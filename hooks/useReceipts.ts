import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Upload a receipt photo for an assignment (no-voucher reimbursement flow).
// Stores the image in the `receipt-uploads` bucket and saves the path to
// assignments.receipt_path.
export function useUploadReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId, uri }: { assignmentId: string; uri: string }) => {
      const filename = `${assignmentId}/${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('receipt-uploads')
        .upload(filename, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('assignments')
        .update({ receipt_path: filename })
        .eq('id', assignmentId);

      if (dbError) throw dbError;

      return filename;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
    },
  });
}

// Get a signed URL for a receipt image path.
export function useReceiptUrl(receiptPath: string | null | undefined) {
  return useQuery({
    queryKey: ['receipt-url', receiptPath],
    queryFn: async () => {
      const { data } = await supabase.storage
        .from('receipt-uploads')
        .createSignedUrl(receiptPath!, 3600);
      return data?.signedUrl ?? null;
    },
    enabled: !!receiptPath,
  });
}
