import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
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

function buildReportHtml(report: any, starRounded: number, starValue: number, total: number, max: number, scored: [string, any][], yesNo: [string, any][], text: [string, any][]) {
  const visitDate = formatDate((report as any).assignment?.slot?.date);
  const visitTime = (report as any).assignment?.slot?.time?.slice(0, 5) ?? '—';
  const restaurantName = (report as any).restaurant?.name ?? 'Restaurant';
  const adminNotes = (report as any).admin_notes ?? '';

  const scorePalette = ['#D94F4F', '#F5A623', '#4CAF50', '#C9A84C'];
  const scoreLabelsList = ['Poor', 'Fair', 'Good', 'Excellent'];

  const breakdownRows = scoreLabelsList.map((label, i) => {
    const count = scored.filter(([, a]) => a.score === i).length;
    const pct = scored.length ? Math.round((count / scored.length) * 100) : 0;
    return `
      <tr>
        <td style="padding:4px 8px;font-size:13px;color:#666;width:80px;">${label}</td>
        <td style="padding:4px 8px;">
          <div style="background:#eee;border-radius:3px;height:8px;width:200px;">
            <div style="background:${scorePalette[i]};border-radius:3px;height:8px;width:${pct * 2}px;"></div>
          </div>
        </td>
        <td style="padding:4px 8px;font-size:13px;color:#444;">${count}</td>
      </tr>`;
  }).join('');

  const scoredRows = scored.map(([, a]) => `
    <tr>
      <td style="padding:6px 8px;">
        <span style="background:${scorePalette[a.score] ?? '#999'}22;color:${scorePalette[a.score] ?? '#999'};border:1px solid ${scorePalette[a.score] ?? '#999'};border-radius:6px;padding:2px 8px;font-size:12px;font-weight:700;">
          ${scoreLabelsList[a.score] ?? '—'}
        </span>
        ${a.notes ? `<div style="font-size:12px;color:#666;margin-top:3px;font-style:italic;">"${a.notes}"</div>` : ''}
      </td>
    </tr>`).join('');

  const yesNoRows = yesNo.map(([, a]) => `
    <tr>
      <td style="padding:6px 8px;">
        <span style="background:${a.value ? '#4CAF5022' : '#D94F4F22'};color:${a.value ? '#4CAF50' : '#D94F4F'};border:1px solid ${a.value ? '#4CAF50' : '#D94F4F'};border-radius:6px;padding:2px 8px;font-size:12px;font-weight:700;">
          ${a.value ? 'Yes' : 'No'}
        </span>
      </td>
    </tr>`).join('');

  const textRows = text.map(([, a]) => `
    <div style="background:#f8f8f6;border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:14px;color:#333;font-style:italic;line-height:1.5;">
      "${a.text}"
    </div>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 0; background: #fff; }
    .header { background: #2C2C2E; color: #fff; padding: 32px 40px 24px; }
    .brand { color: #C9A84C; font-size: 13px; font-weight: 700; letter-spacing: 1px; margin-bottom: 8px; }
    .restaurant { font-size: 26px; font-weight: 700; margin-bottom: 6px; }
    .meta { font-size: 13px; color: #aaa; }
    .content { padding: 32px 40px; }
    .score-card { background: #2C2C2E; color: #fff; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center; }
    .score-label { font-size: 11px; color: #aaa; letter-spacing: 1px; text-transform: uppercase; }
    .stars { font-size: 36px; color: #C9A84C; margin: 8px 0 4px; }
    .score-detail { font-size: 14px; color: #ddd; font-weight: 600; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 12px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 14px; }
    .notes-box { background: #C9A84C18; border-left: 3px solid #C9A84C; border-radius: 8px; padding: 12px 16px; font-size: 14px; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; }
    .footer { background: #f8f8f6; padding: 20px 40px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">5STARX MYSTERY DINE REPORT</div>
    <div class="restaurant">${restaurantName}</div>
    <div class="meta">Visit: ${visitDate} at ${visitTime} &nbsp;·&nbsp; Generated: ${new Date().toLocaleDateString('en-GB')}</div>
  </div>

  <div class="content">
    <div class="score-card">
      <div class="score-label">Overall Rating</div>
      <div class="stars">${max > 0 ? '★'.repeat(starRounded) + '☆'.repeat(5 - starRounded) : '—'}</div>
      <div class="score-detail">${max > 0 ? `${total} / ${max} pts · ${starValue.toFixed(1)} / 5.0` : 'No scored questions'}</div>
      ${max > 0 ? `
      <div style="margin-top:20px;">
        <table style="margin:0 auto;">
          ${breakdownRows}
        </table>
      </div>` : ''}
    </div>

    ${adminNotes ? `
    <div class="section">
      <div class="section-title">Notes from 5StarX</div>
      <div class="notes-box">${adminNotes}</div>
    </div>` : ''}

    ${scored.length > 0 ? `
    <div class="section">
      <div class="section-title">Scored Questions (${scored.length})</div>
      <table>${scoredRows}</table>
    </div>` : ''}

    ${yesNo.length > 0 ? `
    <div class="section">
      <div class="section-title">Yes / No Questions</div>
      <table>${yesNoRows}</table>
    </div>` : ''}

    ${text.length > 0 ? `
    <div class="section">
      <div class="section-title">Written Feedback</div>
      ${textRows}
    </div>` : ''}
  </div>

  <div class="footer">
    Confidential — prepared by 5StarX Mystery Dines &nbsp;·&nbsp; www.5starx.com
  </div>
</body>
</html>`;
}

export default function RestaurantReportDetail() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const { data: report, isLoading } = useRestaurantReportDetail(reportId);
  const { data: photos } = useReportPhotos(reportId);
  const [exporting, setExporting] = useState(false);

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

  async function handleExportPdf() {
    setExporting(true);
    try {
      const html = buildReportHtml(report, starRounded, starValue, total, max, scored, yesNo, text);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('PDF saved', `Report saved to: ${uri}`);
      }
    } catch (e) {
      Alert.alert('Export failed', 'Could not generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  }

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
        <TouchableOpacity style={styles.pdfBtn} onPress={handleExportPdf} disabled={exporting}>
          {exporting
            ? <ActivityIndicator color={colours.gold} size="small" />
            : <Text style={styles.pdfBtnText}>PDF</Text>}
        </TouchableOpacity>
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

        {((report as any).ai_summary || ((report as any).ai_recommendations?.length > 0)) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Overview</Text>
            {(report as any).ai_summary ? (
              <Text style={styles.aiSummary}>{(report as any).ai_summary}</Text>
            ) : null}
            {(report as any).ai_recommendations?.length > 0 ? (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.aiSubLabel}>Areas to focus on</Text>
                <View style={styles.aiChips}>
                  {((report as any).ai_recommendations as string[]).map((rec, i) => (
                    <View key={i} style={styles.aiChip}>
                      <Text style={styles.aiChipText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        )}

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
                  <Text style={{ fontSize: 12, fontWeight: '700', color: a.value ? colours.scoreGood : colours.scorePoor }}>
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
  pdfBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, borderColor: colours.gold, alignItems: 'center', justifyContent: 'center', minWidth: 50 },
  pdfBtnText: { color: colours.gold, fontWeight: '700', fontSize: 13 },

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
  aiSummary: { fontSize: 14, color: colours.textPrimary, lineHeight: 21 },
  aiSubLabel: { fontSize: 12, fontWeight: '700', color: colours.textSecondary, marginBottom: 6 },
  aiChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  aiChip: { backgroundColor: colours.gold + '14', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: colours.gold + '44' },
  aiChipText: { fontSize: 12, fontWeight: '600', color: colours.goldDark },
});
