import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { colours } from '../../utils/theme';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import {
  useRestaurantStats,
  useRestaurantActivity,
} from '../../hooks/useRestaurantPortal';
import { StatusPill } from '../../components/StatusPill';
import { EmptyState } from '../../components/EmptyState';
import {
  SLOT_STATUS,
  REPORT_STATUS,
  getStatus,
} from '../../utils/statusColors';
import { useSubscriptionStatus } from '../../hooks/useSubscription';
import { useScoreTrend, usePlatformBenchmark } from '../../hooks/useTrends';
import { TrendChart } from '../../components/TrendChart';

function StatCard({
  value,
  label,
  accent,
  onPress,
}: {
  value: string | number;
  label: string;
  accent?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.statCard, accent && styles.statCardAccent]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
      <Text style={[styles.statLabel, accent && styles.statLabelAccent]}>{label}</Text>
    </TouchableOpacity>
  );
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export default function RestaurantDashboard() {
  const { user } = useAuthStore();
  const restaurantId = (user as any)?.restaurant_id ?? '';

  const { data: stats, isLoading, refetch, isRefetching } = useRestaurantStats(restaurantId);
  const { data: activity } = useRestaurantActivity(restaurantId, 6);
  const { data: sub } = useSubscriptionStatus(restaurantId || undefined);
  const { data: trendData } = useScoreTrend(restaurantId || undefined);
  const { data: benchmark } = usePlatformBenchmark();
  const { width } = useWindowDimensions();

  if (!restaurantId) {
    return (
      <View style={styles.centered}>
        <EmptyState
          icon="pricetag-outline"
          title="No restaurant linked"
          subtitle="Your account isn't linked to a restaurant yet. Ask Wendy to set this up from the admin panel."
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

  const rating = stats?.avgRating;
  const ratingDisplay = rating != null ? rating.toFixed(1) : '—';
  const ratingStars = rating != null
    ? '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating))
    : '—';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colours.gold} />
      }
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.name}>{stats?.restaurantName || user?.name}</Text>
        </View>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.ratingCard}>
        <Text style={styles.ratingLabel}>CURRENT AVERAGE RATING</Text>
        <Text style={styles.ratingStars}>{ratingStars}</Text>
        <Text style={styles.ratingValue}>
          {ratingDisplay}<Text style={styles.ratingMax}> / 5.0</Text>
        </Text>
        <Text style={styles.ratingMeta}>
          {stats?.reviewedReports ?? 0} reviewed report{stats?.reviewedReports === 1 ? '' : 's'}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.statsGrid}>
        <StatCard
          value={stats?.upcomingVisits ?? 0}
          label="Upcoming Visits"
          onPress={() => router.push('/(restaurant)/reports')}
        />
        <StatCard
          value={stats?.pendingReports ?? 0}
          label="Awaiting Review"
          accent={(stats?.pendingReports ?? 0) > 0}
        />
        <StatCard
          value={stats?.reviewedReports ?? 0}
          label="Reports Available"
          onPress={() => router.push('/(restaurant)/reports')}
        />
        <StatCard value={ratingDisplay} label="Average Rating" />
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(restaurant)/reports')}>
          <Text style={styles.quickActionIcon}>📋</Text>
          <Text style={styles.quickActionLabel}>View Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(restaurant)/proforma')}>
          <Text style={styles.quickActionIcon}>✏️</Text>
          <Text style={styles.quickActionLabel}>Edit Checklist</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(restaurant)/account')}>
          <Text style={styles.quickActionIcon}>💳</Text>
          <Text style={styles.quickActionLabel}>Account</Text>
        </TouchableOpacity>
      </View>

      {sub?.subscription_status !== 'active' && (
        <TouchableOpacity
          style={styles.subscriptionBanner}
          onPress={() => router.push('/(restaurant)/account')}
        >
          <Text style={styles.subscriptionBannerTitle}>
            {sub?.subscription_status === 'trial' ? 'You\'re on a free trial' : 'No active subscription'}
          </Text>
          <Text style={styles.subscriptionBannerBody}>
            Contact Wendy at 5StarX to activate full reports. →
          </Text>
        </TouchableOpacity>
      )}

      {(trendData && trendData.length > 0) && (
        <>
          <Text style={styles.sectionTitle}>Score Trend (12 months)</Text>
          <View style={styles.trendCard}>
            <TrendChart data={trendData} benchmark={benchmark} width={width - 32} />
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <View style={styles.activityCard}>
        {activity && activity.length > 0 ? (
          activity.map((item, idx) => {
            const statusMap = item.kind === 'slot' ? SLOT_STATUS : REPORT_STATUS;
            return (
              <View
                key={`${item.kind}-${item.id}`}
                style={[styles.activityRow, idx > 0 && styles.activityRowBordered]}
              >
                <Text style={styles.activityIcon}>{item.kind === 'slot' ? '📅' : '📋'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityTitle}>{item.title}</Text>
                  <Text style={styles.activityDate}>{formatDate(item.at)}</Text>
                </View>
                <StatusPill status={getStatus(statusMap, item.status)} size="sm" />
              </View>
            );
          })
        ) : (
          <Text style={styles.activityEmpty}>No activity yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colours.offWhite },
  content: { paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: colours.charcoalDark, gap: 12 },
  greeting: { fontSize: 12, color: colours.charcoalLight },
  name: { fontSize: 18, fontWeight: '700', color: colours.white, marginTop: 2 },
  signOut: { fontSize: 13, color: colours.charcoalLight },

  ratingCard: { backgroundColor: colours.charcoalDark, marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: colours.gold },
  ratingLabel: { fontSize: 11, fontWeight: '700', color: colours.charcoalLight, letterSpacing: 1 },
  ratingStars: { fontSize: 32, color: colours.gold, marginTop: 8 },
  ratingValue: { fontSize: 32, fontWeight: '800', color: colours.white, marginTop: 4 },
  ratingMax: { fontSize: 18, fontWeight: '500', color: colours.charcoalLight },
  ratingMeta: { fontSize: 12, color: colours.charcoalLight, marginTop: 6 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: colours.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginHorizontal: 20, marginTop: 24, marginBottom: 10 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: colours.white, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  statCardAccent: { backgroundColor: colours.gold },
  statValue: { fontSize: 32, fontWeight: '800', color: colours.textPrimary },
  statValueAccent: { color: colours.charcoalDark },
  statLabel: { fontSize: 12, color: colours.textSecondary, marginTop: 4, fontWeight: '500' },
  statLabelAccent: { color: colours.charcoalDark },

  quickActions: { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  quickAction: { flex: 1, backgroundColor: colours.white, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  quickActionIcon: { fontSize: 26, marginBottom: 8 },
  quickActionLabel: { fontSize: 12, fontWeight: '600', color: colours.textSecondary, textAlign: 'center' },
  subscriptionBanner: { marginHorizontal: 16, marginTop: 16, backgroundColor: colours.gold + '18', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colours.gold },
  subscriptionBannerTitle: { fontSize: 14, fontWeight: '700', color: colours.goldDark },
  subscriptionBannerBody: { fontSize: 13, color: colours.goldDark, marginTop: 2 },

  activityCard: { backgroundColor: colours.white, borderRadius: 14, marginHorizontal: 16, padding: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, gap: 12 },
  activityRowBordered: { borderTopWidth: 1, borderTopColor: colours.border },
  activityIcon: { fontSize: 20 },
  activityTitle: { fontSize: 14, fontWeight: '600', color: colours.textPrimary },
  activityDate: { fontSize: 12, color: colours.textMuted, marginTop: 2 },
  activityEmpty: { fontSize: 13, color: colours.textMuted, textAlign: 'center', paddingVertical: 20, fontStyle: 'italic' },
  trendCard: { backgroundColor: colours.white, borderRadius: 14, marginHorizontal: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
});
