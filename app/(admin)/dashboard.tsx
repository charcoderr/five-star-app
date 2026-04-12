import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../../stores/authStore';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {user?.name}</Text>
      <Text style={styles.subtitle}>Admin Dashboard</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', color: '#222' },
  subtitle: { fontSize: 16, color: '#777', marginTop: 8 },
});
