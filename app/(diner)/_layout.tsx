import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colours } from '../../utils/theme';
import { useAuthStore } from '../../stores/authStore';
import { useUnreadCount } from '../../hooks/useNotifications';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={name} size={focused ? 24 : 22} color={color} />
  );
}

function BellIcon({ userId }: { userId: string | undefined }) {
  const unread = useUnreadCount(userId);
  return (
    <TouchableOpacity onPress={() => router.push('/(diner)/notifications')} style={bellStyles.btn}>
      <Ionicons name="notifications-outline" size={22} color={colours.white} />
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: colours.error,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: colours.white },
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
          borderTopWidth: 0.5,
          height: 86,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.2, marginTop: 2 },
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
          headerTitleStyle: { fontWeight: '800', fontSize: 20, color: colours.gold, letterSpacing: 0.5 },
          headerRight: () => <BellIcon userId={user?.id} />,
          tabBarIcon: tabIcon('restaurant-outline'),
        }}
      />
      <Tabs.Screen name="my-assignments" options={{ title: 'My Dines',  tabBarIcon: tabIcon('calendar-outline') }} />
      <Tabs.Screen name="vouchers"       options={{ title: 'Vouchers',  tabBarIcon: tabIcon('ticket-outline') }} />
      <Tabs.Screen name="profile"        options={{ title: 'Profile',   tabBarIcon: tabIcon('person-outline') }} />
      {/* Hidden — navigated to programmatically */}
      <Tabs.Screen name="notifications" options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="report"        options={{ href: null, tabBarButton: () => null }} />
    </Tabs>
  );
}
