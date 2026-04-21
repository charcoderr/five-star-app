import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colours, SCORE_LABELS } from '../../../utils/theme';
import { useReportDetail, useReviewReport } from '../../../hooks/useAdmin';
import { useReceiptUrl } from '../../../hooks/useReceipts';
import { supabase } from '../../../lib/supabase';

function ScoreBadge({ score }: { score: number }) {
  const colours_map = [colours.scorePoor, colours.scoreFair, colours.scoreGood, colours.scoreExcellent];
  const bg = colours_map[score] ?? colours.textMuted;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: bg + '22', borderColor: bg }]}>
      <Text style={[badgeStyles.num, { color: bg }]}>{score}</Text>
      <Text style={[badgeStyles.label, { color: bg }]}>{SCORE_LABELS[score]}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, alignSelf: 'flex-start' },
  num: { fontSize: 14, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '700' },
});

// ─── PDF Export ──────────────────────────────────────────────────────────────
// Logo embedded as base64 so it renders in the PDF without a network request
const LOGO_B64 = require('../../../assets/logo.png');
// We'll use a data URI built at export time from the asset
let _logoCachedUri: string | null = null;
async function getLogoDataUri(): Promise<string> {
  if (_logoCachedUri) return _logoCachedUri;
  try {
    const asset = require('../../../assets/logo.png');
    const resolved = (Image as any).resolveAssetSource(asset);
    if (resolved?.uri) {
      const resp = await fetch(resolved.uri);
      const blob = await resp.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          _logoCachedUri = reader.result as string;
          resolve(_logoCachedUri);
        };
        reader.readAsDataURL(blob);
      });
    }
  } catch {}
  return '';
}

function buildReportPdf(report: any, proformaQuestions: any[], photos: any[], logoDataUri: string) {
  const restaurantName = report.restaurant?.name ?? 'Restaurant';
  const dinerName = report.diner?.name ?? '—';
  const visitDate = (report.assignment?.booking_date ?? report.assignment?.slot?.date)
    ? new Date(report.assignment.booking_date ?? report.assignment.slot.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
  const visitTime = (report.assignment?.booking_time ?? report.assignment?.slot?.time)?.slice(0, 5) ?? '';
  const adminNotes = report.admin_notes ?? '';
  const allData = report.answers ?? {};
  // Separate timer data from question answers
  const timerData = allData._timers as Record<string, any> | undefined;
  const answers = Object.fromEntries(Object.entries(allData).filter(([k]) => k !== '_timers'));

  const scorePalette = ['#D94F4F', '#F5A623', '#4CAF50', '#C9A84C'];
  const scoreLabels = ['Poor', 'Fair', 'Good', 'Excellent'];

  const qMap: Record<string, any> = {};
  for (const q of (proformaQuestions ?? [])) {
    if (q?.id) qMap[q.id] = q;
  }

  const categories: Record<string, { question: any; answer: any; qId: string }[]> = {};
  for (const [qId, answer] of Object.entries(answers)) {
    const q = qMap[qId];
    const cat = q?.category ?? 'Other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({ question: q, answer: answer as any, qId });
  }
  for (const cat of Object.keys(categories)) {
    categories[cat].sort((a, b) => (a.question?.order ?? 0) - (b.question?.order ?? 0));
  }

  const categoryOrder = ['Booking', 'External', 'Internal', 'Service', 'Dining', 'Facilities', 'Wrap Up', 'Other'];

  const scored = Object.values(answers).filter((a: any) => a.score !== undefined) as any[];
  const total = scored.reduce((s: number, a: any) => s + (a.score ?? 0), 0);
  const max = scored.length * 3;
  const starValue = max > 0 ? (total / max) * 5 : 0;
  const starRounded = Math.round(starValue);

  // Score distribution with explanation
  const breakdownRows = scoreLabels.map((label, i) => {
    const count = scored.filter((a: any) => a.score === i).length;
    const pct = scored.length ? Math.round((count / scored.length) * 100) : 0;
    return `<tr>
      <td style="padding:6px 12px;font-size:13px;color:#fff;width:90px;font-weight:600;">${label}</td>
      <td style="padding:6px 8px;width:220px;">
        <div style="background:rgba(255,255,255,0.15);border-radius:4px;height:10px;">
          <div style="background:${scorePalette[i]};border-radius:4px;height:10px;width:${pct}%;"></div>
        </div>
      </td>
      <td style="padding:6px 8px;font-size:13px;color:#ccc;font-weight:600;text-align:right;">${count} question${count !== 1 ? 's' : ''} (${pct}%)</td>
    </tr>`;
  }).join('');

  // Category sections
  const categorySections = categoryOrder
    .filter(cat => categories[cat]?.length > 0)
    .map(cat => {
      const items = categories[cat];
      const catScored = items.filter(i => i.answer?.score !== undefined);
      const catTotal = catScored.reduce((s, i) => s + (i.answer.score ?? 0), 0);
      const catMax = catScored.length * 3;
      const catPct = catMax > 0 ? Math.round((catTotal / catMax) * 100) : 0;

      const rows = items.map(({ question, answer, qId }) => {
        const label = question?.label ?? 'Question';
        const order = question?.order ?? '';

        let answerHtml = '';
        if (answer.score !== undefined) {
          const c = scorePalette[answer.score] ?? '#999';
          answerHtml = `<div style="margin-bottom:4px;"><span style="display:inline-block;background:${c}18;color:${c};border:1.5px solid ${c};border-radius:8px;padding:4px 12px;font-size:13px;font-weight:700;">${answer.score} \u00b7 ${scoreLabels[answer.score] ?? '\u2014'}</span></div>`;
        }
        if (answer.value !== undefined) {
          const c = answer.value ? '#4CAF50' : '#D94F4F';
          answerHtml = `<div style="margin-bottom:4px;"><span style="display:inline-block;background:${c}18;color:${c};border:1.5px solid ${c};border-radius:8px;padding:4px 12px;font-size:13px;font-weight:700;">${answer.value ? 'Yes' : 'No'}</span></div>`;
        }
        if (answer.text) {
          answerHtml += `<div style="font-size:13px;color:#333;font-style:italic;margin-top:6px;line-height:1.5;padding:8px 12px;background:#f8f8f6;border-radius:6px;">\u201c${answer.text}\u201d</div>`;
        }
        if (answer.notes) {
          answerHtml += `<div style="font-size:12px;color:#555;margin-top:6px;padding:6px 12px;background:#C9A84C0D;border-left:3px solid #C9A84C;border-radius:4px;line-height:1.4;"><strong>Note:</strong> ${answer.notes}</div>`;
        }

        // Per-question photo
        const photoUrl = answer.photo_url;
        if (photoUrl) {
          answerHtml += `<div style="margin-top:8px;"><img src="${photoUrl}" style="width:100%;max-width:400px;border-radius:8px;border:1px solid #e0e0e0;" /></div>`;
        }

        return `<tr>
          <td style="padding:14px 12px;border-bottom:1px solid #e0e0e0;font-size:13px;color:#333;line-height:1.4;width:55%;vertical-align:top;"><strong>${order}.</strong> ${label}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #e0e0e0;vertical-align:top;">${answerHtml}</td>
        </tr>`;
      }).join('');

      return `<div style="margin-bottom:32px;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #cca300;padding-bottom:10px;margin-bottom:14px;">
          <span style="font-size:15px;font-weight:800;color:#2C2C2E;text-transform:uppercase;letter-spacing:1px;">${cat}</span>
          ${catMax > 0 ? `<span style="font-size:14px;font-weight:700;color:#cca300;">${catTotal} / ${catMax} (${catPct}%)</span>` : ''}
        </div>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
      </div>`;
    }).join('');

  // Photos section — large, clear images
  const generalPhotos = photos.filter((p: any) => p.url);
  const photoSection = generalPhotos.length > 0 ? `
    <div style="margin-bottom:32px;page-break-before:always;">
      <div style="font-size:15px;font-weight:800;color:#2C2C2E;text-transform:uppercase;letter-spacing:1px;border-bottom:3px solid #cca300;padding-bottom:10px;margin-bottom:16px;">Photos (${generalPhotos.length})</div>
      ${generalPhotos.map((p: any) => `
        <div style="margin-bottom:16px;">
          <img src="${p.url}" style="width:100%;max-width:500px;border-radius:10px;border:1px solid #ddd;" />
        </div>`).join('')}
    </div>` : '';

  // Category summary cards for front page
  const catSummaryCards = categoryOrder
    .filter(cat => categories[cat]?.length > 0)
    .map(cat => {
      const items = categories[cat];
      const catScored = items.filter(i => i.answer?.score !== undefined);
      const catTotal = catScored.reduce((s, i) => s + (i.answer.score ?? 0), 0);
      const catMax = catScored.length * 3;
      const catPct = catMax > 0 ? Math.round((catTotal / catMax) * 100) : 0;
      const barColour = catPct >= 75 ? '#4CAF50' : catPct >= 50 ? '#F5A623' : '#D94F4F';
      if (catMax === 0) return '';
      return `<div style="display:inline-block;width:48%;margin-bottom:12px;vertical-align:top;">
        <div style="font-size:12px;font-weight:700;color:#2C2C2E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">${cat}</div>
        <div style="background:#eee;border-radius:4px;height:8px;margin-bottom:4px;">
          <div style="background:${barColour};border-radius:4px;height:8px;width:${catPct}%;"></div>
        </div>
        <div style="font-size:12px;color:#555;">${catTotal} / ${catMax} (${catPct}%)</div>
      </div>`;
    }).join('');

  // Timer section for PDF
  const timerLabels: Record<string, string> = {
    drinks_order: 'Drinks order taken', drinks_arrived: 'Drinks arrived',
    food_order: 'Food order taken', starters_arrived: 'Starters arrived',
    mains_arrived: 'Mains arrived', desserts_arrived: 'Desserts arrived',
    bill_arrived: 'Bill arrived',
  };
  const timerSection = timerData ? (() => {
    const entries = Object.entries(timerData).filter(([, t]: any) => t.status !== 'idle');
    if (entries.length === 0) return '';
    const rows = entries.map(([id, t]: any) => {
      const label = timerLabels[id] ?? id;
      const mins = t.elapsedSeconds ? Math.floor(t.elapsedSeconds / 60) : null;
      const secs = t.elapsedSeconds ? t.elapsedSeconds % 60 : null;
      const timeStr = mins !== null ? `${mins}:${String(secs).padStart(2, '0')}` : '\u2014';
      const scoreCol = t.suggestedScore !== null ? scorePalette[t.suggestedScore] : '#999';
      const scoreLabel = t.suggestedScore !== null ? scoreLabels[t.suggestedScore] : (t.status === 'skipped' ? 'Skipped' : '\u2014');
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e0e0e0;font-size:13px;color:#333;font-weight:500;">${label}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e0e0e0;font-size:15px;font-weight:700;color:#2C2C2E;font-variant-numeric:tabular-nums;">${t.status === 'skipped' ? '<em style="color:#999;font-weight:500;">Skipped</em>' : timeStr}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e0e0e0;">
          ${t.suggestedScore !== null ? `<span style="background:${scoreCol}18;color:${scoreCol};border:1.5px solid ${scoreCol};border-radius:8px;padding:3px 10px;font-size:12px;font-weight:700;">${t.suggestedScore} \u00b7 ${scoreLabel}</span>` : `<span style="color:#999;font-size:12px;">${scoreLabel}</span>`}
        </td>
      </tr>
      ${t.notes ? `<tr><td colspan="3" style="padding:4px 12px 12px;font-size:12px;color:#555;font-style:italic;border-bottom:1px solid #e0e0e0;"><strong>Note:</strong> ${t.notes}</td></tr>` : ''}`;
    }).join('');
    return `<div style="margin-bottom:32px;">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #cca300;padding-bottom:10px;margin-bottom:14px;">
        <span style="font-size:15px;font-weight:800;color:#2C2C2E;text-transform:uppercase;letter-spacing:1px;">Service Timers</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
    </div>`;
  })() : '';

  const GOLD = '#cca300';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 0; background: #fff; }
  @page { margin: 24px 0; }
</style></head>
<body>
  <!-- FRONT PAGE -->
  <div style="border:3px solid ${GOLD};margin:16px;border-radius:16px;overflow:hidden;">
    <!-- Header band -->
    <div style="background:#2C2C2E;padding:28px 36px 24px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="color:${GOLD};font-size:14px;font-weight:800;letter-spacing:2px;margin-bottom:8px;">5STARX MYSTERY DINE REPORT</div>
        <div style="font-size:24px;font-weight:800;color:#fff;margin-bottom:4px;">${restaurantName}</div>
        <div style="font-size:13px;color:#ccc;margin-top:6px;">
          ${visitDate}${visitTime ? ' at ' + visitTime : ''}
        </div>
      </div>
      ${logoDataUri ? `<img src="${logoDataUri}" style="width:160px;height:160px;" />` : ''}
    </div>

    <!-- Score section -->
    <div style="padding:24px 36px 20px;">
      <!-- Star rating -->
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-size:12px;color:#2C2C2E;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;font-weight:800;">Overall Rating</div>
        <div style="font-size:36px;margin-bottom:4px;"><span style="color:${GOLD};font-family:serif;">${max > 0 ? '\u2605'.repeat(starRounded) + '\u2606'.repeat(5 - starRounded) : '\u2014'}</span></div>
        <div style="font-size:16px;color:#2C2C2E;font-weight:700;">${max > 0 ? `${total} / ${max} points \u00b7 ${starValue.toFixed(1)} out of 5.0` : 'No scored questions'}</div>
      </div>

      <!-- Score distribution -->
      ${max > 0 ? `
      <div style="border:2px solid ${GOLD};border-radius:10px;overflow:hidden;margin-bottom:16px;">
        <div style="background:#2C2C2E;padding:14px 20px;">
          <div style="font-size:11px;color:${GOLD};letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;font-weight:800;">Score Distribution Across ${scored.length} Questions</div>
          <table style="width:100%;">${breakdownRows}</table>
        </div>
      </div>` : ''}

      <!-- Category summary -->
      <div style="border:2px solid ${GOLD};border-radius:10px;padding:14px 20px;margin-bottom:16px;">
        <div style="font-size:11px;color:${GOLD};letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;font-weight:800;">Category Breakdown</div>
        <div>${catSummaryCards}</div>
      </div>

      <!-- Report details -->
      <div style="border-top:2px solid ${GOLD};padding-top:12px;">
        <div style="font-size:12px;color:#333;line-height:1.8;">
          <strong>Diner:</strong> ${dinerName} &nbsp;\u00b7&nbsp;
          <strong>Visit:</strong> ${visitDate}${visitTime ? ' at ' + visitTime : ''} &nbsp;\u00b7&nbsp;
          <strong>Generated:</strong> ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </div>
  </div>

  <!-- DETAIL PAGES -->
  <div style="padding:36px 48px;">
    ${adminNotes ? `
    <div style="margin-bottom:32px;">
      <div style="font-size:15px;font-weight:800;color:#2C2C2E;text-transform:uppercase;letter-spacing:1px;border-bottom:3px solid ${GOLD};padding-bottom:10px;margin-bottom:14px;">Notes from 5StarX</div>
      <div style="background:${GOLD}0D;border-left:4px solid ${GOLD};border-radius:8px;padding:16px 20px;font-size:14px;line-height:1.6;color:#333;">${adminNotes}</div>
    </div>` : ''}

    ${timerSection}
    ${categorySections}
    ${photoSection}
  </div>

  <!-- Footer -->
  <div style="background:#2C2C2E;padding:20px 48px;text-align:center;">
    <div style="color:${GOLD};font-size:12px;font-weight:700;letter-spacing:1px;">5STARX</div>
    <div style="font-size:11px;color:#888;margin-top:4px;">Confidential \u2014 prepared by 5StarX Mystery Dines \u00b7 www.5starx.com</div>
  </div>
</body></html>`;
}

export default function AdminReportDetail() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const { data, isLoading } = useReportDetail(reportId);
  const reviewReport = useReviewReport();
  const [adminNotes, setAdminNotes] = useState('');
  const [exporting, setExporting] = useState(false);

  const { report, photos, proformaQuestions } = data ?? {};
  const { data: receiptUrl } = useReceiptUrl(report?.assignment?.receipt_path);

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator color={colours.gold} size="large" /></View>;
  }
  if (!report) return <View style={styles.centered}><Text>Report not found.</Text></View>;

  const answers = report.answers ?? {};

  async function handleExportPdf() {
    setExporting(true);
    try {
      const logoDataUri = await getLogoDataUri();

      // Refresh signed URLs for per-question photos (they expire)
      const freshAnswers = { ...report.answers };
      for (const [qId, ans] of Object.entries(freshAnswers) as [string, any][]) {
        // Use photo_storage_path (reliable) to generate a fresh signed URL
        const storagePath = ans?.photo_storage_path;
        if (storagePath) {
          const { data: urlData } = await supabase.storage
            .from('report-photos')
            .createSignedUrl(storagePath, 3600);
          if (urlData?.signedUrl) {
            freshAnswers[qId] = { ...ans, photo_url: urlData.signedUrl };
          }
        }
      }
      const reportWithFreshPhotos = { ...report, answers: freshAnswers };

      // Also refresh general report photos
      const freshPhotos = await Promise.all(
        (photos ?? []).map(async (p: any) => {
          if (p.storage_path) {
            const { data: urlData } = await supabase.storage
              .from('report-photos')
              .createSignedUrl(p.storage_path, 3600);
            return { ...p, url: urlData?.signedUrl ?? p.url };
          }
          return p;
        })
      );

      const html = buildReportPdf(reportWithFreshPhotos, proformaQuestions ?? [], freshPhotos, logoDataUri);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('PDF saved', `Report saved to: ${uri}`);
      }
    } catch {
      Alert.alert('Export failed', 'Could not generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  // Build a lookup map: questionId → question object (with label, category, type, order)
  const questionMap: Record<string, any> = {};
  for (const q of (proformaQuestions ?? [])) {
    if (q?.id) questionMap[q.id] = q;
  }

  // Collect answered question IDs that exist in the proforma, sorted by order
  // Group by category
  const categories: Record<string, { question: any; answer: any }[]> = {};
  const unmappedAnswers: { qId: string; answer: any }[] = [];

  for (const [qId, answer] of Object.entries(answers)) {
    const q = questionMap[qId];
    if (q) {
      const cat = q.category ?? 'Other';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push({ question: q, answer });
    } else {
      unmappedAnswers.push({ qId, answer: answer as any });
    }
  }

  // Sort each category's questions by order
  for (const cat of Object.keys(categories)) {
    categories[cat].sort((a, b) => (a.question.order ?? 0) - (b.question.order ?? 0));
  }

  const categoryOrder = ['Booking', 'External', 'Internal', 'Service', 'Dining', 'Facilities', 'Wrap Up', 'Other'];

  function handleReview() {
    Alert.alert(
      'Approve & Send to Restaurant?',
      'This will calculate the star rating and share the report with the restaurant.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Send',
          onPress: async () => {
            await reviewReport.mutateAsync({
              reportId: report.id,
              restaurantId: report.restaurant_id,
              answers: report.answers,
              adminNotes,
            });
            Alert.alert('Sent!', 'Report approved and shared with the restaurant.', [
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
            {report.diner?.name} · {(report.assignment?.booking_date ?? report.assignment?.slot?.date)
              ? new Date(report.assignment.booking_date ?? report.assignment.slot.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              : report.submitted_at ? new Date(report.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
          </Text>
        </View>
        <TouchableOpacity style={styles.pdfBtn} onPress={handleExportPdf} disabled={exporting}>
          {exporting
            ? <ActivityIndicator color={colours.gold} size="small" />
            : <Text style={styles.pdfBtnText}>PDF</Text>}
        </TouchableOpacity>
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

        {/* AI Summary */}
        {(report.ai_summary || (report.ai_flags && report.ai_flags.length > 0) || (report.ai_recommendations && report.ai_recommendations.length > 0)) && (
          <View style={styles.section}>
            <View style={styles.aiHeader}>
              <Text style={styles.sectionTitle}>AI Summary</Text>
              <View style={styles.aiBadge}><Text style={styles.aiBadgeText}>Claude Haiku</Text></View>
            </View>
            {report.ai_summary ? (
              <Text style={styles.aiSummaryText}>{report.ai_summary}</Text>
            ) : null}
            {report.ai_flags && report.ai_flags.length > 0 ? (
              <View style={styles.aiChipSection}>
                <Text style={styles.aiChipLabel}>⚠️ Flags</Text>
                <View style={styles.aiChips}>
                  {report.ai_flags.map((flag: string, i: number) => (
                    <View key={i} style={[styles.aiChip, styles.aiChipRed]}>
                      <Text style={[styles.aiChipText, { color: colours.error }]}>{flag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            {report.ai_recommendations && report.ai_recommendations.length > 0 ? (
              <View style={styles.aiChipSection}>
                <Text style={styles.aiChipLabel}>💡 Recommendations</Text>
                <View style={styles.aiChips}>
                  {report.ai_recommendations.map((rec: string, i: number) => (
                    <View key={i} style={[styles.aiChip, styles.aiChipGold]}>
                      <Text style={[styles.aiChipText, { color: colours.goldDark }]}>{rec}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        )}

        {/* Diner details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diner Details</Text>
          <Text style={styles.detailRow}>Name: <Text style={styles.detailValue}>{report.diner?.name}</Text></Text>
          <Text style={styles.detailRow}>Email: <Text style={styles.detailValue}>{report.diner?.email}</Text></Text>
          <Text style={styles.detailRow}>Phone: <Text style={styles.detailValue}>{report.diner?.phone ?? '—'}</Text></Text>
          <Text style={styles.detailRow}>Visit: <Text style={styles.detailValue}>
            {(report.assignment?.booking_date ?? report.assignment?.slot?.date)
              ? new Date(report.assignment.booking_date ?? report.assignment.slot.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
              : '—'}{(report.assignment?.booking_time ?? report.assignment?.slot?.time) ? ` at ${(report.assignment.booking_time ?? report.assignment.slot.time).slice(0, 5)}` : ''}
          </Text></Text>
        </View>

        {/* Answers grouped by category */}
        {categoryOrder
          .filter(cat => categories[cat]?.length > 0)
          .map(cat => {
            const items = categories[cat];
            const scored = items.filter(i => i.answer?.score !== undefined);
            const catTotal = scored.reduce((s, i) => s + (i.answer.score ?? 0), 0);
            const catMax = scored.length * 3;
            return (
              <View key={cat} style={styles.section}>
                <View style={styles.catHeader}>
                  <Text style={styles.sectionTitle}>{cat}</Text>
                  {catMax > 0 && (
                    <Text style={styles.catScore}>{catTotal}/{catMax}</Text>
                  )}
                </View>
                {items.map(({ question, answer }) => {
                  const hasAny =
                    answer?.score !== undefined ||
                    answer?.value !== undefined ||
                    answer?.text ||
                    answer?.notes;
                  return (
                    <View key={question.id} style={styles.qRow}>
                      <Text style={styles.qLabel}>{question.order}. {question.label}</Text>
                      <View style={styles.qAnswer}>
                        {answer?.score !== undefined && <ScoreBadge score={answer.score} />}
                        {answer?.value !== undefined && (
                          <View style={[styles.yesNoBadge, { backgroundColor: answer.value ? colours.scoreGood + '22' : colours.scorePoor + '22', borderColor: answer.value ? colours.scoreGood : colours.scorePoor }]}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: answer.value ? colours.scoreGood : colours.scorePoor }}>
                              {answer.value ? 'Yes' : 'No'}
                            </Text>
                          </View>
                        )}
                        {answer?.text ? (
                          <Text style={styles.qText}>"{answer.text}"</Text>
                        ) : null}
                        {answer?.notes ? (
                          <Text style={styles.qNotes}>Note: {answer.notes}</Text>
                        ) : null}
                        {!hasAny && (
                          <Text style={styles.qEmpty}>— not answered —</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })
        }

        {/* Fallback: answers with no matching proforma question */}
        {unmappedAnswers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Answers</Text>
            {unmappedAnswers.map(({ qId, answer }: any) => (
              <View key={qId} style={styles.qRow}>
                {answer.score !== undefined && <ScoreBadge score={answer.score} />}
                {answer.value !== undefined && (
                  <View style={[styles.yesNoBadge, { backgroundColor: answer.value ? colours.scoreGood + '22' : colours.scorePoor + '22', borderColor: answer.value ? colours.scoreGood : colours.scorePoor }]}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: answer.value ? colours.scoreGood : colours.scorePoor }}>
                      {answer.value ? 'Yes' : 'No'}
                    </Text>
                  </View>
                )}
                {answer.text ? <Text style={styles.qText}>"{answer.text}"</Text> : null}
                {answer.notes ? <Text style={styles.qNotes}>Note: {answer.notes}</Text> : null}
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

        {/* Diner receipt (reimbursement flow) */}
        {report.assignment?.receipt_path && receiptUrl && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diner Receipt (Reimbursement)</Text>
            <Image source={{ uri: receiptUrl }} style={{ width: '100%', height: 300, borderRadius: 10 }} resizeMode="contain" />
          </View>
        )}

        {/* Admin notes */}
        {report.status !== 'sent_to_restaurant' && (
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
        {(report.status === 'submitted' || report.status === 'under_review') && (
          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={handleReview}
            disabled={reviewReport.isPending}
          >
            {reviewReport.isPending
              ? <ActivityIndicator color={colours.charcoalDark} />
              : <Text style={styles.reviewBtnText}>Approve & Send to Restaurant</Text>}
          </TouchableOpacity>
        )}

        {report.status === 'sent_to_restaurant' && (
          <View style={styles.reviewedBanner}>
            <Text style={styles.reviewedText}>✓ Sent to the restaurant</Text>
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
  pdfBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, borderColor: colours.gold, alignItems: 'center', justifyContent: 'center', minWidth: 50, marginBottom: 2 },
  pdfBtnText: { color: colours.gold, fontWeight: '700', fontSize: 13 },
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
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  catScore: { fontSize: 13, fontWeight: '700', color: colours.gold },
  qRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colours.border + '88', gap: 8 },
  qLabel: { fontSize: 13, color: colours.textPrimary, lineHeight: 18, fontWeight: '500' },
  qAnswer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4, paddingLeft: 4, borderLeftWidth: 2, borderLeftColor: colours.gold + '66' },
  qNotes: { fontSize: 12, color: colours.textSecondary, fontStyle: 'italic', width: '100%' },
  qText: { fontSize: 13, color: colours.textPrimary, fontStyle: 'italic', lineHeight: 19, flex: 1 },
  qEmpty: { fontSize: 12, color: colours.textMuted, fontStyle: 'italic' },
  yesNoBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, alignSelf: 'flex-start' },
  textAnswer: { backgroundColor: colours.offWhite, borderRadius: 8, padding: 12, marginBottom: 8 },
  textAnswerContent: { fontSize: 14, color: colours.textPrimary, lineHeight: 20, fontStyle: 'italic' },
  photoRow: { flexDirection: 'row', gap: 10 },
  photo: { width: 120, height: 120, borderRadius: 10 },
  notesInput: { backgroundColor: colours.offWhite, borderWidth: 1, borderColor: colours.border, borderRadius: 10, padding: 12, fontSize: 14, color: colours.textPrimary, textAlignVertical: 'top', minHeight: 90 },
  reviewBtn: { backgroundColor: colours.gold, borderRadius: 12, padding: 17, alignItems: 'center', marginTop: 8 },
  reviewBtnText: { fontSize: 15, fontWeight: '700', color: colours.charcoalDark },
  reviewedBanner: { backgroundColor: colours.scoreGood + '22', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colours.scoreGood },
  reviewedText: { fontSize: 15, fontWeight: '700', color: colours.scoreGood },
  aiHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  aiBadge: { backgroundColor: colours.charcoalDark, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  aiBadgeText: { fontSize: 10, color: colours.gold, fontWeight: '700' },
  aiSummaryText: { fontSize: 14, color: colours.textPrimary, lineHeight: 21, marginBottom: 10 },
  aiChipSection: { marginTop: 8 },
  aiChipLabel: { fontSize: 12, fontWeight: '700', color: colours.textSecondary, marginBottom: 6 },
  aiChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  aiChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  aiChipRed: { backgroundColor: colours.error + '12', borderColor: colours.error + '44' },
  aiChipGold: { backgroundColor: colours.gold + '14', borderColor: colours.gold + '44' },
  aiChipText: { fontSize: 12, fontWeight: '600' },
});
