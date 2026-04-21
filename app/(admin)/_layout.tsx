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
      {/* Visible tabs — 4 items fit cleanly without text truncation */}
      <Tabs.Screen name="dashboard"   options={{ title: 'Home',   tabBarIcon: tabIcon('home-outline') }} />
      <Tabs.Screen name="slots"       options={{ title: 'Dines',  tabBarIcon: tabIcon('calendar-outline') }} />
      <Tabs.Screen name="diners"      options={{ title: 'Diners', tabBarIcon: tabIcon('people-outline') }} />
      <Tabs.Screen name="more"        options={{ title: 'More',   tabBarIcon: tabIcon('ellipsis-horizontal-outline') }} />

      {/* Hidden from tab bar — accessed via More screen or push navigation.
          tabBarButton renders nothing; tabBarItemStyle ensures zero width
          so the tab bar doesn't allocate space for these items. */}
      <Tabs.Screen name="reports"     options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none', width: 0 } }} />
      <Tabs.Screen name="restaurants" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none', width: 0 } }} />
      <Tabs.Screen name="vouchers"    options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none', width: 0 } }} />
      <Tabs.Screen name="tcs-editor"  options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none', width: 0 } }} />
      <Tabs.Screen name="report"      options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none', width: 0 } }} />
      <Tabs.Screen name="restaurant"  options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none', width: 0 } }} />
    </Tabs>
  );
}
