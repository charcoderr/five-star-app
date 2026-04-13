import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { colours } from '../../utils/theme';
import { useProforma, useSaveProforma } from '../../hooks/useProforma';
import { useAuthStore } from '../../stores/authStore';
import { ProformaQuestion, QuestionType } from '../../types';
import { DEFAULT_PROFORMA_QUESTIONS, PROFORMA_CATEGORIES, LOCKED_CATEGORIES } from '../../utils/defaultProforma';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const TYPE_LABELS: Record<QuestionType, string> = {
  scored:    '0–3 Score',
  yes_no:    'Yes / No',
  free_text: 'Free Text',
};

const PRESET_CATEGORIES = [...PROFORMA_CATEGORIES];

function isLocked(q: ProformaQuestion): boolean {
  return !!q.locked || (LOCKED_CATEGORIES as readonly string[]).includes(q.category);
}

export default function RestaurantProforma() {
  const { user } = useAuthStore();
  const restaurantId = (user as any)?.restaurant_id ?? '';
  const { data: proforma, isLoading } = useProforma(restaurantId);
  const saveProforma = useSaveProforma();

  const [questions, setQuestions] = useState<ProformaQuestion[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showAiInfo, setShowAiInfo] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(false);

  // Add question form state
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<QuestionType>('scored');
  const [newCategory, setNewCategory] = useState<string>('Service');
  const [newCustomCategory, setNewCustomCategory] = useState('');
  const [newRequired, setNewRequired] = useState(true);
  const [newPhotoPrompt, setNewPhotoPrompt] = useState(false);
  const [usingCustomCategory, setUsingCustomCategory] = useState(false);

  // Seed default template when proforma has no questions
  useEffect(() => {
    if (proforma && proforma.questions.length === 0 && questions === null) {
      const defaults = DEFAULT_PROFORMA_QUESTIONS.map((q, i) => ({
        ...q,
        id: uuidv4(),
        order: i + 1,
      })) as ProformaQuestion[];
      setQuestions(defaults);
      setIsFirstLoad(true);
    }
  }, [proforma]);

  const activeQuestions = questions ?? proforma?.questions ?? [];

  // Group by category — locked categories always last
  const categoryOrder = [
    ...PRESET_CATEGORIES.filter(c => !(LOCKED_CATEGORIES as readonly string[]).includes(c)),
    // any custom categories
    ...Array.from(new Set(activeQuestions.map(q => q.category)))
      .filter(c => !PRESET_CATEGORIES.includes(c as any)),
    // locked last
    ...LOCKED_CATEGORIES,
  ];
  const byCategory = categoryOrder.reduce((acc, cat) => {
    const qs = activeQuestions.filter(q => q.category === cat);
    if (qs.length > 0) acc[cat] = qs;
    return acc;
  }, {} as Record<string, ProformaQuestion[]>);

  function togglePhotoPrompt(id: string) {
    setQuestions(activeQuestions.map(q =>
      q.id === id ? { ...q, photoPrompt: !q.photoPrompt } : q
    ));
  }

  function removeQuestion(id: string) {
    const q = activeQuestions.find(q => q.id === id);
    if (!q || isLocked(q)) return;
    Alert.alert('Remove question?', 'This will remove it from your checklist.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setQuestions(activeQuestions.filter(q => q.id !== id)) },
    ]);
  }

  function addQuestion() {
    if (!newLabel.trim()) { Alert.alert('Please enter a question'); return; }
    const category = usingCustomCategory ? newCustomCategory.trim() || 'Custom' : newCategory;
    const q: ProformaQuestion = {
      id: uuidv4(),
      label: newLabel.trim(),
      type: newType,
      category,
      required: newRequired,
      photoPrompt: newPhotoPrompt,
      order: activeQuestions.length + 1,
    };
    // Insert before locked questions
    const lockedStart = activeQuestions.findIndex(q => isLocked(q));
    const insertion = lockedStart === -1
      ? [...activeQuestions, q]
      : [...activeQuestions.slice(0, lockedStart), q, ...activeQuestions.slice(lockedStart)];
    setQuestions(insertion);
    setNewLabel(''); setNewPhotoPrompt(false); setNewRequired(true); setUsingCustomCategory(false); setNewCustomCategory('');
    setShowAdd(false);
  }

  function handleResetToDefault() {
    Alert.alert(
      'Reset to suggested layout?',
      'This will replace all your current questions with the default template. You can still edit after.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            const defaults = DEFAULT_PROFORMA_QUESTIONS.map((q, i) => ({
              ...q, id: uuidv4(), order: i + 1,
            })) as ProformaQuestion[];
            setQuestions(defaults);
          },
        },
      ]
    );
  }

  async function handleSave() {
    if (!proforma) return;
    try {
      await saveProforma.mutateAsync({ ...proforma, questions: activeQuestions });
      setQuestions(null);
      setIsFirstLoad(false);
      Alert.alert('Saved!', 'Your checklist has been updated.');
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
    }
  }

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator color={colours.gold} size="large" /></View>;
  }

  const hasChanges = questions !== null;
  const photoCount = activeQuestions.filter(q => q.photoPrompt).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Edit Checklist</Text>
          <Text style={styles.headerSub}>
            {activeQuestions.filter(q => !isLocked(q)).length} custom · {activeQuestions.filter(q => isLocked(q)).length} fixed
            {photoCount > 0 ? ` · 📷 ${photoCount}` : ''}
          </Text>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.aiBtn} onPress={() => setShowAiInfo(true)}>
            <Text style={styles.aiBtnText}>✨ AI</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
          {hasChanges && (
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saveProforma.isPending}>
              {saveProforma.isPending
                ? <ActivityIndicator color={colours.charcoalDark} size="small" />
                : <Text style={styles.saveBtnText}>Save</Text>}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* First-load banner */}
      {isFirstLoad && (
        <View style={styles.suggestionBanner}>
          <Text style={styles.suggestionTitle}>We've suggested a layout for you</Text>
          <Text style={styles.suggestionBody}>Based on industry standards — edit, remove or add questions to make it yours. Tap 📷 on any question to prompt the diner for a photo.</Text>
        </View>
      )}

      <FlatList
        data={Object.entries(byCategory)}
        keyExtractor={([cat]) => cat}
        contentContainerStyle={styles.list}
        ListFooterComponent={
          <TouchableOpacity style={styles.resetBtn} onPress={handleResetToDefault}>
            <Text style={styles.resetBtnText}>Reset to suggested layout</Text>
          </TouchableOpacity>
        }
        renderItem={({ item: [category, qs] }) => {
          const locked = (LOCKED_CATEGORIES as readonly string[]).includes(category);
          return (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{category.toUpperCase()}</Text>
                {locked && (
                  <View style={styles.lockedBadge}>
                    <Text style={styles.lockedBadgeText}>🔒 Always included</Text>
                  </View>
                )}
              </View>
              {qs.map(q => {
                const qLocked = isLocked(q);
                return (
                  <View key={q.id} style={styles.questionRow}>
                    <View style={styles.questionInfo}>
                      <Text style={styles.questionLabel}>{q.label}</Text>
                      <View style={styles.badges}>
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{TYPE_LABELS[q.type]}</Text>
                        </View>
                        {q.required && !qLocked && (
                          <View style={[styles.badge, styles.requiredBadge]}>
                            <Text style={[styles.badgeText, styles.requiredBadgeText]}>Required</Text>
                          </View>
                        )}
                        {q.photoPrompt && (
                          <View style={[styles.badge, styles.photoBadge]}>
                            <Text style={[styles.badgeText, styles.photoBadgeText]}>📷 Photo</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.questionActions}>
                      {!qLocked && (
                        <TouchableOpacity
                          style={[styles.photoToggle, q.photoPrompt && styles.photoToggleActive]}
                          onPress={() => togglePhotoPrompt(q.id)}
                        >
                          <Text style={styles.photoToggleText}>📷</Text>
                        </TouchableOpacity>
                      )}
                      {qLocked ? (
                        <View style={styles.lockIcon}><Text style={styles.lockIconText}>🔒</Text></View>
                      ) : (
                        <TouchableOpacity onPress={() => removeQuestion(q.id)} style={styles.removeBtn}>
                          <Text style={styles.removeBtnText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          );
        }}
      />

      {/* Add Question Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={overlayStyles.overlay}>
          <ScrollView contentContainerStyle={overlayStyles.sheet}>
            <Text style={overlayStyles.title}>New Question</Text>

            <Text style={overlayStyles.label}>Question *</Text>
            <TextInput
              style={overlayStyles.input}
              placeholder="e.g. Were the menus clean and undamaged?"
              value={newLabel}
              onChangeText={setNewLabel}
              placeholderTextColor={colours.textMuted}
              multiline
            />

            <Text style={overlayStyles.label}>Section</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {PRESET_CATEGORIES.filter(c => !(LOCKED_CATEGORIES as readonly string[]).includes(c)).map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[overlayStyles.chip, !usingCustomCategory && newCategory === cat && overlayStyles.chipActive]}
                    onPress={() => { setNewCategory(cat); setUsingCustomCategory(false); }}
                  >
                    <Text style={[overlayStyles.chipText, !usingCustomCategory && newCategory === cat && overlayStyles.chipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[overlayStyles.chip, usingCustomCategory && overlayStyles.chipActive]}
                  onPress={() => setUsingCustomCategory(true)}
                >
                  <Text style={[overlayStyles.chipText, usingCustomCategory && overlayStyles.chipTextActive]}>+ Custom</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            {usingCustomCategory && (
              <TextInput
                style={[overlayStyles.input, { marginTop: 8 }]}
                placeholder="Section name (e.g. Bar Area)"
                value={newCustomCategory}
                onChangeText={setNewCustomCategory}
                placeholderTextColor={colours.textMuted}
              />
            )}

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

            <TouchableOpacity style={overlayStyles.toggleRow} onPress={() => setNewRequired(!newRequired)}>
              <View style={[overlayStyles.checkbox, newRequired && overlayStyles.checkboxActive]}>
                {newRequired && <Text style={overlayStyles.checkMark}>✓</Text>}
              </View>
              <Text style={overlayStyles.toggleLabel}>Required question</Text>
            </TouchableOpacity>

            <TouchableOpacity style={overlayStyles.toggleRow} onPress={() => setNewPhotoPrompt(!newPhotoPrompt)}>
              <View style={[overlayStyles.checkbox, newPhotoPrompt && overlayStyles.checkboxActive]}>
                {newPhotoPrompt && <Text style={overlayStyles.checkMark}>✓</Text>}
              </View>
              <View>
                <Text style={overlayStyles.toggleLabel}>📷 Prompt diner for a photo</Text>
                <Text style={overlayStyles.toggleSub}>Diner sees an optional "Add photo" button under this question</Text>
              </View>
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

      {/* AI Suggestions Info Modal */}
      <Modal visible={showAiInfo} animationType="fade" transparent>
        <View style={aiModalStyles.overlay}>
          <View style={aiModalStyles.card}>
            <Text style={aiModalStyles.emoji}>✨</Text>
            <Text style={aiModalStyles.title}>AI Checklist Assistant</Text>
            <Text style={aiModalStyles.body}>
              This feature will let you describe what matters most to your venue — cocktails, service pace, ambience — and get tailored question suggestions from Claude AI.
            </Text>
            <Text style={aiModalStyles.body}>
              Scott is building the Edge Function backend for this. It will be available in the next update.
            </Text>
            <TouchableOpacity style={aiModalStyles.btn} onPress={() => setShowAiInfo(false)}>
              <Text style={aiModalStyles.btnText}>Got it</Text>
            </TouchableOpacity>
          </View>
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
  aiBtn: { backgroundColor: colours.charcoalDark, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  aiBtnText: { fontSize: 13, fontWeight: '700', color: colours.gold },
  addBtn: { backgroundColor: colours.offWhite, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colours.border },
  addBtnText: { fontSize: 14, fontWeight: '700', color: colours.textPrimary },
  saveBtn: { backgroundColor: colours.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: colours.charcoalDark },
  suggestionBanner: { margin: 16, backgroundColor: colours.gold + '14', borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: colours.gold },
  suggestionTitle: { fontSize: 14, fontWeight: '700', color: colours.goldDark, marginBottom: 4 },
  suggestionBody: { fontSize: 13, color: colours.goldDark, lineHeight: 18 },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  section: { backgroundColor: colours.white, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colours.charcoalDark, paddingHorizontal: 16, paddingVertical: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colours.gold, letterSpacing: 0.8 },
  lockedBadge: { backgroundColor: colours.gold + '22', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  lockedBadgeText: { fontSize: 10, color: colours.gold, fontWeight: '600' },
  questionRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colours.border },
  questionInfo: { flex: 1, paddingRight: 8 },
  questionLabel: { fontSize: 13, color: colours.textPrimary, lineHeight: 18 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  badge: { backgroundColor: colours.offWhite, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colours.border },
  badgeText: { fontSize: 11, color: colours.textSecondary, fontWeight: '600' },
  requiredBadge: { borderColor: colours.gold, backgroundColor: colours.gold + '22' },
  requiredBadgeText: { color: colours.goldDark },
  photoBadge: { borderColor: colours.charcoal, backgroundColor: colours.charcoal + '18' },
  photoBadgeText: { color: colours.charcoal },
  questionActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  photoToggle: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: colours.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colours.offWhite },
  photoToggleActive: { borderColor: colours.gold, backgroundColor: colours.gold + '22' },
  photoToggleText: { fontSize: 15 },
  lockIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  lockIconText: { fontSize: 14 },
  removeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { fontSize: 16, color: colours.error },
  resetBtn: { alignItems: 'center', paddingVertical: 16 },
  resetBtnText: { fontSize: 13, color: colours.textMuted, textDecorationLine: 'underline' },
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
  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  checkbox: { width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, borderColor: colours.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colours.white, marginTop: 1 },
  checkboxActive: { backgroundColor: colours.gold, borderColor: colours.gold },
  checkMark: { fontSize: 13, color: colours.charcoalDark, fontWeight: '700' },
  toggleLabel: { fontSize: 14, color: colours.textPrimary, fontWeight: '600' },
  toggleSub: { fontSize: 12, color: colours.textMuted, marginTop: 2, lineHeight: 16 },
  createBtn: { backgroundColor: colours.gold, borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 8 },
  createBtnText: { fontSize: 15, fontWeight: '700', color: colours.charcoalDark },
  cancelBtn: { alignItems: 'center', padding: 14 },
  cancelText: { fontSize: 14, color: colours.textMuted },
});

const aiModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  card: { backgroundColor: colours.white, borderRadius: 20, padding: 28, alignItems: 'center', width: '100%' },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: colours.textPrimary, marginBottom: 12, textAlign: 'center' },
  body: { fontSize: 14, color: colours.textSecondary, lineHeight: 21, textAlign: 'center', marginBottom: 12 },
  btn: { backgroundColor: colours.gold, borderRadius: 10, paddingHorizontal: 32, paddingVertical: 12, marginTop: 8 },
  btnText: { fontSize: 15, fontWeight: '700', color: colours.charcoalDark },
});
