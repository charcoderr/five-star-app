import { View, Text, StyleSheet } from 'react-native';
import { Tabs, router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { colours } from '../../utils/theme';
import { useAuthStore } from '../../stores/authStore';
import { useUnreadCount } from '../../hooks/useNotifications';

function TabIcon({ icon }: { icon: string }) {
  return <Text style={{ fontSize: 20 }}>{icon}</Text>;
}

function BellIcon({ userId }: { userId: string | undefined }) {
  const unread = useUnreadCount(userId);
  return (
    <TouchableOpacity onPress={() => router.push('/(diner)/notifications')} style={bellStyles.btn}>
      <Text style={bellStyles.icon}>🔔</Text>
      {unread > 0 && (
        <View style={bellStyles.badge}>
          <Text style={bellStyles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const bellStyles = StyleSheet.create({
  btn: { marginRight: 16, position: 'relative' },
  icon: { fontSize: 22 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: colours.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: colours.white },
});

export default function DinerLayout() {
  const { user } = useAuthStore();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colours.gold,
        tabBarInactiveTintColor: colours.charcoalLight,
        tabBarStyle: {
          backgroundColor: colours.charcoalDark,
          borderTopColor: colours.charcoal,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Available',
          headerShown: true,
          headerStyle: { backgroundColor: colours.charcoalDark },
          headerTintColor: colours.white,
          headerTitle: '5StarX',
          headerTitleStyle: { fontWeight: '800', fontSize: 20, color: colours.gold },
          headerRight: () => <BellIcon userId={user?.id} />,
          tabBarIcon: () => <TabIcon icon="🍽️" />,
        }}
      />
      <Tabs.Screen
        name="my-assignments"
        options={{
          title: 'My Dines',
          tabBarIcon: () => <TabIcon icon="📅" />,
        }}
      />
      <Tabs.Screen
        name="vouchers"
        options={{
          title: 'Vouchers',
          tabBarIcon: () => <TabIcon icon="🎟️" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: () => <TabIcon icon="👤" />,
        }}
      />
      {/* Hidden screens — navigated to programmatically */}
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="report"        options={{ href: null }} />
    </Tabs>
  );
}
