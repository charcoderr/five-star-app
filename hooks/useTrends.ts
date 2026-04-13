import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface MonthlyScore {
  month: string;   // "2025-01"
  label: string;   // "Jan"
  avgScore: number;
  count: number;
}

// ─── Monthly score trend for one restaurant ──────────────────────────────────
export function useScoreTrend(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['score-trend', restaurantId],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 1);

      const { data, error } = await supabase
        .from('ratings')
        .select('score, calculated_at')
        .eq('restaurant_id', restaurantId!)
        .gte('calculated_at', cutoff.toISOString())
        .order('calculated_at', { ascending: true });
      if (error) throw error;

      const monthMap: Record<string, number[]> = {};
      for (const r of data ?? []) {
        const d = new Date(r.calculated_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap[key]) monthMap[key] = [];
        monthMap[key].push(r.score);
      }

      return Object.entries(monthMap).map(([month, scores]) => ({
        month,
        label: new Date(month + '-01').toLocaleDateString('en-GB', { month: 'short' }),
        avgScore: scores.reduce((s, n) => s + n, 0) / scores.length,
        count: scores.length,
      })) as MonthlyScore[];
    },
    enabled: !!restaurantId,
  });
}

// ─── Platform-wide average for the last 12 months (benchmark) ────────────────
export function usePlatformBenchmark() {
  return useQuery({
    queryKey: ['platform-benchmark'],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 1);

      const { data, error } = await supabase
        .from('ratings')
        .select('score')
        .gte('calculated_at', cutoff.toISOString());
      if (error) throw error;

      const scores = (data ?? []).map(r => r.score);
      if (scores.length === 0) return null;
      return scores.reduce((s, n) => s + n, 0) / scores.length;
    },
  });
}
