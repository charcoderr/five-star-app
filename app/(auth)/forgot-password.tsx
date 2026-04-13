import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colours } from '../../utils/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!email) {
      Alert.alert('Please enter your email');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Check your email', 'A password reset link has been sent.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    }
  }

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>Enter your email and we'll send you a reset link.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor={colours.textMuted}
      />

      <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colours.charcoalDark} />
        ) : (
          <Text style={styles.buttonText}>Send Reset Link</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
        <Text style={styles.backText}>Back to login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite, justifyContent: 'center', paddingHorizontal: 32 },
  logo: { width: 180, height: 58, alignSelf: 'center', borderRadius: 6, marginBottom: 32 },
  title: { fontSize: 26, fontWeight: '700', color: colours.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 15, color: colours.textSecondary, marginBottom: 32 },
  input: { backgroundColor: colours.white, borderWidth: 1, borderColor: colours.border, borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 16, color: colours.textPrimary },
  button: { backgroundColor: colours.gold, borderRadius: 10, padding: 16, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700', color: colours.charcoalDark },
  backLink: { marginTop: 24, alignItems: 'center' },
  backText: { color: colours.textSecondary, fontSize: 14 },
});
