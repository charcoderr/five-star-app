// ─── Timer definitions ────────────────────────────────────────────────────────
// Each timer maps to a scored question in the proforma.
// targetSeconds: the benchmark from the 5StarX proforma
// autoCancelSeconds: 2× target — past this we assume the diner forgot to stop
// scoreThresholds: [Excellent, Good, Fair] upper bounds in seconds
//   e.g. [240, 300, 360] means ≤4m = Excellent, ≤5m = Good, ≤6m = Fair, else Poor

export interface TimerDefinition {
  id: string;
  label: string;
  shortLabel: string;
  targetSeconds: number;
  autoCancelSeconds: number;
  /** Upper bound in seconds for each score tier [Excellent, Good, Fair].
   *  Anything over the Fair threshold = Poor. */
  scoreThresholds: [number, number, number];
}

export const DINE_TIMERS: TimerDefinition[] = [
  {
    id: 'drinks_order',
    label: 'Drinks order taken',
    shortLabel: 'Drinks order',
    targetSeconds: 4 * 60,        // 4 min target
    autoCancelSeconds: 10 * 60,   // cancel at 10 min
    scoreThresholds: [4 * 60, 5 * 60, 6 * 60],
  },
  {
    id: 'drinks_arrived',
    label: 'Drinks arrived',
    shortLabel: 'Drinks arrived',
    targetSeconds: 5 * 60,
    autoCancelSeconds: 12 * 60,
    scoreThresholds: [5 * 60, 7 * 60, 9 * 60],
  },
  {
    id: 'food_order',
    label: 'Food order taken',
    shortLabel: 'Food order',
    targetSeconds: 10 * 60,
    autoCancelSeconds: 22 * 60,
    scoreThresholds: [10 * 60, 13 * 60, 16 * 60],
  },
  {
    id: 'food_arrived',
    label: 'Food arrived',
    shortLabel: 'Food arrived',
    targetSeconds: 20 * 60,
    autoCancelSeconds: 45 * 60,
    scoreThresholds: [20 * 60, 25 * 60, 30 * 60],
  },
  {
    id: 'bill_arrived',
    label: 'Bill arrived',
    shortLabel: 'Bill',
    targetSeconds: 3 * 60,
    autoCancelSeconds: 8 * 60,
    scoreThresholds: [3 * 60, 4 * 60, 5 * 60],
  },
];

// ─── Score from elapsed time ──────────────────────────────────────────────────
export function scoreFromElapsed(
  elapsedSeconds: number,
  thresholds: [number, number, number]
): number {
  const [excellent, good, fair] = thresholds;
  if (elapsedSeconds <= excellent) return 3; // Excellent
  if (elapsedSeconds <= good)     return 2; // Good
  if (elapsedSeconds <= fair)     return 1; // Fair
  return 0;                                  // Poor
}

// ─── Format helpers ───────────────────────────────────────────────────────────
export function formatSeconds(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function parseMMSS(input: string): number | null {
  const cleaned = input.trim().replace(/[^0-9:]/g, '');
  const parts = cleaned.split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10);
    const secs = parseInt(parts[1], 10);
    if (!isNaN(mins) && !isNaN(secs) && secs < 60) return mins * 60 + secs;
  }
  if (parts.length === 1) {
    const mins = parseInt(parts[0], 10);
    if (!isNaN(mins)) return mins * 60;
  }
  return null;
}

// ─── Timer state ──────────────────────────────────────────────────────────────
export type TimerStatus = 'idle' | 'running' | 'stopped' | 'cancelled' | 'manual';

export interface TimerState {
  id: string;
  status: TimerStatus;
  startedAt: number | null;        // Date.now() when started
  elapsedSeconds: number | null;   // Final elapsed (stopped or cancelled)
  suggestedScore: number | null;   // 0–3, null if not recorded
}

export function buildInitialTimers(): Record<string, TimerState> {
  return Object.fromEntries(
    DINE_TIMERS.map(t => [
      t.id,
      { id: t.id, status: 'idle', startedAt: null, elapsedSeconds: null, suggestedScore: null },
    ])
  );
}
