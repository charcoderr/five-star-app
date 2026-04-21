-- ─── Receipt uploads (no-voucher reimbursement flow) ────────────────────────
-- When Wendy doesn't issue a voucher, the diner pays out of pocket and
-- uploads a photo of their receipt. Wendy sees it on the report review
-- page and processes the reimbursement.

alter table public.assignments
  add column if not exists receipt_path text;

comment on column public.assignments.receipt_path is
  'Supabase Storage path in the receipt-uploads bucket. Set by the diner for the reimbursement (no-voucher) flow.';

-- Storage bucket created manually in Supabase dashboard:
-- Name: receipt-uploads, Public: false (signed URLs only)
-- Or via CLI: supabase storage create receipt-uploads --public false
