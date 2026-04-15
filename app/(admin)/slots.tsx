import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Modal,
  TextInput, ScrollView,
} from 'react-native';
import { colours } from '../../utils/theme';
import { useAllSlots, useCreateSlot, useSlotAssignments, useUpdateSlot, useCancelSlot } from '../../hooks/useSlots';
import { useIssueVoucher } from '../../hooks/useVouchers';
import { useAuthStore } from '../../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useNotifyDinersForSlot, useNotifyDinersForSlots } from '../../hooks/useSmartNotify';
import { useAllWaitlistCounts, useSlotWaitlist, useNotifyWaitlist } from '../../hooks/useWaitlist';
import { useDinerNotes } from '../../hooks/useCrm';

const STATUS_COLOURS: Record<string, string> = {
  open:      colours.scoreGood,
  claimed:   colours.scoreFair,
  completed: colours.charcoal,
  cancelled: colours.error,
};

const WEEKDAYS = [
  { label: 'Mon', day: 1 }, { label: 'Tue', day: 2 }, { label: 'Wed', day: 3 },
  { label: 'Thu', day: 4 }, { label: 'Fri', day: 5 }, { label: 'Sat', day: 6 }, { label: 'Sun', day: 0 },
];

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

function generateSlotDates(startDate: string, endDate: string, weekdays: number[]): string[] {
  if (!startDate || !endDate || weekdays.length === 0) return [];
  const dates: string[] = [];
  const current = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  if (isNaN(current.getTime()) || isNaN(end.getTime())) return [];
  while (current <= end) {
    if (weekdays.includes(current.getDay())) dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function DinerNotesInline({ dinerId }: { dinerId: string }) {
  const { data: notes, isLoading } = useDinerNotes(dinerId);
  if (isLoading) return null;
  if (!notes || notes.length === 0) return null;
  const recent = notes.slice(0, 3);
  return (
    <View style={modalStyles.notesBlock}>
      <Text style={modalStyles.notesHeader}>Diner notes ({notes.length})</Text>
      {recent.map(n => (
        <View key={n.id} style={modalStyles.noteRow}>
          <Text style={modalStyles.noteType}>{n.note_type}</Text>
          <Text style={modalStyles.noteBody}>{n.body}</Text>
        </View>
      ))}
      {notes.length > 3 && (
        <Text style={modalStyles.notesMore}>+{notes.length - 3} older</Text>
      )}
    </View>
  );
}

function AssignmentsModal({
  slotId,
  slot,
  onClose,
}: {
  slotId: string;
  slot?: { date: string; time: string; restaurant?: { name: string } };
  onClose: () => void;
}) {
  const { data: assignments, isLoading } = useSlotAssignments(slotId);
  const { data: waitlist } = useSlotWaitlist(slotId);
  const notifyWaitlist = useNotifyWaitlist();
  const issueVoucher = useIssueVoucher();
  const [voucherValue, setVoucherValue] = useState<Record<string, string>>({});

  async function handleNotifyWaitlist() {
    if (!slot) return;
    try {
      const result = await notifyWaitlist.mutateAsync({
        slotId,
        restaurantName: slot.restaurant?.name ?? 'this restaurant',
        slotDate: slot.date,
        slotTime: slot.time,
      });
      Alert.alert('Notified!', `${result.notified} diner${result.notified !== 1 ? 's' : ''} on the waitlist have been alerted.`);
    } catch {
      Alert.alert('Error', 'Could not send notifications.');
    }
  }

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
              <DinerNotesInline dinerId={a.diner_id} />
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
                    await issueVoucher.mutateAsync({ assignmentId: a.id, dinerId: a.diner_id, value });
                    Alert.alert('Confirmed & Voucher Issued!', `${a.diner?.name} confirmed and a £${value} voucher sent.`);
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

      {/* Waitlist section */}
      {waitlist && waitlist.length > 0 && (
        <View style={modalStyles.waitlistSection}>
          <View style={modalStyles.waitlistHeader}>
            <Text style={modalStyles.waitlistTitle}>Waitlist ({waitlist.length})</Text>
            <TouchableOpacity
              style={modalStyles.notifyBtn}
              onPress={handleNotifyWaitlist}
              disabled={notifyWaitlist.isPending}
            >
              {notifyWaitlist.isPending
                ? <ActivityIndicator color={colours.charcoalDark} size="small" />
                : <Text style={modalStyles.notifyBtnText}>Notify All</Text>}
            </TouchableOpacity>
          </View>
          {waitlist.map((w, i) => (
            <View key={w.id} style={modalStyles.waitlistRow}>
              <Text style={modalStyles.waitlistPosition}>#{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={modalStyles.waitlistName}>{w.diner?.name}</Text>
                <Text style={modalStyles.waitlistEmail}>{w.diner?.email}</Text>
              </View>
            </View>
          ))}
        </View>
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
  const { data: waitlistCounts } = useAllWaitlistCounts();
  const createSlot = useCreateSlot();
  const updateSlot = useUpdateSlot();
  const cancelSlot = useCancelSlot();
  const notifySlot = useNotifyDinersForSlot();
  const notifySlots = useNotifyDinersForSlots();

  const [search, setSearch] = useState('');

  const sortedSlots = useMemo(() => {
    const statusOrder: Record<string, number> = { open: 0, claimed: 1, completed: 2, cancelled: 3 };
    return [...(slots ?? [])]
      .filter(s => !search || s.restaurant?.name?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const statusDiff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
        if (statusDiff !== 0) return statusDiff;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
  }, [slots, search]);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [editingSlot, setEditingSlot] = useState<any | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editMaxCovers, setEditMaxCovers] = useState('2');
  const [restaurantId, setRestaurantId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [maxCovers, setMaxCovers] = useState('2');

  const [showBulk, setShowBulk] = useState(false);
  const [bulkRestaurantId, setBulkRestaurantId] = useState('');
  const [bulkWeekdays, setBulkWeekdays] = useState<number[]>([]);
  const [bulkTime, setBulkTime] = useState('');
  const [bulkMaxCovers, setBulkMaxCovers] = useState('2');
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkCreating, setBulkCreating] = useState(false);

  const bulkPreviewDates = useMemo(
    () => generateSlotDates(bulkStartDate, bulkEndDate, bulkWeekdays),
    [bulkStartDate, bulkEndDate, bulkWeekdays]
  );

  function toggleWeekday(day: number) {
    setBulkWeekdays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }

  function resetSingleForm() { setRestaurantId(''); setDate(''); setTime(''); setMaxCovers('2'); }
  function resetBulkForm() { setBulkRestaurantId(''); setBulkWeekdays([]); setBulkTime(''); setBulkMaxCovers('2'); setBulkStartDate(''); setBulkEndDate(''); }

  function openEdit(slot: any) {
    setEditingSlot(slot);
    setEditDate(slot.date ?? '');
    setEditTime(slot.time?.slice(0, 5) ?? '');
    setEditMaxCovers(String(slot.max_covers ?? 2));
  }

  async function handleSaveEdit() {
    if (!editingSlot || !editDate || !editTime) { Alert.alert('Fill in all fields'); return; }
    try {
      await updateSlot.mutateAsync({ id: editingSlot.id, date: editDate, time: editTime, max_covers: parseInt(editMaxCovers, 10) || 2 });
      setEditingSlot(null);
    } catch {
      Alert.alert('Error', 'Could not update slot.');
    }
  }

  function handleCancelSlot(slot: any) {
    Alert.alert(
      'Cancel Slot?',
      `Cancel the slot at ${slot.restaurant?.name ?? 'this restaurant'} on ${new Date(slot.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Slot',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelSlot.mutateAsync(slot.id);
            } catch {
              Alert.alert('Error', 'Could not cancel slot.');
            }
          },
        },
      ]
    );
  }

  function offerNotify(slotId: string, rId: string, slotDate: string, slotTime: string) {
    const restaurant = restaurants?.find(r => r.id === rId);
    Alert.alert(
      'Slot created!',
      `Notify matching diners? (active diners who haven't visited ${restaurant?.name ?? 'this restaurant'} recently)`,
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Notify',
          onPress: async () => {
            try {
              const result = await notifySlot.mutateAsync({
                restaurantId: rId,
                restaurantName: restaurant?.name ?? '',
                slotDate,
                slotTime,
                slotId,
              });
              Alert.alert('Sent!', `${result.notified} diner${result.notified !== 1 ? 's' : ''} notified.`);
            } catch {
              Alert.alert('Error', 'Could not send notifications. The slot was still created.');
            }
          },
        },
      ]
    );
  }

  async function handleCreate() {
    if (!restaurantId || !date || !time) { Alert.alert('Please fill in all fields'); return; }
    try {
      const created = await createSlot.mutateAsync({
        restaurant_id: restaurantId, date, time,
        max_covers: parseInt(maxCovers, 10) || 2,
        created_by: user!.id,
      });
      setShowCreate(false);
      const savedId = restaurantId;
      const savedDate = date;
      const savedTime = time;
      resetSingleForm();
      offerNotify(created.id, savedId, savedDate, savedTime);
    } catch {
      Alert.alert('Error', 'Could not create slot. Please try again.');
    }
  }

  async function handleBulkCreate() {
    if (!bulkRestaurantId || bulkWeekdays.length === 0 || !bulkTime || !bulkStartDate || !bulkEndDate) {
      Alert.alert('Missing fields', 'Please fill in restaurant, day(s), time, and date range.');
      return;
    }
    if (bulkPreviewDates.length === 0) {
      Alert.alert('No dates', 'The selected days produce no dates in the given range.');
      return;
    }
    if (bulkPreviewDates.length > 52) {
      Alert.alert('Too many slots', `This would create ${bulkPreviewDates.length} slots. Narrow the range.`);
      return;
    }
    setBulkCreating(true);
    try {
      const covers = parseInt(bulkMaxCovers, 10) || 2;
      const createdSlots = await Promise.all(
        bulkPreviewDates.map(d => createSlot.mutateAsync({
          restaurant_id: bulkRestaurantId, date: d, time: bulkTime,
          max_covers: covers, created_by: user!.id,
        }))
      );
      setShowBulk(false);
      const savedId = bulkRestaurantId;
      resetBulkForm();
      const restaurant = restaurants?.find(r => r.id === savedId);
      Alert.alert(
        `${createdSlots.length} slots created!`,
        `Notify matching diners about the new slots at ${restaurant?.name ?? 'this restaurant'}?`,
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Notify',
            onPress: async () => {
              try {
                const result = await notifySlots.mutateAsync(
                  createdSlots.map(s => ({
                    restaurantId: savedId,
                    restaurantName: restaurant?.name ?? '',
                    slotId: s.id,
                  }))
                );
                Alert.alert('Sent!', `${result.notified} diner${result.notified !== 1 ? 's' : ''} notified.`);
              } catch {
                Alert.alert('Error', 'Could not send notifications. Slots were still created.');
              }
            },
          },
        ]
      );
    } catch {
      Alert.alert('Error', 'Some slots could not be created. Please try again.');
    } finally {
      setBulkCreating(false);
    }
  }

  if (isLoading) return <View style={styles.centered}><ActivityIndicator color={colours.gold} size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Slots</Text>
          <Text style={styles.headerSub}>{slots?.length ?? 0} total</Text>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.bulkBtn} onPress={() => setShowBulk(true)}>
            <Text style={styles.bulkBtnText}>Bulk</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurants..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colours.textMuted}
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={sortedSlots}
        keyExtractor={item => item.id}
        contentContainerStyle={sortedSlots.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colours.gold} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>No slots yet</Text>
            <Text style={styles.emptySub}>Tap "+ New" or "Bulk" to create slots.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const waitingCount = waitlistCounts?.[item.id] ?? 0;
          const canEdit = item.status === 'open';
          const canCancel = item.status === 'open' || item.status === 'claimed';
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => item.status === 'claimed' ? setSelectedSlot(item) : null}
              activeOpacity={item.status === 'claimed' ? 0.7 : 1}
            >
              <View style={styles.cardRow}>
                <View style={styles.cardInfo}>
                  <Text style={styles.restaurantName}>{item.restaurant?.name}</Text>
                  <Text style={styles.dateTime}>
                    {new Date(item.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · {item.time?.slice(0, 5)}
                  </Text>
                  <Text style={styles.covers}>Up to {item.max_covers} guests</Text>
                </View>
                <View style={styles.cardRight}>
                  <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOURS[item.status] ?? colours.textMuted) + '22', borderColor: STATUS_COLOURS[item.status] ?? colours.textMuted }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOURS[item.status] ?? colours.textMuted }]}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                  {waitingCount > 0 && (
                    <View style={styles.waitlistBadge}>
                      <Text style={styles.waitlistBadgeText}>{waitingCount} waiting</Text>
                    </View>
                  )}
                </View>
              </View>
              {item.status === 'claimed' && (
                <Text style={styles.tapHint}>Tap to review claim →</Text>
              )}
              {(canEdit || canCancel) && (
                <View style={styles.cardActions}>
                  {canEdit && (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
                      <Text style={styles.actionBtnText}>Edit</Text>
                    </TouchableOpacity>
                  )}
                  {canCancel && (
                    <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleCancelSlot(item)}>
                      <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>Cancel Slot</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Single Slot Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={overlayStyles.overlay}>
          <ScrollView contentContainerStyle={overlayStyles.sheet}>
            <Text style={overlayStyles.title}>New Slot</Text>
            <Text style={overlayStyles.label}>Restaurant *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {restaurants?.map(r => (
                  <TouchableOpacity key={r.id} style={[overlayStyles.chip, restaurantId === r.id && overlayStyles.chipActive]} onPress={() => setRestaurantId(r.id)}>
                    <Text style={[overlayStyles.chipText, restaurantId === r.id && overlayStyles.chipTextActive]}>{r.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={overlayStyles.label}>Voucher Expiry Deadline * (YYYY-MM-DD)</Text>
            <TextInput style={overlayStyles.input} placeholder="e.g. 2025-08-15" value={date} onChangeText={setDate} placeholderTextColor={colours.textMuted} />
            <Text style={overlayStyles.label}>Notes</Text>
            <TextInput style={overlayStyles.input} placeholder="e.g. Dinner for 2, any day in April" value={time} onChangeText={setTime} placeholderTextColor={colours.textMuted} />
            <Text style={overlayStyles.label}>Max Covers</Text>
            <TextInput style={overlayStyles.input} placeholder="2" value={maxCovers} onChangeText={setMaxCovers} keyboardType="number-pad" placeholderTextColor={colours.textMuted} />
            <TouchableOpacity style={overlayStyles.createBtn} onPress={handleCreate} disabled={createSlot.isPending}>
              {createSlot.isPending ? <ActivityIndicator color={colours.charcoalDark} /> : <Text style={overlayStyles.createBtnText}>Create Slot</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowCreate(false); resetSingleForm(); }} style={overlayStyles.cancelBtn}>
              <Text style={overlayStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Bulk Slot Modal */}
      <Modal visible={showBulk} animationType="slide" transparent>
        <View style={overlayStyles.overlay}>
          <ScrollView contentContainerStyle={overlayStyles.sheet}>
            <Text style={overlayStyles.title}>Bulk Create Slots</Text>
            <Text style={overlayStyles.subtitle}>Create recurring slots by selecting day(s) and a date range.</Text>
            <Text style={overlayStyles.label}>Restaurant *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {restaurants?.map(r => (
                  <TouchableOpacity key={r.id} style={[overlayStyles.chip, bulkRestaurantId === r.id && overlayStyles.chipActive]} onPress={() => setBulkRestaurantId(r.id)}>
                    <Text style={[overlayStyles.chipText, bulkRestaurantId === r.id && overlayStyles.chipTextActive]}>{r.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={overlayStyles.label}>Day(s) of week *</Text>
            <View style={overlayStyles.weekdayRow}>
              {WEEKDAYS.map(w => (
                <TouchableOpacity key={w.day} style={[overlayStyles.dayChip, bulkWeekdays.includes(w.day) && overlayStyles.dayChipActive]} onPress={() => toggleWeekday(w.day)}>
                  <Text style={[overlayStyles.dayChipText, bulkWeekdays.includes(w.day) && overlayStyles.dayChipTextActive]}>{w.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={overlayStyles.label}>Time * (HH:MM)</Text>
            <TextInput style={overlayStyles.input} placeholder="e.g. 19:30" value={bulkTime} onChangeText={setBulkTime} placeholderTextColor={colours.textMuted} />
            <Text style={overlayStyles.label}>Max Covers</Text>
            <TextInput style={overlayStyles.input} placeholder="2" value={bulkMaxCovers} onChangeText={setBulkMaxCovers} keyboardType="number-pad" placeholderTextColor={colours.textMuted} />
            <Text style={overlayStyles.label}>Start Date * (YYYY-MM-DD)</Text>
            <TextInput style={overlayStyles.input} placeholder="e.g. 2025-09-01" value={bulkStartDate} onChangeText={setBulkStartDate} placeholderTextColor={colours.textMuted} />
            <Text style={overlayStyles.label}>End Date * (YYYY-MM-DD)</Text>
            <TextInput style={overlayStyles.input} placeholder="e.g. 2025-11-30" value={bulkEndDate} onChangeText={setBulkEndDate} placeholderTextColor={colours.textMuted} />
            {bulkPreviewDates.length > 0 && (
              <View style={overlayStyles.previewBox}>
                <Text style={overlayStyles.previewText}>✓ This will create <Text style={{ fontWeight: '700' }}>{bulkPreviewDates.length} slots</Text></Text>
                <Text style={overlayStyles.previewSub}>{bulkPreviewDates[0]} → {bulkPreviewDates[bulkPreviewDates.length - 1]}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[overlayStyles.createBtn, bulkPreviewDates.length === 0 && overlayStyles.createBtnDisabled]}
              onPress={handleBulkCreate}
              disabled={bulkCreating || bulkPreviewDates.length === 0}
            >
              {bulkCreating ? <ActivityIndicator color={colours.charcoalDark} /> : <Text style={overlayStyles.createBtnText}>Create {bulkPreviewDates.length > 0 ? `${bulkPreviewDates.length} ` : ''}Slots</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowBulk(false); resetBulkForm(); }} style={overlayStyles.cancelBtn}>
              <Text style={overlayStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Slot Modal */}
      <Modal visible={!!editingSlot} animationType="slide" transparent>
        <View style={overlayStyles.overlay}>
          <ScrollView contentContainerStyle={overlayStyles.sheet}>
            <Text style={overlayStyles.title}>Edit Slot</Text>
            <Text style={overlayStyles.subtitle}>{editingSlot?.restaurant?.name}</Text>
            <Text style={overlayStyles.label}>Date * (YYYY-MM-DD)</Text>
            <TextInput style={overlayStyles.input} value={editDate} onChangeText={setEditDate} placeholderTextColor={colours.textMuted} />
            <Text style={overlayStyles.label}>Time * (HH:MM)</Text>
            <TextInput style={overlayStyles.input} value={editTime} onChangeText={setEditTime} placeholderTextColor={colours.textMuted} />
            <Text style={overlayStyles.label}>Max Covers</Text>
            <TextInput style={overlayStyles.input} value={editMaxCovers} onChangeText={setEditMaxCovers} keyboardType="number-pad" placeholderTextColor={colours.textMuted} />
            <TouchableOpacity style={overlayStyles.createBtn} onPress={handleSaveEdit} disabled={updateSlot.isPending}>
              {updateSlot.isPending ? <ActivityIndicator color={colours.charcoalDark} /> : <Text style={overlayStyles.createBtnText}>Save Changes</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditingSlot(null)} style={overlayStyles.cancelBtn}>
              <Text style={overlayStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Assignments + Waitlist Modal */}
      <Modal visible={!!selectedSlot} animationType="slide" transparent>
        <View style={overlayStyles.overlay}>
          <ScrollView contentContainerStyle={overlayStyles.sheet}>
            {selectedSlot && (
              <AssignmentsModal
                slotId={selectedSlot.id}
                slot={selectedSlot}
                onClose={() => setSelectedSlot(null)}
              />
            )}
          </ScrollView>
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
  headerBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  bulkBtn: { backgroundColor: colours.offWhite, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: colours.gold },
  bulkBtnText: { fontSize: 14, fontWeight: '700', color: colours.gold },
  addBtn: { backgroundColor: colours.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { fontSize: 14, fontWeight: '700', color: colours.charcoalDark },
  searchBar: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colours.white, borderBottomWidth: 1, borderBottomColor: colours.border },
  searchInput: { backgroundColor: colours.offWhite, borderWidth: 1, borderColor: colours.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, color: colours.textPrimary },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  empty: { alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colours.textPrimary, textAlign: 'center' },
  emptySub: { fontSize: 14, color: colours.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  card: { backgroundColor: colours.white, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1, marginRight: 10 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  restaurantName: { fontSize: 16, fontWeight: '700', color: colours.textPrimary },
  dateTime: { fontSize: 13, color: colours.textSecondary, marginTop: 3 },
  covers: { fontSize: 13, color: colours.textMuted, marginTop: 3 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  waitlistBadge: { backgroundColor: colours.scoreFair + '22', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colours.scoreFair },
  waitlistBadgeText: { fontSize: 10, fontWeight: '700', color: colours.scoreFair },
  tapHint: { fontSize: 12, color: colours.gold, marginTop: 10, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colours.border },
  actionBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1.5, borderColor: colours.gold, backgroundColor: colours.offWhite },
  actionBtnDanger: { borderColor: colours.error, backgroundColor: colours.offWhite },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: colours.gold },
  actionBtnTextDanger: { color: colours.error },
});

const overlayStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colours.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 28, paddingBottom: 48 },
  title: { fontSize: 20, fontWeight: '700', color: colours.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 13, color: colours.textSecondary, marginBottom: 20, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '600', color: colours.textSecondary, marginBottom: 6 },
  input: { backgroundColor: colours.offWhite, borderWidth: 1, borderColor: colours.border, borderRadius: 10, padding: 13, fontSize: 15, color: colours.textPrimary, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colours.border, backgroundColor: colours.offWhite },
  chipActive: { borderColor: colours.gold, backgroundColor: colours.gold },
  chipText: { fontSize: 13, fontWeight: '600', color: colours.textSecondary },
  chipTextActive: { color: colours.charcoalDark },
  weekdayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  dayChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: colours.border, backgroundColor: colours.offWhite, minWidth: 48, alignItems: 'center' },
  dayChipActive: { borderColor: colours.gold, backgroundColor: colours.gold },
  dayChipText: { fontSize: 13, fontWeight: '700', color: colours.textSecondary },
  dayChipTextActive: { color: colours.charcoalDark },
  previewBox: { backgroundColor: colours.scoreGood + '18', borderRadius: 10, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: colours.scoreGood },
  previewText: { fontSize: 14, color: colours.textPrimary },
  previewSub: { fontSize: 12, color: colours.textSecondary, marginTop: 3 },
  createBtn: { backgroundColor: colours.gold, borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 8 },
  createBtnDisabled: { opacity: 0.5 },
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
  waitlistSection: { marginTop: 20, borderTopWidth: 1, borderTopColor: colours.border, paddingTop: 16 },
  waitlistHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  waitlistTitle: { fontSize: 14, fontWeight: '700', color: colours.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  notifyBtn: { backgroundColor: colours.gold, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  notifyBtnText: { fontSize: 12, fontWeight: '700', color: colours.charcoalDark },
  waitlistRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colours.border },
  waitlistPosition: { fontSize: 14, fontWeight: '700', color: colours.gold, width: 24 },
  waitlistName: { fontSize: 14, fontWeight: '600', color: colours.textPrimary },
  waitlistEmail: { fontSize: 12, color: colours.textSecondary, marginTop: 1 },
  closeBtn: { alignItems: 'center', marginTop: 20, padding: 12 },
  closeBtnText: { fontSize: 14, color: colours.textMuted },
  notesBlock: { marginTop: 8, padding: 8, backgroundColor: colours.offWhite, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: colours.gold },
  notesHeader: { fontSize: 11, fontWeight: '700', color: colours.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  noteRow: { marginTop: 4 },
  noteType: { fontSize: 10, fontWeight: '700', color: colours.gold, textTransform: 'uppercase' },
  noteBody: { fontSize: 12, color: colours.textPrimary, marginTop: 1 },
  notesMore: { fontSize: 11, color: colours.textMuted, marginTop: 4, fontStyle: 'italic' },
});
