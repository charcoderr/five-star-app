import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ─── Dashboard stats ──────────────────────────────────────────────────────────
export function useDashboardStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [slotsRes, reportsRes, underReviewRes, dinersRes, restaurantsRes, applicationsRes, overdueRes] = await Promise.all([
        supabase.from('slots').select('id, status', { count: 'exact' }).eq('status', 'open'),
        supabase.from('reports').select('id', { count: 'exact' }).eq('status', 'submitted'),
        supabase.from('reports').select('id', { count: 'exact' }).eq('status', 'under_review'),
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'diner').eq('status', 'active'),
        supabase.from('restaurants').select('id', { count: 'exact' }),
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'diner').eq('status', 'pending_approval'),
        supabase.from('overdue_reports').select('assignment_id', { count: 'exact', head: true }),
      ]);
      return {
        openSlots: slotsRes.count ?? 0,
        pendingReports: reportsRes.count ?? 0,
        reportsUnderReview: underReviewRes.count ?? 0,
        activeDiners: dinersRes.count ?? 0,
        restaurants: restaurantsRes.count ?? 0,
        pendingApplications: applicationsRes.count ?? 0,
        overdueReports: overdueRes.count ?? 0,
      };
    },
  });
}

// ─── Reports ─────────────────────────────────────────────────────────────────
export function useAllReports() {
  return useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          diner:users!reports_diner_id_fkey(name, email),
          restaurant:restaurants(name)
        `)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useReportDetail(reportId: string) {
  return useQuery({
    queryKey: ['report-detail', reportId],
    queryFn: async () => {
      const [reportRes, photosRes] = await Promise.all([
        supabase
          .from('reports')
          .select(`
            *,
            diner:users!reports_diner_id_fkey(name, email, phone),
            restaurant:restaurants(id, name, address),
            assignment:assignments(slot:slots(date, time))
          `)
          .eq('id', reportId)
          .single(),
        supabase
          .from('report_photos')
          .select('*')
          .eq('report_id', reportId),
      ]);
      if (reportRes.error) throw reportRes.error;

      // Fetch proforma so we can show question labels alongside answers
      const restaurantId = reportRes.data?.restaurant?.id;
      let proformaQuestions: any[] = [];
      if (restaurantId) {
        const { data: pfData } = await supabase
          .from('proformas')
          .select('questions')
          .eq('restaurant_id', restaurantId)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();
        proformaQuestions = pfData?.questions ?? [];
      }

      // Get signed URLs for photos
      const photos = await Promise.all(
        (photosRes.data ?? []).map(async (p: any) => {
          const { data } = await supabase.storage
            .from('report-photos')
            .createSignedUrl(p.storage_path, 3600);
          return { ...p, url: data?.signedUrl };
        })
      );
      return { report: reportRes.data, photos, proformaQuestions };
    },
    enabled: !!reportId,
  });
}

export function useReviewReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reportId,
      restaurantId,
      answers,
      adminNotes,
    }: {
      reportId: string;
      restaurantId: string;
      answers: Record<string, any>;
      adminNotes?: string;
    }) => {
      // Approve & send to restaurant (status moves from submitted/under_review
      // to sent_to_restaurant, at which point restaurant RLS exposes the row).
      await supabase
        .from('reports')
        .update({ status: 'sent_to_restaurant', admin_notes: adminNotes })
        .eq('id', reportId);

      // Calculate star rating from scored answers
      const scored = Object.values(answers).filter(
        (a: any) => a.score !== undefined
      );
      if (scored.length > 0) {
        const total = scored.reduce((sum: number, a: any) => sum + (a.score ?? 0), 0);
        const max = scored.length * 3;
        const starRating = (total / max) * 5;

        await supabase.from('ratings').insert({
          restaurant_id: restaurantId,
          report_id: reportId,
          score: parseFloat(starRating.toFixed(2)),
        });

        // Update restaurant avg_rating
        const { data: allRatings } = await supabase
          .from('ratings')
          .select('score')
          .eq('restaurant_id', restaurantId);

        if (allRatings && allRatings.length > 0) {
          const avg = allRatings.reduce((s: number, r: any) => s + r.score, 0) / allRatings.length;
          await supabase
            .from('restaurants')
            .update({ avg_rating: parseFloat(avg.toFixed(2)) })
            .eq('id', restaurantId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['report-detail'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
    },
  });
}

// ─── Diners / Applications ────────────────────────────────────────────────────
export function useDiners() {
  return useQuery({
    queryKey: ['admin-diners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'diner')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useApproveApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dinerId: string) => {
      const { error } = await supabase
        .from('users')
        .update({ status: 'active' })
        .eq('id', dinerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-diners'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

export function useRejectApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dinerId: string) => {
      const { error } = await supabase
        .from('users')
        .update({ status: 'suspended' })
        .eq('id', dinerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-diners'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

// ─── Restaurants ──────────────────────────────────────────────────────────────
export function useAdminRestaurants() {
  return useQuery({
    queryKey: ['admin-restaurants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateRestaurant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (r: {
      name: string;
      address: string;
      cuisine_type: string;
      contact_email: string;
    }) => {
      const { data, error } = await supabase
        .from('restaurants')
        .insert({ ...r, subscription_status: 'trial' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-restaurants'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
    },
  });
}

// ─── T&Cs ─────────────────────────────────────────────────────────────────────
export function useTcsContent() {
  return useQuery({
    queryKey: ['tcs-content'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tcs_content')
        .select('*')
        .order('version', { ascending: false })
        .limit(1)
        .single();
      return data;
    },
  });
}

export function useUpdateTcs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ content, version }: { content: string; version: number }) => {
      const { error } = await supabase
        .from('tcs_content')
        .insert({ content, version });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tcs-content'] });
    },
  });
}
