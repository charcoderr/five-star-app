import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { colours } from '../../utils/theme';
import { useAllVouchers } from '../../hooks/useVouchers';
import { formatVoucherExpiry } from '../../utils/voucher';
import { SkeletonList } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';

const STATUS_CONFIG: Record<string, { label: string; colour: string }> = {
  issued:   { label: 'Active',   colour: colours.scoreGood },
  redeemed: { label: 'Redeemed', colour: colours.charcoal },
  expired:  { label: 'Expired',  colour: colours.error },
};

export default function AdminVouchers() {
  const { data: vouchers, isLoading, refetch, isRefetching } = useAllVouchers();

  const active = vouchers?.filter(v => v.status === 'issued').length ?? 0;
  const redeemed = vouchers?.filter(v => v.status === 'redeemed').length ?? 0;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>All Vouchers</Text>
          <Text style={styles.headerSub}>Loading…</Text>
        </View>
        <SkeletonList count={5} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Vouchers</Text>
        <Text style={styles.headerSub}>{active} active · {redeemed} redeemed</Text>
      </View>

      <FlatList
        data={vouchers}
        keyExtractor={item => item.id}
        contentContainerStyle={vouchers?.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colours.gold} />}
        ListEmptyComponent={
          <EmptyState
            icon="ticket-outline"
            title="No vouchers yet"
            subtitle="Vouchers are issued automatically when assignments are confirmed."
          />
        }
        renderItem={({ item }) => {
          const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.issued;
          const restaurantName = item.assignment?.slot?.restaurant?.name ?? '—';
          return (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardInfo}>
                  <Text style={styles.dinerName}>{item.diner?.name}</Text>
                  <Text style={styles.restaurantName}>{restaurantName}</Text>
                  <Text style={styles.code}>{item.qr_code}</Text>
                  {(item as any).expires_at && (
                    <Text style={styles.expiry}>Expires {formatVoucherExpiry((item as any).expires_at)}</Text>
                  )}
                </View>
                <View style={styles.right}>
                  <Text style={styles.value}>£{Number(item.value).toFixed(0)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: status.colour + '22', borderColor: status.colour }]}>
                    <Text style={[styles.statusText, { color: status.colour }]}>{status.label}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: colours.white, borderBottomWidth: 1, borderBottomColor: colours.border },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colours.textPrimary },
  headerSub: { fontSize: 14, color: colours.textSecondary, marginTop: 2 },
  list: { padding: 16, gap: 10 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  card: { backgroundColor: colours.white, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardInfo: { flex: 1, marginRight: 12 },
  dinerName: { fontSize: 15, fontWeight: '700', color: colours.textPrimary },
  restaurantName: { fontSize: 13, color: colours.textSecondary, marginTop: 2 },
  code: { fontSize: 12, color: colours.textMuted, marginTop: 4, fontFamily: 'monospace', letterSpacing: 1 },
  expiry: { fontSize: 11, color: colours.textMuted, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 8 },
  value: { fontSize: 22, fontWeight: '800', color: colours.charcoalDark },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
});
