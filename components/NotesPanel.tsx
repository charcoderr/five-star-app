import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { colours } from '../utils/theme';
import { StatusPill } from './StatusPill';
import { NOTE_TYPE, getStatus } from '../utils/statusColors';

export interface NoteEntity {
  id: string;
  body: string;
  note_type: string;
  created_at: string;
  author?: { name?: string | null } | null;
}

interface Props {
  notes: NoteEntity[];
  typeOptions: { key: string; label: string }[];
  isLoading?: boolean;
  isAdding?: boolean;
  onAdd: (body: string, noteType: string) => Promise<void>;
  onDelete?: (noteId: string) => Promise<void>;
  title?: string;
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export function NotesPanel({
  notes,
  typeOptions,
  isLoading,
  isAdding,
  onAdd,
  onDelete,
  title = 'Notes',
}: Props) {
  const [body, setBody] = useState('');
  const [noteType, setNoteType] = useState(typeOptions[0]?.key ?? 'general');

  async function handleAdd() {
    const trimmed = body.trim();
    if (!trimmed) return;
    try {
      await onAdd(trimmed, noteType);
      setBody('');
    } catch {
      Alert.alert('Could not save note', 'Please try again.');
    }
  }

  function handleDelete(noteId: string) {
    if (!onDelete) return;
    Alert.alert('Delete note?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(noteId) },
    ]);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={body}
          onChangeText={setBody}
          placeholder="Add a note..."
          placeholderTextColor={colours.textMuted}
          multiline
        />
        <View style={styles.composerFooter}>
          <View style={styles.chipRow}>
            {typeOptions.map(opt => {
              const active = noteType === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setNoteType(opt.key)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.addBtn, (!body.trim() || isAdding) && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!body.trim() || isAdding}
          >
            {isAdding ? <ActivityIndicator size="small" color={colours.charcoalDark} />
              : <Text style={styles.addBtnText}>Add</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colours.gold} style={styles.loader} />
      ) : notes.length === 0 ? (
        <Text style={styles.emptyText}>No notes yet.</Text>
      ) : (
        <View style={styles.list}>
          {notes.map(note => (
            <View key={note.id} style={styles.note}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteMeta}>
                  {note.author?.name ?? 'Unknown'} · {formatDate(note.created_at)}
                </Text>
                <StatusPill status={getStatus(NOTE_TYPE, note.note_type)} size="sm" />
              </View>
              <Text style={styles.noteBody}>{note.body}</Text>
              {onDelete ? (
                <TouchableOpacity onPress={() => handleDelete(note.id)} style={styles.deleteBtn}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colours.white, borderRadius: 14, padding: 16, gap: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  title: { fontSize: 13, fontWeight: '700', color: colours.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  composer: { gap: 10 },
  input: { backgroundColor: colours.offWhite, borderWidth: 1, borderColor: colours.border, borderRadius: 10, padding: 12, fontSize: 14, color: colours.textPrimary, minHeight: 70, textAlignVertical: 'top' },
  composerFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  chipRow: { flexDirection: 'row', gap: 6, flex: 1, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: colours.border, backgroundColor: colours.offWhite },
  chipActive: { borderColor: colours.gold, backgroundColor: colours.gold },
  chipText: { fontSize: 11, fontWeight: '600', color: colours.textSecondary },
  chipTextActive: { color: colours.charcoalDark },
  addBtn: { backgroundColor: colours.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, minWidth: 60, alignItems: 'center' },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: colours.charcoalDark },
  loader: { marginVertical: 20 },
  emptyText: { fontSize: 13, color: colours.textMuted, fontStyle: 'italic', textAlign: 'center', paddingVertical: 14 },
  list: { gap: 10 },
  note: { backgroundColor: colours.offWhite, borderRadius: 10, padding: 12, gap: 6 },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  noteMeta: { fontSize: 11, color: colours.textMuted, fontWeight: '600', flex: 1 },
  noteBody: { fontSize: 14, color: colours.textPrimary, lineHeight: 20 },
  deleteBtn: { alignSelf: 'flex-end' },
  deleteText: { fontSize: 11, color: colours.error, fontWeight: '600' },
});
