import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Dashboard stats for a single restaurant (scoped to current restaurant user)
export function useRestaurantStats(restaurantId: string) {
  return useQuery({
    queryKey: ['restaurant-stats', restaurantId],
    queryFn: async () => {
      const now = new Date().toISOString().slice(0, 10);

      const [upcomingRes, submittedRes, reviewedRes, ratingRes] = await Promise.all([
        // Upcoming visits = slots claimed or completed after today
        supabase
          .from('slots')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .in('status', ['open', 'claimed'])
          .gte('date', now),

        // Submitted reports still awaiting admin review
        supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .eq('status', 'submitted'),

        // Reports that have been approved and sent to the restaurant
        supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .eq('status', 'sent_to_restaurant'),

        // Current restaurant avg rating
        supabase
          .from('restaurants')
          .select('avg_rating, name')
          .eq('id', restaurantId)
          .single(),
      ]);

      return {
        upcomingVisits: upcomingRes.count ?? 0,
        pendingReports: submittedRes.count ?? 0,
        reviewedReports: reviewedRes.count ?? 0,
        avgRating: (ratingRes.data as any)?.avg_rating ?? null,
        restaurantName: (ratingRes.data as any)?.name ?? '',
      };
    },
    enabled: !!restaurantId,
  });
}

// Recent activity feed for the restaurant
export function useRestaurantActivity(restaurantId: string, limit = 5) {
  return useQuery({
    queryKey: ['restaurant-activity', restaurantId, limit],
    queryFn: async () => {
      const [slotsRes, reportsRes] = await Promise.all([
        supabase
          .from('slots')
          .select('id, date, time, status, created_at')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase
          .from('reports')
          .select('id, status, submitted_at, created_at')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false })
          .limit(limit),
      ]);

      const slots = (slotsRes.data ?? []).map(s => ({
        kind: 'slot' as const,
        id: s.id,
        title: `Slot ${s.date} ${String(s.time).slice(0, 5)}`,
        status: s.status,
        at: s.created_at,
      }));
      const reports = (reportsRes.data ?? []).map(r => ({
        kind: 'report' as const,
        id: r.id,
        title: 'Mystery diner report',
        status: r.status,
        at: r.submitted_at ?? r.created_at,
      }));
      return [...slots, ...reports]
        .sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
        .slice(0, limit);
    },
    enabled: !!restaurantId,
  });
}

// Reports visible to the restaurant (only those Wendy has approved + sent)
export function useRestaurantReports(restaurantId: string) {
  return useQuery({
    queryKey: ['restaurant-reports', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          id, status, submitted_at, answers,
          assignment:assignments(slot:slots(date, time))
        `)
        .eq('restaurant_id', restaurantId)
        .eq('status', 'sent_to_restaurant')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!restaurantId,
  });
}

export function useRestaurantReportDetail(reportId: string) {
  return useQuery({
    queryKey: ['restaurant-report-detail', reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          assignment:assignments(slot:slots(date, time))
        `)
        .eq('id', reportId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!reportId,
  });
}
