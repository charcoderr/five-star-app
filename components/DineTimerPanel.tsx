import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
} from 'react-native';
import { colours } from '../utils/theme';
import {
  DINE_TIMERS,
  TimerState,
  formatSeconds,
  parseMMSS,
} from '../utils/dineTimers';

const SCORE_COLOURS = [colours.scorePoor, colours.scoreFair, colours.scoreGood, colours.scoreExcellent];
const SCORE_LABELS  = ['Poor', 'Fair', 'Good', 'Excellent'];

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  timers: Record<string, TimerState>;
  liveElapsed: Record<string, number>;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onManual: (id: string, seconds: number) => void;
  onReset: (id: string) => void;
  onNotes: (id: string, text: string) => void;
}

// ─── Individual timer row ─────────────────────────────────────────────────────
function TimerRow({ def, state, liveSeconds, onStart, onStop, onManual, onReset, onNotes }: {
  def: typeof DINE_TIMERS[number];
  state: TimerState;
  liveSeconds?: number;
  onStart: () => void;
  onStop: () => void;
  onManual: (seconds: number) => void;
  onReset: () => void;
  onNotes: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');

  const isRunning  = state.status === 'running';
  const isStopped  = state.status === 'stopped' || state.status === 'manual';
  const isCancelled = state.status === 'cancelled';
  const isIdle     = state.status === 'idle';

  const displaySeconds = isRunning
    ? (liveSeconds ?? 0)
    : (state.elapsedSeconds ?? 0);

  function commitEdit() {
    const parsed = parseMMSS(editText);
    if (parsed !== null && parsed > 0) {
      onManual(parsed);
    }
    setEditing(false);
    setEditText('');
  }

  return (
    <View style={rowStyles.container}>
      {/* Label + target */}
      <View style={rowStyles.labelBlock}>
        <Text style={rowStyles.label}>{def.label}</Text>
        <Text style={rowStyles.target}>Target: {formatSeconds(def.targetSeconds)}</Text>
      </View>

      {/* Display + controls */}
      <View style={rowStyles.right}>
        {editing ? (
          <TextInput
            style={rowStyles.editInput}
            value={editText}
            onChangeText={setEditText}
            onBlur={commitEdit}
            onSubmitEditing={commitEdit}
            placeholder="m:ss"
            placeholderTextColor={colours.textMuted}
            keyboardType="numbers-and-punctuation"
            autoFocus
            returnKeyType="done"
          />
        ) : (
          <TouchableOpacity
            onPress={() => {
              if (isStopped || isCancelled) {
                setEditText(state.elapsedSeconds ? formatSeconds(state.elapsedSeconds) : '');
                setEditing(true);
              }
            }}
            disabled={isRunning || isIdle}
          >
            <Text style={[
              rowStyles.time,
              isRunning && rowStyles.timeRunning,
              isCancelled && rowStyles.timeCancelled,
            ]}>
              {isCancelled
                ? 'Cancelled'
                : isIdle
                  ? '--:--'
                  : formatSeconds(displaySeconds)
              }
            </Text>
          </TouchableOpacity>
        )}

        {(isStopped) && state.suggestedScore !== null && (
          <View style={[rowStyles.scoreBadge, { backgroundColor: SCORE_COLOURS[state.suggestedScore] + '22', borderColor: SCORE_COLOURS[state.suggestedScore] }]}>
            <Text style={[rowStyles.scoreText, { color: SCORE_COLOURS[state.suggestedScore] }]}>
              {SCORE_LABELS[state.suggestedScore]}
            </Text>
          </View>
        )}

        {isIdle && (
          <TouchableOpacity style={rowStyles.startBtn} onPress={onStart}>
            <Text style={rowStyles.startBtnText}>Start</Text>
          </TouchableOpacity>
        )}

        {isRunning && (
          <TouchableOpacity style={rowStyles.stopBtn} onPress={onStop}>
            <Text style={rowStyles.stopBtnText}>Stop</Text>
          </TouchableOpacity>
        )}

        {(isStopped || isCancelled) && (
          <TouchableOpacity style={rowStyles.resetBtn} onPress={onReset}>
            <Text style={rowStyles.resetBtnText}>↺</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Edit hint */}
      {isStopped && !editing && (
        <Text style={rowStyles.editHint}>Tap time to edit</Text>
      )}
      {isCancelled && !editing && (
        <Text style={rowStyles.editHint}>Tap 'Cancelled' to enter time manually</Text>
      )}

      {/* Notes field — visible when timer has been used */}
      {(isStopped || isCancelled) && (
        <TextInput
          style={rowStyles.notesInput}
          value={state.notes}
          onChangeText={onNotes}
          placeholder="Add a note..."
          placeholderTextColor={colours.textMuted}
          multiline
        />
      )}
    </View>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────
export default function DineTimerPanel({
  timers, liveElapsed,
  onStart, onStop, onManual, onReset, onNotes,
}: Props) {
  return (
    <View style={styles.panel}>
      <View style={styles.headerRow}>
        <Text style={styles.panelTitle}>In-Dine Timers</Text>
        <Text style={styles.panelSub}>Track service times as you dine</Text>
      </View>

      <View style={styles.timersContainer}>
        <Text style={styles.hint}>
          Start each timer when the event begins, stop when it happens.
          Timers auto-cancel if left running too long. You can edit any time after stopping.
        </Text>
        {DINE_TIMERS.map(def => (
          <TimerRow
            key={def.id}
            def={def}
            state={timers[def.id]}
            liveSeconds={liveElapsed[def.id]}
            onStart={() => onStart(def.id)}
            onStop={() => onStop(def.id)}
            onManual={secs => onManual(def.id, secs)}
            onReset={() => onReset(def.id)}
            onNotes={text => onNotes(def.id, text)}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  panel: {
    backgroundColor: colours.white,
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colours.charcoalDark,
  },
  panelTitle: { fontSize: 14, fontWeight: '700', color: colours.gold, textTransform: 'uppercase', letterSpacing: 0.8 },
  panelSub: { fontSize: 12, color: colours.charcoalLight, marginTop: 2 },
  timersContainer: { paddingBottom: 8 },
  hint: {
    fontSize: 12,
    color: colours.textMuted,
    lineHeight: 17,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
});

const rowStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
  },
  labelBlock: { marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: colours.textPrimary },
  target: { fontSize: 11, color: colours.textMuted, marginTop: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  time: { fontSize: 22, fontWeight: '700', color: colours.charcoalDark, minWidth: 70 },
  timeRunning: { color: colours.gold },
  timeCancelled: { fontSize: 14, color: colours.textMuted, fontWeight: '500' },
  editInput: {
    fontSize: 20,
    fontWeight: '700',
    color: colours.charcoalDark,
    borderBottomWidth: 2,
    borderBottomColor: colours.gold,
    minWidth: 70,
    paddingVertical: 2,
  },
  scoreBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  scoreText: { fontSize: 11, fontWeight: '700' },
  startBtn: {
    backgroundColor: colours.gold,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  startBtnText: { fontSize: 13, fontWeight: '700', color: colours.charcoalDark },
  stopBtn: {
    backgroundColor: colours.charcoalDark,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  stopBtnText: { fontSize: 13, fontWeight: '700', color: colours.white },
  resetBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: colours.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: { fontSize: 18, color: colours.textSecondary },
  editHint: { fontSize: 11, color: colours.textMuted, marginTop: 4 },
  notesInput: {
    marginTop: 8,
    padding: 10,
    backgroundColor: colours.offWhite,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colours.border,
    fontSize: 13,
    color: colours.textPrimary,
    minHeight: 36,
  },
});
