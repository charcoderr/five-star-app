import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colours } from '../../utils/theme';

export default function PendingApprovalScreen() {
  return (
    <View style={styles.container}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.icon}>⏳</Text>
      <Text style={styles.title}>Application Under Review</Text>
      <Text style={styles.body}>
        Thank you for applying to become a 5StarX Mystery Diner.{'\n\n'}
        Wendy is reviewing your application and will be in touch shortly. You'll receive an email once your account has been approved.
      </Text>
      <TouchableOpacity style={styles.signOut} onPress={async () => { await supabase.auth.signOut(); router.replace('/(auth)/login'); }}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  logo: { width: 160, height: 52, borderRadius: 6, marginBottom: 40 },
  icon: { fontSize: 52, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colours.textPrimary, textAlign: 'center', marginBottom: 16 },
  body: { fontSize: 15, color: colours.textSecondary, textAlign: 'center', lineHeight: 24 },
  signOut: { marginTop: 48, backgroundColor: colours.white, borderRadius: 10, padding: 14, paddingHorizontal: 36, borderWidth: 1, borderColor: colours.border },
  signOutText: { fontSize: 15, color: colours.textPrimary, fontWeight: '600' },
});
