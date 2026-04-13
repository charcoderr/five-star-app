import { Tabs } from 'expo-router';
import { colours } from '../../utils/theme';

export default function RestaurantLayout() {
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
      <Tabs.Screen name="dashboard"    options={{ title: 'Overview',  tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} /> }} />
      <Tabs.Screen name="reports"      options={{ title: 'Reports',   tabBarIcon: ({ color }) => <TabIcon icon="📋" color={color} /> }} />
      <Tabs.Screen name="proforma"     options={{ title: 'Checklist', tabBarIcon: ({ color }) => <TabIcon icon="✏️" color={color} /> }} />
      {/* Hidden — navigated to programmatically */}
      <Tabs.Screen name="report"  options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null }} />
    </Tabs>
  );
}

function TabIcon({ icon, color }: { icon: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20 }}>{icon}</Text>;
}
