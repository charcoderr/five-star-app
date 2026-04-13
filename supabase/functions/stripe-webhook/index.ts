// deno-lint-ignore-file no-explicit-any
// Stripe webhook: keeps restaurants.subscription_status in sync with Stripe.
//
// Deploy with `--no-verify-jwt` so Stripe can reach it without a Supabase JWT:
//   supabase functions deploy stripe-webhook --no-verify-jwt
//
// Env vars:
//   STRIPE_SECRET_KEY           — sk_test_... / sk_live_...
//   STRIPE_WEBHOOK_SECRET       — whsec_... from the Stripe dashboard
//
// Stripe dashboard → Developers → Webhooks → Add endpoint:
//   URL:  https://<project-ref>.supabase.co/functions/v1/stripe-webhook
//   Events to listen for:
//     - invoice.paid
//     - invoice.payment_failed
//     - customer.subscription.created
//     - customer.subscription.updated
//     - customer.subscription.deleted

import Stripe from 'https://esm.sh/stripe@16.12.0?target=deno';
import { adminClient } from '../_shared/supabaseAdmin.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

function updateFromSubscription(sub: Stripe.Subscription) {
  const metaRestaurantId = (sub.metadata?.restaurant_id ?? '').toString();
  const metaPlanId = (sub.metadata?.plan_id ?? '').toString();
  const renewsAt = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  // Map Stripe subscription status → our 3-state column
  let status: 'active' | 'trial' | 'inactive';
  switch (sub.status) {
    case 'active':
    case 'trialing':
      status = 'active';
      break;
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      status = 'trial';
      break;
    default:
      status = 'inactive'; // canceled, incomplete_expired, paused
  }

  return {
    metaRestaurantId,
    update: {
      subscription_status: status,
      subscription_plan: metaPlanId || null,
      subscription_renews_at: renewsAt,
      stripe_subscription_id: sub.id,
      stripe_customer_id: sub.customer as string,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing stripe-signature', { status: 400 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed', err);
    return new Response(`Invalid signature: ${(err as Error).message}`, { status: 400 });
  }

  const sb = adminClient();

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const { metaRestaurantId, update } = updateFromSubscription(sub);

        if (metaRestaurantId) {
          await sb.from('restaurants').update(update).eq('id', metaRestaurantId);
        } else {
          // Fall back to customer id lookup
          await sb
            .from('restaurants')
            .update(update)
            .eq('stripe_customer_id', sub.customer as string);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const { metaRestaurantId, update } = updateFromSubscription(sub);
          if (metaRestaurantId) {
            await sb.from('restaurants').update(update).eq('id', metaRestaurantId);
          } else {
            await sb
              .from('restaurants')
              .update(update)
              .eq('stripe_customer_id', sub.customer as string);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.customer) {
          await sb
            .from('restaurants')
            .update({ subscription_status: 'trial' })
            .eq('stripe_customer_id', invoice.customer as string);
        }
        break;
      }

      default:
        // Ignore other event types
        break;
    }
  } catch (err) {
    console.error('Webhook handler error', event.type, err);
    return new Response('Handler error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
