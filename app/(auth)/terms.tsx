import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { colours } from '../../utils/theme';

const TCS_VERSION = 1; // Bump this when Wendy updates the T&Cs

export default function TermsScreen() {
  const { user } = useAuthStore();
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
    if (isAtBottom) setHasScrolledToBottom(true);
  }

  async function handleAgree() {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from('tcs_agreements').insert({
      diner_id: user.id,
      version: TCS_VERSION,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', 'Could not save your agreement. Please try again.');
      return;
    }
    router.replace('/(diner)/home');
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Terms & Conditions</Text>
        <Text style={styles.subtitle}>Please read carefully and scroll to the bottom to agree.</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.tcsMeta}>Effective Date: 1st May 2025</Text>
        <Text style={styles.tcsMeta}>Company: 5StarX, registered in Scotland</Text>

        <Section title="1. Introduction">
          These terms and conditions set out the relationship between 5StarX ("the Company") and you, the Mystery Shopper. By accepting mystery shopping assignments, you agree to these terms.
        </Section>

        <Section title="2. Eligibility">
          To be eligible as a Mystery Shopper, you must:{'\n\n'}
          • Be at least 18 years of age.{'\n'}
          • Reside in the United Kingdom.{'\n'}
          • Be eligible to work in the United Kingdom.{'\n'}
          • Not be employed by or have a conflict of interest with the client being evaluated.{'\n'}
          • Shoppers are permitted to two alcoholic drinks per assignment.
        </Section>

        <Section title="3. Independent Contractor Status">
          • You are engaged as an independent contractor, not an employee of the Company.{'\n'}
          • You are responsible for your own taxes, including Income Tax and National Insurance, under HMRC guidelines.{'\n'}
          • You are not entitled to employment rights such as holiday pay, sick pay, or pension contributions.
        </Section>

        <Section title="4. Assignments">
          • Assignments are offered at the Company's discretion and may be accepted or declined by you.{'\n'}
          • Each assignment will come with specific instructions, deadlines, and payment details.{'\n'}
          • Failure to follow assignment requirements or deadlines may result in non-payment or removal from our approved shopper list.
        </Section>

        <Section title="5. Standards of Conduct">
          You agree to:{'\n\n'}
          • Carry out each assignment with professionalism, honesty and impartiality.{'\n'}
          • Remain anonymous to the client's staff during the visit.{'\n'}
          • Not disclose your role or discuss the assignment with unauthorised persons.{'\n'}
          • Abide by all laws and safety regulations while conducting visits.{'\n'}
          • 5StarX does not accept liability for accidents occurring during the dines.
        </Section>

        <Section title="6. Confidentiality">
          • All information regarding the Company, its clients and assignments is confidential.{'\n'}
          • You may not disclose, share, or publish any details about the assignment or client.{'\n'}
          • Breach of confidentiality may result in legal action.
        </Section>

        <Section title="7. Reporting Requirements">
          • Reports must be accurate, complete, and submitted by the deadline.{'\n'}
          • Supporting documents (e.g., receipts, photographs) must be genuine and provided where required.{'\n'}
          • Falsification of reports will result in termination and may lead to legal action.
        </Section>

        <Section title="8. Payment">
          • Payment terms will be stated per assignment and typically processed within 14 or 30 days following acceptance of a completed report.{'\n'}
          • Payments will be made via BACS bank transfer.{'\n'}
          • You are responsible for ensuring your bank details are correct.{'\n'}
          • You may be required to submit invoices in accordance with UK tax laws.
        </Section>

        <Section title="9. Proof of Assignment">
          In order to prove work of assignment and receive payment, shoppers are to provide evidence of their visit — including pictures, receipts and completed reports.
        </Section>

        <Section title="10. Termination">
          • Either party may terminate this Agreement at any time, with or without cause.{'\n'}
          • The Company may remove you from its database for non-compliance or misconduct.
        </Section>

        <Section title="11. Data Protection">
          • The Company will handle your personal data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.{'\n'}
          • Your data will not be shared with third parties except where necessary for assignment fulfilment or legal compliance.
        </Section>

        <Section title="12. Intellectual Property">
          All reports, media, and materials you produce as part of an assignment are the intellectual property of the Company and/or client.
        </Section>

        <Section title="13. Limitation of Liability">
          The Company is not responsible for any losses, damages or personal injury incurred while performing assignments — including travelling to and from the venues.
        </Section>

        <Section title="14. Acceptance of Terms">
          By tapping "I Agree" below, you acknowledge that you have read, understood, and agree to these Terms & Conditions. Your agreement will be recorded with a timestamp.
        </Section>

        <View style={styles.endMarker}>
          <Text style={styles.endMarkerText}>— End of Terms & Conditions —</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {!hasScrolledToBottom && (
          <Text style={styles.scrollHint}>↓ Scroll to the bottom to enable agreement</Text>
        )}
        <TouchableOpacity
          style={[styles.agreeBtn, !hasScrolledToBottom && styles.agreeBtnDisabled]}
          onPress={handleAgree}
          disabled={!hasScrolledToBottom || loading}
        >
          {loading ? (
            <ActivityIndicator color={colours.charcoalDark} />
          ) : (
            <Text style={styles.agreeBtnText}>I Agree to the Terms & Conditions</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineBtn} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.declineBtnText}>Decline & Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      <Text style={sectionStyles.body}>{children}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: { marginBottom: 20 },
  title: { fontSize: 15, fontWeight: '700', color: colours.textPrimary, marginBottom: 6 },
  body: { fontSize: 14, color: colours.textSecondary, lineHeight: 22 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 24, backgroundColor: colours.white, borderBottomWidth: 1, borderBottomColor: colours.border, alignItems: 'center' },
  logo: { width: 140, height: 44, borderRadius: 5, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: colours.textPrimary },
  subtitle: { fontSize: 13, color: colours.textSecondary, marginTop: 4, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 24 },
  tcsMeta: { fontSize: 13, fontWeight: '600', color: colours.charcoal, marginBottom: 4 },
  endMarker: { paddingVertical: 24, alignItems: 'center' },
  endMarkerText: { fontSize: 13, color: colours.textMuted, fontStyle: 'italic' },
  footer: { padding: 20, backgroundColor: colours.white, borderTopWidth: 1, borderTopColor: colours.border },
  scrollHint: { fontSize: 13, color: colours.gold, textAlign: 'center', marginBottom: 10, fontWeight: '600' },
  agreeBtn: { backgroundColor: colours.gold, borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 10 },
  agreeBtnDisabled: { backgroundColor: colours.border },
  agreeBtnText: { fontSize: 15, fontWeight: '700', color: colours.charcoalDark },
  declineBtn: { alignItems: 'center', padding: 10 },
  declineBtnText: { fontSize: 14, color: colours.textMuted },
});
