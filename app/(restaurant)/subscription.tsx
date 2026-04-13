import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useStripe } from '@stripe/stripe-react-native';
import { colours } from '../../utils/theme';
import { useAuthStore } from '../../stores/authStore';
import { SUBSCRIPTION_PLANS, formatPrice } from '../../utils/stripe';
import { useSubscriptionStatus, createPaymentIntent } from '../../hooks/useSubscription';

export default function RestaurantSubscription() {
  const { user } = useAuthStore();
  const restaurantId = (user as any)?.restaurant_id ?? '';
  const { data: sub, isLoading } = useSubscriptionStatus(restaurantId);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  async function handleSubscribe(planId: string) {
    setLoadingPlanId(planId);
    try {
      // 1. Get client secret from Edge Function (Scott to deploy)
      const { clientSecret } = await createPaymentIntent(restaurantId, planId);

      // 2. Initialise Stripe payment sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: '5StarX',
        style: 'alwaysLight',
        appearance: {
          colors: {
            primary: colours.gold,
            background: colours.white,
            componentBackground: colours.offWhite,
          },
        },
      });
      if (initError) {
        Alert.alert('Payment error', initError.message);
        return;
      }

      // 3. Present the payment sheet
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Payment failed', presentError.message);
        }
        return;
      }

      // 4. Success — Stripe webhook will update subscription_status
      Alert.alert(
        'Subscription active!',
        'Your plan is now live. Reports and analytics are fully available.',
        [{ text: 'Great', onPress: () => router.replace('/(restaurant)/dashboard') }]
      );
    } catch (err: any) {
      Alert.alert(
        'Could not process payment',
        err?.message ?? 'Please try again or contact 5StarX.'
      );
    } finally {
      setLoadingPlanId(null);
    }
  }

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator color={colours.gold} size="large" /></View>;
  }

  const isActive = sub?.subscription_status === 'active';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Choose your plan</Text>
        <Text style={styles.subtitle}>
          Your subscription covers your monthly mystery dine visits and access to full reports.
        </Text>

        {isActive && (
          <View style={styles.activeBanner}>
            <Text style={styles.activeBannerText}>
              You are on the {sub?.subscription_plan ?? 'active'} plan. Tap a plan below to upgrade or change.
            </Text>
          </View>
        )}

        {SUBSCRIPTION_PLANS.map(plan => {
          const isCurrent = sub?.subscription_plan === plan.id && isActive;
          const loading = loadingPlanId === plan.id;

          return (
            <View key={plan.id} style={[styles.planCard, plan.recommended && styles.planCardRecommended]}>
              {plan.recommended && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>Most Popular</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{formatPrice(plan.priceMonthly)}</Text>
              </View>

              <View style={styles.featureList}>
                {plan.features.map(f => (
                  <View key={f} style={styles.featureRow}>
                    <Text style={styles.featureCheck}>✓</Text>
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.subscribeBtn,
                  plan.recommended && styles.subscribeBtnGold,
                  isCurrent && styles.subscribeBtnCurrent,
                ]}
                onPress={() => handleSubscribe(plan.id)}
                disabled={loading || isCurrent}
              >
                {loading ? (
                  <ActivityIndicator color={plan.recommended ? colours.charcoalDark : colours.gold} />
                ) : (
                  <Text style={[styles.subscribeBtnText, plan.recommended && styles.subscribeBtnTextGold]}>
                    {isCurrent ? 'Current plan' : isActive ? 'Switch to this plan' : 'Subscribe'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        <Text style={styles.footer}>
          Payments are processed securely by Stripe. Cancel anytime from your account.
          For billing queries, contact Wendy at 5StarX.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20, backgroundColor: colours.charcoalDark, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  back: { color: colours.gold, fontSize: 15, fontWeight: '600', paddingBottom: 2 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colours.white },
  content: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: '800', color: colours.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 15, color: colours.textSecondary, lineHeight: 22, marginBottom: 20 },
  activeBanner: { backgroundColor: colours.scoreGood + '18', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colours.scoreGood, marginBottom: 20 },
  activeBannerText: { fontSize: 14, color: colours.scoreGood, fontWeight: '500' },
  planCard: { backgroundColor: colours.white, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1.5, borderColor: colours.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  planCardRecommended: { borderColor: colours.gold, borderWidth: 2 },
  recommendedBadge: { alignSelf: 'flex-start', backgroundColor: colours.gold, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12 },
  recommendedText: { fontSize: 11, fontWeight: '800', color: colours.charcoalDark, textTransform: 'uppercase', letterSpacing: 0.5 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  planName: { fontSize: 20, fontWeight: '800', color: colours.textPrimary },
  planPrice: { fontSize: 20, fontWeight: '700', color: colours.gold },
  featureList: { gap: 8, marginBottom: 20 },
  featureRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  featureCheck: { fontSize: 14, color: colours.gold, fontWeight: '700', marginTop: 1 },
  featureText: { fontSize: 14, color: colours.textPrimary, flex: 1, lineHeight: 20 },
  subscribeBtn: { borderRadius: 12, padding: 15, alignItems: 'center', borderWidth: 1.5, borderColor: colours.gold },
  subscribeBtnGold: { backgroundColor: colours.gold, borderColor: colours.gold },
  subscribeBtnCurrent: { borderColor: colours.border, backgroundColor: colours.offWhite },
  subscribeBtnText: { fontSize: 15, fontWeight: '700', color: colours.gold },
  subscribeBtnTextGold: { color: colours.charcoalDark },
  footer: { fontSize: 12, color: colours.textMuted, textAlign: 'center', lineHeight: 18, marginTop: 8 },
});
