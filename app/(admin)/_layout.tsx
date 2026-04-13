import { Tabs } from 'expo-router';
import { colours } from '../../utils/theme';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colours.gold,
        tabBarInactiveTintColor: colours.charcoalLight,
        tabBarStyle: { backgroundColor: colours.charcoalDark, borderTopColor: colours.charcoal },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="dashboard"   options={{ title: 'Home',        tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} /> }} />
      <Tabs.Screen name="slots"       options={{ title: 'Slots',       tabBarIcon: ({ color }) => <TabIcon icon="📅" color={color} /> }} />
      <Tabs.Screen name="reports"     options={{ title: 'Reports',     tabBarIcon: ({ color }) => <TabIcon icon="📋" color={color} /> }} />
      <Tabs.Screen name="restaurants" options={{ title: 'Restaurants', tabBarIcon: ({ color }) => <TabIcon icon="🍽️" color={color} /> }} />
      <Tabs.Screen name="diners"      options={{ title: 'Diners',      tabBarIcon: ({ color }) => <TabIcon icon="👤" color={color} /> }} />
      {/* Hidden screens — navigated to from dashboard quick actions */}
      <Tabs.Screen name="vouchers"    options={{ href: null }} />
      <Tabs.Screen name="tcs-editor"  options={{ href: null }} />
      <Tabs.Screen name="report"      options={{ href: null }} />
    </Tabs>
  );
}

function TabIcon({ icon, color }: { icon: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20 }}>{icon}</Text>;
}
