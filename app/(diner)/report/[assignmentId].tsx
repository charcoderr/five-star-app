import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colours, SCORE_LABELS } from '../../../utils/theme';
import { useProforma, useReport, useSaveDraft, useSubmitReport, useUploadPhoto, useReportPhotos } from '../../../hooks/useProforma';
import { useAuthStore } from '../../../stores/authStore';
import { ProformaQuestion, ReportAnswer } from '../../../types';
import { PROFORMA_CATEGORIES } from '../../../utils/defaultProforma';
import { useDineTimers } from '../../../hooks/useDineTimers';
import DineTimerPanel from '../../../components/DineTimerPanel';
import { DINE_TIMERS, formatSeconds } from '../../../utils/dineTimers';
import { supabase } from '../../../lib/supabase';

// ─── Score Picker ─────────────────────────────────────────────────────────────
// value: 0-3 for scored, -1 for N/A, undefined for unanswered
function ScorePicker({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  const isNA = value === -1;
  return (
    <View style={scoreStyles.wrap}>
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
      <TouchableOpacity
        style={[scoreStyles.naBtn, isNA && scoreStyles.naBtnActive]}
        onPress={() => onChange(-1)}
      >
        <Text style={[scoreStyles.naText, isNA && scoreStyles.naTextActive]}>N/A</Text>
      </TouchableOpacity>
    </View>
  );
}

const scoreStyles = StyleSheet.create({
  wrap: { marginTop: 6 },
  row: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  btn: { flex: 1, minWidth: 60, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: colours.border, alignItems: 'center', backgroundColor: colours.white },
  btnActive: { borderColor: colours.gold, backgroundColor: colours.gold },
  btnText: { fontSize: 11, fontWeight: '700', color: colours.textMuted },
  btnTextActive: { color: colours.charcoalDark },
  naBtn: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 6, borderWidth: 1.5, borderColor: colours.border },
  naBtnActive: { borderColor: colours.textMuted, backgroundColor: colours.textMuted },
  naText: { fontSize: 11, fontWeight: '700', color: colours.textMuted },
  naTextActive: { color: colours.white },
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

// ─── Section total (excludes N/A answers from both total and max) ────────────
function sectionScore(questions: ProformaQuestion[], answers: Record<string, ReportAnswer>) {
  let total = 0;
  let max = 0;
  questions.filter(q => q.type === 'scored').forEach(q => {
    const a = answers[q.id];
    if (a?.score === -1) return; // N/A — excluded from scoring
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
  onView,
  onDelete,
  photoUrls,
  prominent,
}: {
  photoUrl?: string;
  photoUrls?: string[];
  uploading: boolean;
  onPick: () => void;
  onView?: (uri: string) => void;
  onDelete?: (index: number) => void;
  prominent: boolean;
}) {
  const allPhotos = photoUrls?.length ? photoUrls : (photoUrl ? [photoUrl] : []);

  if (prominent) {
    return (
      <View style={photoStyles.prominentWrap}>
        {allPhotos.length > 0 ? (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8, overflow: 'visible', paddingTop: 8, paddingLeft: 4 }}>
              <View style={photoStyles.row}>
                {allPhotos.map((uri, i) => (
                  <View key={i} style={photoStyles.thumbWrap}>
                    <TouchableOpacity onPress={() => onView?.(uri)}>
                      <Image source={{ uri }} style={photoStyles.thumb} />
                    </TouchableOpacity>
                    {onDelete && (
                      <TouchableOpacity style={photoStyles.deleteCircle} onPress={() => onDelete(i)}>
                        <Text style={photoStyles.deleteCircleText}>x</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={photoStyles.addMoreBtn} onPress={onPick} disabled={uploading}>
              {uploading
                ? <ActivityIndicator color={colours.gold} size="small" />
                : <Text style={photoStyles.addMoreText}>+ Add another photo</Text>}
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

  // Subtle: show thumbnails if photos exist
  if (allPhotos.length === 0) return null;
  return (
    <View style={photoStyles.subtleThumbWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={photoStyles.row}>
          {allPhotos.map((uri, i) => (
            <View key={i} style={photoStyles.thumbWrap}>
              <TouchableOpacity onPress={() => onView?.(uri)}>
                <Image source={{ uri }} style={photoStyles.thumb} />
              </TouchableOpacity>
              {onDelete && (
                <TouchableOpacity style={photoStyles.deleteCircle} onPress={() => onDelete(i)}>
                  <Text style={photoStyles.deleteCircleText}>x</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
      <TouchableOpacity style={photoStyles.addMoreBtn} onPress={onPick} disabled={uploading}>
        {uploading
          ? <ActivityIndicator color={colours.gold} size="small" />
          : <Text style={photoStyles.addMoreText}>+ Add more</Text>}
      </TouchableOpacity>
    </View>
  );
}

const photoStyles = StyleSheet.create({
  prominentWrap: { marginTop: 10, paddingTop: 8 },
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
  thumbWrap: { position: 'relative', marginRight: 12, marginTop: 4 },
  deleteCircle: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: colours.error, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  deleteCircleText: { color: '#fff', fontSize: 12, fontWeight: '800', lineHeight: 14 },
  addMoreBtn: { alignSelf: 'flex-start', marginTop: 6 },
  addMoreText: { fontSize: 13, color: colours.gold, fontWeight: '600' },
  subtleThumbWrap: { marginTop: 8, paddingTop: 8, overflow: 'visible' },
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
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [expandedExtras, setExpandedExtras] = useState<Set<string>>(new Set());
  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dineTimers = useDineTimers();

  // Local storage key for offline backup
  const localKey = `draft_${assignmentId}`;

  // Load: prefer local backup (fresher) over remote
  const answersRef = useRef(false);
  useEffect(() => {
    if (answersRef.current) return;
    (async () => {
      try {
        const local = await AsyncStorage.getItem(localKey);
        if (local) {
          const parsed = JSON.parse(local);
          const remoteCount = Object.keys(report?.answers ?? {}).filter(k => k !== '_timers').length;
          const localCount = Object.keys(parsed).filter(k => k !== '_timers').length;
          if (localCount >= remoteCount) {
            setAnswers(parsed);
            answersRef.current = true;
            return;
          }
        }
      } catch {}
      if (report) {
        setAnswers(report.answers ?? {});
        answersRef.current = true;
      }
    })();
  }, [report]);

  // Save locally on every change (instant, works offline, never loses data)
  const saveLocal = useCallback(async (data: Record<string, any>) => {
    try { await AsyncStorage.setItem(localKey, JSON.stringify(data)); } catch {}
  }, [localKey]);

  function updateAnswer(questionId: string, partial: Partial<ReportAnswer>) {
    const updated = { ...answers, [questionId]: { ...answers[questionId], ...partial } };
    setAnswers(updated);

    // Always save locally first (instant, works offline)
    const withTimers = { ...updated, _timers: dineTimers.timers };
    saveLocal(withTimers);

    // Sync to Supabase with a longer debounce (less network pressure)
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (report) {
        saveDraft.mutate(
          { reportId: report.id, answers: withTimers },
          {
            onSuccess: () => setSaveFailed(false),
            onError: () => setSaveFailed(true),
          }
        );
      }
    }, 5000);
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

  // Pick an image from camera or library
  async function pickImage(): Promise<string | null> {
    return new Promise(resolve => {
      Alert.alert('Add Photo', 'Choose a source', [
        {
          text: 'Take Photo',
          onPress: async () => {
            try {
              const perm = await ImagePicker.requestCameraPermissionsAsync();
              if (!perm.granted) { Alert.alert('Camera access required'); resolve(null); return; }
              const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
              resolve(result.canceled ? null : result.assets?.[0]?.uri ?? null);
            } catch {
              Alert.alert('Camera unavailable', 'Camera is not available on this device. Please use Camera Roll instead.');
              resolve(null);
            }
          },
        },
        {
          text: 'Camera Roll',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.7,
            });
            resolve(result.canceled ? null : result.assets?.[0]?.uri ?? null);
          },
        },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ]);
    });
  }

  // Local preview URIs per question (multiple photos)
  const [localPhotoPreviews, setLocalPhotoPreviews] = useState<Record<string, string[]>>({});

  // Get all display URIs for a question's photos
  // If local previews exist for this question, use those (they're fresher).
  // Otherwise fall back to saved signed URLs from the database.
  function getPhotoDisplayUris(questionId: string): string[] {
    const local = localPhotoPreviews[questionId] ?? [];
    if (local.length > 0) return local;
    const saved = answers[questionId]?.photo_urls ?? [];
    if (saved.length > 0) return saved;
    const legacy = answers[questionId]?.photo_url;
    const all = legacy ? [legacy] : [];
    return all;
  }

  // Backward compat helper
  function getPhotoDisplayUri(questionId: string): string | undefined {
    return getPhotoDisplayUris(questionId)[0];
  }

  // Upload a photo attached to a question (supports multiple)
  async function pickQuestionPhoto(questionId: string) {
    const uri = await pickImage();
    if (!uri || !report) return;

    // Show local preview immediately
    setLocalPhotoPreviews(prev => ({
      ...prev,
      [questionId]: [...(prev[questionId] ?? []), uri],
    }));
    setUploadingQuestionId(questionId);
    try {
      const filename = `${report.id}/q_${questionId}_${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('report-photos')
        .upload(filename, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from('report-photos')
        .createSignedUrl(filename, 604800);

      const signedUrl = urlData?.signedUrl ?? filename;
      const existing = answers[questionId];
      const urls = [...(existing?.photo_urls ?? []), signedUrl];
      const paths = [...(existing?.photo_storage_paths ?? []), filename];

      updateAnswer(questionId, {
        photo_url: urls[0],
        photo_storage_path: paths[0],
        photo_urls: urls,
        photo_storage_paths: paths,
      });
    } catch {
      Alert.alert('Upload failed', 'Could not upload this photo. Please try again.');
      // Remove the failed local preview
      setLocalPhotoPreviews(prev => ({
        ...prev,
        [questionId]: (prev[questionId] ?? []).filter(u => u !== uri),
      }));
    } finally {
      setUploadingQuestionId(null);
    }
  }

  // Delete a specific photo from a question
  async function deleteQuestionPhoto(questionId: string, index?: number) {
    const existing = answers[questionId];
    if (index !== undefined && existing?.photo_storage_paths) {
      // Delete specific photo
      const path = existing.photo_storage_paths[index];
      if (path) await supabase.storage.from('report-photos').remove([path]);
      const urls = [...(existing.photo_urls ?? [])];
      const paths = [...(existing.photo_storage_paths ?? [])];
      urls.splice(index, 1);
      paths.splice(index, 1);
      setLocalPhotoPreviews(prev => {
        const arr = [...(prev[questionId] ?? [])];
        if (index < arr.length) arr.splice(index, 1);
        return { ...prev, [questionId]: arr };
      });
      updateAnswer(questionId, {
        photo_url: urls[0] ?? undefined,
        photo_storage_path: paths[0] ?? undefined,
        photo_urls: urls.length > 0 ? urls : undefined,
        photo_storage_paths: paths.length > 0 ? paths : undefined,
      });
    } else {
      // Delete all photos (legacy single-photo)
      const path = existing?.photo_storage_path;
      if (path) await supabase.storage.from('report-photos').remove([path]);
      setLocalPhotoPreviews(prev => { const n = { ...prev }; delete n[questionId]; return n; });
      updateAnswer(questionId, { photo_url: undefined, photo_storage_path: undefined, photo_urls: undefined, photo_storage_paths: undefined });
    }
  }

  // Upload a general report photo (Wrap Up gallery)
  async function pickGeneralPhoto() {
    const uri = await pickImage();
    if (!uri) return;

    setLocalPhotos(prev => [...prev, uri]);
    if (report) {
      try {
        await Promise.race([
          uploadPhoto.mutateAsync({ reportId: report.id, uri }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
        ]);
      } catch {
        Alert.alert('Photo saved locally', 'The photo is on your phone but couldn\'t upload to the server. It will sync when you have a better connection.');
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
            const withTimers = { ...answers, _timers: dineTimers.timers };
            // Always save locally first
            await saveLocal(withTimers);

            try {
              // Try to sync + submit with a 10-second timeout
              const saveWithTimeout = Promise.race([
                saveDraft.mutateAsync({ reportId: report.id, answers: withTimers }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
              ]);
              await saveWithTimeout;
              await submitReport.mutateAsync(report.id);
              await AsyncStorage.removeItem(localKey);
              Alert.alert('Report submitted!', 'Thank you. Wendy will review your report shortly.', [
                { text: 'Done', onPress: () => router.back() },
              ]);
            } catch (err) {
              Alert.alert(
                'Submission failed',
                'Your answers are saved safely on your phone. Please connect to a stronger Wi-Fi or mobile data and try again. Your data will not be lost.',
                [{ text: 'OK' }]
              );
            }
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
      {/* Header — back button inline with restaurant name */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{restaurantName}</Text>
          {saveDraft.isPending && <Text style={styles.saving}>Syncing…</Text>}
          {saveFailed && !saveDraft.isPending && <Text style={styles.saveFailed}>Offline</Text>}
        </View>
      </View>

      {/* Sticky running-timer bars — stacks all running timers between header and scroll */}
      {(() => {
        const running = DINE_TIMERS.filter(d => dineTimers.timers[d.id]?.status === 'running');
        if (running.length === 0) return null;
        return (
          <View>
            {running.map(def => {
              const elapsed = dineTimers.liveElapsed[def.id] ?? 0;
              return (
                <View key={def.id} style={styles.stickyTimer}>
                  <Text style={styles.stickyTimerLabel}>{def.shortLabel}</Text>
                  <Text style={styles.stickyTimerTime}>{formatSeconds(elapsed)}</Text>
                  <TouchableOpacity style={styles.stickyTimerStop} onPress={() => dineTimers.stopTimer(def.id)}>
                    <Text style={styles.stickyTimerStopText}>Stop</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        );
      })()}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* In-dine timers */}
        <DineTimerPanel
          timers={dineTimers.timers}
          liveElapsed={dineTimers.liveElapsed}
          onStart={dineTimers.startTimer}
          onStop={dineTimers.stopTimer}
          onSkip={dineTimers.skipTimer}
          onManual={dineTimers.setManualTime}
          onReset={dineTimers.resetTimer}
          onNotes={dineTimers.setTimerNotes}
          nudgeTimerId={dineTimers.nudgeTimerId}
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
                const hasQuestionPhoto = !!(getPhotoDisplayUri(q.id));
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
                        photoUrl={getPhotoDisplayUri(q.id)}
                        photoUrls={getPhotoDisplayUris(q.id)}
                        uploading={isUploadingThis}
                        onPick={() => pickQuestionPhoto(q.id)}
                        onView={(uri) => setViewingPhoto(uri)}
                        onDelete={(i) => deleteQuestionPhoto(q.id, i)}
                        prominent
                      />
                    )}

                    {/* Subtle extras panel — shown when toggled or photo already attached */}
                    {!q.photoPrompt && (extrasOpen || hasQuestionPhoto) && (
                      <View style={styles.extrasPanel}>
                        {hasQuestionPhoto ? (
                          <QuestionPhoto
                            photoUrl={getPhotoDisplayUri(q.id)}
                            photoUrls={getPhotoDisplayUris(q.id)}
                            uploading={isUploadingThis}
                            onPick={() => pickQuestionPhoto(q.id)}
                            onView={(uri) => setViewingPhoto(uri)}
                            onDelete={(i) => deleteQuestionPhoto(q.id, i)}
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

      {/* Full-screen photo viewer */}
      {viewingPhoto && (
        <Modal visible animationType="fade" transparent>
          <View style={styles.photoViewerOverlay}>
            <TouchableOpacity style={styles.photoViewerClose} onPress={() => setViewingPhoto(null)}>
              <Text style={styles.photoViewerCloseText}>Close</Text>
            </TouchableOpacity>
            <Image source={{ uri: viewingPhoto }} style={styles.photoViewerImage} resizeMode="contain" />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colours.offWhite, gap: 12 },
  loadingText: { fontSize: 15, color: colours.textSecondary },
  errorText: { fontSize: 15, color: colours.error },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: colours.charcoalDark },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colours.gold, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colours.gold, fontSize: 16, fontWeight: '700' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colours.white, flex: 1 },
  saving: { fontSize: 12, color: colours.charcoalLight, fontStyle: 'italic' },
  saveFailed: { fontSize: 11, color: colours.scoreFair, fontWeight: '700', backgroundColor: colours.scoreFair + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  stickyTimer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colours.gold, paddingHorizontal: 16, paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: colours.goldDark + '44' },
  stickyTimerLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: colours.charcoalDark },
  stickyTimerTime: { fontSize: 18, fontWeight: '800', color: colours.charcoalDark, fontVariant: ['tabular-nums'] },
  stickyTimerStop: { backgroundColor: colours.charcoalDark, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  stickyTimerStopText: { fontSize: 13, fontWeight: '700', color: colours.white },
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
  photoViewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  photoViewerImage: { width: '90%', height: '70%' },
  photoViewerClose: { position: 'absolute', top: 60, right: 20, zIndex: 10, padding: 12 },
  photoViewerCloseText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
