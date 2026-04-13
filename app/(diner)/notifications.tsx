import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { colours } from '../../utils/theme';
import { useAuthStore } from '../../stores/authStore';
import {
  useMyNotifications,
  useMarkRead,
  useMarkAllRead,
  AppNotification,
} from '../../hooks/useNotifications';
import { SkeletonList } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';

const TYPE_ICONS: Record<string, string> = {
  assignment_confirmed:  '✅',
  assignment_reminder:   '⏰',
  voucher_issued:        '🎟️',
  report_reviewed:       '📋',
  new_slot:              '📅',
  new_application:       '👤',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function navigateFromNotification(n: AppNotification) {
  const data = n.data ?? {};
  switch (n.type) {
    case 'assignment_confirmed':
    case 'assignment_reminder':
      router.push('/(diner)/my-assignments');
      break;
    case 'voucher_issued':
      router.push('/(diner)/vouchers');
      break;
    case 'report_reviewed':
      router.push('/(diner)/my-assignments');
      break;
    case 'new_slot':
      router.push('/(diner)/home');
      break;
  }
}

export default function DinerNotifications() {
  const { user } = useAuthStore();
  const { data: notifications, isLoading, refetch, isRefetching } = useMyNotifications(user?.id);
  const markRead    = useMarkRead();
  const markAllRead = useMarkAllRead();

  const unread = notifications?.filter(n => !n.read).length ?? 0;

  async function handlePress(n: AppNotification) {
    if (!n.read) await markRead.mutateAsync(n.id);
    navigateFromNotification(n);
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 80 }} />
        </View>
        <SkeletonList count={5} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unread > 0 && (
          <TouchableOpacity onPress={() => user && markAllRead.mutate(user.id)}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={(notifications?.length ?? 0) === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colours.gold} />}
        ListEmptyComponent={
          <EmptyState
            icon="🔔"
            title="No notifications yet"
            subtitle="We'll let you know when you have a new booking, voucher, or report update."
          />
        }
        renderItem={({ item: n }) => (
          <TouchableOpacity
            style={[styles.card, !n.read && styles.cardUnread]}
            onPress={() => handlePress(n)}
          >
            <View style={styles.cardInner}>
              <View style={[styles.iconCircle, !n.read && styles.iconCircleUnread]}>
                <Text style={styles.icon}>{TYPE_ICONS[n.type] ?? '🔔'}</Text>
              </View>
              <View style={styles.content}>
                <Text style={[styles.title, !n.read && styles.titleUnread]} numberOfLines={1}>
                  {n.title}
                </Text>
                <Text style={styles.body} numberOfLines={2}>{n.body}</Text>
                <Text style={styles.time}>{timeAgo(n.created_at)}</Text>
              </View>
              {!n.read && <View style={styles.dot} />}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  header: {
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: colours.charcoalDark,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  backBtn: { paddingBottom: 2 },
  backText: { color: colours.gold, fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colours.white },
  markAll: { fontSize: 13, color: colours.charcoalLight, paddingBottom: 2 },
  list: { padding: 16, gap: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  card: {
    backgroundColor: colours.white,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: colours.gold },
  cardInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colours.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleUnread: { backgroundColor: colours.gold + '22' },
  icon: { fontSize: 20 },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: colours.textSecondary },
  titleUnread: { color: colours.textPrimary, fontWeight: '700' },
  body: { fontSize: 13, color: colours.textSecondary, lineHeight: 18, marginTop: 2 },
  time: { fontSize: 11, color: colours.textMuted, marginTop: 4 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colours.gold,
    marginTop: 4,
  },
});
