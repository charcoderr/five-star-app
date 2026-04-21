import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { colours } from '../../utils/theme';
import { useDinerStats, useDinerVoucherHistory, BADGE_CONFIG, getBadgeTier } from '../../hooks/useDinerStats';

const VOUCHER_STATUS_COLOUR: Record<string, string> = {
  issued:   colours.scoreGood,
  redeemed: colours.charcoal,
  expired:  colours.error,
};

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DinerProfile() {
  const { user } = useAuthStore();
  const { data: stats, isLoading: statsLoading } = useDinerStats(user?.id);
  const { data: history, isLoading: historyLoading } = useDinerVoucherHistory(user?.id);

  const badgeTier = stats ? stats.badgeTier : getBadgeTier(0);
  const badge = BADGE_CONFIG[badgeTier];
  const nextTierConfig = badge.nextAt !== null ? BADGE_CONFIG[getBadgeTier(badge.nextAt)] : null;
  const progress = badge.nextAt !== null && badge.minVisits < badge.nextAt
    ? ((stats?.totalVisits ?? 0) - badge.minVisits) / (badge.nextAt - badge.minVisits)
    : 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />

      {/* Avatar + identity */}
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
        </View>
        {badgeTier !== 'None' && (
          <View style={[styles.badgePip, { backgroundColor: badge.colour }]}>
            <Text style={styles.badgePipText}>{badge.emoji}</Text>
          </View>
        )}
      </View>
      <Text style={styles.name}>{user?.name}</Text>
      <Text style={styles.email}>{user?.email}</Text>

      {/* Badge card */}
      <View style={styles.badgeCard}>
        {statsLoading ? (
          <ActivityIndicator color={colours.gold} />
        ) : (
          <>
            <View style={styles.badgeRow}>
              <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.badgeName, { color: badge.colour }]}>{badgeTier} Member</Text>
                {badge.nextAt !== null ? (
                  <Text style={styles.badgeProgress}>
                    {stats?.totalVisits ?? 0} / {badge.nextAt} visits to {nextTierConfig?.emoji} {getBadgeTier(badge.nextAt)}
                  </Text>
                ) : (
                  <Text style={styles.badgeProgress}>Elite status — the highest tier!</Text>
                )}
              </View>
            </View>
            {badge.nextAt !== null && (
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: badge.colour }]} />
              </View>
            )}
          </>
        )}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCell label="Visits" value={statsLoading ? '—' : `${stats?.totalVisits ?? 0}`} />
        <View style={styles.statDivider} />
        <StatCell label="Earned" value={statsLoading ? '—' : `£${stats?.totalVoucherValue ?? 0}`} />
        <View style={styles.statDivider} />
        <StatCell
          label="Avg Rating"
          value={statsLoading ? '—' : stats?.avgScore != null ? `${stats.avgScore.toFixed(1)}★` : '—'}
        />
      </View>

      {/* Earnings history */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Earnings History</Text>
        {historyLoading ? (
          <ActivityIndicator color={colours.gold} style={{ marginTop: 12 }} />
        ) : !history || history.length === 0 ? (
          <Text style={styles.empty}>No vouchers issued yet. Complete your first visit to earn rewards!</Text>
        ) : (
          history.map(v => (
            <View key={v.id} style={styles.historyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyRestaurant}>{v.restaurant_name ?? 'Mystery Dine'}</Text>
                <Text style={styles.historyDate}>{formatDate(v.issued_at)}</Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyValue}>£{v.value}</Text>
                <View style={[styles.historyStatus, { backgroundColor: (VOUCHER_STATUS_COLOUR[v.status] ?? colours.textMuted) + '22', borderColor: VOUCHER_STATUS_COLOUR[v.status] ?? colours.textMuted }]}>
                  <Text style={[styles.historyStatusText, { color: VOUCHER_STATUS_COLOUR[v.status] ?? colours.textMuted }]}>
                    {v.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.signOut} onPress={async () => { await supabase.auth.signOut(); router.replace('/(auth)/login'); }}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  content: { alignItems: 'center', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },

  logo: { width: 160, height: 160, borderRadius: 14, marginBottom: 28 },

  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colours.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: '700', color: colours.charcoalDark },
  badgePip: { position: 'absolute', bottom: 0, right: -4, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colours.offWhite },
  badgePipText: { fontSize: 13 },

  name: { fontSize: 22, fontWeight: '700', color: colours.textPrimary },
  email: { fontSize: 14, color: colours.textSecondary, marginTop: 4, marginBottom: 24 },

  badgeCard: { width: '100%', backgroundColor: colours.white, borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  badgeEmoji: { fontSize: 32 },
  badgeName: { fontSize: 17, fontWeight: '700' },
  badgeProgress: { fontSize: 13, color: colours.textSecondary, marginTop: 2 },
  progressBarTrack: { height: 6, backgroundColor: colours.offWhite, borderRadius: 3, overflow: 'hidden', borderWidth: 1, borderColor: colours.border },
  progressBarFill: { height: '100%', borderRadius: 3 },

  statsRow: { width: '100%', backgroundColor: colours.white, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  statCell: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 36, backgroundColor: colours.border },
  statValue: { fontSize: 20, fontWeight: '700', color: colours.textPrimary },
  statLabel: { fontSize: 11, color: colours.textSecondary, marginTop: 2, fontWeight: '600' },

  section: { width: '100%', backgroundColor: colours.white, borderRadius: 16, padding: 18, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colours.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  empty: { fontSize: 14, color: colours.textMuted, lineHeight: 20, textAlign: 'center', paddingVertical: 8 },

  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colours.border },
  historyRestaurant: { fontSize: 15, fontWeight: '600', color: colours.textPrimary },
  historyDate: { fontSize: 12, color: colours.textMuted, marginTop: 2 },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  historyValue: { fontSize: 17, fontWeight: '700', color: colours.textPrimary },
  historyStatus: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  historyStatusText: { fontSize: 10, fontWeight: '700' },

  signOut: { width: '100%', backgroundColor: colours.white, borderRadius: 12, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: colours.border },
  signOutText: { fontSize: 15, color: colours.textPrimary, fontWeight: '600' },
});
