// ─── Stripe configuration ─────────────────────────────────────────────────────
// Publishable key is safe to include in client code.
// Secret key MUST stay server-side (Supabase Edge Function).
export const STRIPE_PUBLISHABLE_KEY =
  'pk_test_REPLACE_WITH_YOUR_STRIPE_PUBLISHABLE_KEY';

// ─── Subscription plans ───────────────────────────────────────────────────────
export interface SubscriptionPlan {
  id: string;
  name: string;
  priceMonthly: number;     // GBP pence (e.g. 4900 = £49)
  stripePriceId: string;    // from Stripe dashboard — Scott to fill in
  features: string[];
  recommended?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'standard',
    name: 'Standard',
    priceMonthly: 4900,
    stripePriceId: 'price_REPLACE_STANDARD',
    features: [
      'Monthly mystery dine visit',
      'Full scored report',
      'Photo evidence included',
      'Overall star rating',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    priceMonthly: 9900,
    stripePriceId: 'price_REPLACE_PREMIUM',
    recommended: true,
    features: [
      'Everything in Standard',
      'Unlimited visits per month',
      'Score breakdown by category',
      'Notes from 5StarX reviewer',
      'Priority scheduling',
    ],
  },
];

export function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(0)}/mo`;
}
