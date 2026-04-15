import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Slot, Assignment } from '../types';

// Fetch all open slots for the diner feed
export function useOpenSlots() {
  return useQuery({
    queryKey: ['slots', 'open'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slots')
        .select('*, restaurant:restaurants(id, name, address, cuisine_type, avg_rating)')
        .eq('status', 'open')
        .order('date', { ascending: true });
      if (error) throw error;
      return data as (Slot & { restaurant: any })[];
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

// Admin: create a new slot
export function useCreateSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (slot: {
      restaurant_id: string;
      date: string;
      time: string;
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

// Admin: update an existing slot
export function useUpdateSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, date, time, max_covers }: { id: string; date: string; time: string; max_covers: number }) => {
      const { error } = await supabase
        .from('slots')
        .update({ date, time, max_covers })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
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
