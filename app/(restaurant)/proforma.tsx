import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { colours } from '../../utils/theme';
import { useProforma, useSaveProforma } from '../../hooks/useProforma';
import { useAuthStore } from '../../stores/authStore';
import { ProformaQuestion, QuestionType, QuestionCategory } from '../../types';
import { PROFORMA_CATEGORIES } from '../../utils/defaultProforma';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const TYPE_LABELS: Record<QuestionType, string> = {
  scored: '0–3 Score',
  yes_no: 'Yes / No',
  free_text: 'Free Text',
};

export default function RestaurantProforma() {
  const { user } = useAuthStore();
  const restaurantId = (user as any)?.restaurant_id ?? '';
  const { data: proforma, isLoading } = useProforma(restaurantId);
  const saveProforma = useSaveProforma();

  const [questions, setQuestions] = useState<ProformaQuestion[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<QuestionType>('scored');
  const [newCategory, setNewCategory] = useState<QuestionCategory>('Internal');
  const [newRequired, setNewRequired] = useState(true);

  // Use remote questions until user edits
  const activeQuestions = questions ?? proforma?.questions ?? [];

  function addQuestion() {
    if (!newLabel.trim()) {
      Alert.alert('Please enter a question label');
      return;
    }
    const q: ProformaQuestion = {
      id: uuidv4(),
      label: newLabel.trim(),
      type: newType,
      category: newCategory,
      required: newRequired,
      order: activeQuestions.length + 1,
    };
    setQuestions([...activeQuestions, q]);
    setNewLabel('');
    setShowAdd(false);
  }

  function removeQuestion(id: string) {
    Alert.alert('Remove question?', 'This will remove it from your checklist.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setQuestions(activeQuestions.filter(q => q.id !== id)) },
    ]);
  }

  async function handleSave() {
    if (!proforma) return;
    try {
      await saveProforma.mutateAsync({
        ...proforma,
        questions: activeQuestions,
      });
      setQuestions(null); // Reset local edits (will re-fetch from server)
      Alert.alert('Saved!', 'Your checklist has been updated.');
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colours.gold} size="large" />
      </View>
    );
  }

  const byCategory = PROFORMA_CATEGORIES.reduce((acc, cat) => {
    const qs = activeQuestions.filter(q => q.category === cat);
    if (qs.length > 0) acc[cat] = qs;
    return acc;
  }, {} as Record<string, ProformaQuestion[]>);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Edit Checklist</Text>
          <Text style={styles.headerSub}>{activeQuestions.length} questions · v{proforma?.version ?? 1}</Text>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
          {questions && (
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saveProforma.isPending}>
              {saveProforma.isPending
                ? <ActivityIndicator color={colours.charcoalDark} size="small" />
                : <Text style={styles.saveBtnText}>Save</Text>}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={Object.entries(byCategory)}
        keyExtractor={([cat]) => cat}
        contentContainerStyle={styles.list}
        renderItem={({ item: [category, qs] }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{category}</Text>
            {qs.map(q => (
              <View key={q.id} style={styles.questionRow}>
                <View style={styles.questionInfo}>
                  <Text style={styles.questionLabel}>{q.label}</Text>
                  <View style={styles.badges}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{TYPE_LABELS[q.type]}</Text>
                    </View>
                    {q.required && (
                      <View style={[styles.badge, styles.requiredBadge]}>
                        <Text style={[styles.badgeText, styles.requiredBadgeText]}>Required</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={() => removeQuestion(q.id)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      />

      {/* Add Question Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={overlayStyles.overlay}>
          <ScrollView contentContainerStyle={overlayStyles.sheet}>
            <Text style={overlayStyles.title}>New Question</Text>

            <Text style={overlayStyles.label}>Question *</Text>
            <TextInput
              style={overlayStyles.input}
              placeholder="e.g. Were the menus clean?"
              value={newLabel}
              onChangeText={setNewLabel}
              placeholderTextColor={colours.textMuted}
              multiline
            />

            <Text style={overlayStyles.label}>Category</Text>
            <View style={overlayStyles.chipRow}>
              {PROFORMA_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[overlayStyles.chip, newCategory === cat && overlayStyles.chipActive]}
                  onPress={() => setNewCategory(cat)}
                >
                  <Text style={[overlayStyles.chipText, newCategory === cat && overlayStyles.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={overlayStyles.label}>Answer Type</Text>
            <View style={overlayStyles.chipRow}>
              {(Object.keys(TYPE_LABELS) as QuestionType[]).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[overlayStyles.chip, newType === type && overlayStyles.chipActive]}
                  onPress={() => setNewType(type)}
                >
                  <Text style={[overlayStyles.chipText, newType === type && overlayStyles.chipTextActive]}>{TYPE_LABELS[type]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={overlayStyles.requiredRow}
              onPress={() => setNewRequired(!newRequired)}
            >
              <View style={[overlayStyles.checkbox, newRequired && overlayStyles.checkboxActive]}>
                {newRequired && <Text style={overlayStyles.checkMark}>✓</Text>}
              </View>
              <Text style={overlayStyles.requiredLabel}>Required question</Text>
            </TouchableOpacity>

            <TouchableOpacity style={overlayStyles.createBtn} onPress={addQuestion}>
              <Text style={overlayStyles.createBtnText}>Add Question</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAdd(false)} style={overlayStyles.cancelBtn}>
              <Text style={overlayStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: colours.white, borderBottomWidth: 1, borderBottomColor: colours.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colours.textPrimary },
  headerSub: { fontSize: 13, color: colours.textSecondary, marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: 8 },
  addBtn: { backgroundColor: colours.offWhite, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colours.border },
  addBtnText: { fontSize: 14, fontWeight: '700', color: colours.textPrimary },
  saveBtn: { backgroundColor: colours.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: colours.charcoalDark },
  list: { padding: 16, gap: 12 },
  section: { backgroundColor: colours.white, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colours.gold, textTransform: 'uppercase', letterSpacing: 0.8, backgroundColor: colours.charcoalDark, paddingHorizontal: 16, paddingVertical: 8 },
  questionRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colours.border },
  questionInfo: { flex: 1 },
  questionLabel: { fontSize: 13, color: colours.textPrimary, lineHeight: 18 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 6 },
  badge: { backgroundColor: colours.offWhite, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colours.border },
  badgeText: { fontSize: 11, color: colours.textSecondary, fontWeight: '600' },
  requiredBadge: { borderColor: colours.gold, backgroundColor: colours.gold + '22' },
  requiredBadgeText: { color: colours.goldDark },
  removeBtn: { padding: 8 },
  removeBtnText: { fontSize: 16, color: colours.error },
});

const overlayStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colours.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 28, paddingBottom: 48 },
  title: { fontSize: 20, fontWeight: '700', color: colours.textPrimary, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: colours.textSecondary, marginBottom: 6 },
  input: { backgroundColor: colours.offWhite, borderWidth: 1, borderColor: colours.border, borderRadius: 10, padding: 13, fontSize: 15, color: colours.textPrimary, marginBottom: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: colours.border, backgroundColor: colours.offWhite },
  chipActive: { borderColor: colours.gold, backgroundColor: colours.gold },
  chipText: { fontSize: 12, fontWeight: '600', color: colours.textSecondary },
  chipTextActive: { color: colours.charcoalDark },
  requiredRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  checkbox: { width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, borderColor: colours.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colours.white },
  checkboxActive: { backgroundColor: colours.gold, borderColor: colours.gold },
  checkMark: { fontSize: 13, color: colours.charcoalDark, fontWeight: '700' },
  requiredLabel: { fontSize: 14, color: colours.textPrimary },
  createBtn: { backgroundColor: colours.gold, borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 8 },
  createBtnText: { fontSize: 15, fontWeight: '700', color: colours.charcoalDark },
  cancelBtn: { alignItems: 'center', padding: 14 },
  cancelText: { fontSize: 14, color: colours.textMuted },
});
