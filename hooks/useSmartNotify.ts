import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ─── Notify matching diners about a single new slot ───────────────────────────
// Excludes diners who visited this restaurant in the last 60 days
export function useNotifyDinersForSlot() {
  return useMutation({
    mutationFn: async ({
      restaurantId,
      restaurantName,
      slotDate,
      slotTime,
      slotId,
    }: {
      restaurantId: string;
      restaurantName: string;
      slotDate: string;
      slotTime: string;
      slotId: string;
    }) => {
      const eligible = await getEligibleDiners(restaurantId);
      if (eligible.length === 0) return { notified: 0 };

      const formattedDate = new Date(slotDate + 'T00:00:00').toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short',
      });

      const notifications = eligible.map(id => ({
        user_id: id,
        title: `New dine at ${restaurantName}`,
        body: `${formattedDate} at ${slotTime.slice(0, 5)} — be quick, slots fill fast!`,
        type: 'new_slot',
        data: { slotId, restaurantId },
      }));

      await insertInBatches(notifications);
      return { notified: eligible.length };
    },
  });
}

// ─── Notify matching diners about multiple new slots (bulk creation) ───────────
export function useNotifyDinersForSlots() {
  return useMutation({
    mutationFn: async (slots: {
      restaurantId: string;
      restaurantName: string;
      slotId: string;
    }[]) => {
      if (slots.length === 0) return { notified: 0 };
      const { restaurantId, restaurantName } = slots[0];

      const eligible = await getEligibleDiners(restaurantId);
      if (eligible.length === 0) return { notified: 0 };

      const notifications = eligible.map(id => ({
        user_id: id,
        title: `${slots.length} new dine${slots.length > 1 ? 's' : ''} at ${restaurantName}`,
        body: `New mystery dine slots available — check the app and claim yours!`,
        type: 'new_slot',
        data: { restaurantId },
      }));

      await insertInBatches(notifications);
      return { notified: eligible.length };
    },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function getEligibleDiners(restaurantId: string): Promise<string[]> {
  // All active diners
  const { data: activeDiners, error: dinersError } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'diner')
    .eq('status', 'active');
  if (dinersError) throw dinersError;
  if (!activeDiners || activeDiners.length === 0) return [];

  // Slots at this restaurant (to find recent visitors)
  const { data: restaurantSlots } = await supabase
    .from('slots')
    .select('id')
    .eq('restaurant_id', restaurantId);
  const slotIds = (restaurantSlots ?? []).map(s => s.id);

  if (slotIds.length === 0) return activeDiners.map(d => d.id);

  // Diners who visited in the last 60 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);
  const { data: recentVisitors } = await supabase
    .from('assignments')
    .select('diner_id')
    .in('slot_id', slotIds)
    .gte('created_at', cutoff.toISOString())
    .in('status', ['confirmed', 'completed']);

  const recentIds = new Set((recentVisitors ?? []).map(v => v.diner_id));
  return activeDiners.filter(d => !recentIds.has(d.id)).map(d => d.id);
}

async function insertInBatches(notifications: object[], batchSize = 100) {
  for (let i = 0; i < notifications.length; i += batchSize) {
    const { error } = await supabase
      .from('notifications')
      .insert(notifications.slice(i, i + batchSize));
    if (error) throw error;
  }
}
