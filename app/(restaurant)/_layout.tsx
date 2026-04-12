import { Tabs } from 'expo-router';

export default function RestaurantLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#FFD700' }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
      <Tabs.Screen name="proforma" options={{ title: 'Checklist' }} />
    </Tabs>
  );
}
