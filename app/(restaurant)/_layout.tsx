import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colours } from '../../utils/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={name} size={focused ? 24 : 22} color={color} />
  );
}

export default function RestaurantLayout() {
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
      <Tabs.Screen name="dashboard" options={{ title: 'Overview',  tabBarIcon: tabIcon('stats-chart-outline') }} />
      <Tabs.Screen name="reports"   options={{ title: 'Reports',   tabBarIcon: tabIcon('document-text-outline') }} />
      <Tabs.Screen name="proforma"  options={{ title: 'Checklist', tabBarIcon: tabIcon('checkbox-outline') }} />
      {/* Hidden — navigated to programmatically */}
      <Tabs.Screen name="report"  options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null }} />
    </Tabs>
  );
}
