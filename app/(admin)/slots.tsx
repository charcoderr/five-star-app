import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Modal,
  TextInput, ScrollView, Platform,
} from 'react-native';
import { colours } from '../../utils/theme';
import { useAllSlots, useCreateSlot, useSlotAssignments } from '../../hooks/useSlots';
import { useIssueVoucher } from '../../hooks/useVouchers';
import { useAuthStore } from '../../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

const STATUS_COLOURS: Record<string, string> = {
  open:      colours.scoreGood,
  claimed:   colours.scoreFair,
  completed: colours.charcoal,
  cancelled: colours.error,
};

function useRestaurants() {
  return useQuery({
    queryKey: ['restaurants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('restaurants').select('id, name').order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });
}

function AssignmentsModal({ slotId, onClose }: { slotId: string; onClose: () => void }) {
  const { data: assignments, isLoading } = useSlotAssignments(slotId);
  const issueVoucher = useIssueVoucher();
  const [voucherValue, setVoucherValue] = useState<Record<string, string>>({});

  return (
    <View style={modalStyles.container}>
      <Text style={modalStyles.title}>Slot Claims</Text>
      {isLoading ? (
        <ActivityIndicator color={colours.gold} />
      ) : assignments?.length === 0 ? (
        <Text style={modalStyles.empty}>No claims yet.</Text>
      ) : (
        assignments?.map(a => (
          <View key={a.id} style={modalStyles.row}>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.dinerName}>{a.diner?.name}</Text>
              <Text style={modalStyles.dinerEmail}>{a.diner?.email}</Text>
              <Text style={[modalStyles.status, { color: STATUS_COLOURS[a.status] ?? colours.textMuted }]}>
                {a.status.toUpperCase()}
              </Text>
              {a.status === 'pending' && (
                <View style={modalStyles.voucherRow}>
                  <Text style={modalStyles.voucherLabel}>£ Voucher value</Text>
                  <TextInput
                    style={modalStyles.voucherInput}
                    placeholder="e.g. 40"
                    value={voucherValue[a.id] ?? ''}
                    onChangeText={v => setVoucherValue(prev => ({ ...prev, [a.id]: v }))}
                    keyboardType="number-pad"
                    placeholderTextColor={colours.textMuted}
                  />
                </View>
              )}
            </View>
            {a.status === 'pending' && (
              <TouchableOpacity
                style={modalStyles.confirmBtn}
                disabled={issueVoucher.isPending}
                onPress={async () => {
                  const value = parseFloat(voucherValue[a.id] ?? '0');
                  if (!value || value <= 0) {
                    Alert.alert('Enter a voucher value', 'Please set a £ value before confirming.');
                    return;
                  }
                  try {
                    await issueVoucher.mutateAsync({
                      assignmentId: a.id,
                      dinerId: a.diner_id,
                      value,
                    });
                    Alert.alert(
                      'Confirmed & Voucher Issued!',
                      `${a.diner?.name} has been confirmed and a £${value} voucher has been sent to their app.`
                    );
                    onClose();
                  } catch {
                    Alert.alert('Error', 'Could not confirm assignment. Please try again.');
                  }
                }}
              >
                {issueVoucher.isPending
                  ? <ActivityIndicator color={colours.charcoalDark} size="small" />
                  : <Text style={modalStyles.confirmBtnText}>Confirm + Issue Voucher</Text>}
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
      <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
        <Text style={modalStyles.closeBtnText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AdminSlots() {
  const { user } = useAuthStore();
  const { data: slots, isLoading, refetch, isRefetching } = useAllSlots();
  const { data: restaurants } = useRestaurants();
  const createSlot = useCreateSlot();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  // Create form state
  const [restaurantId, setRestaurantId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [maxCovers, setMaxCovers] = useState('2');

  async function handleCreate() {
    if (!restaurantId || !date || !time) {
      Alert.alert('Please fill in all fields');
      return;
    }
    try {
      await createSlot.mutateAsync({
        restaurant_id: restaurantId,
        date,
        time,
        max_covers: parseInt(maxCovers, 10) || 2,
        created_by: user!.id,
      });
      setShowCreate(false);
      setRestaurantId('');
      setDate('');
      setTime('');
      setMaxCovers('2');
      Alert.alert('Slot created!', 'The slot is now visible to all diners.');
    } catch {
      Alert.alert('Error', 'Could not create slot. Please try again.');
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colours.gold} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Slots</Text>
          <Text style={styles.headerSub}>{slots?.length ?? 0} total</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.addBtnText}>+ New Slot</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={slots}
        keyExtractor={item => item.id}
        contentContainerStyle={slots?.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colours.gold} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>No slots yet</Text>
            <Text style={styles.emptySub}>Tap "+ New Slot" to create the first one.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => item.status === 'claimed' ? setSelectedSlotId(item.id) : null}
          >
            <View style={styles.cardRow}>
              <View style={styles.cardInfo}>
                <Text style={styles.restaurantName}>{item.restaurant?.name}</Text>
                <Text style={styles.dateTime}>
                  {new Date(item.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · {item.time?.slice(0, 5)}
                </Text>
                <Text style={styles.covers}>👥 Up to {item.max_covers} guests</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOURS[item.status] ?? colours.textMuted) + '22', borderColor: STATUS_COLOURS[item.status] ?? colours.textMuted }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOURS[item.status] ?? colours.textMuted }]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
            {item.status === 'claimed' && (
              <Text style={styles.tapHint}>Tap to review claim →</Text>
            )}
          </TouchableOpacity>
        )}
      />

      {/* Create Slot Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={overlayStyles.overlay}>
          <ScrollView contentContainerStyle={overlayStyles.sheet}>
            <Text style={overlayStyles.title}>New Slot</Text>

            <Text style={overlayStyles.label}>Restaurant *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {restaurants?.map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={[overlayStyles.chip, restaurantId === r.id && overlayStyles.chipActive]}
                    onPress={() => setRestaurantId(r.id)}
                  >
                    <Text style={[overlayStyles.chipText, restaurantId === r.id && overlayStyles.chipTextActive]}>
                      {r.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={overlayStyles.label}>Date * (YYYY-MM-DD)</Text>
            <TextInput
              style={overlayStyles.input}
              placeholder="e.g. 2025-08-15"
              value={date}
              onChangeText={setDate}
              placeholderTextColor={colours.textMuted}
            />

            <Text style={overlayStyles.label}>Time * (HH:MM)</Text>
            <TextInput
              style={overlayStyles.input}
              placeholder="e.g. 19:30"
              value={time}
              onChangeText={setTime}
              placeholderTextColor={colours.textMuted}
            />

            <Text style={overlayStyles.label}>Max Covers</Text>
            <TextInput
              style={overlayStyles.input}
              placeholder="2"
              value={maxCovers}
              onChangeText={setMaxCovers}
              keyboardType="number-pad"
              placeholderTextColor={colours.textMuted}
            />

            <TouchableOpacity style={overlayStyles.createBtn} onPress={handleCreate} disabled={createSlot.isPending}>
              {createSlot.isPending ? (
                <ActivityIndicator color={colours.charcoalDark} />
              ) : (
                <Text style={overlayStyles.createBtnText}>Create Slot</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCreate(false)} style={overlayStyles.cancelBtn}>
              <Text style={overlayStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Assignments Modal */}
      <Modal visible={!!selectedSlotId} animationType="slide" transparent>
        <View style={overlayStyles.overlay}>
          <View style={overlayStyles.sheet}>
            {selectedSlotId && (
              <AssignmentsModal slotId={selectedSlotId} onClose={() => setSelectedSlotId(null)} />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colours.offWhite },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: colours.white, borderBottomWidth: 1, borderBottomColor: colours.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colours.textPrimary },
  headerSub: { fontSize: 13, color: colours.textSecondary, marginTop: 2 },
  addBtn: { backgroundColor: colours.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { fontSize: 14, fontWeight: '700', color: colours.charcoalDark },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  empty: { alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colours.textPrimary, textAlign: 'center' },
  emptySub: { fontSize: 14, color: colours.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  card: { backgroundColor: colours.white, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1, marginRight: 10 },
  restaurantName: { fontSize: 16, fontWeight: '700', color: colours.textPrimary },
  dateTime: { fontSize: 13, color: colours.textSecondary, marginTop: 3 },
  covers: { fontSize: 13, color: colours.textMuted, marginTop: 3 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  tapHint: { fontSize: 12, color: colours.gold, marginTop: 10, fontWeight: '600' },
});

const overlayStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colours.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 28, paddingBottom: 48 },
  title: { fontSize: 20, fontWeight: '700', color: colours.textPrimary, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: colours.textSecondary, marginBottom: 6 },
  input: { backgroundColor: colours.offWhite, borderWidth: 1, borderColor: colours.border, borderRadius: 10, padding: 13, fontSize: 15, color: colours.textPrimary, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colours.border, backgroundColor: colours.offWhite },
  chipActive: { borderColor: colours.gold, backgroundColor: colours.gold },
  chipText: { fontSize: 13, fontWeight: '600', color: colours.textSecondary },
  chipTextActive: { color: colours.charcoalDark },
  createBtn: { backgroundColor: colours.gold, borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 8 },
  createBtnText: { fontSize: 15, fontWeight: '700', color: colours.charcoalDark },
  cancelBtn: { alignItems: 'center', padding: 14 },
  cancelText: { fontSize: 14, color: colours.textMuted },
});

const modalStyles = StyleSheet.create({
  container: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700', color: colours.textPrimary, marginBottom: 16 },
  empty: { fontSize: 14, color: colours.textMuted, textAlign: 'center', paddingVertical: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colours.border },
  dinerName: { fontSize: 15, fontWeight: '700', color: colours.textPrimary },
  dinerEmail: { fontSize: 13, color: colours.textSecondary },
  status: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  voucherRow: { marginTop: 8 },
  voucherLabel: { fontSize: 12, fontWeight: '600', color: colours.textSecondary, marginBottom: 4 },
  voucherInput: { backgroundColor: colours.offWhite, borderWidth: 1, borderColor: colours.border, borderRadius: 8, padding: 8, fontSize: 15, color: colours.textPrimary, width: 120 },
  confirmBtn: { backgroundColor: colours.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-end', minWidth: 80, alignItems: 'center' },
  confirmBtnText: { fontSize: 12, fontWeight: '700', color: colours.charcoalDark },
  closeBtn: { alignItems: 'center', marginTop: 20, padding: 12 },
  closeBtnText: { fontSize: 14, color: colours.textMuted },
});
