import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

export default function DinerProfile() {
  const { user } = useAuthStore();

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{user?.name}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <TouchableOpacity style={styles.signOut} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  name: { fontSize: 22, fontWeight: '700', color: '#222' },
  email: { fontSize: 15, color: '#777', marginTop: 4 },
  signOut: { marginTop: 40, backgroundColor: '#f0f0f0', borderRadius: 10, padding: 14, paddingHorizontal: 32 },
  signOutText: { fontSize: 15, color: '#333', fontWeight: '600' },
});
