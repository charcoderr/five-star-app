import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { colours } from '../../utils/theme';
import { useDashboardStats } from '../../hooks/useAdmin';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';

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
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <Text style={styles.quickActionIcon}>{icon}</Text>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const { data: stats, isLoading, refetch, isRefetching } = useDashboardStats();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colours.gold} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.headerRight}>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.name}>{user?.name ?? 'Wendy'}</Text>
        </View>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Attention banner for pending applications */}
      {(stats?.pendingApplications ?? 0) > 0 && (
        <TouchableOpacity
          style={styles.banner}
          onPress={() => router.push('/(admin)/diners')}
        >
          <Text style={styles.bannerText}>
            ⚠️  {stats?.pendingApplications} diner application{stats?.pendingApplications !== 1 ? 's' : ''} awaiting review
          </Text>
          <Text style={styles.bannerCta}>Review →</Text>
        </TouchableOpacity>
      )}

      {/* Stats grid */}
      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.statsGrid}>
        <StatCard
          value={stats?.openSlots ?? 0}
          label="Open Slots"
          onPress={() => router.push('/(admin)/slots')}
        />
        <StatCard
          value={stats?.pendingReports ?? 0}
          label="Reports to Review"
          accent={(stats?.pendingReports ?? 0) > 0}
          onPress={() => router.push('/(admin)/reports')}
        />
        <StatCard
          value={stats?.activeDiners ?? 0}
          label="Active Diners"
          onPress={() => router.push('/(admin)/diners')}
        />
        <StatCard
          value={stats?.restaurants ?? 0}
          label="Restaurants"
          onPress={() => router.push('/(admin)/restaurants')}
        />
      </View>

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <QuickAction icon="📅" label="Post New Slot" onPress={() => router.push('/(admin)/slots')} />
        <QuickAction icon="📋" label="Review Reports" onPress={() => router.push('/(admin)/reports')} />
        <QuickAction icon="🍽️" label="Add Restaurant" onPress={() => router.push('/(admin)/restaurants')} />
        <QuickAction icon="👤" label="Manage Diners" onPress={() => router.push('/(admin)/diners')} />
        <QuickAction icon="📄" label="Edit T&Cs" onPress={() => router.push('/(admin)/tcs-editor')} />
        <QuickAction icon="🎟️" label="All Vouchers" onPress={() => router.push('/(admin)/vouchers')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  content: { paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: colours.charcoalDark, gap: 12 },
  logo: { width: 90, height: 28, borderRadius: 4 },
  headerRight: { flex: 1 },
  greeting: { fontSize: 12, color: colours.charcoalLight },
  name: { fontSize: 16, fontWeight: '700', color: colours.white },
  signOut: { fontSize: 13, color: colours.charcoalLight },
  banner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colours.gold + '22', borderLeftWidth: 4, borderLeftColor: colours.gold, marginHorizontal: 16, marginTop: 16, borderRadius: 10, padding: 14 },
  bannerText: { fontSize: 13, fontWeight: '600', color: colours.goldDark, flex: 1 },
  bannerCta: { fontSize: 13, fontWeight: '700', color: colours.gold, marginLeft: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colours.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginHorizontal: 20, marginTop: 28, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: colours.white, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  statCardAccent: { backgroundColor: colours.gold },
  statValue: { fontSize: 36, fontWeight: '800', color: colours.textPrimary },
  statValueAccent: { color: colours.charcoalDark },
  statLabel: { fontSize: 13, color: colours.textSecondary, marginTop: 4, fontWeight: '500' },
  statLabelAccent: { color: colours.charcoalDark },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  quickAction: { width: '30%', flex: 1, backgroundColor: colours.white, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  quickActionIcon: { fontSize: 28, marginBottom: 8 },
  quickActionLabel: { fontSize: 12, fontWeight: '600', color: colours.textSecondary, textAlign: 'center' },
});
