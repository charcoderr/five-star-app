import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { colours } from '../../utils/theme';
import { useOpenSlots, useClaimSlot } from '../../hooks/useSlots';
import { useAuthStore } from '../../stores/authStore';

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
  const { data: slots, isLoading, refetch, isRefetching } = useOpenSlots();
  const claimSlot = useClaimSlot();

  function handleClaim(slotId: string, restaurantName: string) {
    Alert.alert(
      'Claim this dine?',
      `You're requesting ${restaurantName}. Wendy will confirm your assignment shortly.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, claim it',
          onPress: async () => {
            try {
              await claimSlot.mutateAsync({ slotId, dinerId: user!.id });
              Alert.alert('Request sent!', 'Wendy will review and confirm your assignment.');
            } catch {
              Alert.alert('Error', 'Could not claim this slot. It may have just been taken.');
            }
          },
        },
      ]
    );
  }

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
        <Text style={styles.headerTitle}>Available Dines</Text>
        <Text style={styles.headerSub}>Tap a slot to claim your spot</Text>
      </View>

      <FlatList
        data={slots}
        keyExtractor={item => item.id}
        contentContainerStyle={slots?.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colours.gold} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyTitle}>No dines available right now</Text>
            <Text style={styles.emptySub}>Check back soon — Wendy posts new slots each month.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.cardInfo}>
                <Text style={styles.restaurantName}>{item.restaurant?.name ?? 'Restaurant'}</Text>
                <Text style={styles.cuisineType}>{item.restaurant?.cuisine_type}</Text>
                <Text style={styles.address} numberOfLines={1}>{item.restaurant?.address}</Text>
              </View>
              <View style={styles.dateBox}>
                <Text style={styles.dateDay}>{new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric' })}</Text>
                <Text style={styles.dateMonth}>{new Date(item.date).toLocaleDateString('en-GB', { month: 'short' })}</Text>
              </View>
            </View>

            <View style={styles.cardMid}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>🕐 {item.time.slice(0, 5)}</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillText}>👥 Up to {item.max_covers} guests</Text>
              </View>
            </View>

            <StarRating rating={item.restaurant?.avg_rating} />

            <TouchableOpacity
              style={styles.claimBtn}
              onPress={() => handleClaim(item.id, item.restaurant?.name ?? 'this restaurant')}
              disabled={claimSlot.isPending}
            >
              <Text style={styles.claimBtnText}>Claim this Dine</Text>
            </TouchableOpacity>
          </View>
        )}
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
  list: { padding: 16, gap: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  empty: { alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colours.textPrimary, textAlign: 'center' },
  emptySub: { fontSize: 14, color: colours.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  card: { backgroundColor: colours.white, borderRadius: 14, padding: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardInfo: { flex: 1, marginRight: 12 },
  restaurantName: { fontSize: 17, fontWeight: '700', color: colours.textPrimary },
  cuisineType: { fontSize: 13, color: colours.gold, fontWeight: '600', marginTop: 2 },
  address: { fontSize: 13, color: colours.textMuted, marginTop: 4 },
  dateBox: { backgroundColor: colours.charcoalDark, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 52 },
  dateDay: { fontSize: 22, fontWeight: '700', color: colours.gold },
  dateMonth: { fontSize: 12, color: colours.white, fontWeight: '600', marginTop: 1 },
  cardMid: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  pill: { backgroundColor: colours.offWhite, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  pillText: { fontSize: 12, color: colours.textSecondary, fontWeight: '600' },
  stars: { fontSize: 14, color: colours.gold, marginBottom: 14 },
  noRating: { fontSize: 13, color: colours.textMuted, marginBottom: 14, fontStyle: 'italic' },
  claimBtn: { backgroundColor: colours.gold, borderRadius: 10, padding: 13, alignItems: 'center' },
  claimBtnText: { fontSize: 15, fontWeight: '700', color: colours.charcoalDark },
});
