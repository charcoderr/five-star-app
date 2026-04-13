import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { colours } from '../../utils/theme';
import { useMyAssignments } from '../../hooks/useSlots';
import { useAuthStore } from '../../stores/authStore';

const STATUS_LABELS: Record<string, { label: string; colour: string }> = {
  pending:   { label: 'Awaiting Confirmation', colour: colours.scoreFair },
  confirmed: { label: 'Confirmed — Fill Report', colour: colours.scoreGood },
  completed: { label: 'Completed',              colour: colours.charcoal },
  cancelled: { label: 'Cancelled',              colour: colours.error },
};

export default function MyAssignments() {
  const { user } = useAuthStore();
  const { data: assignments, isLoading, refetch, isRefetching } = useMyAssignments(user?.id ?? '');

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
        <Text style={styles.headerTitle}>My Dines</Text>
        <Text style={styles.headerSub}>Your current and past assignments</Text>
      </View>

      <FlatList
        data={assignments}
        keyExtractor={item => item.id}
        contentContainerStyle={assignments?.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colours.gold} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No assignments yet</Text>
            <Text style={styles.emptySub}>Head to Available Dines to claim your first slot.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const status = STATUS_LABELS[item.status] ?? { label: item.status, colour: colours.textMuted };
          const slot = item.slot;
          const restaurant = slot?.restaurant;
          const canFillReport = item.status === 'confirmed';

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                if (canFillReport) {
                  router.push({
                    pathname: '/(diner)/report/[assignmentId]',
                    params: {
                      assignmentId: item.id,
                      restaurantId: restaurant?.id ?? '',
                      restaurantName: restaurant?.name ?? 'Restaurant',
                    },
                  });
                }
              }}
              disabled={!canFillReport}
            >
              <View style={styles.cardRow}>
                <View style={styles.cardInfo}>
                  <Text style={styles.restaurantName}>{restaurant?.name ?? '—'}</Text>
                  <Text style={styles.address} numberOfLines={1}>{restaurant?.address}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: status.colour + '22', borderColor: status.colour }]}>
                  <Text style={[styles.statusText, { color: status.colour }]}>{status.label}</Text>
                </View>
              </View>
              <View style={styles.pills}>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>
                    📅 {slot?.date ? new Date(slot.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>🕐 {slot?.time?.slice(0, 5) ?? '—'}</Text>
                </View>
              </View>
              {canFillReport && (
                <Text style={styles.tapHint}>Tap to fill in your report →</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colours.offWhite },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: colours.white, borderBottomWidth: 1, borderBottomColor: colours.border },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colours.textPrimary },
  headerSub: { fontSize: 14, color: colours.textSecondary, marginTop: 2 },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  empty: { alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colours.textPrimary, textAlign: 'center' },
  emptySub: { fontSize: 14, color: colours.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  card: { backgroundColor: colours.white, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardInfo: { flex: 1, marginRight: 10 },
  restaurantName: { fontSize: 16, fontWeight: '700', color: colours.textPrimary },
  address: { fontSize: 13, color: colours.textMuted, marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { backgroundColor: colours.offWhite, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  pillText: { fontSize: 12, color: colours.textSecondary, fontWeight: '600' },
  tapHint: { fontSize: 12, color: colours.gold, marginTop: 10, fontWeight: '600' },
});
