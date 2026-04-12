import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Voucher } from '../types';
import { generateVoucherCode, defaultExpiryDate } from '../utils/voucher';

// Diner: fetch own vouchers
export function useMyVouchers(dinerId: string) {
  return useQuery({
    queryKey: ['vouchers', dinerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*, assignment:assignments(slot:slots(restaurant:restaurants(name, address)))')
        .eq('diner_id', dinerId)
        .order('issued_at', { ascending: false });
      if (error) throw error;
      return data as (Voucher & { assignment: any })[];
    },
    enabled: !!dinerId,
  });
}

// Admin: fetch all vouchers
export function useAllVouchers() {
  return useQuery({
    queryKey: ['vouchers', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*, diner:users(name, email), assignment:assignments(slot:slots(restaurant:restaurants(name)))')
        .order('issued_at', { ascending: false });
      if (error) throw error;
      return data as (Voucher & { diner: any; assignment: any })[];
    },
  });
}

// Issue a voucher on assignment confirmation
export function useIssueVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assignmentId,
      dinerId,
      value,
      expiresAt,
    }: {
      assignmentId: string;
      dinerId: string;
      value: number;
      expiresAt?: string;
    }) => {
      const code = generateVoucherCode();
      const expiry = expiresAt ?? defaultExpiryDate();

      const { data: voucher, error: voucherError } = await supabase
        .from('vouchers')
        .insert({
          assignment_id: assignmentId,
          diner_id: dinerId,
          value,
          qr_code: code,
          expires_at: expiry,
          status: 'issued',
        })
        .select()
        .single();

      if (voucherError) throw voucherError;

      // Link voucher to assignment and confirm it
      const { error: assignError } = await supabase
        .from('assignments')
        .update({ status: 'confirmed', voucher_id: voucher.id })
        .eq('id', assignmentId);

      if (assignError) throw assignError;

      return voucher as Voucher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
    },
  });
}

// Restaurant: redeem a voucher by code
export function useRedeemVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (qrCode: string) => {
      const { data: voucher, error: fetchError } = await supabase
        .from('vouchers')
        .select('*')
        .eq('qr_code', qrCode)
        .single();

      if (fetchError || !voucher) throw new Error('Voucher not found');
      if (voucher.status === 'redeemed') throw new Error('This voucher has already been redeemed');
      if (voucher.status === 'expired') throw new Error('This voucher has expired');

      const { error } = await supabase
        .from('vouchers')
        .update({ status: 'redeemed' })
        .eq('id', voucher.id);

      if (error) throw error;
      return voucher as Voucher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] });
    },
  });
}
