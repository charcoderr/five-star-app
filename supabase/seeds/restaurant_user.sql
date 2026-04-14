-- ─── Seed: Restaurant login for La Vita Buchanan Street ─────────────────────
-- Creates an auth user + public.users row with role='restaurant' linked to
-- La Vita Buchanan Street, so you can sign in and see the restaurant portal.
--
-- Login:
--   email:    restaurant@5starx.co.uk
--   password: Test1234!
--
-- Idempotent: re-running updates the password and role link in place.
--
-- Apply with:
--   supabase db query --linked --file supabase/seeds/restaurant_user.sql

-- Fixed UUID so the auth and public rows always line up on re-runs.
-- Using a valid-hex prefix (no g/h/z). Pattern: cccccccc-2222-... (diner is -1111-).
do $$
declare
  v_user_id   uuid := 'cccccccc-2222-4000-8000-000000000001';
  v_email     text := 'restaurant@5starx.co.uk';
  v_password  text := 'Test1234!';
  v_rest_id   uuid := 'aaaaaaaa-1111-4000-8000-000000000001';  -- La Vita Buchanan Street
begin
  -- 1. Upsert into auth.users
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated', v_email,
    crypt(v_password, gen_salt('bf')), now(),
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, '', '', '', ''
  )
  on conflict (id) do update set
    encrypted_password = crypt(v_password, gen_salt('bf')),
    email              = v_email,
    email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
    updated_at         = now();

  -- 2. Upsert into auth.identities (required for email login)
  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  )
  on conflict (provider, provider_id) do update set
    identity_data = excluded.identity_data,
    updated_at    = now();

  -- 3. Upsert public.users row linked to the restaurant
  insert into public.users (id, email, role, name, status, restaurant_id)
  values (v_user_id, v_email, 'restaurant', 'La Vita Manager', 'active', v_rest_id)
  on conflict (id) do update set
    email         = excluded.email,
    role          = 'restaurant',
    name          = excluded.name,
    status        = 'active',
    restaurant_id = excluded.restaurant_id;
end $$;

-- Verify
select u.email, u.role, u.status, r.name as restaurant
from public.users u
left join public.restaurants r on r.id = u.restaurant_id
where u.email = 'restaurant@5starx.co.uk';
