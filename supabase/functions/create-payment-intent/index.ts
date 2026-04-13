// deno-lint-ignore-file no-explicit-any
// Creates (or reuses) a Stripe Customer for a restaurant, then creates a
// Subscription with `payment_behavior: default_incomplete` and returns the
// PaymentIntent client_secret for the mobile Stripe payment sheet to confirm.
//
// Expected body: { restaurantId: string, planId: 'standard' | 'premium' }
// Returns:       { clientSecret: string, subscriptionId: string }
//
// Env vars required:
//   STRIPE_SECRET_KEY               — sk_test_... / sk_live_...
//   STRIPE_PRICE_STANDARD           — price_... (from Stripe dashboard)
//   STRIPE_PRICE_PREMIUM            — price_...
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (set automatically by Supabase)

import Stripe from 'https://esm.sh/stripe@16.12.0?target=deno';
import { preflight, json } from '../_shared/cors.ts';
import { adminClient } from '../_shared/supabaseAdmin.ts';

const PRICE_BY_PLAN: Record<string, string | undefined> = {
  standard: Deno.env.get('STRIPE_PRICE_STANDARD'),
  premium:  Deno.env.get('STRIPE_PRICE_PREMIUM'),
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { restaurantId, planId } = await req.json();
    if (!restaurantId || !planId) return json({ error: 'restaurantId and planId required' }, 400);

    const priceId = PRICE_BY_PLAN[planId];
    if (!priceId) return json({ error: `Unknown planId: ${planId}` }, 400);

    const sb = adminClient();

    const { data: restaurant, error: rErr } = await sb
      .from('restaurants')
      .select('id, name, contact_email, stripe_customer_id, subscription_plan')
      .eq('id', restaurantId)
      .single();
    if (rErr) throw rErr;

    // Reuse existing Stripe customer or create a new one
    let customerId = (restaurant as any).stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: restaurant.contact_email ?? undefined,
        name: restaurant.name ?? undefined,
        metadata: { restaurant_id: restaurantId },
      });
      customerId = customer.id;

      await sb
        .from('restaurants')
        .update({ stripe_customer_id: customerId })
        .eq('id', restaurantId);
    }

    // Create an incomplete subscription. Stripe returns the latest invoice's
    // payment_intent with a client_secret we hand to the mobile payment sheet.
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card'],
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: { restaurant_id: restaurantId, plan_id: planId },
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice | null;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent | null;
    const clientSecret = paymentIntent?.client_secret;

    if (!clientSecret) {
      return json({ error: 'Stripe did not return a client_secret' }, 500);
    }

    // Mark as trial→transitioning so the UI reflects progress; webhook
    // flips this to 'active' once the first invoice is paid.
    await sb
      .from('restaurants')
      .update({
        subscription_plan: planId,
        subscription_status: 'trial',
      })
      .eq('id', restaurantId);

    return json({ clientSecret, subscriptionId: subscription.id });
  } catch (err) {
    console.error('create-payment-intent error', err);
    return json({ error: (err as Error).message }, 500);
  }
});
