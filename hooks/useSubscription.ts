import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ─── Get subscription status for a restaurant ────────────────────────────────
export function useSubscriptionStatus(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['subscription', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, subscription_status, subscription_plan, subscription_renews_at')
        .eq('id', restaurantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });
}

// ─── Create a payment intent (calls Edge Function Scott needs to deploy) ──────
// Edge Function: supabase/functions/create-payment-intent/index.ts
// It should: create a Stripe customer if needed, create a subscription or
// payment intent, return { clientSecret }
export async function createPaymentIntent(restaurantId: string, planId: string) {
  const { data, error } = await supabase.functions.invoke('create-payment-intent', {
    body: { restaurantId, planId },
  });
  if (error) throw error;
  return data as { clientSecret: string };
}

// ─── Admin: manually update a restaurant's subscription (override) ────────────
export function useSetSubscriptionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      restaurantId,
      status,
      plan,
    }: {
      restaurantId: string;
      status: 'active' | 'inactive' | 'trial';
      plan?: string;
    }) => {
      const { error } = await supabase
        .from('restaurants')
        .update({
          subscription_status: status,
          ...(plan ? { subscription_plan: plan } : {}),
        })
        .eq('id', restaurantId);
      if (error) throw error;
    },
    onSuccess: (_, { restaurantId }) => {
      queryClient.invalidateQueries({ queryKey: ['subscription', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['admin-restaurants'] });
      queryClient.invalidateQueries({ queryKey: ['my-restaurant', restaurantId] });
    },
  });
}
