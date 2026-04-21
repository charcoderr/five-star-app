import { useState, useEffect, useRef, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import {
  DINE_TIMERS,
  TimerState,
  buildInitialTimers,
  scoreFromElapsed,
  NEXT_TIMER,
} from '../utils/dineTimers';

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useDineTimers() {
  const [timers, setTimers] = useState<Record<string, TimerState>>(buildInitialTimers);
  const [liveElapsed, setLiveElapsed] = useState<Record<string, number>>({});
  // ID of the timer that was most recently stopped — used for auto-chain nudge
  const [lastStoppedId, setLastStoppedId] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCancelRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Tick every second for running timers ─────────────────────────────────
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimers(prev => {
        const hasRunning = Object.values(prev).some(t => t.status === 'running');
        if (!hasRunning) return prev;

        const now = Date.now();
        const updates: Record<string, number> = {};
        Object.values(prev).forEach(t => {
          if (t.status === 'running' && t.startedAt !== null) {
            updates[t.id] = Math.floor((now - t.startedAt) / 1000);
          }
        });
        setLiveElapsed(le => ({ ...le, ...updates }));
        return prev; // timer state itself unchanged — only liveElapsed changes
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── Start ─────────────────────────────────────────────────────────────────
  const startTimer = useCallback((id: string) => {
    const def = DINE_TIMERS.find(t => t.id === id);
    if (!def) return;

    const startedAt = Date.now();

    setTimers(prev => ({
      ...prev,
      [id]: { id, status: 'running', startedAt, elapsedSeconds: null, suggestedScore: null, notes: prev[id]?.notes ?? '' },
    }));
    setLiveElapsed(le => ({ ...le, [id]: 0 }));

    // Schedule auto-cancel
    autoCancelRefs.current[id] = setTimeout(() => {
      setTimers(prev => {
        const t = prev[id];
        if (t.status !== 'running') return prev; // already stopped/cancelled
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        return {
          ...prev,
          [id]: { ...t, status: 'cancelled', elapsedSeconds: null, suggestedScore: null },
        };
      });
      setLiveElapsed(le => {
        const next = { ...le };
        delete next[id];
        return next;
      });
    }, def.autoCancelSeconds * 1000);
  }, []);

  // ── Stop ──────────────────────────────────────────────────────────────────
  const stopTimer = useCallback((id: string) => {
    if (autoCancelRefs.current[id]) {
      clearTimeout(autoCancelRefs.current[id]);
      delete autoCancelRefs.current[id];
    }

    setTimers(prev => {
      const t = prev[id];
      if (t.status !== 'running' || t.startedAt === null) return prev;
      const elapsed = Math.floor((Date.now() - t.startedAt) / 1000);
      const def = DINE_TIMERS.find(d => d.id === id)!;
      const suggestedScore = scoreFromElapsed(elapsed, def.scoreThresholds);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      return {
        ...prev,
        [id]: { ...t, status: 'stopped', elapsedSeconds: elapsed, suggestedScore },
      };
    });
    setLiveElapsed(le => {
      const next = { ...le };
      delete next[id];
      return next;
    });

    // Auto-chain nudge: highlight the next timer for 3 seconds
    const nextId = NEXT_TIMER[id];
    if (nextId) {
      setLastStoppedId(id);
      setTimeout(() => setLastStoppedId(prev => prev === id ? null : prev), 3000);
    }
  }, []);

  // ── Skip (N/A — diner didn't use this, e.g. no desserts) ────────────────
  const skipTimer = useCallback((id: string) => {
    if (autoCancelRefs.current[id]) {
      clearTimeout(autoCancelRefs.current[id]);
      delete autoCancelRefs.current[id];
    }
    setTimers(prev => ({
      ...prev,
      [id]: { ...prev[id], status: 'skipped', elapsedSeconds: null, suggestedScore: null },
    }));
    setLiveElapsed(le => {
      const next = { ...le };
      delete next[id];
      return next;
    });
  }, []);

  // ── Manual override (user typed a time) ──────────────────────────────────
  const setManualTime = useCallback((id: string, seconds: number) => {
    const def = DINE_TIMERS.find(d => d.id === id)!;
    const suggestedScore = scoreFromElapsed(seconds, def.scoreThresholds);
    setTimers(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        status: 'manual',
        startedAt: null,
        elapsedSeconds: seconds,
        suggestedScore,
      },
    }));
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetTimer = useCallback((id: string) => {
    if (autoCancelRefs.current[id]) {
      clearTimeout(autoCancelRefs.current[id]);
      delete autoCancelRefs.current[id];
    }
    setTimers(prev => ({
      ...prev,
      [id]: { id, status: 'idle', startedAt: null, elapsedSeconds: null, suggestedScore: null, notes: '' },
    }));
    setLiveElapsed(le => {
      const next = { ...le };
      delete next[id];
      return next;
    });
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      Object.values(autoCancelRefs.current).forEach(clearTimeout);
    };
  }, []);

  const setTimerNotes = useCallback((id: string, notes: string) => {
    setTimers(prev => ({
      ...prev,
      [id]: { ...prev[id], notes },
    }));
  }, []);

  // The "next" timer to nudge after the last stopped one
  const nudgeTimerId = lastStoppedId ? NEXT_TIMER[lastStoppedId] ?? null : null;

  return {
    timers,
    liveElapsed,
    startTimer,
    stopTimer,
    skipTimer,
    setManualTime,
    resetTimer,
    setTimerNotes,
    nudgeTimerId,
  };
}
