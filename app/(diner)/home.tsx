import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  Alert, RefreshControl,
} from 'react-native';
import { colours } from '../../utils/theme';
import { useOpenSlots, useClaimedSlots } from '../../hooks/useSlots';
import { useAuthStore } from '../../stores/authStore';
import { useClaimSlot } from '../../hooks/useSlots';
import { useMyWaitlistEntries, useJoinWaitlist, useLeaveWaitlist } from '../../hooks/useWaitlist';
import { SkeletonList } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <Text style={styles.noRating}>No rating yet</Text>;
  const stars = Math.round(rating);
  return (
    <Text style={styles.stars}>
      {'★'.repeat(stars)}{'☆'.repeat(5 - stars)} {rating.toFixed(1)}
    </Text>
  );
}

export default function DinerHome() {
  const { user } = useAuthStore();
  const { data: openSlots, isLoading: loadingOpen, refetch: refetchOpen, isRefetching: refetchingOpen } = useOpenSlots();
  const { data: claimedSlots, isLoading: loadingClaimed, refetch: refetchClaimed, isRefetching: refetchingClaimed } = useClaimedSlots();
  const { data: waitlistMap } = useMyWaitlistEntries(user?.id);
  const claimSlot = useClaimSlot();
  const joinWaitlist = useJoinWaitlist();
  const leaveWaitlist = useLeaveWaitlist();

  const isLoading = loadingOpen || loadingClaimed;
  const isRefetching = refetchingOpen || refetchingClaimed;

  function handleRefetch() {
    refetchOpen();
    refetchClaimed();
  }

  function handleClaim(slotId: string, restaurantName: string) {
    Alert.alert(
      `Apply for ${restaurantName}?`,
      `Once Wendy approves your request, you'll book directly with the restaurant at a time that suits you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            try {
              await claimSlot.mutateAsync({ slotId, dinerId: user!.id });
              Alert.alert(
                'Application sent!',
                'Thanks for applying. We\'ll be in touch once this has been accepted — come back to the app then to log your booking.'
              );
            } catch {
              Alert.alert('Error', 'Could not apply for this slot. It may have just been taken.');
            }
          },
        },
      ]
    );
  }

  function handleJoinWaitlist(slotId: string, restaurantName: string) {
    Alert.alert(
      'Join the waitlist?',
      `${restaurantName} is taken but you'll be notified if it opens up.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join Waitlist',
          onPress: async () => {
            try {
              await joinWaitlist.mutateAsync({ slotId, dinerId: user!.id });
              Alert.alert('You\'re on the waitlist!', 'We\'ll notify you if this slot becomes available.');
            } catch {
              Alert.alert('Error', 'Could not join the waitlist. You may already be on it.');
            }
          },
        },
      ]
    );
  }

  function handleLeaveWaitlist(slotId: string) {
    Alert.alert('Leave the waitlist?', 'You will no longer be notified if this slot opens up.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveWaitlist.mutateAsync({ slotId, dinerId: user!.id });
          } catch {
            Alert.alert('Error', 'Could not update your waitlist status.');
          }
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Available Dines</Text>
          <Text style={styles.headerSub}>Apply for a voucher — you choose when to dine</Text>
        </View>
        <SkeletonList count={4} />
      </View>
    );
  }

  const hasOpen = (openSlots?.length ?? 0) > 0;
  const hasClaimed = (claimedSlots?.length ?? 0) > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Dines</Text>
        <Text style={styles.headerSub}>Apply for a voucher — you choose when to dine</Text>
      </View>

      <SectionList
        contentContainerStyle={!hasOpen && !hasClaimed ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefetch} tintColor={colours.gold} />
        }
        sections={[
          ...(hasOpen ? [{ title: 'OPEN', data: openSlots ?? [] }] : []),
          ...(hasClaimed ? [{ title: 'WAITLIST AVAILABLE', data: claimedSlots ?? [] }] : []),
        ]}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <EmptyState
            icon="restaurant-outline"
            title="No dines available right now"
            subtitle="Check back soon — Wendy posts new slots each month."
          />
        }
        renderSectionHeader={({ section }) =>
          section.data.length > 0 ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
              {section.title === 'WAITLIST AVAILABLE' && (
                <Text style={styles.sectionHeaderSub}>Slot claimed — join the queue</Text>
              )}
            </View>
          ) : null
        }
        renderItem={({ item, section }) => {
          const isClaimed = section.title === 'WAITLIST AVAILABLE';
          const myPosition = waitlistMap?.[item.id];
          const onWaitlist = myPosition !== undefined;

          return (
            <View style={[styles.card, isClaimed && styles.cardMuted]}>
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.restaurantName}>{item.restaurant?.name ?? 'Restaurant'}</Text>
                  <Text style={styles.cuisineType}>{item.restaurant?.cuisine_type}</Text>
                  <Text style={styles.address} numberOfLines={1}>{item.restaurant?.address}</Text>
                </View>
                {item.voucher_expiry ? (
                  <View style={styles.dateBox}>
                    <Text style={styles.dateLabel}>USE BY</Text>
                    <Text style={styles.dateDay}>{new Date(item.voucher_expiry).toLocaleDateString('en-GB', { day: 'numeric' })}</Text>
                    <Text style={styles.dateMonth}>{new Date(item.voucher_expiry).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.cardMid}>
                {item.voucher_expiry && (
                  <View style={[styles.pill, styles.pillExpiry]}>
                    <Text style={styles.pillExpiryText}>Use by {new Date(item.voucher_expiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                  </View>
                )}
                <View style={styles.pill}>
                  <Text style={styles.pillText}>👥 Up to {item.max_covers} guests</Text>
                </View>
                {isClaimed && onWaitlist && (
                  <View style={[styles.pill, styles.pillWaitlist]}>
                    <Text style={styles.pillWaitlistText}>#{myPosition} in queue</Text>
                  </View>
                )}
              </View>

              <StarRating rating={item.restaurant?.avg_rating} />

              {!isClaimed ? (
                <TouchableOpacity
                  style={styles.claimBtn}
                  onPress={() => handleClaim(item.id, item.restaurant?.name ?? 'this restaurant')}
                  disabled={claimSlot.isPending}
                >
                  <Text style={styles.claimBtnText}>Claim this Dine</Text>
                </TouchableOpacity>
              ) : onWaitlist ? (
                <TouchableOpacity
                  style={styles.leaveBtn}
                  onPress={() => handleLeaveWaitlist(item.id)}
                  disabled={leaveWaitlist.isPending}
                >
                  <Text style={styles.leaveBtnText}>Leave Waitlist</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.waitlistBtn}
                  onPress={() => handleJoinWaitlist(item.id, item.restaurant?.name ?? 'this restaurant')}
                  disabled={joinWaitlist.isPending}
                >
                  <Text style={styles.waitlistBtnText}>Join Waitlist</Text>
                </TouchableOpacity>
              )}
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
  list: { padding: 16, paddingTop: 8, gap: 0 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  sectionHeader: { paddingTop: 16, paddingBottom: 8, paddingHorizontal: 4 },
  sectionHeaderText: { fontSize: 11, fontWeight: '700', color: colours.textSecondary, letterSpacing: 0.8 },
  sectionHeaderSub: { fontSize: 12, color: colours.textMuted, marginTop: 2 },
  card: { backgroundColor: colours.white, borderRadius: 14, padding: 18, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardMuted: { opacity: 0.8, borderWidth: 1, borderColor: colours.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardInfo: { flex: 1, marginRight: 12 },
  restaurantName: { fontSize: 17, fontWeight: '700', color: colours.textPrimary },
  cuisineType: { fontSize: 13, color: colours.gold, fontWeight: '600', marginTop: 2 },
  address: { fontSize: 13, color: colours.textMuted, marginTop: 4 },
  dateBox: { backgroundColor: colours.charcoalDark, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 60 },
  dateLabel: { fontSize: 9, fontWeight: '700', color: colours.gold, letterSpacing: 0.8, marginBottom: 2 },
  dateDay: { fontSize: 22, fontWeight: '700', color: colours.white },
  dateMonth: { fontSize: 11, color: colours.charcoalLight ?? '#aaa', fontWeight: '600', marginTop: 1 },
  pillExpiry: { backgroundColor: colours.gold + '18', borderWidth: 1, borderColor: colours.gold + '44' },
  pillExpiryText: { fontSize: 12, color: colours.goldDark ?? colours.gold, fontWeight: '700' },
  cardMid: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  pill: { backgroundColor: colours.offWhite, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  pillText: { fontSize: 12, color: colours.textSecondary, fontWeight: '600' },
  pillWaitlist: { backgroundColor: colours.gold + '22' },
  pillWaitlistText: { fontSize: 12, color: colours.gold, fontWeight: '700' },
  stars: { fontSize: 14, color: colours.gold, marginBottom: 14 },
  noRating: { fontSize: 13, color: colours.textMuted, marginBottom: 14, fontStyle: 'italic' },
  claimBtn: { backgroundColor: colours.gold, borderRadius: 10, padding: 13, alignItems: 'center' },
  claimBtnText: { fontSize: 15, fontWeight: '700', color: colours.charcoalDark },
  waitlistBtn: { backgroundColor: colours.offWhite, borderRadius: 10, padding: 13, alignItems: 'center', borderWidth: 1.5, borderColor: colours.charcoal },
  waitlistBtnText: { fontSize: 15, fontWeight: '700', color: colours.textPrimary },
  leaveBtn: { backgroundColor: colours.offWhite, borderRadius: 10, padding: 13, alignItems: 'center', borderWidth: 1, borderColor: colours.border },
  leaveBtnText: { fontSize: 14, fontWeight: '600', color: colours.textMuted },
});
