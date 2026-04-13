import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colours } from '../../../utils/theme';
import {
  useRestaurantDetail,
  useRestaurantNotes,
  useAddRestaurantNote,
  useDeleteRestaurantNote,
} from '../../../hooks/useCrm';
import { Avatar } from '../../../components/Avatar';
import { StatusPill } from '../../../components/StatusPill';
import { NotesPanel } from '../../../components/NotesPanel';
import { EmptyState } from '../../../components/EmptyState';
import {
  SUBSCRIPTION_STATUS,
  SLOT_STATUS,
  REPORT_STATUS,
  USER_STATUS,
  getStatus,
} from '../../../utils/statusColors';
import { useSetSubscriptionStatus } from '../../../hooks/useSubscription';

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function starRating(answers: Record<string, any>): string {
  const scored = Object.values(answers ?? {}).filter((a: any) => a?.score !== undefined);
  if (scored.length === 0) return '—';
  const total = scored.reduce((s: number, a: any) => s + (a.score ?? 0), 0);
  const max = scored.length * 3;
  return ((total / max) * 5).toFixed(1);
}

const NOTE_TYPE_OPTIONS = [
  { key: 'general',    label: 'General' },
  { key: 'admin',      label: 'Admin only' },
  { key: 'commercial', label: 'Commercial' },
];

export default function RestaurantCrmDetail() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const { data, isLoading, refetch, isRefetching } = useRestaurantDetail(restaurantId);
  const { data: notes, isLoading: notesLoading } = useRestaurantNotes(restaurantId);
  const addNote = useAddRestaurantNote(restaurantId);
  const deleteNote = useDeleteRestaurantNote(restaurantId);
  const setSubscription = useSetSubscriptionStatus();

  function handleSubscriptionChange() {
    const r = data?.restaurant;
    if (!r) return;
    const current = r.subscription_status ?? 'trial';
    Alert.alert(
      'Change Subscription',
      `Current status: ${current.toUpperCase()}`,
      [
        { text: 'Set Active', onPress: () => setSubscription.mutateAsync({ restaurantId, status: 'active' }) },
        { text: 'Set Trial',  onPress: () => setSubscription.mutateAsync({ restaurantId, status: 'trial' }) },
        { text: 'Set Inactive', style: 'destructive', onPress: () => setSubscription.mutateAsync({ restaurantId, status: 'inactive' }) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={colours.gold} /></View>;
  }
  if (!data?.restaurant) {
    return (
      <View style={styles.centered}>
        <EmptyState icon="🏚️" title="Restaurant not found" ctaLabel="Back" onCtaPress={() => router.back()} />
      </View>
    );
  }

  const r = data.restaurant;
  const subStatus = getStatus(SUBSCRIPTION_STATUS, r.subscription_status);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>{r.name}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{r.cuisine_type || 'Restaurant'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colours.gold} />}
      >
        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <Avatar name={r.name} size={56} tone="gold" />
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.summaryName} numberOfLines={1}>{r.name}</Text>
                <StatusPill status={subStatus} size="sm" />
              </View>
              <Text style={styles.summaryMeta}>
                {r.avg_rating != null ? `★ ${r.avg_rating.toFixed(1)} / 5.0` : 'No ratings yet'}
              </Text>
            </View>
          </View>

          <View style={styles.contactGrid}>
            <View style={styles.contactRow}>
              <Text style={styles.contactLabel}>Address</Text>
              <Text style={styles.contactValue}>{r.address || '—'}</Text>
            </View>
            <View style={styles.contactRow}>
              <Text style={styles.contactLabel}>Contact</Text>
              <Text style={styles.contactValue}>{r.contact_email || '—'}</Text>
            </View>
            <View style={styles.contactRow}>
              <Text style={styles.contactLabel}>Cuisine</Text>
              <Text style={styles.contactValue}>{r.cuisine_type || '—'}</Text>
            </View>
            <View style={styles.contactRow}>
              <Text style={styles.contactLabel}>Since</Text>
              <Text style={styles.contactValue}>{formatDate(r.created_at)}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{data.recentSlots.length}</Text>
              <Text style={styles.statLabel}>Recent slots</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{data.recentReports.length}</Text>
              <Text style={styles.statLabel}>Recent reports</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{data.linkedDiners.length}</Text>
              <Text style={styles.statLabel}>Diners</Text>
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => router.push('/(admin)/slots')}
          >
            <Text style={styles.quickBtnText}>+ New Slot</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, styles.quickBtnSecondary]}
            onPress={() => router.push('/(admin)/reports')}
          >
            <Text style={[styles.quickBtnText, styles.quickBtnTextSecondary]}>All Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, styles.quickBtnSecondary]}
            onPress={handleSubscriptionChange}
            disabled={setSubscription.isPending}
          >
            <Text style={[styles.quickBtnText, styles.quickBtnTextSecondary]}>
              {setSubscription.isPending ? 'Saving…' : '💳 Subscription'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Notes */}
        <Text style={styles.sectionTitle}>Notes</Text>
        <NotesPanel
          notes={notes ?? []}
          typeOptions={NOTE_TYPE_OPTIONS}
          isLoading={notesLoading}
          isAdding={addNote.isPending}
          onAdd={(body, noteType) => addNote.mutateAsync({ body, noteType })}
          onDelete={id => deleteNote.mutateAsync(id)}
        />

        {/* Recent slots */}
        <Text style={styles.sectionTitle}>Recent Slots</Text>
        <View style={styles.listCard}>
          {data.recentSlots.length === 0 ? (
            <Text style={styles.emptyText}>No slots yet.</Text>
          ) : (
            data.recentSlots.map((s, i) => (
              <View key={s.id} style={[styles.listRow, i > 0 && styles.listRowBordered]}>
                <Text style={styles.listIcon}>📅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{formatDate(s.date)}</Text>
                  <Text style={styles.listSub}>{String(s.time).slice(0, 5)}</Text>
                </View>
                <StatusPill status={getStatus(SLOT_STATUS, s.status)} size="sm" />
              </View>
            ))
          )}
        </View>

        {/* Recent reports */}
        <Text style={styles.sectionTitle}>Recent Reports</Text>
        <View style={styles.listCard}>
          {data.recentReports.length === 0 ? (
            <Text style={styles.emptyText}>No reports yet.</Text>
          ) : (
            data.recentReports.map((rep: any, i: number) => (
              <TouchableOpacity
                key={rep.id}
                style={[styles.listRow, i > 0 && styles.listRowBordered]}
                onPress={() => router.push({
                  pathname: '/(admin)/report/[reportId]',
                  params: { reportId: rep.id },
                })}
              >
                <Text style={styles.listIcon}>⭐</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>
                    {rep.diner?.name ?? 'Diner'} · ★ {starRating(rep.answers ?? {})}
                  </Text>
                  <Text style={styles.listSub}>{formatDate(rep.submitted_at)}</Text>
                </View>
                <StatusPill status={getStatus(REPORT_STATUS, rep.status)} size="sm" />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Linked diners */}
        <Text style={styles.sectionTitle}>Linked Diners ({data.linkedDiners.length})</Text>
        <View style={styles.listCard}>
          {data.linkedDiners.length === 0 ? (
            <Text style={styles.emptyText}>No diners have visited yet.</Text>
          ) : (
            data.linkedDiners.map((d: any, i: number) => (
              <View key={d.id} style={[styles.dinerRow, i > 0 && styles.listRowBordered]}>
                <Avatar name={d.name} size={34} tone="charcoal" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{d.name}</Text>
                  <Text style={styles.listSub}>{d.city || d.email}</Text>
                </View>
                <StatusPill status={getStatus(USER_STATUS, d.status)} size="sm" />
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colours.offWhite },

  header: { paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20, backgroundColor: colours.charcoalDark, flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  back: { color: colours.gold, fontSize: 15, fontWeight: '600', paddingBottom: 2 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colours.white },
  headerSub: { fontSize: 12, color: colours.charcoalLight, marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  summaryCard: { backgroundColor: colours.white, borderRadius: 14, padding: 16, gap: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  summaryName: { fontSize: 18, fontWeight: '700', color: colours.textPrimary, flex: 1 },
  summaryMeta: { fontSize: 13, color: colours.textSecondary },

  contactGrid: { borderTopWidth: 1, borderTopColor: colours.border, paddingTop: 12, gap: 8 },
  contactRow: { flexDirection: 'row', gap: 10 },
  contactLabel: { fontSize: 12, fontWeight: '600', color: colours.textMuted, width: 70, textTransform: 'uppercase', letterSpacing: 0.5 },
  contactValue: { flex: 1, fontSize: 13, color: colours.textPrimary, lineHeight: 18 },

  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colours.border, paddingTop: 12, gap: 12 },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: colours.textPrimary },
  statLabel: { fontSize: 11, color: colours.textMuted, marginTop: 2, fontWeight: '600' },

  quickRow: { flexDirection: 'row', gap: 8 },
  quickBtn: { flex: 1, backgroundColor: colours.gold, borderRadius: 10, padding: 12, alignItems: 'center' },
  quickBtnSecondary: { backgroundColor: colours.white, borderWidth: 1, borderColor: colours.border },
  quickBtnText: { fontSize: 13, fontWeight: '700', color: colours.charcoalDark },
  quickBtnTextSecondary: { color: colours.textPrimary },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: colours.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },

  listCard: { backgroundColor: colours.white, borderRadius: 14, padding: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, gap: 10 },
  listRowBordered: { borderTopWidth: 1, borderTopColor: colours.border },
  listIcon: { fontSize: 18 },
  listTitle: { fontSize: 14, fontWeight: '600', color: colours.textPrimary },
  listSub: { fontSize: 12, color: colours.textMuted, marginTop: 2 },
  dinerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, gap: 10 },

  emptyText: { fontSize: 13, color: colours.textMuted, textAlign: 'center', paddingVertical: 16, fontStyle: 'italic' },
});
