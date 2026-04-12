import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { colours, SCORE_LABELS } from '../../../utils/theme';
import { useReportDetail, useReviewReport } from '../../../hooks/useAdmin';
import { PROFORMA_CATEGORIES } from '../../../utils/defaultProforma';
import { ProformaQuestion } from '../../../types';

function ScoreBadge({ score }: { score: number }) {
  const colours_map = [colours.scorePoor, colours.scoreFair, colours.scoreGood, colours.scoreExcellent];
  const bg = colours_map[score] ?? colours.textMuted;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: bg + '22', borderColor: bg }]}>
      <Text style={[badgeStyles.text, { color: bg }]}>{SCORE_LABELS[score]}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '700' },
});

export default function AdminReportDetail() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const { data, isLoading } = useReportDetail(reportId);
  const reviewReport = useReviewReport();
  const [adminNotes, setAdminNotes] = useState('');

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator color={colours.gold} size="large" /></View>;
  }

  const { report, photos } = data ?? {};
  if (!report) return <View style={styles.centered}><Text>Report not found.</Text></View>;

  // Group questions from answers by matching to proforma categories
  // We work with raw answers since we don't have the proforma here
  const answers = report.answers ?? {};
  const answeredKeys = Object.keys(answers);

  function handleReview() {
    Alert.alert(
      'Mark as Reviewed?',
      'This will calculate the star rating for this restaurant.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Reviewed',
          onPress: async () => {
            await reviewReport.mutateAsync({
              reportId: report.id,
              restaurantId: report.restaurant_id,
              answers: report.answers,
              adminNotes,
            });
            Alert.alert('Done', 'Report reviewed and star rating updated.', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          },
        },
      ]
    );
  }

  // Calculate live score summary
  const scoredAnswers = Object.values(answers).filter((a: any) => a.score !== undefined);
  const totalScore = scoredAnswers.reduce((sum: number, a: any) => sum + (a.score ?? 0), 0);
  const maxScore = scoredAnswers.length * 3;
  const starRating = maxScore > 0 ? ((totalScore / maxScore) * 5).toFixed(1) : '—';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{report.restaurant?.name}</Text>
          <Text style={styles.headerSub}>
            {report.diner?.name} · {report.assignment?.slot?.date
              ? new Date(report.assignment.slot.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              : '—'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Score summary */}
        <View style={styles.scoreSummary}>
          <View style={styles.scoreMain}>
            <Text style={styles.starValue}>{'★'.repeat(Math.round(Number(starRating)))}{'☆'.repeat(5 - Math.round(Number(starRating)))}</Text>
            <Text style={styles.scoreDetail}>{totalScore} / {maxScore} pts · {starRating} / 5.0</Text>
          </View>
          <View style={styles.scoreBreakdown}>
            {SCORE_LABELS.map((label, i) => {
              const count = scoredAnswers.filter((a: any) => a.score === i).length;
              return (
                <View key={label} style={styles.scoreBreakdownRow}>
                  <Text style={styles.scoreBreakdownLabel}>{label}</Text>
                  <View style={styles.scoreBar}>
                    <View style={[styles.scoreBarFill, {
                      width: `${scoredAnswers.length ? (count / scoredAnswers.length) * 100 : 0}%`,
                      backgroundColor: [colours.scorePoor, colours.scoreFair, colours.scoreGood, colours.scoreExcellent][i],
                    }]} />
                  </View>
                  <Text style={styles.scoreBarCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Diner details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diner Details</Text>
          <Text style={styles.detailRow}>Name: <Text style={styles.detailValue}>{report.diner?.name}</Text></Text>
          <Text style={styles.detailRow}>Email: <Text style={styles.detailValue}>{report.diner?.email}</Text></Text>
          <Text style={styles.detailRow}>Phone: <Text style={styles.detailValue}>{report.diner?.phone ?? '—'}</Text></Text>
          <Text style={styles.detailRow}>Visit: <Text style={styles.detailValue}>
            {report.assignment?.slot?.date
              ? new Date(report.assignment.slot.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
              : '—'} at {report.assignment?.slot?.time?.slice(0, 5) ?? '—'}
          </Text></Text>
        </View>

        {/* Answers by category */}
        {PROFORMA_CATEGORIES.map(category => {
          const catAnswers = Object.entries(answers).filter(([, a]: any) =>
            a.score !== undefined || a.value !== undefined || a.text
          );
          if (catAnswers.length === 0) return null;
          // We show all answers — without the original proforma we can't filter by category
          return null;
        })}

        {/* All scored answers */}
        {scoredAnswers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scored Questions ({scoredAnswers.length})</Text>
            {Object.entries(answers)
              .filter(([, a]: any) => a.score !== undefined)
              .map(([qId, a]: any) => (
                <View key={qId} style={styles.answerRow}>
                  <ScoreBadge score={a.score} />
                  {a.notes ? <Text style={styles.answerNotes}>"{a.notes}"</Text> : null}
                </View>
              ))}
          </View>
        )}

        {/* Yes/No answers */}
        {Object.entries(answers).filter(([, a]: any) => a.value !== undefined).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yes / No Questions</Text>
            {Object.entries(answers)
              .filter(([, a]: any) => a.value !== undefined)
              .map(([qId, a]: any) => (
                <View key={qId} style={styles.answerRow}>
                  <View style={[styles.yesNoBadge, { backgroundColor: a.value ? colours.scoreGood + '22' : colours.scorePoor + '22', borderColor: a.value ? colours.scoreGood : colours.scorePoor }]}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: a.value ? colours.scoreGood : colours.scorePoor }}>
                      {a.value ? 'Yes' : 'No'}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        )}

        {/* Free text answers */}
        {Object.entries(answers).filter(([, a]: any) => a.text).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Written Responses</Text>
            {Object.entries(answers)
              .filter(([, a]: any) => a.text)
              .map(([qId, a]: any) => (
                <View key={qId} style={styles.textAnswer}>
                  <Text style={styles.textAnswerContent}>"{a.text}"</Text>
                </View>
              ))}
          </View>
        )}

        {/* Photos */}
        {photos && photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos ({photos.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photoRow}>
                {photos.map((p: any) => (
                  p.url ? <Image key={p.id} source={{ uri: p.url }} style={styles.photo} /> : null
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Admin notes */}
        {report.status !== 'reviewed' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin Notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Add any notes for your records..."
              value={adminNotes}
              onChangeText={setAdminNotes}
              multiline
              numberOfLines={4}
              placeholderTextColor={colours.textMuted}
            />
          </View>
        )}

        {/* Review button */}
        {report.status === 'submitted' && (
          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={handleReview}
            disabled={reviewReport.isPending}
          >
            {reviewReport.isPending
              ? <ActivityIndicator color={colours.charcoalDark} />
              : <Text style={styles.reviewBtnText}>Mark as Reviewed & Update Rating</Text>}
          </TouchableOpacity>
        )}

        {report.status === 'reviewed' && (
          <View style={styles.reviewedBanner}>
            <Text style={styles.reviewedText}>✓ This report has been reviewed</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20, backgroundColor: colours.charcoalDark, flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  back: { color: colours.gold, fontSize: 15, fontWeight: '600', paddingBottom: 2 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colours.white },
  headerSub: { fontSize: 12, color: colours.charcoalLight, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  scoreSummary: { backgroundColor: colours.charcoalDark, borderRadius: 16, padding: 20, marginBottom: 16 },
  scoreMain: { marginBottom: 16 },
  starValue: { fontSize: 28, color: colours.gold, marginBottom: 4 },
  scoreDetail: { fontSize: 14, color: colours.charcoalLight, fontWeight: '600' },
  scoreBreakdown: { gap: 6 },
  scoreBreakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreBreakdownLabel: { fontSize: 11, color: colours.charcoalLight, width: 60, fontWeight: '600' },
  scoreBar: { flex: 1, height: 6, backgroundColor: colours.charcoal, borderRadius: 3, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 3 },
  scoreBarCount: { fontSize: 11, color: colours.charcoalLight, width: 20, textAlign: 'right' },
  section: { backgroundColor: colours.white, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colours.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  detailRow: { fontSize: 13, color: colours.textSecondary, marginBottom: 6 },
  detailValue: { color: colours.textPrimary, fontWeight: '600' },
  answerRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colours.border, gap: 4 },
  answerNotes: { fontSize: 13, color: colours.textSecondary, fontStyle: 'italic' },
  yesNoBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, alignSelf: 'flex-start' },
  textAnswer: { backgroundColor: colours.offWhite, borderRadius: 8, padding: 12, marginBottom: 8 },
  textAnswerContent: { fontSize: 14, color: colours.textPrimary, lineHeight: 20, fontStyle: 'italic' },
  photoRow: { flexDirection: 'row', gap: 10 },
  photo: { width: 120, height: 120, borderRadius: 10 },
  notesInput: { backgroundColor: colours.offWhite, borderWidth: 1, borderColor: colours.border, borderRadius: 10, padding: 12, fontSize: 14, color: colours.textPrimary, textAlignVertical: 'top', minHeight: 90 },
  reviewBtn: { backgroundColor: colours.gold, borderRadius: 12, padding: 17, alignItems: 'center', marginTop: 8 },
  reviewBtnText: { fontSize: 15, fontWeight: '700', color: colours.charcoalDark },
  reviewedBanner: { backgroundColor: colours.scoreGood + '22', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colours.scoreGood },
  reviewedText: { fontSize: 15, fontWeight: '700', color: colours.scoreGood },
});
