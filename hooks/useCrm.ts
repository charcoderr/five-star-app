import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface CrmNote {
  id: string;
  body: string;
  note_type: string;
  created_at: string;
  author?: { name?: string | null } | null;
}

// ─── Restaurant CRM ──────────────────────────────────────────────────────────
export function useRestaurantDetail(restaurantId: string) {
  return useQuery({
    queryKey: ['crm-restaurant', restaurantId],
    queryFn: async () => {
      const [restRes, slotsRes, reportsRes, dinersRes] = await Promise.all([
        supabase.from('restaurants').select('*').eq('id', restaurantId).single(),

        supabase
          .from('slots')
          .select('id, date, time, status')
          .eq('restaurant_id', restaurantId)
          .order('date', { ascending: false })
          .limit(10),

        supabase
          .from('reports')
          .select(`
            id, status, submitted_at, answers,
            diner:users!reports_diner_id_fkey(id, name)
          `)
          .eq('restaurant_id', restaurantId)
          .order('submitted_at', { ascending: false, nullsFirst: false })
          .limit(10),

        // Diners who've been assigned slots at this restaurant
        supabase
          .from('assignments')
          .select(`
            diner:users!assignments_diner_id_fkey(id, name, email, city, status),
            slot:slots!inner(restaurant_id)
          `)
          .eq('slot.restaurant_id', restaurantId),
      ]);

      if (restRes.error) throw restRes.error;

      // Deduplicate linked diners
      const dinersMap = new Map<string, any>();
      (dinersRes.data ?? []).forEach((row: any) => {
        if (row.diner?.id) dinersMap.set(row.diner.id, row.diner);
      });

      return {
        restaurant: restRes.data,
        recentSlots: slotsRes.data ?? [],
        recentReports: reportsRes.data ?? [],
        linkedDiners: Array.from(dinersMap.values()),
      };
    },
    enabled: !!restaurantId,
  });
}

export function useRestaurantNotes(restaurantId: string) {
  return useQuery({
    queryKey: ['crm-restaurant-notes', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_notes')
        .select(`
          id, body, note_type, created_at,
          author:users!restaurant_notes_author_id_fkey(name)
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CrmNote[];
    },
    enabled: !!restaurantId,
  });
}

export function useAddRestaurantNote(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, noteType }: { body: string; noteType: string }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const authorId = sessionData.session?.user.id ?? null;
      const { error } = await supabase
        .from('restaurant_notes')
        .insert({
          restaurant_id: restaurantId,
          author_id: authorId,
          body,
          note_type: noteType,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-restaurant-notes', restaurantId] });
    },
  });
}

export function useDeleteRestaurantNote(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('restaurant_notes')
        .delete()
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-restaurant-notes', restaurantId] });
    },
  });
}

// ─── Diner CRM notes ─────────────────────────────────────────────────────────
export function useDinerNotes(dinerId: string) {
  return useQuery({
    queryKey: ['crm-diner-notes', dinerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diner_notes')
        .select(`
          id, body, note_type, created_at,
          author:users!diner_notes_author_id_fkey(name)
        `)
        .eq('diner_id', dinerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CrmNote[];
    },
    enabled: !!dinerId,
  });
}

export function useAddDinerNote(dinerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, noteType }: { body: string; noteType: string }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const authorId = sessionData.session?.user.id ?? null;
      const { error } = await supabase
        .from('diner_notes')
        .insert({
          diner_id: dinerId,
          author_id: authorId,
          body,
          note_type: noteType,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-diner-notes', dinerId] });
    },
  });
}

export function useDeleteDinerNote(dinerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('diner_notes')
        .delete()
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-diner-notes', dinerId] });
    },
  });
}
