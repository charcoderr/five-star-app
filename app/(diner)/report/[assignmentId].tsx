import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colours, SCORE_LABELS } from '../../../utils/theme';
import { useProforma, useReport, useSaveDraft, useSubmitReport, useUploadPhoto, useReportPhotos } from '../../../hooks/useProforma';
import { useAuthStore } from '../../../stores/authStore';
import { ProformaQuestion, ReportAnswer } from '../../../types';
import { PROFORMA_CATEGORIES } from '../../../utils/defaultProforma';
import { useDineTimers } from '../../../hooks/useDineTimers';
import DineTimerPanel from '../../../components/DineTimerPanel';

// ─── Score Picker ────────────────────────────────────────────────────────────
function ScorePicker({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  return (
    <View style={scoreStyles.row}>
      {SCORE_LABELS.map((label, index) => (
        <TouchableOpacity
          key={label}
          style={[scoreStyles.btn, value === index && scoreStyles.btnActive]}
          onPress={() => onChange(index)}
        >
          <Text style={[scoreStyles.btnText, value === index && scoreStyles.btnTextActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const scoreStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 6 },
  btn: { flex: 1, minWidth: 60, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: colours.border, alignItems: 'center', backgroundColor: colours.white },
  btnActive: { borderColor: colours.gold, backgroundColor: colours.gold },
  btnText: { fontSize: 11, fontWeight: '700', color: colours.textMuted },
  btnTextActive: { color: colours.charcoalDark },
});

// ─── Yes/No Picker ───────────────────────────────────────────────────────────
function YesNoPicker({ value, onChange }: { value?: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
      {[true, false].map(v => (
        <TouchableOpacity
          key={String(v)}
          style={[scoreStyles.btn, value === v && scoreStyles.btnActive]}
          onPress={() => onChange(v)}
        >
          <Text style={[scoreStyles.btnText, value === v && scoreStyles.btnTextActive]}>
            {v ? 'Yes' : 'No'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Section total ────────────────────────────────────────────────────────────
function sectionScore(questions: ProformaQuestion[], answers: Record<string, ReportAnswer>) {
  let total = 0;
  let max = 0;
  questions.filter(q => q.type === 'scored').forEach(q => {
    const a = answers[q.id];
    if (a?.score !== undefined) total += a.score;
    max += 3;
  });
  return { total, max };
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function ReportScreen() {
  const { assignmentId, restaurantId, restaurantName } = useLocalSearchParams<{
    assignmentId: string;
    restaurantId: string;
    restaurantName: string;
  }>();

  const { user } = useAuthStore();
  const { data: proforma, isLoading: proformaLoading } = useProforma(restaurantId);
  const { data: report, isLoading: reportLoading } = useReport(assignmentId, user?.id ?? '', restaurantId);
  const { data: photos } = useReportPhotos(report?.id ?? '');

  const saveDraft = useSaveDraft();
  const submitReport = useSubmitReport();
  const uploadPhoto = useUploadPhoto();

  const [answers, setAnswers] = useState<Record<string, ReportAnswer>>({});
  const [localPhotos, setLocalPhotos] = useState<string[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dineTimers = useDineTimers();

  // Merge remote answers into local on first load
  const answersRef = useRef(false);
  if (report && !answersRef.current) {
    setAnswers(report.answers ?? {});
    answersRef.current = true;
  }

  function updateAnswer(questionId: string, partial: Partial<ReportAnswer>) {
    const updated = { ...answers, [questionId]: { ...answers[questionId], ...partial } };
    setAnswers(updated);
    // Auto-save after 2s of inactivity
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (report) saveDraft.mutate({ reportId: report.id, answers: updated });
    }, 2000);
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setLocalPhotos(prev => [...prev, uri]);
      if (report) {
        try {
          await uploadPhoto.mutateAsync({ reportId: report.id, uri });
        } catch {
          Alert.alert('Upload failed', 'Could not upload this photo. It has been saved locally for now.');
        }
      }
    }
  }

  async function handleSubmit() {
    if (!report || !proforma) return;

    // Check required questions
    const unanswered = proforma.questions.filter(q => {
      if (!q.required) return false;
      const a = answers[q.id];
      if (q.type === 'scored') return a?.score === undefined;
      if (q.type === 'yes_no') return a?.value === undefined;
      if (q.type === 'free_text') return !a?.text?.trim();
      return false;
    });

    if (unanswered.length > 0) {
      Alert.alert(
        'Incomplete report',
        `Please answer all required questions. ${unanswered.length} question${unanswered.length > 1 ? 's' : ''} still need${unanswered.length === 1 ? 's' : ''} an answer.`
      );
      return;
    }

    Alert.alert(
      'Submit Report',
      'Once submitted, you cannot make changes. Are you ready?',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            await saveDraft.mutateAsync({ reportId: report.id, answers });
            await submitReport.mutateAsync(report.id);
            Alert.alert('Report submitted!', 'Thank you. Wendy will review your report shortly.', [
              { text: 'Done', onPress: () => router.back() },
            ]);
          },
        },
      ]
    );
  }

  if (proformaLoading || reportLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colours.gold} size="large" />
        <Text style={styles.loadingText}>Loading your checklist...</Text>
      </View>
    );
  }

  if (!proforma || !report) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load checklist. Please try again.</Text>
      </View>
    );
  }

  const questionsByCategory = PROFORMA_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = proforma.questions.filter(q => q.category === cat).sort((a, b) => a.order - b.order);
    return acc;
  }, {} as Record<string, ProformaQuestion[]>);

  const allPhotos = [...localPhotos, ...(photos?.map((p: any) => p.url).filter(Boolean) ?? [])];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{restaurantName}</Text>
          <Text style={styles.headerSub}>Customer Experience Report</Text>
        </View>
        {saveDraft.isPending && <Text style={styles.saving}>Saving…</Text>}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* ── In-dine timers (optional) ──────────────────────────────────── */}
        <DineTimerPanel
          enabled={dineTimers.enabled}
          onToggleEnabled={dineTimers.setEnabled}
          timers={dineTimers.timers}
          liveElapsed={dineTimers.liveElapsed}
          onStart={dineTimers.startTimer}
          onStop={dineTimers.stopTimer}
          onManual={dineTimers.setManualTime}
          onReset={dineTimers.resetTimer}
        />

        {PROFORMA_CATEGORIES.map(category => {
          const questions = questionsByCategory[category];
          if (!questions || questions.length === 0) return null;

          const { total, max } = sectionScore(questions, answers);
          const isConclusion = category === 'Conclusion';

          return (
            <View key={category} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{category}</Text>
                {!isConclusion && max > 0 && (
                  <Text style={styles.sectionScore}>{total} / {max}</Text>
                )}
              </View>

              {questions.map(q => (
                <View key={q.id} style={styles.question}>
                  <Text style={styles.questionLabel}>
                    {q.label}
                    {q.required && <Text style={styles.required}> *</Text>}
                  </Text>

                  {q.type === 'scored' && (
                    <>
                      <ScorePicker
                        value={answers[q.id]?.score}
                        onChange={score => updateAnswer(q.id, { score })}
                      />
                      <TextInput
                        style={styles.notesInput}
                        placeholder="Notes (optional)"
                        value={answers[q.id]?.notes ?? ''}
                        onChangeText={notes => updateAnswer(q.id, { notes })}
                        placeholderTextColor={colours.textMuted}
                        multiline
                      />
                    </>
                  )}

                  {q.type === 'yes_no' && (
                    <YesNoPicker
                      value={answers[q.id]?.value}
                      onChange={value => updateAnswer(q.id, { value })}
                    />
                  )}

                  {q.type === 'free_text' && (
                    <TextInput
                      style={[styles.notesInput, styles.freeText]}
                      placeholder="Write your response..."
                      value={answers[q.id]?.text ?? ''}
                      onChangeText={text => updateAnswer(q.id, { text })}
                      placeholderTextColor={colours.textMuted}
                      multiline
                      numberOfLines={4}
                    />
                  )}
                </View>
              ))}

              {/* Photo upload in Conclusion */}
              {isConclusion && (
                <View style={styles.photoSection}>
                  <Text style={styles.photoTitle}>Photos</Text>
                  <Text style={styles.photoSub}>Upload photos as evidence of your visit (receipts, food, venue).</Text>
                  <View style={styles.photoGrid}>
                    {allPhotos.map((uri, i) => (
                      <Image key={i} source={{ uri }} style={styles.photoThumb} />
                    ))}
                    <TouchableOpacity style={styles.addPhotoBtn} onPress={pickPhoto} disabled={uploadPhoto.isPending}>
                      {uploadPhoto.isPending ? (
                        <ActivityIndicator color={colours.gold} size="small" />
                      ) : (
                        <Text style={styles.addPhotoIcon}>+</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {/* Submit */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={submitReport.isPending}
        >
          {submitReport.isPending ? (
            <ActivityIndicator color={colours.charcoalDark} />
          ) : (
            <Text style={styles.submitBtnText}>Submit Report</Text>
          )}
        </TouchableOpacity>
        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colours.offWhite, gap: 12 },
  loadingText: { fontSize: 15, color: colours.textSecondary },
  errorText: { fontSize: 15, color: colours.error },
  header: { paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20, backgroundColor: colours.charcoalDark, flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  backBtn: { paddingBottom: 2 },
  backText: { color: colours.gold, fontSize: 15, fontWeight: '600' },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colours.white },
  headerSub: { fontSize: 12, color: colours.charcoalLight, marginTop: 1 },
  saving: { fontSize: 12, color: colours.charcoalLight, fontStyle: 'italic' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  section: { backgroundColor: colours.white, borderRadius: 14, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colours.charcoalDark, paddingHorizontal: 16, paddingVertical: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colours.gold, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionScore: { fontSize: 13, fontWeight: '700', color: colours.white },
  question: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colours.border },
  questionLabel: { fontSize: 14, color: colours.textPrimary, lineHeight: 20, fontWeight: '500' },
  required: { color: colours.error },
  notesInput: { marginTop: 8, backgroundColor: colours.offWhite, borderRadius: 8, borderWidth: 1, borderColor: colours.border, padding: 10, fontSize: 13, color: colours.textPrimary, minHeight: 38 },
  freeText: { minHeight: 90, textAlignVertical: 'top' },
  photoSection: { padding: 16, borderTopWidth: 1, borderTopColor: colours.border },
  photoTitle: { fontSize: 14, fontWeight: '700', color: colours.textPrimary, marginBottom: 4 },
  photoSub: { fontSize: 13, color: colours.textSecondary, marginBottom: 12 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoThumb: { width: 80, height: 80, borderRadius: 8, backgroundColor: colours.border },
  addPhotoBtn: { width: 80, height: 80, borderRadius: 8, borderWidth: 2, borderColor: colours.gold, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addPhotoIcon: { fontSize: 28, color: colours.gold, fontWeight: '300' },
  submitBtn: { backgroundColor: colours.gold, borderRadius: 12, padding: 17, alignItems: 'center', marginTop: 8 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: colours.charcoalDark },
  bottomPad: { height: 40 },
});
