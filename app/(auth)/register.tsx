import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colours } from '../../utils/theme';

type Availability = 'weekdays' | 'weekends' | 'evenings' | 'short_notice';
type AttentionToDetail = 'Excellent' | 'Good' | 'Average' | 'Poor';

const AVAILABILITY_OPTIONS: { key: Availability; label: string }[] = [
  { key: 'weekdays', label: 'Weekdays' },
  { key: 'weekends', label: 'Weekends' },
  { key: 'evenings', label: 'Evenings' },
  { key: 'short_notice', label: 'Short notice' },
];

const DETAIL_OPTIONS: AttentionToDetail[] = ['Excellent', 'Good', 'Average', 'Poor'];

export default function RegisterScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 — Basic info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');

  // Step 2 — Application questions
  const [foodIndustry, setFoodIndustry] = useState<boolean | null>(null);
  const [foodIndustryDetails, setFoodIndustryDetails] = useState('');
  const [prevMystery, setPrevMystery] = useState<boolean | null>(null);
  const [prevMysteryDetails, setPrevMysteryDetails] = useState('');
  const [attentionToDetail, setAttentionToDetail] = useState<AttentionToDetail | null>(null);
  const [attentionExample, setAttentionExample] = useState('');
  const [discreteNotes, setDiscreteNotes] = useState<boolean | null>(null);
  const [discreteStrategies, setDiscreteStrategies] = useState('');
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [availabilityRestrictions, setAvailabilityRestrictions] = useState('');

  // Step 3 — Scenarios & motivation
  const [scenarioServer, setScenarioServer] = useState('');
  const [scenarioHygiene, setScenarioHygiene] = useState('');
  const [motivation, setMotivation] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  function toggleAvailability(key: Availability) {
    setAvailability(prev =>
      prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]
    );
  }

  async function handleSubmit() {
    if (!motivation) {
      Alert.alert('Please fill in all required fields');
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setLoading(false);
      Alert.alert('Registration failed', error.message);
      return;
    }

    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id,
        email,
        name,
        phone,
        role: 'diner',
        city,
        status: 'pending_approval',
        application: {
          food_industry_experience: foodIndustry,
          food_industry_details: foodIndustryDetails,
          previous_mystery_diner: prevMystery,
          previous_mystery_details: prevMysteryDetails,
          attention_to_detail: attentionToDetail,
          attention_example: attentionExample,
          discrete_notes: discreteNotes,
          discrete_strategies: discreteStrategies,
          availability,
          availability_restrictions: availabilityRestrictions,
          scenario_server: scenarioServer,
          scenario_hygiene: scenarioHygiene,
          motivation,
          additional_info: additionalInfo,
        },
      });
    }

    setLoading(false);
    Alert.alert(
      'Application Submitted!',
      'Thank you for applying to 5StarX. Wendy will review your application and be in touch shortly.',
      [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Step indicator */}
        <View style={styles.stepRow}>
          {[1, 2, 3].map(s => (
            <View key={s} style={[styles.stepDot, step === s && styles.stepDotActive]}>
              <Text style={[styles.stepDotText, step === s && styles.stepDotTextActive]}>{s}</Text>
            </View>
          ))}
        </View>

        {/* STEP 1 — Basic Info */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Your Details</Text>
            <TextInput style={styles.input} placeholder="Full name *" value={name} onChangeText={setName} placeholderTextColor={colours.textMuted} />
            <TextInput style={styles.input} placeholder="Email address *" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor={colours.textMuted} />
            <TextInput style={styles.input} placeholder="Contact number *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={colours.textMuted} />
            <TextInput style={styles.input} placeholder="City / Town of residence *" value={city} onChangeText={setCity} placeholderTextColor={colours.textMuted} />
            <TextInput style={styles.input} placeholder="Password *" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={colours.textMuted} />
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                if (!name || !email || !phone || !city || !password) {
                  Alert.alert('Please fill in all fields');
                  return;
                }
                setStep(2);
              }}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2 — Application Questions */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Application Questions</Text>

            <Text style={styles.label}>Have you worked in the food service industry?</Text>
            <View style={styles.yesNoRow}>
              {[true, false].map(val => (
                <TouchableOpacity
                  key={String(val)}
                  style={[styles.yesNoBtn, foodIndustry === val && styles.yesNoBtnActive]}
                  onPress={() => setFoodIndustry(val)}
                >
                  <Text style={[styles.yesNoBtnText, foodIndustry === val && styles.yesNoBtnTextActive]}>
                    {val ? 'Yes' : 'No'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {foodIndustry && (
              <TextInput style={[styles.input, styles.textArea]} placeholder="Please describe your experience" value={foodIndustryDetails} onChangeText={setFoodIndustryDetails} multiline numberOfLines={3} placeholderTextColor={colours.textMuted} />
            )}

            <Text style={styles.label}>Have you worked as a mystery diner/shopper before?</Text>
            <View style={styles.yesNoRow}>
              {[true, false].map(val => (
                <TouchableOpacity
                  key={String(val)}
                  style={[styles.yesNoBtn, prevMystery === val && styles.yesNoBtnActive]}
                  onPress={() => setPrevMystery(val)}
                >
                  <Text style={[styles.yesNoBtnText, prevMystery === val && styles.yesNoBtnTextActive]}>
                    {val ? 'Yes' : 'No'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {prevMystery && (
              <TextInput style={[styles.input, styles.textArea]} placeholder="Please provide details" value={prevMysteryDetails} onChangeText={setPrevMysteryDetails} multiline numberOfLines={3} placeholderTextColor={colours.textMuted} />
            )}

            <Text style={styles.label}>Rate your attention to detail</Text>
            <View style={styles.chipRow}>
              {DETAIL_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, attentionToDetail === opt && styles.chipActive]}
                  onPress={() => setAttentionToDetail(opt)}
                >
                  <Text style={[styles.chipText, attentionToDetail === opt && styles.chipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[styles.input, styles.textArea]} placeholder="Give an example of your attention to detail" value={attentionExample} onChangeText={setAttentionExample} multiline numberOfLines={3} placeholderTextColor={colours.textMuted} />

            <Text style={styles.label}>Are you comfortable taking discreet notes during your visit?</Text>
            <View style={styles.yesNoRow}>
              {[true, false].map(val => (
                <TouchableOpacity
                  key={String(val)}
                  style={[styles.yesNoBtn, discreteNotes === val && styles.yesNoBtnActive]}
                  onPress={() => setDiscreteNotes(val)}
                >
                  <Text style={[styles.yesNoBtnText, discreteNotes === val && styles.yesNoBtnTextActive]}>
                    {val ? 'Yes' : 'No'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {discreteNotes && (
              <TextInput style={[styles.input, styles.textArea]} placeholder="What strategies do you use to stay discreet?" value={discreteStrategies} onChangeText={setDiscreteStrategies} multiline numberOfLines={2} placeholderTextColor={colours.textMuted} />
            )}

            <Text style={styles.label}>Availability</Text>
            <View style={styles.chipRow}>
              {AVAILABILITY_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.chip, availability.includes(opt.key) && styles.chipActive]}
                  onPress={() => toggleAvailability(opt.key)}
                >
                  <Text style={[styles.chipText, availability.includes(opt.key) && styles.chipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Any availability restrictions?" value={availabilityRestrictions} onChangeText={setAvailabilityRestrictions} placeholderTextColor={colours.textMuted} />

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={() => setStep(3)}>
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 3 — Scenarios & Motivation */}
        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Scenarios & Motivation</Text>

            <Text style={styles.label}>Scenario: Your server forgets to offer dessert and rushes the bill. What do you do?</Text>
            <TextInput style={[styles.input, styles.textArea]} placeholder="Your response..." value={scenarioServer} onChangeText={setScenarioServer} multiline numberOfLines={4} placeholderTextColor={colours.textMuted} />

            <Text style={styles.label}>Scenario: You notice a hygiene issue during your visit. How do you report it?</Text>
            <TextInput style={[styles.input, styles.textArea]} placeholder="Your response..." value={scenarioHygiene} onChangeText={setScenarioHygiene} multiline numberOfLines={4} placeholderTextColor={colours.textMuted} />

            <Text style={styles.label}>Why do you want to be a mystery diner for 5StarX? *</Text>
            <TextInput style={[styles.input, styles.textArea]} placeholder="Tell us why..." value={motivation} onChangeText={setMotivation} multiline numberOfLines={4} placeholderTextColor={colours.textMuted} />

            <Text style={styles.label}>Anything else we should know about you?</Text>
            <TextInput style={[styles.input, styles.textArea]} placeholder="Optional..." value={additionalInfo} onChangeText={setAdditionalInfo} multiline numberOfLines={3} placeholderTextColor={colours.textMuted} />

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color={colours.charcoalDark} /> : <Text style={styles.buttonText}>Submit Application</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity onPress={() => router.back()} style={styles.loginLink}>
          <Text style={styles.loginLinkText}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  inner: { flexGrow: 1, paddingHorizontal: 28, paddingVertical: 48 },
  logo: { width: 100, height: 100, alignSelf: 'center', borderRadius: 10, marginBottom: 24 },
  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 28 },
  stepDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colours.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colours.white },
  stepDotActive: { backgroundColor: colours.gold, borderColor: colours.gold },
  stepDotText: { fontSize: 13, fontWeight: '600', color: colours.textMuted },
  stepDotTextActive: { color: colours.charcoalDark },
  stepTitle: { fontSize: 20, fontWeight: '700', color: colours.textPrimary, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: colours.textPrimary, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: colours.white, borderWidth: 1, borderColor: colours.border, borderRadius: 10, padding: 14, fontSize: 15, color: colours.textPrimary, marginBottom: 4 },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  yesNoRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  yesNoBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: colours.border, alignItems: 'center', backgroundColor: colours.white },
  yesNoBtnActive: { borderColor: colours.gold, backgroundColor: colours.gold },
  yesNoBtnText: { fontSize: 15, fontWeight: '600', color: colours.textSecondary },
  yesNoBtnTextActive: { color: colours.charcoalDark },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colours.border, backgroundColor: colours.white },
  chipActive: { borderColor: colours.gold, backgroundColor: colours.gold },
  chipText: { fontSize: 13, fontWeight: '600', color: colours.textSecondary },
  chipTextActive: { color: colours.charcoalDark },
  navRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  button: { flex: 1, backgroundColor: colours.gold, borderRadius: 10, padding: 15, alignItems: 'center' },
  buttonText: { fontSize: 15, fontWeight: '700', color: colours.charcoalDark },
  backBtn: { flex: 1, backgroundColor: colours.white, borderRadius: 10, padding: 15, alignItems: 'center', borderWidth: 1.5, borderColor: colours.border },
  backBtnText: { fontSize: 15, fontWeight: '600', color: colours.textSecondary },
  loginLink: { alignItems: 'center', marginTop: 32 },
  loginLinkText: { color: colours.textSecondary, fontSize: 14 },
});
