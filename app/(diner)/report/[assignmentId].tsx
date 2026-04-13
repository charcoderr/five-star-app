import { useState, useRef } from 'react';
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
import { supabase } from '../../../lib/supabase';

// ─── Score Picker ─────────────────────────────────────────────────────────────
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

// ─── Yes/No Picker ────────────────────────────────────────────────────────────
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

// ─── Per-question photo row ───────────────────────────────────────────────────
function QuestionPhoto({
  photoUrl,
  uploading,
  onPick,
  prominent,
}: {
  photoUrl?: string;
  uploading: boolean;
  onPick: () => void;
  prominent: boolean; // true = photoPrompt (always visible), false = subtle
}) {
  if (prominent) {
    return (
      <View style={photoStyles.prominentWrap}>
        {photoUrl ? (
          <View style={photoStyles.row}>
            <Image source={{ uri: photoUrl }} style={photoStyles.thumb} />
            <TouchableOpacity style={photoStyles.replaceBtn} onPress={onPick} disabled={uploading}>
              {uploading
                ? <ActivityIndicator color={colours.gold} size="small" />
                : <Text style={photoStyles.replaceBtnText}>Replace photo</Text>
              }
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={photoStyles.prominentBtn} onPress={onPick} disabled={uploading}>
            {uploading
              ? <ActivityIndicator color={colours.gold} size="small" />
              : <>
                  <Text style={photoStyles.prominentBtnIcon}>📷</Text>
                  <Text style={photoStyles.prominentBtnText}>Add photo</Text>
                </>
            }
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Subtle: just show thumbnail if already uploaded, otherwise nothing (parent controls visibility)
  if (!photoUrl) return null;
  return (
    <View style={photoStyles.subtleThumbWrap}>
      <Image source={{ uri: photoUrl }} style={photoStyles.thumb} />
      <TouchableOpacity style={photoStyles.replaceBtn} onPress={onPick} disabled={uploading}>
        {uploading
          ? <ActivityIndicator color={colours.gold} size="small" />
          : <Text style={photoStyles.replaceBtnText}>Replace</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const photoStyles = StyleSheet.create({
  prominentWrap: { marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 80, height: 80, borderRadius: 8, backgroundColor: colours.border },
  replaceBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1.5, borderColor: colours.gold },
  replaceBtnText: { fontSize: 13, color: colours.gold, fontWeight: '600' },
  prominentBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: colours.gold, borderStyle: 'dashed',
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  prominentBtnIcon: { fontSize: 16 },
  prominentBtnText: { fontSize: 13, color: colours.gold, fontWeight: '600' },
  subtleThumbWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
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
  // Track which non-photoPrompt questions have their extras panel open
  const [expandedExtras, setExpandedExtras] = useState<Set<string>>(new Set());
  // Track which question is currently uploading a per-question photo
  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(null);
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
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (report) saveDraft.mutate({ reportId: report.id, answers: updated });
    }, 2000);
  }

  function toggleExtras(questionId: string) {
    setExpandedExtras(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }

  // Upload a photo attached to a specific question — stores URL in answers[questionId].photo_url
  async function pickQuestionPhoto(questionId: string) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets[0] || !report) return;

    const uri = result.assets[0].uri;
    setUploadingQuestionId(questionId);
    try {
      const filename = `${report.id}/q_${questionId}_${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('report-photos')
        .upload(filename, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('report-photos').getPublicUrl(filename);
      updateAnswer(questionId, { photo_url: urlData.publicUrl });
    } catch {
      Alert.alert('Upload failed', 'Could not upload this photo. Please try again.');
    } finally {
      setUploadingQuestionId(null);
    }
  }

  // Upload a general report photo (Wrap Up gallery)
  async function pickGeneralPhoto() {
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

  // Build category map — also include any custom categories not in PROFORMA_CATEGORIES
  const allCategories = Array.from(
    new Set([...PROFORMA_CATEGORIES, ...proforma.questions.map(q => q.category)])
  );
  const questionsByCategory = allCategories.reduce((acc, cat) => {
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
        {/* In-dine timers */}
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

        {allCategories.map(category => {
          const questions = questionsByCategory[category];
          if (!questions || questions.length === 0) return null;

          const { total, max } = sectionScore(questions, answers);
          const isWrapUp = category === 'Wrap Up';

          return (
            <View key={category} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{category}</Text>
                {!isWrapUp && max > 0 && (
                  <Text style={styles.sectionScore}>{total} / {max}</Text>
                )}
              </View>

              {questions.map(q => {
                const extrasOpen = expandedExtras.has(q.id);
                const hasQuestionPhoto = !!answers[q.id]?.photo_url;
                const isUploadingThis = uploadingQuestionId === q.id;

                return (
                  <View key={q.id} style={styles.question}>
                    {/* Question label + subtle photo toggle (non-photoPrompt only) */}
                    <View style={styles.questionLabelRow}>
                      <Text style={[styles.questionLabel, { flex: 1 }]}>
                        {q.label}
                        {q.required && <Text style={styles.required}> *</Text>}
                      </Text>
                      {!q.photoPrompt && (
                        <TouchableOpacity
                          style={[styles.subtlePhotoBtn, (extrasOpen || hasQuestionPhoto) && styles.subtlePhotoBtnActive]}
                          onPress={() => toggleExtras(q.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={[styles.subtlePhotoBtnText, (extrasOpen || hasQuestionPhoto) && styles.subtlePhotoBtnTextActive]}>
                            📷
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Answer inputs */}
                    {q.type === 'scored' && (
                      <ScorePicker
                        value={answers[q.id]?.score}
                        onChange={score => updateAnswer(q.id, { score })}
                      />
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

                    {/* Notes field for scored questions */}
                    {q.type === 'scored' && (
                      <TextInput
                        style={styles.notesInput}
                        placeholder="Notes (optional)"
                        value={answers[q.id]?.notes ?? ''}
                        onChangeText={notes => updateAnswer(q.id, { notes })}
                        placeholderTextColor={colours.textMuted}
                        multiline
                      />
                    )}

                    {/* Prominent photo prompt — always visible for photoPrompt questions */}
                    {q.photoPrompt && (
                      <QuestionPhoto
                        photoUrl={answers[q.id]?.photo_url}
                        uploading={isUploadingThis}
                        onPick={() => pickQuestionPhoto(q.id)}
                        prominent
                      />
                    )}

                    {/* Subtle extras panel — shown when toggled or photo already attached */}
                    {!q.photoPrompt && (extrasOpen || hasQuestionPhoto) && (
                      <View style={styles.extrasPanel}>
                        {hasQuestionPhoto ? (
                          <QuestionPhoto
                            photoUrl={answers[q.id]?.photo_url}
                            uploading={isUploadingThis}
                            onPick={() => pickQuestionPhoto(q.id)}
                            prominent={false}
                          />
                        ) : (
                          <TouchableOpacity
                            style={photoStyles.prominentBtn}
                            onPress={() => pickQuestionPhoto(q.id)}
                            disabled={isUploadingThis}
                          >
                            {isUploadingThis
                              ? <ActivityIndicator color={colours.gold} size="small" />
                              : <>
                                  <Text style={photoStyles.prominentBtnIcon}>📷</Text>
                                  <Text style={photoStyles.prominentBtnText}>Add photo</Text>
                                </>
                            }
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Wrap Up general photo gallery */}
              {isWrapUp && (
                <View style={styles.photoSection}>
                  <Text style={styles.photoTitle}>Additional Photos</Text>
                  <Text style={styles.photoSub}>Upload any other photos as evidence — receipts, food, venue.</Text>
                  <View style={styles.photoGrid}>
                    {allPhotos.map((uri, i) => (
                      <Image key={i} source={{ uri }} style={styles.photoThumb} />
                    ))}
                    <TouchableOpacity style={styles.addPhotoBtn} onPress={pickGeneralPhoto} disabled={uploadPhoto.isPending}>
                      {uploadPhoto.isPending
                        ? <ActivityIndicator color={colours.gold} size="small" />
                        : <Text style={styles.addPhotoIcon}>+</Text>
                      }
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
          {submitReport.isPending
            ? <ActivityIndicator color={colours.charcoalDark} />
            : <Text style={styles.submitBtnText}>Submit Report</Text>
          }
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
  question: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colours.border },
  questionLabelRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  questionLabel: { fontSize: 14, color: colours.textPrimary, lineHeight: 20, fontWeight: '500' },
  required: { color: colours.error },
  subtlePhotoBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: colours.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colours.offWhite, marginTop: 1 },
  subtlePhotoBtnActive: { borderColor: colours.gold, backgroundColor: '#FDF8EC' },
  subtlePhotoBtnText: { fontSize: 14, opacity: 0.4 },
  subtlePhotoBtnTextActive: { opacity: 1 },
  notesInput: { marginTop: 8, backgroundColor: colours.offWhite, borderRadius: 8, borderWidth: 1, borderColor: colours.border, padding: 10, fontSize: 13, color: colours.textPrimary, minHeight: 38 },
  freeText: { minHeight: 90, textAlignVertical: 'top' },
  extrasPanel: { marginTop: 10 },
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
