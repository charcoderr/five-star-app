import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { colours } from '../../utils/theme';
import { useAllReports } from '../../hooks/useAdmin';
import { SkeletonList } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';

const STATUS_CONFIG: Record<string, { label: string; colour: string }> = {
  submitted:          { label: 'To Review',          colour: colours.scoreFair },
  under_review:       { label: 'In Review',           colour: colours.gold },
  sent_to_restaurant: { label: 'Sent to Restaurant',  colour: colours.scoreGood },
  reviewed:           { label: 'Reviewed',            colour: colours.scoreGood },
};

export default function AdminReports() {
  const { data: reports, isLoading, refetch, isRefetching } = useAllReports();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reports</Text>
          <Text style={styles.headerSub}>Loading…</Text>
        </View>
        <SkeletonList count={5} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports</Text>
        <Text style={styles.headerSub}>{reports?.filter(r => r.status === 'submitted' || r.status === 'under_review').length ?? 0} to review</Text>
      </View>

      <FlatList
        data={reports}
        keyExtractor={item => item.id}
        contentContainerStyle={reports?.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colours.gold} />}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No reports yet"
            subtitle="Reports will appear here once diners submit them."
          />
        }
        renderItem={({ item }) => {
          const status = STATUS_CONFIG[item.status] ?? { label: item.status, colour: colours.textMuted };
          return (
            <TouchableOpacity
              style={[styles.card, item.status === 'submitted' && styles.cardHighlight]}
              onPress={() => router.push({ pathname: '/(admin)/report/[reportId]', params: { reportId: item.id } })}
            >
              <View style={styles.cardRow}>
                <View style={styles.cardInfo}>
                  <Text style={styles.restaurantName}>{item.restaurant?.name ?? '—'}</Text>
                  <Text style={styles.dinerName}>Diner: {item.diner?.name}</Text>
                  <Text style={styles.date}>
                    {item.submitted_at
                      ? new Date(item.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Not submitted'}
                  </Text>
                </View>
                <View>
                  <View style={[styles.statusBadge, { backgroundColor: status.colour + '22', borderColor: status.colour }]}>
                    <Text style={[styles.statusText, { color: status.colour }]}>{status.label}</Text>
                  </View>
                  {item.status === 'submitted' && <Text style={styles.reviewCta}>Tap to review →</Text>}
                </View>
              </View>
            </TouchableOpacity>
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
  cardHighlight: { borderLeftWidth: 4, borderLeftColor: colours.gold },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1, marginRight: 10 },
  restaurantName: { fontSize: 16, fontWeight: '700', color: colours.textPrimary },
  dinerName: { fontSize: 13, color: colours.textSecondary, marginTop: 2 },
  date: { fontSize: 12, color: colours.textMuted, marginTop: 4 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, alignSelf: 'flex-end' },
  statusText: { fontSize: 11, fontWeight: '700' },
  reviewCta: { fontSize: 11, color: colours.gold, fontWeight: '600', marginTop: 6, textAlign: 'right' },
});
