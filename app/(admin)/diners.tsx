import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { colours } from '../../utils/theme';
import { useDiners, useApproveApplication, useRejectApplication } from '../../hooks/useAdmin';

const STATUS_CONFIG: Record<string, { label: string; colour: string }> = {
  active:           { label: 'Active',          colour: colours.scoreGood },
  pending_approval: { label: 'Pending Review',  colour: colours.scoreFair },
  suspended:        { label: 'Suspended',       colour: colours.error },
};

export default function AdminDiners() {
  const { data: diners, isLoading, refetch, isRefetching } = useDiners();
  const approve = useApproveApplication();
  const reject = useRejectApplication();
  const [selected, setSelected] = useState<any | null>(null);

  if (isLoading) return <View style={styles.centered}><ActivityIndicator color={colours.gold} size="large" /></View>;

  const pending = diners?.filter(d => d.status === 'pending_approval') ?? [];
  const active = diners?.filter(d => d.status === 'active') ?? [];
  const suspended = diners?.filter(d => d.status === 'suspended') ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Diners</Text>
        <Text style={styles.headerSub}>
          {pending.length} pending · {active.length} active
        </Text>
      </View>

      <FlatList
        data={diners}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colours.gold} />}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No diners yet.</Text></View>}
        renderItem={({ item }) => {
          const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.active;
          const isPending = item.status === 'pending_approval';
          return (
            <TouchableOpacity style={[styles.card, isPending && styles.cardHighlight]} onPress={() => setSelected(item)}>
              <View style={styles.cardRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.dinerName}>{item.name}</Text>
                  <Text style={styles.dinerEmail}>{item.email}</Text>
                  <Text style={styles.dinerCity}>{item.city}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: status.colour + '22', borderColor: status.colour }]}>
                  <Text style={[styles.statusText, { color: status.colour }]}>{status.label}</Text>
                </View>
              </View>
              {isPending && <Text style={styles.reviewHint}>Tap to review application →</Text>}
            </TouchableOpacity>
          );
        }}
      />

      {/* Application detail modal */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <ScrollView contentContainerStyle={modalStyles.sheet}>
            <Text style={modalStyles.name}>{selected?.name}</Text>
            <Text style={modalStyles.email}>{selected?.email} · {selected?.phone}</Text>
            <Text style={modalStyles.city}>{selected?.city}</Text>

            {selected?.application && (
              <View style={modalStyles.appSection}>
                <Text style={modalStyles.appTitle}>Application</Text>

                <AppRow label="Food industry experience" value={selected.application.food_industry_experience ? `Yes — ${selected.application.food_industry_details || 'no details'}` : 'No'} />
                <AppRow label="Previous mystery diner" value={selected.application.previous_mystery_diner ? `Yes — ${selected.application.previous_mystery_details || 'no details'}` : 'No'} />
                <AppRow label="Attention to detail" value={selected.application.attention_to_detail ?? '—'} />
                <AppRow label="Example" value={selected.application.attention_example ?? '—'} />
                <AppRow label="Comfortable with discreet notes" value={selected.application.discrete_notes ? 'Yes' : 'No'} />
                {selected.application.discrete_strategies ? <AppRow label="Strategies" value={selected.application.discrete_strategies} /> : null}
                <AppRow label="Availability" value={(selected.application.availability ?? []).join(', ') || '—'} />
                {selected.application.availability_restrictions ? <AppRow label="Restrictions" value={selected.application.availability_restrictions} /> : null}
                <AppRow label="Scenario: server issue" value={selected.application.scenario_server ?? '—'} />
                <AppRow label="Scenario: hygiene issue" value={selected.application.scenario_hygiene ?? '—'} />
                <AppRow label="Motivation" value={selected.application.motivation ?? '—'} />
                {selected.application.additional_info ? <AppRow label="Additional info" value={selected.application.additional_info} /> : null}
              </View>
            )}

            {selected?.status === 'pending_approval' && (
              <View style={modalStyles.actionRow}>
                <TouchableOpacity
                  style={[modalStyles.btn, modalStyles.approveBtn]}
                  onPress={async () => {
                    await approve.mutateAsync(selected.id);
                    Alert.alert('Approved!', `${selected.name} can now access the app.`);
                    setSelected(null);
                  }}
                  disabled={approve.isPending}
                >
                  <Text style={modalStyles.approveBtnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modalStyles.btn, modalStyles.rejectBtn]}
                  onPress={() => {
                    Alert.alert('Decline application?', `${selected.name} will not be approved.`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Decline', style: 'destructive', onPress: async () => { await reject.mutateAsync(selected.id); setSelected(null); } },
                    ]);
                  }}
                >
                  <Text style={modalStyles.rejectBtnText}>Decline</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity onPress={() => setSelected(null)} style={modalStyles.closeBtn}>
              <Text style={modalStyles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function AppRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={appRowStyles.row}>
      <Text style={appRowStyles.label}>{label}</Text>
      <Text style={appRowStyles.value}>{value}</Text>
    </View>
  );
}

const appRowStyles = StyleSheet.create({
  row: { marginBottom: 10 },
  label: { fontSize: 11, fontWeight: '700', color: colours.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  value: { fontSize: 14, color: colours.textPrimary, lineHeight: 20 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: colours.white, borderBottomWidth: 1, borderBottomColor: colours.border },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colours.textPrimary },
  headerSub: { fontSize: 14, color: colours.textSecondary, marginTop: 2 },
  list: { padding: 16, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: colours.textMuted },
  card: { backgroundColor: colours.white, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHighlight: { borderLeftWidth: 4, borderLeftColor: colours.gold },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colours.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: colours.charcoalDark },
  cardInfo: { flex: 1 },
  dinerName: { fontSize: 15, fontWeight: '700', color: colours.textPrimary },
  dinerEmail: { fontSize: 12, color: colours.textSecondary, marginTop: 1 },
  dinerCity: { fontSize: 12, color: colours.textMuted, marginTop: 1 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  reviewHint: { fontSize: 12, color: colours.gold, fontWeight: '600', marginTop: 8 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colours.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 28, paddingBottom: 48 },
  name: { fontSize: 22, fontWeight: '700', color: colours.textPrimary },
  email: { fontSize: 13, color: colours.textSecondary, marginTop: 2 },
  city: { fontSize: 13, color: colours.textMuted, marginTop: 2, marginBottom: 20 },
  appSection: { borderTopWidth: 1, borderTopColor: colours.border, paddingTop: 16, marginBottom: 20 },
  appTitle: { fontSize: 14, fontWeight: '700', color: colours.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  btn: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
  approveBtn: { backgroundColor: colours.gold },
  approveBtnText: { fontSize: 15, fontWeight: '700', color: colours.charcoalDark },
  rejectBtn: { backgroundColor: colours.white, borderWidth: 1.5, borderColor: colours.border },
  rejectBtnText: { fontSize: 15, fontWeight: '600', color: colours.textSecondary },
  closeBtn: { alignItems: 'center', padding: 12 },
  closeBtnText: { fontSize: 14, color: colours.textMuted },
});
