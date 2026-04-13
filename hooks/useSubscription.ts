import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ─── Get subscription status + billing info for a restaurant ─────────────────
export function useSubscriptionStatus(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['subscription', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select(`
          id, name,
          subscription_status, subscription_plan, subscription_renews_at,
          invoice_amount_pence, invoice_interval,
          last_invoice_sent_at, last_payment_received_at,
          billing_notes
        `)
        .eq('id', restaurantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });
}

// ─── Admin: update subscription status / plan (manual override) ──────────────
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
      queryClient.invalidateQueries({ queryKey: ['crm-restaurant', restaurantId] });
    },
  });
}

// ─── Admin: manual invoice tracking ───────────────────────────────────────────
// Wendy invoices each restaurant manually (bank transfer / Xero). These
// mutations record the billing cycle on the restaurant record.

export interface InvoiceUpdate {
  restaurantId: string;
  amountPence?: number;
  interval?: 'monthly' | 'quarterly' | 'annual';
  plan?: string;
  renewsAt?: string | null;   // ISO string or null to clear
  notes?: string;
}

export function useUpdateBillingInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (u: InvoiceUpdate) => {
      const patch: Record<string, unknown> = {};
      if (u.amountPence !== undefined) patch.invoice_amount_pence = u.amountPence;
      if (u.interval) patch.invoice_interval = u.interval;
      if (u.plan) patch.subscription_plan = u.plan;
      if (u.renewsAt !== undefined) patch.subscription_renews_at = u.renewsAt;
      if (u.notes !== undefined) patch.billing_notes = u.notes;

      const { error } = await supabase
        .from('restaurants')
        .update(patch)
        .eq('id', u.restaurantId);
      if (error) throw error;
    },
    onSuccess: (_, { restaurantId }) => {
      queryClient.invalidateQueries({ queryKey: ['subscription', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['crm-restaurant', restaurantId] });
    },
  });
}

// Marks "invoice sent today" — stamps the date
export function useMarkInvoiceSent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (restaurantId: string) => {
      const { error } = await supabase
        .from('restaurants')
        .update({ last_invoice_sent_at: new Date().toISOString() })
        .eq('id', restaurantId);
      if (error) throw error;
    },
    onSuccess: (_, restaurantId) => {
      queryClient.invalidateQueries({ queryKey: ['subscription', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['crm-restaurant', restaurantId] });
    },
  });
}

// Marks "payment received today" — stamps the date AND flips to active
// AND bumps the renewal date forward by the interval.
export function useMarkPaymentReceived() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      restaurantId,
      interval = 'monthly',
    }: {
      restaurantId: string;
      interval?: 'monthly' | 'quarterly' | 'annual';
    }) => {
      const now = new Date();
      const renews = new Date(now);
      if (interval === 'monthly')   renews.setMonth(renews.getMonth() + 1);
      if (interval === 'quarterly') renews.setMonth(renews.getMonth() + 3);
      if (interval === 'annual')    renews.setFullYear(renews.getFullYear() + 1);

      const { error } = await supabase
        .from('restaurants')
        .update({
          last_payment_received_at: now.toISOString(),
          subscription_status: 'active',
          subscription_renews_at: renews.toISOString(),
        })
        .eq('id', restaurantId);
      if (error) throw error;
    },
    onSuccess: (_, { restaurantId }) => {
      queryClient.invalidateQueries({ queryKey: ['subscription', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['crm-restaurant', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['admin-restaurants'] });
    },
  });
}
