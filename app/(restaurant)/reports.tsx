import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { colours } from '../../utils/theme';
import { useAuthStore } from '../../stores/authStore';
import { useRestaurantReports } from '../../hooks/useRestaurantPortal';
import { StatusPill } from '../../components/StatusPill';
import { EmptyState } from '../../components/EmptyState';
import { SearchFilterBar } from '../../components/SearchFilterBar';
import { REPORT_STATUS, getStatus } from '../../utils/statusColors';

type SortKey = 'newest' | 'oldest' | 'highest' | 'lowest';

const SORT_CHIPS = [
  { key: 'newest',  label: 'Newest' },
  { key: 'oldest',  label: 'Oldest' },
  { key: 'highest', label: 'Highest rated' },
  { key: 'lowest',  label: 'Lowest rated' },
];

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function starRating(answers: Record<string, any>): { stars: number; total: number; max: number } {
  const scored = Object.values(answers ?? {}).filter((a: any) => a?.score !== undefined);
  if (scored.length === 0) return { stars: 0, total: 0, max: 0 };
  const total = scored.reduce((s: number, a: any) => s + (a.score ?? 0), 0);
  const max = scored.length * 3;
  return { stars: (total / max) * 5, total, max };
}

export default function RestaurantReports() {
  const { user } = useAuthStore();
  const restaurantId = (user as any)?.restaurant_id ?? '';
  const { data, isLoading, refetch, isRefetching } = useRestaurantReports(restaurantId);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');

  const items = useMemo(() => {
    const list = (data ?? []).map((r: any) => {
      const rating = starRating(r.answers ?? {});
      const visitDate = r.assignment?.slot?.date ?? null;
      return {
        id: r.id,
        status: r.status as string,
        submittedAt: r.submitted_at as string | null,
        visitDate: visitDate as string | null,
        stars: rating.stars,
        total: rating.total,
        max: rating.max,
      };
    });

    const q = query.trim().toLowerCase();
    const filtered = q
      ? list.filter(r =>
          (r.visitDate ?? '').toLowerCase().includes(q)
          || (r.submittedAt ?? '').toLowerCase().includes(q),
        )
      : list;

    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case 'oldest':  return (a.submittedAt ?? '').localeCompare(b.submittedAt ?? '');
        case 'highest': return b.stars - a.stars;
        case 'lowest':  return a.stars - b.stars;
        case 'newest':
        default:        return (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '');
      }
    });

    return sorted;
  }, [data, query, sort]);

  if (!restaurantId) {
    return (
      <View style={styles.centered}>
        <EmptyState
          icon="pricetag-outline"
          title="No restaurant linked"
          subtitle="Ask Wendy to link your account to your restaurant."
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colours.gold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports</Text>
        <Text style={styles.headerSub}>
          {items.length} reviewed report{items.length === 1 ? '' : 's'}
        </Text>
      </View>

      <SearchFilterBar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search by date..."
        chips={SORT_CHIPS}
        activeKey={sort}
        onChipPress={k => setSort(k as SortKey)}
      />

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colours.gold} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No reports yet"
            subtitle="Completed mystery-diner reports will appear here once Wendy has reviewed them."
          />
        }
        renderItem={({ item }) => {
          const stars = Math.round(item.stars);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: '/(restaurant)/report/[reportId]',
                  params: { reportId: item.id },
                })
              }
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {item.visitDate ? formatDate(item.visitDate) : 'Visit date unknown'}
                  </Text>
                  <Text style={styles.cardSub}>Reviewed {formatDate(item.submittedAt)}</Text>
                </View>
                <StatusPill status={getStatus(REPORT_STATUS, item.status)} size="sm" />
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.stars}>
                  {item.max > 0 ? '★'.repeat(stars) + '☆'.repeat(5 - stars) : 'No score'}
                </Text>
                <Text style={styles.scoreDetail}>
                  {item.max > 0 ? `${item.total} / ${item.max} pts` : '—'}
                </Text>
                <Text style={styles.viewCta}>View →</Text>
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colours.offWhite },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: colours.white },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colours.textPrimary },
  headerSub: { fontSize: 13, color: colours.textSecondary, marginTop: 2 },
  list: { padding: 16, gap: 10 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  card: { backgroundColor: colours.white, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2, gap: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colours.textPrimary },
  cardSub: { fontSize: 12, color: colours.textMuted, marginTop: 2 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: colours.border, paddingTop: 10 },
  stars: { fontSize: 16, color: colours.gold },
  scoreDetail: { fontSize: 12, color: colours.textSecondary, flex: 1 },
  viewCta: { fontSize: 13, fontWeight: '700', color: colours.gold },
});
