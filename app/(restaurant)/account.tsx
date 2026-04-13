import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { colours } from '../../utils/theme';
import { useAuthStore } from '../../stores/authStore';
import { useSubscriptionStatus } from '../../hooks/useSubscription';
import { StatusPill } from '../../components/StatusPill';
import { SUBSCRIPTION_STATUS, getStatus } from '../../utils/statusColors';

const BILLING_EMAIL = 'billing@5starx.co.uk';

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatAmount(pence: number | null | undefined, interval: string | null | undefined): string {
  if (pence == null) return '—';
  const pounds = (pence / 100).toFixed(0);
  const suffix = interval === 'annual' ? '/yr'
    : interval === 'quarterly' ? '/qtr'
    : '/mo';
  return `£${pounds}${suffix}`;
}

export default function RestaurantAccount() {
  const { user } = useAuthStore();
  const restaurantId = (user as any)?.restaurant_id ?? '';
  const { data: sub, isLoading } = useSubscriptionStatus(restaurantId);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colours.gold} />
      </View>
    );
  }

  const status = getStatus(SUBSCRIPTION_STATUS, sub?.subscription_status);
  const planLabel = sub?.subscription_plan
    ? sub.subscription_plan.charAt(0).toUpperCase() + sub.subscription_plan.slice(1)
    : '—';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>SUBSCRIPTION STATUS</Text>
          <View style={styles.statusRow}>
            <StatusPill status={status} />
          </View>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Plan</Text>
              <Text style={styles.summaryVal}>{planLabel}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Amount</Text>
              <Text style={styles.summaryVal}>
                {formatAmount(sub?.invoice_amount_pence, sub?.invoice_interval)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Renews</Text>
              <Text style={styles.summaryVal}>{formatDate(sub?.subscription_renews_at)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Last invoice</Text>
              <Text style={styles.summaryVal}>{formatDate(sub?.last_invoice_sent_at)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Last payment</Text>
              <Text style={styles.summaryVal}>{formatDate(sub?.last_payment_received_at)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Billing</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Paid by invoice</Text>
          <Text style={styles.infoBody}>
            5StarX invoices you directly via email each billing cycle. Payment is made by
            bank transfer to the details on the invoice.
          </Text>
          <Text style={styles.infoBody}>
            Once Wendy confirms payment, your subscription status will switch back to
            Active and all reports become available again.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Billing queries</Text>
        <View style={styles.contactCard}>
          <Text style={styles.contactLabel}>Email</Text>
          <TouchableOpacity onPress={() => Linking.openURL(`mailto:${BILLING_EMAIL}`)}>
            <Text style={styles.contactLink}>{BILLING_EMAIL}</Text>
          </TouchableOpacity>
        </View>

        {Platform.OS !== 'web' ? (
          <Text style={styles.footer}>
            To update your plan, change billing contact details, or request a VAT
            receipt, email the address above and Wendy will follow up directly.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colours.offWhite },

  header: { paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20, backgroundColor: colours.charcoalDark, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  back: { color: colours.gold, fontSize: 15, fontWeight: '600', paddingBottom: 2 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colours.white },

  content: { padding: 20, paddingBottom: 48 },

  statusCard: { backgroundColor: colours.charcoalDark, borderRadius: 16, padding: 20, marginBottom: 24 },
  statusLabel: { fontSize: 11, fontWeight: '700', color: colours.charcoalLight, letterSpacing: 1, marginBottom: 10 },
  statusRow: { marginBottom: 16 },
  summaryGrid: { borderTopWidth: 1, borderTopColor: colours.charcoal, paddingTop: 14, gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryKey: { fontSize: 13, color: colours.charcoalLight, fontWeight: '500' },
  summaryVal: { fontSize: 14, color: colours.white, fontWeight: '700' },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: colours.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },

  infoCard: { backgroundColor: colours.white, borderRadius: 14, padding: 18, marginBottom: 24, gap: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  infoTitle: { fontSize: 15, fontWeight: '700', color: colours.textPrimary },
  infoBody: { fontSize: 14, color: colours.textSecondary, lineHeight: 20 },

  contactCard: { backgroundColor: colours.white, borderRadius: 14, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  contactLabel: { fontSize: 12, fontWeight: '600', color: colours.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  contactLink: { fontSize: 15, fontWeight: '700', color: colours.gold },

  footer: { fontSize: 12, color: colours.textMuted, lineHeight: 18, marginTop: 8 },
});
