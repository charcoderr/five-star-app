import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { colours } from '../../utils/theme';

// The current T&Cs text — in a full implementation this would be fetched
// from a tcs_content table in Supabase (Scott to wire up)
const DEFAULT_TCS = `Mystery Shopper Terms & Conditions (UK)
Effective Date: 1st May 2025
Company: 5StarX, registered in Scotland.

1. Introduction
These terms and conditions set out the relationship between "company" 5StarX and "you" the Mystery Shopper. By accepting mystery shopping assignments, you agree to these terms.

2. Eligibility
To be eligible as a Mystery Shopper, you must:
- Be at least 18 years of age.
- Shoppers are permitted to two alcoholic drinks per assignment.
- Reside in the United Kingdom.
- Be eligible to work in the United Kingdom.
- Not be employed by or have a conflict of interest with the client being evaluated.

3. Independent Contractor Status
- You are engaged as an independent contractor, not an employee of the Company.
- You are responsible for your own taxes, including Income Tax and National Insurance, under HMRC guidelines.
- You are not entitled to employment rights such as holiday pay, sick pay, or pension contributions.

4. Assignments
- Assignments are offered at the Company's discretion and may be accepted or declined by you.
- Each assignment will come with specific instructions, deadlines, and payment details.
- Failure to follow assignment requirements or deadlines may result in non-payment or removal from our approved shopper list.

5. Standards of Conduct
You agree to:
- Carry out each assignment with professionalism, honesty and impartiality.
- Remain anonymous to the client's staff during the visit.
- Not disclose your role or discuss the assignment with unauthorised persons.
- Abide by all laws and safety regulations while conducting visits.
- 5StarX does not accept liability for accidents occurring or during the dines.

6. Confidentiality
- All information regarding the company, its clients and assignments is confidential.
- You may not disclose, share, or publish any details about the assignment or client.
- Breach of confidentiality may result in legal action.

7. Reporting Requirements
- Reports must be accurate, complete, and submitted by the deadline.
- Supporting documents (e.g., receipts, photographs) must be genuine and provided where required.
- Falsification of reports will result in termination and may lead to legal action.

8. Payment
- Payment terms will be stated per assignment and typically processed within 14 or 30 days following acceptance of a completed report.
- Payments will be made via BACS bank transfer.
- You are responsible for ensuring your bank details are correct.
- You may be required to submit invoices in accordance with UK tax laws.

9. Proof of Assignment
In order to prove work of assignment and receive payment shoppers are to provide evidence of their visit — pictures, receipts and reports.

10. Termination
- Either party may terminate this Agreement at any time, with or without cause.
- The Company may remove you from its database for non-compliance or misconduct.

11. Data Protection
- The Company will handle your personal data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
- Your data will not be shared with third parties except where necessary for assignment fulfilment or legal compliance.

12. Intellectual Property
All reports, media, and materials you produce as part of an assignment are the intellectual property of the Company and/or client.

13. Limitation of Liability
The Company is not responsible for any losses, damages or personal injury incurred while performing assignments — including travelling to and from the venues.

14. Acceptance of Terms
By registering and/or accepting any assignment, you acknowledge that you have read, understood, and agree to these Terms & Conditions.`;

export default function TcsEditor() {
  const [content, setContent] = useState(DEFAULT_TCS);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleChange(text: string) {
    setContent(text);
    setHasChanges(true);
  }

  async function handleSave() {
    Alert.alert(
      'Update Terms & Conditions?',
      'All active diners will be asked to re-read and re-agree to the new version next time they open the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save & Publish',
          onPress: async () => {
            setSaving(true);
            // TODO: Scott to wire up — insert into tcs_content table
            // await supabase.from('tcs_content').insert({ content, version: currentVersion + 1 })
            setSaving(false);
            setHasChanges(false);
            Alert.alert('Saved!', 'The updated T&Cs will be shown to diners on their next login.');
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit T&Cs</Text>
        {hasChanges && (
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={colours.charcoalDark} size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>
          Saving a new version will prompt all active diners to re-agree next time they open the app.
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <TextInput
          style={styles.editor}
          value={content}
          onChangeText={handleChange}
          multiline
          placeholderTextColor={colours.textMuted}
          textAlignVertical="top"
          scrollEnabled={false}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  header: { paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20, backgroundColor: colours.charcoalDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { color: colours.gold, fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colours.white },
  saveBtn: { backgroundColor: colours.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: colours.charcoalDark },
  infoBanner: { backgroundColor: colours.gold + '18', borderLeftWidth: 4, borderLeftColor: colours.gold, margin: 16, borderRadius: 8, padding: 12 },
  infoText: { fontSize: 13, color: colours.goldDark, lineHeight: 18 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  editor: { backgroundColor: colours.white, borderRadius: 12, padding: 16, fontSize: 14, color: colours.textPrimary, lineHeight: 22, borderWidth: 1, borderColor: colours.border },
});
