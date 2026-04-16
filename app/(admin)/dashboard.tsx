import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colours } from '../../utils/theme';
import { useDashboardStats } from '../../hooks/useAdmin';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../../components/Avatar';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function StatCard({
  value,
  label,
  accent,
  onPress,
}: {
  value: number;
  label: string;
  accent?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.statCard, accent && styles.statCardAccent]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
      <Text style={[styles.statLabel, accent && styles.statLabelAccent]}>{label}</Text>
    </TouchableOpacity>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  width,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  width: number;
}) {
  return (
    <TouchableOpacity style={[styles.quickAction, { width }]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.quickActionIcon}>
        <Ionicons name={icon} size={22} color={colours.gold} />
      </View>
      <Text style={styles.quickActionLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const { data: stats, isLoading, refetch, isRefetching } = useDashboardStats();
  const { width: screenWidth } = useWindowDimensions();

  // 3 columns with 16px side padding and 10px gaps
  const quickWidth = (screenWidth - 32 - 20) / 3;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colours.gold} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <Avatar name={user?.name ?? 'W'} size={44} tone="gold" />
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.name}>{user?.name ?? 'Wendy'}</Text>
          </View>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={async () => {
              await supabase.auth.signOut();
              router.replace('/(auth)/login');
            }}
            hitSlop={12}
          >
            <Ionicons name="log-out-outline" size={22} color={colours.charcoalLight} />
          </TouchableOpacity>
        </View>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>5StarX</Text>
          <Text style={styles.brandSub}>ADMIN</Text>
        </View>
      </View>

      {/* Pending slot applications banner */}
      {(stats?.pendingSlotClaims ?? 0) > 0 && (
        <TouchableOpacity
          style={[styles.banner, styles.bannerGold]}
          onPress={() => router.push({ pathname: '/(admin)/slots', params: { filter: 'pending' } })}
          activeOpacity={0.85}
        >
          <Ionicons name="ticket-outline" size={18} color={colours.goldDark} style={{ marginRight: 8 }} />
          <Text style={styles.bannerText}>
            {stats?.pendingSlotClaims} diner voucher request{stats?.pendingSlotClaims !== 1 ? 's' : ''} to approve — tap to review
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colours.gold} />
        </TouchableOpacity>
      )}

      {/* Pending diner applications banner */}
      {(stats?.pendingApplications ?? 0) > 0 && (
        <TouchableOpacity
          style={styles.banner}
          onPress={() => router.push('/(admin)/diners')}
          activeOpacity={0.85}
        >
          <Ionicons name="alert-circle" size={18} color={colours.goldDark} style={{ marginRight: 8 }} />
          <Text style={styles.bannerText}>
            {stats?.pendingApplications} diner application{stats?.pendingApplications !== 1 ? 's' : ''} awaiting review
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colours.gold} />
        </TouchableOpacity>
      )}

      {/* Stats grid */}
      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.statsGrid}>
        <StatCard value={stats?.openSlots ?? 0} label="Available Dines" onPress={() => router.push('/(admin)/slots')} />
        <StatCard value={(stats?.pendingReports ?? 0) + (stats?.reportsUnderReview ?? 0)} label="Reports to Review" accent={((stats?.pendingReports ?? 0) + (stats?.reportsUnderReview ?? 0)) > 0} onPress={() => router.push('/(admin)/reports')} />
        <StatCard value={stats?.activeDiners ?? 0} label="Active Diners" onPress={() => router.push('/(admin)/diners')} />
        <StatCard value={stats?.restaurants ?? 0} label="Restaurants" onPress={() => router.push('/(admin)/restaurants')} />
      </View>

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <QuickAction width={quickWidth} icon="calendar-outline"      label="New Dine"    onPress={() => router.push('/(admin)/slots')} />
        <QuickAction width={quickWidth} icon="document-text-outline" label="Reports"     onPress={() => router.push('/(admin)/reports')} />
        <QuickAction width={quickWidth} icon="restaurant-outline"    label="Restaurants" onPress={() => router.push('/(admin)/restaurants')} />
        <QuickAction width={quickWidth} icon="people-outline"        label="Diners"      onPress={() => router.push('/(admin)/diners')} />
        <QuickAction width={quickWidth} icon="document-outline"      label="T&Cs"        onPress={() => router.push('/(admin)/tcs-editor')} />
        <QuickAction width={quickWidth} icon="ticket-outline"        label="Vouchers"    onPress={() => router.push('/(admin)/vouchers')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  content: { paddingBottom: 40 },

  header: { paddingTop: 56, paddingBottom: 18, paddingHorizontal: 20, backgroundColor: colours.charcoalDark },
  headerInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1 },
  greeting: { fontSize: 12, color: colours.charcoalLight, fontWeight: '500' },
  name: { fontSize: 18, fontWeight: '700', color: colours.white, marginTop: 1 },
  signOutBtn: { padding: 6 },
  brandRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 14 },
  brand: { fontSize: 22, fontWeight: '800', color: colours.gold, letterSpacing: 0.5 },
  brandSub: { fontSize: 10, fontWeight: '700', color: colours.charcoalLight, letterSpacing: 2 },

  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colours.gold + '18', borderLeftWidth: 3, borderLeftColor: colours.gold, marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 14 },
  bannerGold: { backgroundColor: colours.scoreGood + '18', borderLeftColor: colours.scoreGood },
  bannerText: { fontSize: 13, fontWeight: '600', color: colours.goldDark, flex: 1 },

  sectionTitle: { fontSize: 12, fontWeight: '700', color: colours.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginHorizontal: 20, marginTop: 26, marginBottom: 12 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: colours.white, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  statCardAccent: { backgroundColor: colours.gold },
  statValue: { fontSize: 32, fontWeight: '800', color: colours.textPrimary, letterSpacing: -0.5 },
  statValueAccent: { color: colours.charcoalDark },
  statLabel: { fontSize: 12, color: colours.textSecondary, marginTop: 4, fontWeight: '600' },
  statLabelAccent: { color: colours.charcoalDark },

  quickActions: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  quickAction: { backgroundColor: colours.white, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1, minHeight: 92 },
  quickActionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colours.gold + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickActionLabel: { fontSize: 12, fontWeight: '700', color: colours.textPrimary, textAlign: 'center' },
});
