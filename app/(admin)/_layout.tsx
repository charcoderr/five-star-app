import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colours } from '../../utils/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={name} size={focused ? 24 : 22} color={color} />
  );
}

export default function AdminLayout() {
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
      <Tabs.Screen name="dashboard"   options={{ title: 'Home',    tabBarIcon: tabIcon('home-outline') }} />
      <Tabs.Screen name="slots"       options={{ title: 'Slots',   tabBarIcon: tabIcon('calendar-outline') }} />
      <Tabs.Screen name="reports"     options={{ title: 'Reports', tabBarIcon: tabIcon('document-text-outline') }} />
      <Tabs.Screen name="restaurants" options={{ title: 'Venues',  tabBarIcon: tabIcon('restaurant-outline') }} />
      <Tabs.Screen name="diners"      options={{ title: 'Diners',  tabBarIcon: tabIcon('people-outline') }} />
      {/* Hidden screens — navigated to from dashboard quick actions */}
      <Tabs.Screen name="vouchers"    options={{ href: null }} />
      <Tabs.Screen name="tcs-editor"  options={{ href: null }} />
      <Tabs.Screen name="report"      options={{ href: null }} />
      <Tabs.Screen name="restaurant"  options={{ href: null }} />
    </Tabs>
  );
}
