import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { colours } from '../utils/theme';

interface Props {
  status: 'active' | 'inactive' | 'trial' | string | undefined;
  children: React.ReactNode;
  /** How many items to show in trial mode before cutting off (default 2) */
  trialPreviewCount?: number;
}

/**
 * Wraps content that requires an active subscription.
 * - active: renders children as-is
 * - trial: renders children but with a soft paywall banner at the bottom
 * - inactive: renders a hard paywall replacing the content
 */
export default function SubscriptionGate({ status, children, trialPreviewCount = 2 }: Props) {
  if (status === 'active') return <>{children}</>;

  if (status === 'inactive') {
    return (
      <View style={styles.hardwall}>
        <Text style={styles.icon}>🔒</Text>
        <Text style={styles.title}>Subscription required</Text>
        <Text style={styles.body}>
          Subscribe to 5StarX to access your mystery dine reports, scores, and analytics.
        </Text>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => router.push('/(restaurant)/subscription')}
        >
          <Text style={styles.ctaBtnText}>View plans</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // trial — show content with a soft banner
  return (
    <View style={styles.trialContainer}>
      {children}
      <View style={styles.trialBanner}>
        <View style={styles.trialBannerInner}>
          <Text style={styles.trialTitle}>You're on a free trial</Text>
          <Text style={styles.trialBody}>
            Subscribe to unlock all reports and the full analytics dashboard.
          </Text>
          <TouchableOpacity
            style={styles.trialBtn}
            onPress={() => router.push('/(restaurant)/subscription')}
          >
            <Text style={styles.trialBtnText}>See plans →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hardwall: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 36, backgroundColor: colours.offWhite },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: colours.textPrimary, textAlign: 'center', marginBottom: 12 },
  body: { fontSize: 15, color: colours.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  ctaBtn: { backgroundColor: colours.gold, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: colours.charcoalDark },

  trialContainer: { flex: 1 },
  trialBanner: { padding: 16 },
  trialBannerInner: { backgroundColor: colours.charcoalDark, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: colours.gold },
  trialTitle: { fontSize: 15, fontWeight: '700', color: colours.gold, marginBottom: 6 },
  trialBody: { fontSize: 13, color: colours.charcoalLight, lineHeight: 18, marginBottom: 14 },
  trialBtn: { backgroundColor: colours.gold, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 9, alignSelf: 'flex-start' },
  trialBtnText: { fontSize: 14, fontWeight: '700', color: colours.charcoalDark },
});
