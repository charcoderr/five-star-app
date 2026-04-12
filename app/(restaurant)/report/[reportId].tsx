import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { colours, SCORE_LABELS } from '../../../utils/theme';
import { useRestaurantReportDetail } from '../../../hooks/useRestaurantPortal';
import { useReportPhotos } from '../../../hooks/useProforma';

function ScoreBadge({ score }: { score: number }) {
  const palette = [colours.scorePoor, colours.scoreFair, colours.scoreGood, colours.scoreExcellent];
  const bg = palette[score] ?? colours.textMuted;
  return (
    <View style={[styles.badge, { backgroundColor: bg + '22', borderColor: bg }]}>
      <Text style={[styles.badgeText, { color: bg }]}>{SCORE_LABELS[score] ?? '—'}</Text>
    </View>
  );
}

function formatDate(d: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', opts ?? { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function RestaurantReportDetail() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const { data: report, isLoading } = useRestaurantReportDetail(reportId);
  const { data: photos } = useReportPhotos(reportId);

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={colours.gold} /></View>;
  }
  if (!report) {
    return <View style={styles.centered}><Text>Report not found.</Text></View>;
  }

  const answers = (report as any).answers ?? {};
  const scored = Object.entries(answers).filter(([, a]: any) => a?.score !== undefined) as [string, any][];
  const yesNo  = Object.entries(answers).filter(([, a]: any) => a?.value !== undefined) as [string, any][];
  const text   = Object.entries(answers).filter(([, a]: any) => a?.text) as [string, any][];

  const total = scored.reduce((s, [, a]) => s + (a.score ?? 0), 0);
  const max = scored.length * 3;
  const starValue = max > 0 ? (total / max) * 5 : 0;
  const starRounded = Math.round(starValue);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Mystery Diner Report</Text>
          <Text style={styles.headerSub}>
            Visit {formatDate((report as any).assignment?.slot?.date)} · {(report as any).assignment?.slot?.time?.slice(0,5) ?? '—'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>OVERALL RATING</Text>
          <Text style={styles.starValue}>
            {max > 0 ? '★'.repeat(starRounded) + '☆'.repeat(5 - starRounded) : '—'}
          </Text>
          <Text style={styles.scoreDetail}>
            {max > 0 ? `${total} / ${max} pts · ${starValue.toFixed(1)} / 5.0` : 'No scored questions'}
          </Text>
          {max > 0 ? (
            <View style={styles.breakdown}>
              {SCORE_LABELS.map((label, i) => {
                const count = scored.filter(([, a]) => a.score === i).length;
                const pct = scored.length ? (count / scored.length) * 100 : 0;
                const palette = [colours.scorePoor, colours.scoreFair, colours.scoreGood, colours.scoreExcellent];
                return (
                  <View key={label} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{label}</Text>
                    <View style={styles.bar}>
                      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: palette[i] }]} />
                    </View>
                    <Text style={styles.breakdownCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>

        {(report as any).admin_notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes from 5StarX</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{(report as any).admin_notes}</Text>
            </View>
          </View>
        ) : null}

        {scored.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scored Questions ({scored.length})</Text>
            {scored.map(([qId, a]) => (
              <View key={qId} style={styles.answerRow}>
                <ScoreBadge score={a.score} />
                {a.notes ? <Text style={styles.answerNotes}>"{a.notes}"</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {yesNo.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yes / No Questions</Text>
            {yesNo.map(([qId, a]) => (
              <View key={qId} style={styles.answerRow}>
                <View
                  style={[
                    styles.yesNoBadge,
                    {
                      backgroundColor: (a.value ? colours.scoreGood : colours.scorePoor) + '22',
                      borderColor: a.value ? colours.scoreGood : colours.scorePoor,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: a.value ? colours.scoreGood : colours.scorePoor,
                    }}
                  >
                    {a.value ? 'Yes' : 'No'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {text.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Written Feedback</Text>
            {text.map(([qId, a]) => (
              <View key={qId} style={styles.textAnswer}>
                <Text style={styles.textAnswerContent}>"{a.text}"</Text>
              </View>
            ))}
          </View>
        ) : null}

        {photos && photos.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos ({photos.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photoRow}>
                {photos.map((p: any) =>
                  p.url ? <Image key={p.id} source={{ uri: p.url }} style={styles.photo} /> : null,
                )}
              </View>
            </ScrollView>
          </View>
        ) : null}

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

  scoreCard: { backgroundColor: colours.charcoalDark, borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center' },
  scoreLabel: { fontSize: 11, fontWeight: '700', color: colours.charcoalLight, letterSpacing: 1 },
  starValue: { fontSize: 32, color: colours.gold, marginTop: 8 },
  scoreDetail: { fontSize: 14, color: colours.white, fontWeight: '600', marginTop: 4 },
  breakdown: { gap: 6, marginTop: 16, alignSelf: 'stretch' },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  breakdownLabel: { fontSize: 11, color: colours.charcoalLight, width: 70, fontWeight: '600' },
  bar: { flex: 1, height: 6, backgroundColor: colours.charcoal, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  breakdownCount: { fontSize: 11, color: colours.charcoalLight, width: 20, textAlign: 'right' },

  section: { backgroundColor: colours.white, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colours.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },

  notesBox: { backgroundColor: colours.gold + '14', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: colours.gold },
  notesText: { fontSize: 14, color: colours.textPrimary, lineHeight: 20 },

  answerRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colours.border, gap: 4 },
  answerNotes: { fontSize: 13, color: colours.textSecondary, fontStyle: 'italic' },

  yesNoBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, alignSelf: 'flex-start' },

  textAnswer: { backgroundColor: colours.offWhite, borderRadius: 8, padding: 12, marginBottom: 8 },
  textAnswerContent: { fontSize: 14, color: colours.textPrimary, lineHeight: 20, fontStyle: 'italic' },

  photoRow: { flexDirection: 'row', gap: 10 },
  photo: { width: 120, height: 120, borderRadius: 10 },

  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
