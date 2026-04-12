import { Tabs } from 'expo-router';

export default function DinerLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#FFD700' }}>
      <Tabs.Screen name="home" options={{ title: 'Available Dines' }} />
      <Tabs.Screen name="my-assignments" options={{ title: 'My Dines' }} />
      <Tabs.Screen name="vouchers" options={{ title: 'Vouchers' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
