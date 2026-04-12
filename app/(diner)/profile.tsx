import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { colours } from '../../utils/theme';

export default function DinerProfile() {
  const { user } = useAuthStore();

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.name}>{user?.name}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <TouchableOpacity style={styles.signOut} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 160, height: 52, borderRadius: 6, marginBottom: 32 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colours.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '700', color: colours.charcoalDark },
  name: { fontSize: 22, fontWeight: '700', color: colours.textPrimary },
  email: { fontSize: 14, color: colours.textSecondary, marginTop: 4 },
  signOut: { marginTop: 40, backgroundColor: colours.white, borderRadius: 10, padding: 14, paddingHorizontal: 36, borderWidth: 1, borderColor: colours.border },
  signOutText: { fontSize: 15, color: colours.textPrimary, fontWeight: '600' },
});
