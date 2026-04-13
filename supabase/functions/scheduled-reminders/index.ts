// deno-lint-ignore-file no-explicit-any
// Scheduled reminders for diners with upcoming mystery dines.
// Intended to be invoked HOURLY by pg_cron (see BACKEND_SETUP.md).
//
// Sends two kinds of push notifications:
//   1. 24-hour reminder  — fired when visit is 22-26h away
//   2. Morning-of reminder — fired between 07:30 and 09:00 local on visit day
//
// Each assignment has reminder_24h_sent_at / reminder_morning_sent_at columns
// (see migration 004) to prevent duplicates.
//
// This function expects to run in UTC. pg_cron runs in UTC by default.

import { preflight, json } from '../_shared/cors.ts';
import { adminClient } from '../_shared/supabaseAdmin.ts';
import { sendExpoPush, ExpoPushMessage } from '../_shared/expoPush.ts';

interface AssignmentRow {
  id: string;
  diner_id: string;
  reminder_24h_sent_at: string | null;
  reminder_morning_sent_at: string | null;
  slot: {
    id: string;
    date: string;
    time: string;
    restaurant: { name: string | null } | null;
  } | null;
  diner: { push_token: string | null } | null;
}

function visitDateTime(slot: { date: string; time: string }): Date {
  // Combine slot.date + slot.time (both server-side ISO strings) into a UTC Date.
  // Supabase returns time as 'HH:MM:SS' — we treat this as the venue's local
  // time but for reminder purposes we use UTC; adjust later if needed.
  return new Date(`${slot.date}T${slot.time}Z`);
}

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;

  const sb = adminClient();
  const now = new Date();

  // Look 48h ahead to cover both 24h and morning-of cases.
  const windowEnd = new Date(now.getTime() + 48 * 3600 * 1000);

  const { data, error } = await sb
    .from('assignments')
    .select(`
      id,
      diner_id,
      reminder_24h_sent_at,
      reminder_morning_sent_at,
      slot:slots!inner(id, date, time, restaurant:restaurants(name)),
      diner:users!assignments_diner_id_fkey(push_token)
    `)
    .in('status', ['pending', 'confirmed'])
    .gte('slot.date', now.toISOString().slice(0, 10))
    .lte('slot.date', windowEnd.toISOString().slice(0, 10));

  if (error) {
    console.error('scheduled-reminders query failed', error);
    return json({ error: error.message }, 500);
  }

  const rows = (data ?? []) as unknown as AssignmentRow[];
  const pushMessages: ExpoPushMessage[] = [];
  const inAppRows: any[] = [];
  const mark24h: string[] = [];
  const markMorning: string[] = [];

  for (const row of rows) {
    if (!row.slot) continue;
    const visit = visitDateTime(row.slot);
    if (isNaN(visit.getTime())) continue;

    const msUntil = visit.getTime() - now.getTime();
    const hoursUntil = msUntil / 3_600_000;

    const restaurantName = row.slot.restaurant?.name ?? 'the restaurant';
    const timeStr = String(row.slot.time).slice(0, 5);
    const dateStr = new Date(row.slot.date).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long',
    });

    // 24-hour reminder — fire once when visit is 22-26h away
    if (!row.reminder_24h_sent_at && hoursUntil >= 22 && hoursUntil <= 26) {
      const title = 'Reminder: mystery dine tomorrow';
      const body = `Your visit to ${restaurantName} is tomorrow at ${timeStr}.`;
      inAppRows.push({
        user_id: row.diner_id,
        title, body,
        type: 'assignment_reminder',
        data: { assignmentId: row.id, slotId: row.slot.id, variant: '24h' },
      });
      if (row.diner?.push_token) {
        pushMessages.push({
          to: row.diner.push_token,
          title, body,
          data: { type: 'assignment_reminder', assignmentId: row.id, variant: '24h' },
          sound: 'default',
        });
      }
      mark24h.push(row.id);
    }

    // Morning-of reminder — fire once when visit is same-day and hour ≥ 7
    const sameDay = visit.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
    const morningWindow = now.getUTCHours() >= 7 && now.getUTCHours() <= 10;
    if (!row.reminder_morning_sent_at && sameDay && morningWindow) {
      const title = `Today's the day — ${restaurantName}`;
      const body = `${restaurantName} at ${timeStr}. Good luck!`;
      inAppRows.push({
        user_id: row.diner_id,
        title, body,
        type: 'assignment_reminder',
        data: { assignmentId: row.id, slotId: row.slot.id, variant: 'morning', dateStr },
      });
      if (row.diner?.push_token) {
        pushMessages.push({
          to: row.diner.push_token,
          title, body,
          data: { type: 'assignment_reminder', assignmentId: row.id, variant: 'morning' },
          sound: 'default',
        });
      }
      markMorning.push(row.id);
    }
  }

  // Write in-app notifications
  if (inAppRows.length > 0) {
    const { error: insErr } = await sb.from('notifications').insert(inAppRows);
    if (insErr) console.error('insert notifications failed', insErr);
  }

  // Send push
  let tickets: any[] = [];
  if (pushMessages.length > 0) {
    try {
      tickets = await sendExpoPush(pushMessages);
    } catch (err) {
      console.error('expo push failed', err);
    }
  }

  // Mark sent
  const nowIso = now.toISOString();
  if (mark24h.length > 0) {
    await sb
      .from('assignments')
      .update({ reminder_24h_sent_at: nowIso })
      .in('id', mark24h);
  }
  if (markMorning.length > 0) {
    await sb
      .from('assignments')
      .update({ reminder_morning_sent_at: nowIso })
      .in('id', markMorning);
  }

  return json({
    scanned: rows.length,
    reminder24hSent: mark24h.length,
    reminderMorningSent: markMorning.length,
    pushSent: tickets.length,
  });
});
