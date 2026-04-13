import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ─── Badge tier ───────────────────────────────────────────────────────────────
export type BadgeTier = 'None' | 'Bronze' | 'Silver' | 'Gold' | 'Elite';

export const BADGE_CONFIG: Record<BadgeTier, { emoji: string; colour: string; minVisits: number; nextAt: number | null }> = {
  None:   { emoji: '—',  colour: '#999999', minVisits: 0,  nextAt: 1  },
  Bronze: { emoji: '🥉', colour: '#CD7F32', minVisits: 1,  nextAt: 5  },
  Silver: { emoji: '🥈', colour: '#A8A9AD', minVisits: 5,  nextAt: 10 },
  Gold:   { emoji: '🥇', colour: '#C9A84C', minVisits: 10, nextAt: 20 },
  Elite:  { emoji: '⭐', colour: '#C9A84C', minVisits: 20, nextAt: null },
};

export function getBadgeTier(visits: number): BadgeTier {
  if (visits >= 20) return 'Elite';
  if (visits >= 10) return 'Gold';
  if (visits >= 5) return 'Silver';
  if (visits >= 1) return 'Bronze';
  return 'None';
}

// ─── Own diner stats (profile screen) ────────────────────────────────────────
export interface DinerStats {
  totalVisits: number;
  totalVoucherValue: number; // GBP float (e.g. 240 = £240)
  avgScore: number | null;   // 0–5 star scale
  badgeTier: BadgeTier;
}

export function useDinerStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['diner-stats', userId],
    queryFn: async () => {
      const [assignmentsRes, vouchersRes, reportsRes] = await Promise.all([
        supabase
          .from('assignments')
          .select('id')
          .eq('diner_id', userId!)
          .eq('status', 'completed'),
        supabase
          .from('vouchers')
          .select('value')
          .eq('diner_id', userId!),
        supabase
          .from('reports')
          .select('answers')
          .eq('diner_id', userId!)
          .in('status', ['submitted', 'reviewed']),
      ]);

      const totalVisits = assignmentsRes.data?.length ?? 0;
      const totalVoucherValue = (vouchersRes.data ?? []).reduce(
        (sum, v) => sum + (v.value ?? 0),
        0
      );

      const reports = reportsRes.data ?? [];
      const allScores: number[] = [];
      for (const r of reports) {
        const answers = (r.answers ?? {}) as Record<string, any>;
        const scored = Object.values(answers).filter(a => a?.score !== undefined);
        if (scored.length > 0) {
          const total = scored.reduce((s: number, a: any) => s + (a.score ?? 0), 0);
          const max = scored.length * 3;
          allScores.push((total / max) * 5);
        }
      }
      const avgScore = allScores.length > 0
        ? allScores.reduce((s, n) => s + n, 0) / allScores.length
        : null;

      return {
        totalVisits,
        totalVoucherValue,
        avgScore,
        badgeTier: getBadgeTier(totalVisits),
      } as DinerStats;
    },
    enabled: !!userId,
  });
}

// ─── Voucher earnings history ─────────────────────────────────────────────────
export interface VoucherHistoryItem {
  id: string;
  value: number;
  status: string;
  issued_at: string;
  restaurant_name: string | null;
}

export function useDinerVoucherHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ['diner-voucher-history', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vouchers')
        .select(`
          id, value, status, issued_at,
          assignment:assignments(
            slot:slots(
              restaurant:restaurants(name)
            )
          )
        `)
        .eq('diner_id', userId!)
        .order('issued_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []).map(v => ({
        id: v.id,
        value: v.value,
        status: v.status,
        issued_at: v.issued_at,
        restaurant_name: (v.assignment as any)?.slot?.restaurant?.name ?? null,
      })) as VoucherHistoryItem[];
    },
    enabled: !!userId,
  });
}

// ─── Admin: performance map for all diners ───────────────────────────────────
export interface DinerPerf {
  visits: number;
  avgScore: number | null;
}

export function useDinerPerformanceMap() {
  return useQuery({
    queryKey: ['diner-performance-map'],
    queryFn: async () => {
      const [assignmentsRes, reportsRes] = await Promise.all([
        supabase
          .from('assignments')
          .select('diner_id')
          .eq('status', 'completed'),
        supabase
          .from('reports')
          .select('diner_id, answers')
          .in('status', ['submitted', 'reviewed']),
      ]);

      const visitMap: Record<string, number> = {};
      for (const a of assignmentsRes.data ?? []) {
        if (a.diner_id) visitMap[a.diner_id] = (visitMap[a.diner_id] ?? 0) + 1;
      }

      const scoreMap: Record<string, number[]> = {};
      for (const r of reportsRes.data ?? []) {
        if (!r.diner_id) continue;
        const answers = (r.answers ?? {}) as Record<string, any>;
        const scored = Object.values(answers).filter(a => a?.score !== undefined);
        if (scored.length > 0) {
          const total = scored.reduce((s: number, a: any) => s + (a.score ?? 0), 0);
          const max = scored.length * 3;
          if (!scoreMap[r.diner_id]) scoreMap[r.diner_id] = [];
          scoreMap[r.diner_id].push((total / max) * 5);
        }
      }

      const result: Record<string, DinerPerf> = {};
      const allIds = new Set([...Object.keys(visitMap), ...Object.keys(scoreMap)]);
      for (const id of allIds) {
        const scores = scoreMap[id] ?? [];
        result[id] = {
          visits: visitMap[id] ?? 0,
          avgScore: scores.length > 0
            ? scores.reduce((s, n) => s + n, 0) / scores.length
            : null,
        };
      }
      return result as Record<string, DinerPerf>;
    },
  });
}
