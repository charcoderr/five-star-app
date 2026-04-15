// deno-lint-ignore-file no-explicit-any
// Unified notification dispatcher.
// Creates an in-app notifications row AND sends an Expo push for each recipient.
//
// Two invocation modes:
//
//   1. Direct invoke (from other functions or the client):
//      POST body:
//      {
//        userIds: string[],      // one or many recipient user ids
//        type: string,           // e.g. 'assignment_confirmed'
//        title: string,
//        body: string,
//        data?: Record<string, string>
//      }
//
//   2. Supabase DB webhook (row-level trigger):
//      Set up in Supabase dashboard → Database → Webhooks.
//      Body shape is { type: 'INSERT' | 'UPDATE', table, record, old_record }.
//      This function recognises the following table events and dispatches
//      appropriate notifications:
//
//      assignments.INSERT        → diner: "Your mystery dine at [R] is confirmed for [date]"
//      vouchers.INSERT           → diner: "Your £X voucher is ready to use"
//      reports.UPDATE (status→reviewed) → diner: "Wendy has reviewed your report"
//      users.INSERT (pending_approval) → admin: "New application from [name]"
//      slots.INSERT              → all active diners: "New mystery dine slot available"

import { preflight, json } from '../_shared/cors.ts';
import { adminClient } from '../_shared/supabaseAdmin.ts';
import { sendExpoPush, ExpoPushMessage } from '../_shared/expoPush.ts';

interface DirectPayload {
  userIds: string[];
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface DbWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, any>;
  old_record: Record<string, any> | null;
}

function isDbWebhook(p: any): p is DbWebhookPayload {
  return p && typeof p.table === 'string' && typeof p.type === 'string' && 'record' in p;
}

async function resolveDbWebhook(sb: ReturnType<typeof adminClient>, p: DbWebhookPayload): Promise<DirectPayload | null> {
  switch (`${p.table}.${p.type}`) {
    case 'assignments.INSERT': {
      const r = p.record;
      if (r.status !== 'confirmed' && r.status !== 'pending') return null;
      const { data: slot } = await sb
        .from('slots')
        .select('date, time, restaurant:restaurants(name)')
        .eq('id', r.slot_id)
        .single();
      const restaurantName = (slot as any)?.restaurant?.name ?? 'the restaurant';
      const dateStr = slot?.date ? new Date(slot.date).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long',
      }) : '';
      return {
        userIds: [r.diner_id],
        type: 'assignment_confirmed',
        title: 'Booking confirmed',
        body: `Your mystery dine at ${restaurantName}${dateStr ? ' is confirmed for ' + dateStr : ''}.`,
        data: { assignmentId: r.id, slotId: r.slot_id },
      };
    }

    case 'vouchers.INSERT': {
      const r = p.record;
      const value = typeof r.value === 'number' ? r.value.toFixed(0) : r.value;
      return {
        userIds: [r.diner_id],
        type: 'voucher_issued',
        title: 'Voucher ready!',
        body: `Your £${value} voucher is ready to use.`,
        data: { voucherId: r.id },
      };
    }

    case 'reports.UPDATE': {
      const r = p.record;
      const prev = p.old_record;
      if (r.status !== 'sent_to_restaurant' || prev?.status === 'sent_to_restaurant') return null;
      return {
        userIds: [r.diner_id],
        type: 'report_reviewed',
        title: 'Report sent to restaurant',
        body: 'Wendy has approved your report and sent it to the restaurant.',
        data: { reportId: r.id },
      };
    }

    case 'users.INSERT': {
      const r = p.record;
      if (r.role !== 'diner' || r.status !== 'pending_approval') return null;
      const { data: admins } = await sb
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .eq('status', 'active');
      const ids = (admins ?? []).map((u: any) => u.id);
      if (ids.length === 0) return null;
      return {
        userIds: ids,
        type: 'new_application',
        title: 'New diner application',
        body: `New application from ${r.name ?? 'a new diner'}.`,
        data: { dinerId: r.id },
      };
    }

    case 'slots.INSERT': {
      const r = p.record;
      if (r.status !== 'open') return null;
      const { data: diners } = await sb
        .from('users')
        .select('id')
        .eq('role', 'diner')
        .eq('status', 'active');
      const ids = (diners ?? []).map((u: any) => u.id);
      if (ids.length === 0) return null;
      const { data: rest } = await sb
        .from('restaurants')
        .select('name')
        .eq('id', r.restaurant_id)
        .single();
      return {
        userIds: ids,
        type: 'new_slot',
        title: 'New mystery dine slot',
        body: `${(rest as any)?.name ?? 'A restaurant'} has a new slot available.`,
        data: { slotId: r.id },
      };
    }

    default:
      return null;
  }
}

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const payload = await req.json();
    const sb = adminClient();

    const direct: DirectPayload | null = isDbWebhook(payload)
      ? await resolveDbWebhook(sb, payload)
      : (payload as DirectPayload);

    if (!direct) return json({ skipped: true });

    const { userIds, type, title, body, data } = direct;
    if (!userIds?.length || !type || !title || !body) {
      return json({ error: 'Missing required fields' }, 400);
    }

    // 1. Create in-app notification rows
    const rows = userIds.map(user_id => ({
      user_id,
      title,
      body,
      type,
      data: data ?? null,
    }));
    const { error: insertErr } = await sb.from('notifications').insert(rows);
    if (insertErr) throw insertErr;

    // 2. Send Expo push to anyone with a token
    const { data: users } = await sb
      .from('users')
      .select('id, push_token')
      .in('id', userIds);

    const messages: ExpoPushMessage[] = (users ?? [])
      .filter((u: any) => u.push_token)
      .map((u: any) => ({
        to: u.push_token,
        title,
        body,
        data: { type, ...(data ?? {}) },
        sound: 'default',
      }));

    const tickets = messages.length > 0 ? await sendExpoPush(messages) : [];

    return json({
      inAppInserted: rows.length,
      pushSent: tickets.length,
      pushTickets: tickets,
    });
  } catch (err) {
    console.error('notify error', err);
    return json({ error: (err as Error).message }, 500);
  }
});
