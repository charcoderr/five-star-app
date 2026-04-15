import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colours } from '../../utils/theme';
import { useMyAssignments, useUpdateBooking } from '../../hooks/useSlots';
import { useAuthStore } from '../../stores/authStore';
import { SkeletonList } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';

const STATUS_LABELS: Record<string, { label: string; colour: string }> = {
  pending:   { label: 'Awaiting Approval', colour: colours.scoreFair },
  confirmed: { label: 'Approved',          colour: colours.scoreGood },
  completed: { label: 'Completed',         colour: colours.charcoal },
  cancelled: { label: 'Cancelled',         colour: colours.error },
};

export default function MyAssignments() {
  const { user } = useAuthStore();
  const { data: assignments, isLoading, refetch, isRefetching } = useMyAssignments(user?.id ?? '');
  const updateBooking = useUpdateBooking();
  const insets = useSafeAreaInsets();

  const [bookingAssignment, setBookingAssignment] = useState<any | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');

  const sortedAssignments = useMemo(() => {
    const order: Record<string, number> = { confirmed: 0, pending: 1, completed: 2, cancelled: 3 };
    return [...(assignments ?? [])].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  }, [assignments]);

  function openBookingFor(item: any) {
    setBookingAssignment(item);
    setBookingDate(item.booking_date ?? '');
    setBookingTime(item.booking_time?.slice(0, 5) ?? '');
    setBookingNotes(item.booking_notes ?? '');
  }

  async function handleSaveBooking() {
    if (!bookingAssignment || !bookingDate || !bookingTime) {
      Alert.alert('Date and time required', 'Please enter the date and time you booked with the restaurant.');
      return;
    }
    try {
      await updateBooking.mutateAsync({
        assignmentId: bookingAssignment.id,
        bookingDate,
        bookingTime,
        bookingNotes: bookingNotes || undefined,
      });
      setBookingAssignment(null);
      Alert.alert('Booking saved!', 'Your booking has been logged. You can now fill in your report after your visit.');
    } catch {
      Alert.alert('Error', 'Could not save your booking. Please try again.');
    }
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Dines</Text>
          <Text style={styles.headerSub}>Your current and past assignments</Text>
        </View>
        <SkeletonList count={3} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Dines</Text>
        <Text style={styles.headerSub}>Your current and past assignments</Text>
      </View>

      <FlatList
        data={sortedAssignments}
        keyExtractor={item => item.id}
        contentContainerStyle={sortedAssignments.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colours.gold} />}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="No assignments yet"
            subtitle="Head to Available Dines to claim your first slot."
            ctaLabel="Browse Available Dines"
            onCtaPress={() => router.push('/(diner)/home')}
          />
        }
        renderItem={({ item }) => {
          const status = STATUS_LABELS[item.status] ?? { label: item.status, colour: colours.textMuted };
          const slot = item.slot;
          const restaurant = slot?.restaurant;
          const hasBooking = !!item.booking_date;
          const canFillReport = item.status === 'confirmed';
          const needsBooking = item.status === 'confirmed' && !hasBooking;

          // Display date: prefer diner's booking, fall back to legacy fixed slot date
          const displayDate = item.booking_date ?? slot?.date;
          const displayTime = item.booking_time ?? slot?.time;

          return (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardInfo}>
                  <Text style={styles.restaurantName}>{restaurant?.name ?? '—'}</Text>
                  <Text style={styles.address} numberOfLines={1}>{restaurant?.address}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: status.colour + '22', borderColor: status.colour }]}>
                  <Text style={[styles.statusText, { color: status.colour }]}>{status.label}</Text>
                </View>
              </View>

              {needsBooking ? (
                <View style={styles.bookingPrompt}>
                  <Text style={styles.bookingPromptTitle}>Book directly with the restaurant</Text>
                  <Text style={styles.bookingPromptBody}>
                    {slot?.voucher_expiry ? `Your voucher is valid until ${new Date(slot.voucher_expiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}. ` : ''}
                    Once you've made a reservation, tap here to log the date and time.
                  </Text>
                  {slot?.notes ? <Text style={styles.slotNotes}>Wendy's notes: {slot.notes}</Text> : null}
                </View>
              ) : (
                <View style={styles.pills}>
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>
                      📅 {displayDate ? new Date(displayDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </Text>
                  </View>
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>🕐 {displayTime ? displayTime.slice(0, 5) : '—'}</Text>
                  </View>
                  {item.status === 'confirmed' && hasBooking && (
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); openBookingFor(item); }} style={styles.editBookingBtn}>
                      <Text style={styles.editBookingText}>Edit</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {needsBooking && (
                <TouchableOpacity style={styles.bookingBtn} onPress={() => openBookingFor(item)}>
                  <Text style={styles.bookingBtnText}>Enter your booking date & time →</Text>
                </TouchableOpacity>
              )}
              {canFillReport && (
                <TouchableOpacity
                  style={styles.reportBtn}
                  onPress={() => router.push({
                    pathname: '/(diner)/report/[assignmentId]',
                    params: { assignmentId: item.id, restaurantId: restaurant?.id ?? '', restaurantName: restaurant?.name ?? 'Restaurant' },
                  })}
                >
                  <Text style={styles.reportBtnText}>Fill in Report →</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      {/* Booking entry modal */}
      <Modal visible={!!bookingAssignment} animationType="slide" transparent>
        <KeyboardAvoidingView style={overlay.wrap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[overlay.sheet, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={overlay.title}>Enter your booking</Text>
              <Text style={overlay.subtitle}>{bookingAssignment?.slot?.restaurant?.name}</Text>
              <Text style={overlay.label}>Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={overlay.input}
                placeholder="2026-05-12"
                value={bookingDate}
                onChangeText={setBookingDate}
                placeholderTextColor={colours.textMuted}
              />
              <Text style={overlay.label}>Time * (HH:MM)</Text>
              <TextInput
                style={overlay.input}
                placeholder="19:30"
                value={bookingTime}
                onChangeText={setBookingTime}
                placeholderTextColor={colours.textMuted}
              />
              <Text style={overlay.label}>Notes (optional)</Text>
              <TextInput
                style={overlay.input}
                placeholder="e.g. booking name, party size"
                value={bookingNotes}
                onChangeText={setBookingNotes}
                placeholderTextColor={colours.textMuted}
                multiline
              />
              <TouchableOpacity style={overlay.saveBtn} onPress={handleSaveBooking} disabled={updateBooking.isPending}>
                {updateBooking.isPending
                  ? <ActivityIndicator color={colours.charcoalDark} />
                  : <Text style={overlay.saveText}>Save Booking</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setBookingAssignment(null)} style={overlay.cancelBtn}>
                <Text style={overlay.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: colours.white, borderBottomWidth: 1, borderBottomColor: colours.border },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colours.textPrimary },
  headerSub: { fontSize: 14, color: colours.textSecondary, marginTop: 2 },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  card: { backgroundColor: colours.white, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardInfo: { flex: 1, marginRight: 10 },
  restaurantName: { fontSize: 16, fontWeight: '700', color: colours.textPrimary },
  address: { fontSize: 13, color: colours.textMuted, marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  pills: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  pill: { backgroundColor: colours.offWhite, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  pillText: { fontSize: 12, color: colours.textSecondary, fontWeight: '600' },
  tapHint: { fontSize: 12, color: colours.gold, marginTop: 10, fontWeight: '600' },
  bookingPrompt: { backgroundColor: colours.gold + '11', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: colours.gold, marginTop: 4 },
  bookingPromptTitle: { fontSize: 13, fontWeight: '700', color: colours.textPrimary, marginBottom: 4 },
  bookingPromptBody: { fontSize: 12, color: colours.textSecondary, lineHeight: 17 },
  slotNotes: { fontSize: 12, color: colours.textSecondary, marginTop: 6, fontStyle: 'italic' },
  editBookingBtn: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4 },
  editBookingText: { fontSize: 12, color: colours.gold, fontWeight: '700' },
  bookingBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colours.gold + '18', borderRadius: 8, borderWidth: 1, borderColor: colours.gold },
  bookingBtnText: { fontSize: 13, fontWeight: '700', color: colours.gold },
  reportBtn: { marginTop: 10, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colours.gold, borderRadius: 10, alignItems: 'center' },
  reportBtnText: { fontSize: 14, fontWeight: '700', color: colours.charcoalDark },
});

const overlay = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colours.white, padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  title: { fontSize: 20, fontWeight: '700', color: colours.textPrimary },
  subtitle: { fontSize: 14, color: colours.textSecondary, marginTop: 4, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colours.textSecondary, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: colours.offWhite, borderWidth: 1, borderColor: colours.border, borderRadius: 8, padding: 10, fontSize: 15, color: colours.textPrimary },
  saveBtn: { backgroundColor: colours.gold, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveText: { fontSize: 15, fontWeight: '700', color: colours.charcoalDark },
  cancelBtn: { alignItems: 'center', padding: 14, marginTop: 4 },
  cancelText: { fontSize: 14, color: colours.textMuted },
});
