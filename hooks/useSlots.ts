import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Slot, Assignment } from '../types';

// Fetch all open slots for the diner feed
export function useOpenSlots() {
  return useQuery({
    queryKey: ['slots', 'open'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('slots')
        .select('*, restaurant:restaurants(id, name, address, cuisine_type, avg_rating)')
        .eq('status', 'open')
        .or(`voucher_expiry.gte.${today},voucher_expiry.is.null`)
        .order('voucher_expiry', { ascending: true, nullsFirst: false });
      if (error) throw error;
      // Also filter out legacy date-based slots that have passed
      return (data as (Slot & { restaurant: any })[]).filter(
        s => !s.date || s.date >= today
      );
    },
  });
}

// Fetch claimed slots so diners can join the waitlist
export function useClaimedSlots() {
  return useQuery({
    queryKey: ['slots', 'claimed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slots')
        .select('*, restaurant:restaurants(id, name, address, cuisine_type, avg_rating)')
        .eq('status', 'claimed')
        .order('date', { ascending: true });
      if (error) throw error;
      return data as (Slot & { restaurant: any })[];
    },
  });
}

// Fetch all slots for admin view
export function useAllSlots() {
  return useQuery({
    queryKey: ['slots', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slots')
        .select('*, restaurant:restaurants(id, name, address, cuisine_type)')
        .order('date', { ascending: true });
      if (error) throw error;
      return data as (Slot & { restaurant: any })[];
    },
  });
}

// Fetch assignments for a specific slot (admin)
export function useSlotAssignments(slotId: string) {
  return useQuery({
    queryKey: ['assignments', slotId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('*, diner:users(id, name, email, phone)')
        .eq('slot_id', slotId);
      if (error) throw error;
      return data as (Assignment & { diner: any })[];
    },
    enabled: !!slotId,
  });
}

// Fetch diner's own assignments
export function useMyAssignments(dinerId: string) {
  return useQuery({
    queryKey: ['my-assignments', dinerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('*, slot:slots(*, restaurant:restaurants(id, name, address, cuisine_type))')
        .eq('diner_id', dinerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (Assignment & { slot: any })[];
    },
    enabled: !!dinerId,
  });
}

// Claim a slot
export function useClaimSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ slotId, dinerId }: { slotId: string; dinerId: string }) => {
      const { data, error } = await supabase
        .from('assignments')
        .insert({ slot_id: slotId, diner_id: dinerId, status: 'pending' })
        .select()
        .single();
      if (error) throw error;
      // Mark slot as claimed
      await supabase.from('slots').update({ status: 'claimed' }).eq('id', slotId);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
    },
  });
}

// Admin: create a new slot. Either voucher_expiry (new voucher workflow) or
// date+time (legacy fixed-slot) must be supplied.
export function useCreateSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (slot: {
      restaurant_id: string;
      date?: string | null;
      time?: string | null;
      voucher_expiry?: string | null;
      notes?: string | null;
      max_covers: number;
      created_by: string;
    }) => {
      const { data, error } = await supabase
        .from('slots')
        .insert({ ...slot, status: 'open' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}

// Admin: update an existing slot. All fields optional so Wendy can edit
// voucher_expiry / notes on voucher slots without touching date/time, and
// vice versa for legacy slots.
export function useUpdateSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      date?: string | null;
      time?: string | null;
      voucher_expiry?: string | null;
      notes?: string | null;
      max_covers?: number;
    }) => {
      const { id, ...rest } = payload;
      const { error } = await supabase
        .from('slots')
        .update(rest)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}

// Diner: enter the actual booking date/time after Wendy has approved
// their application. Populates Wendy's calendar.
export function useUpdateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assignmentId,
      bookingDate,
      bookingTime,
      bookingNotes,
    }: {
      assignmentId: string;
      bookingDate: string;
      bookingTime: string;
      bookingNotes?: string;
    }) => {
      const { error } = await supabase
        .from('assignments')
        .update({
          booking_date: bookingDate,
          booking_time: bookingTime,
          booking_notes: bookingNotes ?? null,
        })
        .eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
}

// Admin: cancel a slot (sets status to cancelled)
export function useCancelSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase
        .from('slots')
        .update({ status: 'cancelled' })
        .eq('id', slotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}

// Admin: confirm an assignment
export function useConfirmAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('assignments')
        .update({ status: 'confirmed' })
        .eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}
