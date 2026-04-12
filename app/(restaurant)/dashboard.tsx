import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../../stores/authStore';

export default function RestaurantDashboard() {
  const { user } = useAuthStore();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Restaurant Portal</Text>
      <Text style={styles.subtitle}>{user?.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', color: '#222' },
  subtitle: { fontSize: 16, color: '#777', marginTop: 8 },
});
