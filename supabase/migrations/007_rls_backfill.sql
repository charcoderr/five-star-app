-- ─── Backfill missing RLS policies ──────────────────────────────────────────
-- Migration 001 enabled RLS on tcs_agreements, report_photos, and ratings
-- but never defined any policies, which means every read and write gets
-- silently blocked on the client. This was caught when the test diner
-- "Could not save your agreement" on the T&Cs screen.

-- ─── T&Cs agreements ────────────────────────────────────────────────────────
drop policy if exists "Diners view own tcs agreement" on public.tcs_agreements;
create policy "Diners view own tcs agreement" on public.tcs_agreements
  for select using (
    diner_id = auth.uid() or public.current_user_role() = 'admin'
  );

drop policy if exists "Diners record own tcs agreement" on public.tcs_agreements;
create policy "Diners record own tcs agreement" on public.tcs_agreements
  for insert with check (diner_id = auth.uid());

-- ─── Report photos ──────────────────────────────────────────────────────────
drop policy if exists "Diners manage own report photos" on public.report_photos;
create policy "Diners manage own report photos" on public.report_photos
  for all using (
    exists (
      select 1 from public.reports r
      where r.id = report_photos.report_id
        and r.diner_id = auth.uid()
    )
    or public.current_user_role() = 'admin'
  )
  with check (
    exists (
      select 1 from public.reports r
      where r.id = report_photos.report_id
        and r.diner_id = auth.uid()
    )
  );

drop policy if exists "Admin reads all report photos" on public.report_photos;
create policy "Admin reads all report photos" on public.report_photos
  for select using (public.current_user_role() = 'admin');

-- ─── Ratings (read-only for non-admins; admins manage) ──────────────────────
drop policy if exists "Authenticated read ratings" on public.ratings;
create policy "Authenticated read ratings" on public.ratings
  for select using (auth.uid() is not null);

drop policy if exists "Admin manages ratings" on public.ratings;
create policy "Admin manages ratings" on public.ratings
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
