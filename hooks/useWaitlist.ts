import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ─── All waitlist entries for a specific slot (admin) ─────────────────────────
export function useSlotWaitlist(slotId: string) {
  return useQuery({
    queryKey: ['slot-waitlist', slotId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slot_waitlist')
        .select('id, position, created_at, diner:users(id, name, email)')
        .eq('slot_id', slotId)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; position: number; created_at: string; diner: { id: string; name: string; email: string } }[];
    },
    enabled: !!slotId,
  });
}

// ─── Count of waitlist entries per slot (admin list view, single fetch) ────────
export function useAllWaitlistCounts() {
  return useQuery({
    queryKey: ['all-waitlist-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slot_waitlist')
        .select('slot_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const entry of data ?? []) {
        counts[entry.slot_id] = (counts[entry.slot_id] ?? 0) + 1;
      }
      return counts as Record<string, number>;
    },
  });
}

// ─── Diner's own waitlist entries — returns a map of slotId -> position ───────
export function useMyWaitlistEntries(dinerId: string | undefined) {
  return useQuery({
    queryKey: ['my-waitlist', dinerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slot_waitlist')
        .select('slot_id, position')
        .eq('diner_id', dinerId!);
      if (error) throw error;
      return (data ?? []).reduce((map, e) => {
        map[e.slot_id] = e.position;
        return map;
      }, {} as Record<string, number>);
    },
    enabled: !!dinerId,
  });
}

// ─── Join a waitlist ─────────────────────────────────────────────────────────
export function useJoinWaitlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ slotId, dinerId }: { slotId: string; dinerId: string }) => {
      const { count } = await supabase
        .from('slot_waitlist')
        .select('id', { count: 'exact', head: true })
        .eq('slot_id', slotId);

      const { data, error } = await supabase
        .from('slot_waitlist')
        .insert({ slot_id: slotId, diner_id: dinerId, position: (count ?? 0) + 1 })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { slotId, dinerId }) => {
      queryClient.invalidateQueries({ queryKey: ['my-waitlist', dinerId] });
      queryClient.invalidateQueries({ queryKey: ['slot-waitlist', slotId] });
      queryClient.invalidateQueries({ queryKey: ['all-waitlist-counts'] });
    },
  });
}

// ─── Leave a waitlist ────────────────────────────────────────────────────────
export function useLeaveWaitlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ slotId, dinerId }: { slotId: string; dinerId: string }) => {
      const { error } = await supabase
        .from('slot_waitlist')
        .delete()
        .eq('slot_id', slotId)
        .eq('diner_id', dinerId);
      if (error) throw error;
    },
    onSuccess: (_, { slotId, dinerId }) => {
      queryClient.invalidateQueries({ queryKey: ['my-waitlist', dinerId] });
      queryClient.invalidateQueries({ queryKey: ['slot-waitlist', slotId] });
      queryClient.invalidateQueries({ queryKey: ['all-waitlist-counts'] });
    },
  });
}

// ─── Admin: send in-app notifications to all diners on a slot's waitlist ─────
export function useNotifyWaitlist() {
  return useMutation({
    mutationFn: async ({
      slotId,
      restaurantName,
      slotDate,
      slotTime,
    }: {
      slotId: string;
      restaurantName: string;
      slotDate: string;
      slotTime: string;
    }) => {
      const { data, error } = await supabase
        .from('slot_waitlist')
        .select('diner_id')
        .eq('slot_id', slotId)
        .order('position', { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return { notified: 0 };

      const formattedDate = new Date(slotDate + 'T00:00:00').toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short',
      });

      const notifications = data.map(w => ({
        user_id: w.diner_id,
        title: `Slot open at ${restaurantName}!`,
        body: `${formattedDate} at ${slotTime.slice(0, 5)} — get in quick!`,
        type: 'new_slot',
        data: { slotId },
      }));

      const { error: notifError } = await supabase.from('notifications').insert(notifications);
      if (notifError) throw notifError;

      return { notified: data.length };
    },
  });
}
