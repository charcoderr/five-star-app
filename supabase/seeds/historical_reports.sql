-- ─── Seed: Historical Mystery Dine Reports ───────────────────────────────────
-- Seeds completed past mystery dines from real 5StarX reports.
-- Each block creates:
--   • A past slot (status = completed)
--   • An assignment for the test diner (status = completed)
--   • A reviewed report with answers mapped from the real documents
--   • A rating (score 1–5 calculated from scored answers)
--
-- Must be run AFTER the restaurant + proforma seeds:
--   supabase db query --linked --file supabase/seeds/dine_restaurant_group.sql
--   supabase db query --linked --file supabase/seeds/bread_meats_bread.sql
--   supabase db query --linked --file supabase/seeds/new_restaurants_batch.sql
--
-- Apply with:
--   supabase db query --linked --file supabase/seeds/historical_reports.sql

-- ─── Slot IDs  dddddddd-RRRR-...
-- ─── Assignment IDs  eeeeeeee-RRRR-...
-- ─── Report IDs  ffffffff-RRRR-...
-- ─── Rating IDs  fafafafa-RRRR-...

-- ─── 1. Historical slots (all in the past, status = completed) ───────────────

insert into public.slots (id, restaurant_id, date, time, max_covers, status, created_by)
select id, restaurant_id, date::date, time::time, max_covers, 'completed',
       (select id from public.users where role = 'admin' limit 1)
from (values
  -- Dine Restaurant Group — 23 Oct 2025
  ('dddddddd-2222-4000-8000-000000000001'::uuid, 'aaaaaaaa-2222-4000-8000-000000000001'::uuid, '2025-10-23', '19:30', 2),
  -- Bread Meats Bread St Vincent — 27 Jan 2026 (Toby Sim report)
  ('dddddddd-3333-4000-8000-000000000001'::uuid, 'aaaaaaaa-3333-4000-8000-000000000001'::uuid, '2026-01-27', '19:30', 2),
  -- Mezcal — 27 Feb 2026
  ('dddddddd-4444-4000-8000-000000000001'::uuid, 'aaaaaaaa-4444-4000-8000-000000000001'::uuid, '2026-02-27', '19:15', 2),
  -- The Spanish Butcher — approx Nov 2025
  ('dddddddd-5555-4000-8000-000000000001'::uuid, 'aaaaaaaa-5555-4000-8000-000000000001'::uuid, '2025-11-15', '19:00', 2),
  -- Dalziel Park / Lisini — 3 Dec 2025
  ('dddddddd-6666-4000-8000-000000000001'::uuid, 'aaaaaaaa-6666-4000-8000-000000000001'::uuid, '2025-12-03', '19:00', 2),
  -- Porter & Rye — 8 Dec 2025
  ('dddddddd-7777-4000-8000-000000000001'::uuid, 'aaaaaaaa-7777-4000-8000-000000000001'::uuid, '2025-12-08', '15:00', 2),
  -- Piccolinos Newton Mearns — 19 Mar 2026 (Lesley Sim)
  ('dddddddd-8888-4000-8000-000000000001'::uuid, 'aaaaaaaa-8888-4000-8000-000000000001'::uuid, '2026-03-19', '18:45', 2),
  -- ThunderCat — 13 Sept 2025 (Bucks Bar group)
  ('dddddddd-9999-4000-8000-000000000001'::uuid, 'aaaaaaaa-9999-4000-8000-000000000001'::uuid, '2025-09-13', '14:30', 2),
  -- Bread Meats Bread Glasgow Fort — 15 Jan 2026 (BMB Group report)
  ('dddddddd-aaaa-4000-8000-000000000001'::uuid, 'aaaaaaaa-aaaa-4000-8000-000000000001'::uuid, '2026-01-15', '18:15', 3)
) as t(id, restaurant_id, date, time, max_covers)
on conflict (id) do update set status = 'completed';

-- ─── 2. Assignments (test diner, all completed) ───────────────────────────────

insert into public.assignments (id, slot_id, diner_id, status)
select id, slot_id, (select id from public.users where email = 'diner@5starx.co.uk'), 'completed'
from (values
  ('eeeeeeee-2222-4000-8000-000000000001'::uuid, 'dddddddd-2222-4000-8000-000000000001'::uuid),
  ('eeeeeeee-3333-4000-8000-000000000001'::uuid, 'dddddddd-3333-4000-8000-000000000001'::uuid),
  ('eeeeeeee-4444-4000-8000-000000000001'::uuid, 'dddddddd-4444-4000-8000-000000000001'::uuid),
  ('eeeeeeee-5555-4000-8000-000000000001'::uuid, 'dddddddd-5555-4000-8000-000000000001'::uuid),
  ('eeeeeeee-6666-4000-8000-000000000001'::uuid, 'dddddddd-6666-4000-8000-000000000001'::uuid),
  ('eeeeeeee-7777-4000-8000-000000000001'::uuid, 'dddddddd-7777-4000-8000-000000000001'::uuid),
  ('eeeeeeee-8888-4000-8000-000000000001'::uuid, 'dddddddd-8888-4000-8000-000000000001'::uuid),
  ('eeeeeeee-9999-4000-8000-000000000001'::uuid, 'dddddddd-9999-4000-8000-000000000001'::uuid),
  ('eeeeeeee-aaaa-4000-8000-000000000001'::uuid, 'dddddddd-aaaa-4000-8000-000000000001'::uuid)
) as t(id, slot_id)
on conflict (id) do update set status = 'completed';

-- ─── 3. Reports ──────────────────────────────────────────────────────────────
-- Answers are keyed by actual question ID from the proforma.
-- We join answer_map (keyed by question order 1-55) with the real question UUIDs.
-- NULL entries in answer_map are skipped (N/A questions).

-- Clean up any existing reports for these assignments
delete from public.reports
where id in (
  'ffffffff-2222-4000-8000-000000000001',
  'ffffffff-3333-4000-8000-000000000001',
  'ffffffff-4444-4000-8000-000000000001',
  'ffffffff-5555-4000-8000-000000000001',
  'ffffffff-6666-4000-8000-000000000001',
  'ffffffff-7777-4000-8000-000000000001',
  'ffffffff-8888-4000-8000-000000000001',
  'ffffffff-9999-4000-8000-000000000001',
  'ffffffff-aaaa-4000-8000-000000000001'
);

-- ─── Dine Restaurant Group Edinburgh — 23 Oct 2025 ───────────────────────────
-- Source: 5StarX Mystery Dine Feedback - Dine Restaurant Group Edinburgh - July 2025.pdf
-- 2 guests. Online booking. Server: Benji. Steaks. £95 for 2.

with answer_map(ord, ans) as (values
  (1,  '{"score":3}'::jsonb),                             -- Online booking easy
  (2,  '{"score":3}'),                                    -- Date allocated
  (3,  '{"score":3}'),                                    -- Allergens asked at booking
  (4,  '{"score":0}'),                                    -- Special occasion: No
  (5,  '{"score":2}'),                                    -- Confirmation OK (online)
  (6,  '{"score":1,"notes":"Slightly confusing – restaurant is upstairs"}'),
  (7,  '{"score":3,"notes":"Clean, no issues"}'),
  (8,  '{"score":2}'),
  (9,  '{"score":3,"notes":"Nice smell, no strong odours"}'),
  (10, '{"score":3,"notes":"Yes, met at door"}'),
  (11, '{"score":3,"notes":"Led us to table and gave menus"}'),
  (12, '{"score":3}'),
  (13, '{"score":3,"notes":"Good, calm atmosphere – older crowd"}'),
  (14, '{"score":3,"notes":"Quiet but nice background noise, suitable"}'),
  (15, '{"score":2,"notes":"Nice décor but harsh lighting, some dark areas"}'),
  (16, '{"score":3}'),
  (17, '{"score":3,"notes":"All clean"}'),
  (18, '{"score":3}'),
  (19, '{"score":1,"notes":"Hair not up; uniform ironed"}'),
  (20, '{"score":3,"notes":"Benji: very friendly, smiley and helpful"}'),
  (21, '{"score":3,"notes":"Explained menu in good detail"}'),
  (22, '{"score":3}'),
  (23, '{"score":3}'),
  (24, '{"score":3}'),
  -- Q25 wine service: no wine ordered, skip
  (26, '{"score":3,"notes":"Offered still or sparkling water"}'),
  (27, '{"score":3}'),
  (28, '{"score":3}'),
  (29, '{"score":3,"notes":"Very good — handled large party nearby too"}'),
  (30, '{"score":0,"notes":"Did not clear away bread between courses"}'),
  (31, '{"score":3,"notes":"Yes — steak cooking preference and sauces asked"}'),
  (32, '{"score":3,"notes":"Yes — steak knives provided"}'),
  (33, '{"score":0,"notes":"No upsell of additional drinks or courses"}'),
  (34, '{"score":0,"notes":"Reception area empty on leaving; waiter thanked after bill but did not see us out"}'),
  -- Q35 starters: N/A
  (36, '{"score":3}'),
  -- Q37 desserts: N/A
  (38, '{"score":2,"notes":"Yes, very nice — slightly overdone for one person"}'),
  (39, '{"score":3,"notes":"Great quality, good presentation"}'),
  (40, '{"score":1,"notes":"Not hot but not chilled — room temperature"}'),
  (41, '{"score":3}'),
  (42, '{"score":2,"notes":"Arrived within 3 mins but slow to return after presenting bill"}'),
  (43, '{"score":3,"notes":"Waiter looked away during tip option"}'),
  (44, '{"score":3}'),
  (45, '{"score":3}'),
  (46, '{"score":3}'),
  (47, '{"score":3}'),
  (48, '{"value":true}'),
  (49, '{"value":true}'),
  (50, '{"value":true}'),
  (51, '{"value":true,"notes":"Ideal for 50+, not busy atmosphere for younger people"}'),
  (52, '{"value":false,"notes":"£95 for 2 mains and 2 drinks — not worth it without a voucher"}'),
  (53, '{"text":"Benji was great, very enthusiastic and friendly. Made us feel relaxed and welcomed. Quick service. Smart appearance and knew what he was doing, very confident and polite."}'),
  (54, '{"text":"Bread, Sirloin steak, Ribeye steak with garlic butter. One pint of lager and raspberry daiquiri and tap water. Great food, no complaints despite the price."}'),
  (55, '{"text":"Could not go back without a voucher. Two empty drink glasses sat for a while — server could have been more attentive. No goodbye from staff at reception on leaving."}')
),
qids as (
  select elem->>'id' as qid, (elem->>'order')::int as ord
  from public.proformas, jsonb_array_elements(questions) as elem
  where restaurant_id = 'aaaaaaaa-2222-4000-8000-000000000001'
)
insert into public.reports (id, assignment_id, diner_id, restaurant_id, answers, submitted_at, status)
select
  'ffffffff-2222-4000-8000-000000000001',
  'eeeeeeee-2222-4000-8000-000000000001',
  (select id from public.users where email = 'diner@5starx.co.uk'),
  'aaaaaaaa-2222-4000-8000-000000000001',
  (select jsonb_object_agg(qid, ans) from answer_map join qids using (ord)),
  '2025-10-23 21:30:00+00',
  'sent_to_restaurant';

-- ─── Bread Meats Bread St Vincent St — 27 Jan 2026 (Toby Sim) ────────────────
-- Source: 5StarX Mystery Dine Report - La Vita Feedback - July 2025.docx
-- 2 pax. Phone booking in 3 rings. Host Emily. Not all lighting operational.

with answer_map(ord, ans) as (values
  (1,  '{"score":3,"notes":"Phone answered within 3 rings"}'),
  (2,  '{"score":3}'),
  (3,  '{"score":3,"notes":"Allergens asked"}'),
  (4,  '{"score":0,"notes":"Special occasion not asked"}'),
  (5,  '{"score":3,"notes":"Call closed very friendly"}'),
  (6,  '{"score":2,"notes":"Nice enough but roadworks and scaffolding close by"}'),
  (7,  '{"score":2,"notes":"Street a bit dirty but nothing unusual"}'),
  (8,  '{"score":2,"notes":"No obstructions but roadworks impact approach"}'),
  (9,  '{"score":2,"notes":"No particular smell"}'),
  (10, '{"score":3,"notes":"Yes – by Emily"}'),
  (11, '{"score":3,"notes":"Very attentive, full attention given"}'),
  (12, '{"score":3}'),
  (13, '{"score":3,"notes":"Very quiet but nice vibe in the restaurant"}'),
  (14, '{"score":3,"notes":"Good volume; both commented on enjoying the music"}'),
  (15, '{"score":1,"notes":"Not all lighting fully operational — see photos"}'),
  (16, '{"score":3,"notes":"Seated at a 4-person booth for 2"}'),
  (17, '{"score":3}'),
  (18, '{"score":3}'),
  (19, '{"score":3}'),
  (20, '{"score":3,"notes":"Emily gave a very nice, warm welcome"}'),
  (21, '{"score":3}'),
  (22, '{"score":3}'),
  (23, '{"score":3}'),
  (24, '{"score":3}'),
  (26, '{"score":3}'),
  (27, '{"score":3}'),
  (28, '{"score":3}'),
  (29, '{"score":3}'),
  (30, '{"score":3}'),
  (32, '{"score":3}'),
  (33, '{"score":2}'),
  (34, '{"score":3}'),
  (36, '{"score":3}'),
  (38, '{"score":3}'),
  (39, '{"score":3}'),
  (40, '{"score":3}'),
  (41, '{"score":3}'),
  (42, '{"score":3}'),
  (43, '{"score":3}'),
  (44, '{"score":3}'),
  (45, '{"score":3}'),
  (46, '{"score":3}'),
  (47, '{"score":3}'),
  (48, '{"value":true}'),
  (49, '{"value":true}'),
  (50, '{"value":true}'),
  (51, '{"value":true}'),
  (52, '{"value":true}'),
  (53, '{"text":"Emily greeted us at the door and was warm and attentive throughout."}'),
  (54, '{"text":"Phone booking on 27/01/26, 19:30, 2 pax. Overall a positive experience."}'),
  (55, '{"text":"Not all lighting operational (photos attached). Roadworks and scaffolding directly outside at time of visit."}')
),
qids as (
  select elem->>'id' as qid, (elem->>'order')::int as ord
  from public.proformas, jsonb_array_elements(questions) as elem
  where restaurant_id = 'aaaaaaaa-3333-4000-8000-000000000001'
)
insert into public.reports (id, assignment_id, diner_id, restaurant_id, answers, submitted_at, status)
select
  'ffffffff-3333-4000-8000-000000000001',
  'eeeeeeee-3333-4000-8000-000000000001',
  (select id from public.users where email = 'diner@5starx.co.uk'),
  'aaaaaaaa-3333-4000-8000-000000000001',
  (select jsonb_object_agg(qid, ans) from answer_map join qids using (ord)),
  '2026-01-27 21:30:00+00',
  'sent_to_restaurant';

-- ─── Mezcal — 27 Feb 2026 ────────────────────────────────────────────────────
-- Source: 5StarX Mystery Dine Feedback - Mezcal - February 2026 copy.docx
-- 2 pax. Phone booking. Server: Robert. Lively Spanish atmosphere. Paid by voucher.

with answer_map(ord, ans) as (values
  -- Booking: online fields blank in form — booking method was phone
  (1,  '{"score":3,"notes":"Phone answered after 3 rings; company name mentioned, name not given but pleasant"}'),
  (2,  '{"score":3}'),
  (3,  '{"score":2}'),
  (4,  '{"score":2}'),
  (5,  '{"score":3,"notes":"Call handler very pleasant"}'),
  (6,  '{"score":3,"notes":"Quite eye-catching with lights inside"}'),
  (7,  '{"score":3,"notes":"Clean, no litter"}'),
  (8,  '{"score":3}'),
  (9,  '{"score":3,"notes":"No smells"}'),
  (10, '{"score":3,"notes":"Staff member waiting by door on entry"}'),
  (11, '{"score":3,"notes":"Gave full attention"}'),
  (12, '{"score":3}'),
  (13, '{"score":3,"notes":"Lively and vibrant, restaurant 90% full on arrival"}'),
  (14, '{"score":1,"notes":"Music level quite high — higher than expected, though fitting for Spanish style venue"}'),
  (15, '{"score":3,"notes":"Nice and modern, suited the vibe"}'),
  (16, '{"score":3,"notes":"Spacious enough for both of us and our food"}'),
  (17, '{"score":3,"notes":"Cutlery clean and shiny — a personal highlight"}'),
  (18, '{"score":3}'),
  (19, '{"score":3,"notes":"Hair up, clothes ironed"}'),
  (20, '{"score":3,"notes":"All very friendly and happy to help"}'),
  (21, '{"score":3,"notes":"Explained food would be served as and when ready"}'),
  (22, '{"score":3}'),
  (23, '{"score":3,"notes":"Offered drinks right away"}'),
  (24, '{"score":3}'),
  (26, '{"score":3,"notes":"Offered still or sparkling water"}'),
  (27, '{"score":3,"notes":"Robert was a great host"}'),
  (28, '{"score":2,"notes":"Asked how our food was during the meal"}'),
  (29, '{"score":3,"notes":"Section totally under control"}'),
  (30, '{"score":3}'),
  (32, '{"score":3}'),
  (33, '{"score":0,"notes":"No upsell — ordered water and lager so no opportunity taken"}'),
  (34, '{"score":3,"notes":"Thanked for custom on leaving"}'),
  (35, '{"score":3,"notes":"Starters within 8 minutes"}'),
  (36, '{"score":3}'),
  (38, '{"score":2,"notes":"Nice enough; fish tacos were not to our taste but everything else decent"}'),
  (39, '{"score":2,"notes":"Portion size fair for price and style of venue"}'),
  (40, '{"score":0,"notes":"Glasses not chilled"}'),
  (41, '{"score":2,"notes":"Fries and calamari both good"}'),
  (42, '{"score":3}'),
  (43, '{"score":3,"notes":"Paid with voucher — accepted with ease"}'),
  (44, '{"score":3}'),
  (45, '{"score":3}'),
  (46, '{"score":3}'),
  (47, '{"score":3}'),
  (48, '{"value":true}'),
  (49, '{"value":true}'),
  (50, '{"value":true}'),
  (51, '{"value":true}'),
  (52, '{"value":true,"notes":"Yes, good value for price and style of venue"}'),
  (53, '{"text":"Main waiter Robert — mid 30s, dark hair. Very good at his job. Explained the process clearly, couldn''t have been more helpful. Able to recommend nearby bars. Impeccable service."}'),
  (54, '{"text":"Chicken quesadilla (best course), beef tacitos (average), fish tacos (not to our taste), fries (good), calamari (good). Water and lager. Food nice enough for venue style."}'),
  (55, '{"text":"Speed of service was fantastic — no struggle to get attention. Pint of beer not as cold as expected. One thing to improve: beer temperature. Fish tacos a weak spot on the menu."}')
),
qids as (
  select elem->>'id' as qid, (elem->>'order')::int as ord
  from public.proformas, jsonb_array_elements(questions) as elem
  where restaurant_id = 'aaaaaaaa-4444-4000-8000-000000000001'
)
insert into public.reports (id, assignment_id, diner_id, restaurant_id, answers, submitted_at, status)
select
  'ffffffff-4444-4000-8000-000000000001',
  'eeeeeeee-4444-4000-8000-000000000001',
  (select id from public.users where email = 'diner@5starx.co.uk'),
  'aaaaaaaa-4444-4000-8000-000000000001',
  (select jsonb_object_agg(qid, ans) from answer_map join qids using (ord)),
  '2026-02-27 21:30:00+00',
  'sent_to_restaurant';

-- ─── The Spanish Butcher — Nov 2025 ──────────────────────────────────────────
-- Source: 5StarX Mystery Dine Spec JR 2025.docx
-- 2 pax. Online via OpenTable. Servers Andy & Molly. Galacian blond fillet. 10/10.

with answer_map(ord, ans) as (values
  (1,  '{"score":3,"notes":"OpenTable — very easy to navigate, pre-arrival check sent day before"}'),
  (2,  '{"score":3}'),
  (3,  '{"score":3}'),
  (4,  '{"score":3,"notes":"Special occasion question included via OpenTable"}'),
  (5,  '{"score":3,"notes":"Email + text confirmation; pre-arrival reconfirmation request"}'),
  (6,  '{"score":2,"notes":"Nice vibrant busy street"}'),
  (7,  '{"score":2,"notes":"Black bags lying outside near restaurant signage (may have been from next door bar)"}'),
  (8,  '{"score":3}'),
  (9,  '{"score":3}'),
  (10, '{"score":3}'),
  (11, '{"score":2,"notes":"Found booking immediately but spent time on system allocating a table"}'),
  (12, '{"score":3}'),
  (13, '{"score":3,"notes":"Really nice"}'),
  (14, '{"score":3,"notes":"Perfect"}'),
  (15, '{"score":3,"notes":"Modern and comfortable"}'),
  (16, '{"score":3}'),
  (17, '{"score":3}'),
  (18, '{"score":3}'),
  (19, '{"score":2,"notes":"No hair up; no uniform worn"}'),
  (20, '{"score":3,"notes":"Andy was really friendly"}'),
  (21, '{"score":3,"notes":"Outstanding knowledge and personal recommendations"}'),
  (22, '{"score":3}'),
  (23, '{"score":1,"notes":"Only water offered initially; aperitif not offered until food order was being taken"}'),
  (24, '{"score":3}'),
  (25, '{"score":3,"notes":"Bottle opened correctly at table, taste offered"}'),
  (26, '{"score":3,"notes":"Still or sparkling water offered"}'),
  (27, '{"score":3}'),
  (28, '{"score":3}'),
  (29, '{"score":3,"notes":"Attentive to all tables"}'),
  (30, '{"score":3}'),
  (31, '{"score":3,"notes":"Steak cooking preference asked"}'),
  (32, '{"score":3}'),
  (33, '{"score":2,"notes":"No extra sides offered — we wished we had ordered more"}'),
  (34, '{"score":0,"notes":"Host had their back to us on leaving and was chatting to other staff"}'),
  (35, '{"score":3,"notes":"Starters within 8 minutes"}'),
  (36, '{"score":3}'),
  (38, '{"score":3,"notes":"Perfect — cooked to spec"}'),
  (39, '{"score":3,"notes":"Perfect portion size"}'),
  (40, '{"score":3,"notes":"Wine glasses room temperature as they should be"}'),
  (41, '{"score":3}'),
  (42, '{"score":3}'),
  (43, '{"score":3}'),
  (44, '{"score":3,"notes":"Spotless"}'),
  (45, '{"score":3}'),
  (46, '{"score":3}'),
  (47, '{"score":3}'),
  (48, '{"value":true}'),
  (49, '{"value":true,"notes":"Especially the starter — Jamon iberico was outstanding"}'),
  (50, '{"value":true}'),
  (51, '{"value":true}'),
  (52, '{"value":true,"notes":"Possibly a little pricey for a Saturday lunch but overall a great experience"}'),
  (53, '{"text":"Andy and Molly looked after us. Andy was probably the most knowledgeable and enthusiastic server experienced in recent times — completely engaged, driven to ensure a fantastic meal."}'),
  (54, '{"text":"Starters: Gambas Pil Pil, Jamon iberico (outstanding). Mains: 2 x Galacian blond fillet (perfect). Bottle of house red (10/10), gin & tonic, diet coke. Every dish was delicious."}'),
  (55, '{"text":"Wonderful visit. Previously dined here 4 years ago when lighting was too dark — now perfect. Will 100% be back. Only minor note: no farewell from host on exit."}')
),
qids as (
  select elem->>'id' as qid, (elem->>'order')::int as ord
  from public.proformas, jsonb_array_elements(questions) as elem
  where restaurant_id = 'aaaaaaaa-5555-4000-8000-000000000001'
)
insert into public.reports (id, assignment_id, diner_id, restaurant_id, answers, submitted_at, status)
select
  'ffffffff-5555-4000-8000-000000000001',
  'eeeeeeee-5555-4000-8000-000000000001',
  (select id from public.users where email = 'diner@5starx.co.uk'),
  'aaaaaaaa-5555-4000-8000-000000000001',
  (select jsonb_object_agg(qid, ans) from answer_map join qids using (ord)),
  '2025-11-15 21:30:00+00',
  'sent_to_restaurant';

-- ─── Dalziel Park / Lisini Pub Co — 3 Dec 2025 ───────────────────────────────
-- Source: 5StarX Mystery Dine Report - Lisini Pub Co - Master Copy - December 2025.docx
-- 2 pax. Phone booking (spoke to Gemma). Christmas menu. Espresso Martini issue.

with answer_map(ord, ans) as (values
  (1,  '{"score":2,"notes":"Booked by phone; spoke to Gemma — efficient but not enthusiastic"}'),
  (2,  '{"score":3}'),
  (3,  '{"score":3}'),
  (4,  '{"score":0,"notes":"Special occasion not asked"}'),
  (5,  '{"score":1,"notes":"More efficient than enthusiastic; call not closed properly"}'),
  (6,  '{"score":3,"notes":"Garden areas tidy and well kept"}'),
  (7,  '{"score":3,"notes":"Doorway clear and tidy"}'),
  (8,  '{"score":3}'),
  (9,  '{"score":3,"notes":"Pleasant smell"}'),
  (10, '{"score":3,"notes":"Greeted straightaway"}'),
  (11, '{"score":3,"notes":"Walked to table immediately"}'),
  (12, '{"score":3,"notes":"No waiting time"}'),
  (13, '{"score":3,"notes":"Appropriate ambiance"}'),
  (14, '{"score":3}'),
  (15, '{"score":3,"notes":"Nice and tidy, lights dimmed for ambiance, Christmas decoration on table"}'),
  (16, '{"score":3}'),
  (17, '{"score":3,"notes":"Lovely table setting — salt & pepper filled to the top"}'),
  (18, '{"score":3,"notes":"Staff visible cleaning nearby but nothing left on tables"}'),
  (19, '{"score":3,"notes":"Hair up, uniform smart"}'),
  (20, '{"score":3,"notes":"Chatty but not overly so — seemed very genuine"}'),
  (21, '{"score":3,"notes":"Both al a carte and Christmas Special menus offered; 2-for-1 deals explained"}'),
  (22, '{"score":3,"notes":"Asked immediately on arrival"}'),
  (23, '{"score":3}'),
  (24, '{"score":3}'),
  (25, '{"score":2,"notes":"Glass of wine offered; medium or large option given; New Zealand sauvignon blanc recommended"}'),
  (26, '{"score":0,"notes":"Had to ask for water — not offered proactively"}'),
  (27, '{"score":3,"notes":"Lovely elderly gentleman — a real asset to the restaurant"}'),
  (28, '{"score":3,"notes":"Checked in but not overbearing — appropriate frequency"}'),
  (29, '{"score":3,"notes":"Attentive, area well attended throughout"}'),
  (30, '{"score":3,"notes":"Whole area well attended — tables cleared efficiently"}'),
  (31, '{"score":3,"notes":"Steak cooked to requirements; sides not proactively offered"}'),
  (32, '{"score":3,"notes":"Steak knife provided"}'),
  (33, '{"score":0,"notes":"Desserts and coffee not offered — had to ask to see the dessert menu"}'),
  (34, '{"score":3,"notes":"Acknowledged and thanked on leaving"}'),
  (35, '{"score":3,"notes":"Starters in 7 minutes"}'),
  (36, '{"score":3}'),
  (37, '{"score":2,"notes":"Dessert menu available when requested but not proactively offered"}'),
  (38, '{"score":3,"notes":"Food delicious — plates were nice and hot"}'),
  (39, '{"score":2,"notes":"Cod could have been bigger — delicious but didn''t feel full"}'),
  (40, '{"score":3}'),
  (41, '{"score":3}'),
  (42, '{"score":3}'),
  (43, '{"score":0,"notes":"Espresso Martini was from concentrate — undrinkable; asked to remove from bill causing 10-min delay. Voucher also caused delay. Handled by disengaged young female staff member."}'),
  (44, '{"score":2,"notes":"Ladies OK but water around sink area; no heating in ladies toilet — very cold. Gents: cleaning schedule showed no cleaning that day."}'),
  (45, '{"score":1,"notes":"First cubicle in ladies had a loose toilet seat"}'),
  (46, '{"score":3}'),
  (47, '{"score":3,"notes":"Overall a very nice establishment — main server was outstanding"}'),
  (48, '{"value":true,"notes":"Main server (elderly gentleman) was faultless"}'),
  (49, '{"value":true,"notes":"Pate, Beef Shin, Cod and Steak all delicious"}'),
  (50, '{"value":true}'),
  (51, '{"value":true}'),
  (52, '{"value":true}'),
  (53, '{"text":"Elderly gentleman with bald head — delightful, a real ambassador for the restaurant. Passionate about the food and made personal recommendations. Young blonde female handled the bill and cocktail situation poorly."}'),
  (54, '{"text":"Starters: Pate and Beef Shin. Mains: Cod and Steak (Christmas menu). Sauvignon Blanc. All delicious. Espresso Martini ordered but from concentrate — undrinkable and removed from bill."}'),
  (55, '{"text":"Main server was faultless. Issue: espresso martini from concentrate badly handled. Corridor flooring to toilets uneven (not a hazard but difficult in heels). Ladies toilet had no heating. No manager interaction throughout the visit."}')
),
qids as (
  select elem->>'id' as qid, (elem->>'order')::int as ord
  from public.proformas, jsonb_array_elements(questions) as elem
  where restaurant_id = 'aaaaaaaa-6666-4000-8000-000000000001'
)
insert into public.reports (id, assignment_id, diner_id, restaurant_id, answers, submitted_at, status)
select
  'ffffffff-6666-4000-8000-000000000001',
  'eeeeeeee-6666-4000-8000-000000000001',
  (select id from public.users where email = 'diner@5starx.co.uk'),
  'aaaaaaaa-6666-4000-8000-000000000001',
  (select jsonb_object_agg(qid, ans) from answer_map join qids using (ord)),
  '2025-12-03 21:00:00+00',
  'sent_to_restaurant';

-- ─── Porter & Rye — 8 Dec 2025 ───────────────────────────────────────────────
-- Source: 5StarX Mystery Dining requirements - Porter & Rye Glasgow.docx
-- 2 pax. Online booking (website). Server: Annie. Best steak ever. Cold restaurant.

with answer_map(ord, ans) as (values
  (1,  '{"score":3,"notes":"Website booking easy and straightforward"}'),
  (2,  '{"score":3}'),
  (3,  '{"score":3}'),
  (4,  '{"score":3}'),
  (5,  '{"score":3}'),
  (6,  '{"score":3,"notes":"Well presented and litter/hazard free"}'),
  (7,  '{"score":3}'),
  (8,  '{"score":3,"notes":"Outside lighting working, opening times and menu displayed"}'),
  (9,  '{"score":3,"notes":"Nothing specific"}'),
  (10, '{"score":3,"notes":"Made to feel welcome as we walked through the door"}'),
  (11, '{"score":3,"notes":"Welcoming and friendly atmosphere"}'),
  (12, '{"score":3}'),
  (13, '{"score":3,"notes":"Welcoming, friendly atmosphere"}'),
  (14, '{"score":3,"notes":"Perfect — background music only"}'),
  (15, '{"score":3}'),
  (16, '{"score":3,"notes":"Downstairs, next to door and front window"}'),
  (17, '{"score":3}'),
  (18, '{"score":3}'),
  (19, '{"score":3,"notes":"All staff smart, hair tied back"}'),
  (20, '{"score":3,"notes":"Annie was just lovely"}'),
  (21, '{"score":3,"notes":"Allergens asked when menus presented"}'),
  (22, '{"score":3}'),
  (23, '{"score":3}'),
  (24, '{"score":3,"notes":"Drinks in less than 5 minutes"}'),
  (26, '{"score":3,"notes":"Recommended refill and drink to go with meal"}'),
  (27, '{"score":3}'),
  (28, '{"score":3,"notes":"Dessert and coffees offered"}'),
  (29, '{"score":3}'),
  (30, '{"score":3}'),
  (31, '{"score":3,"notes":"Asked where beef was sourced — concise answer given. Sauces offered with steak."}'),
  (32, '{"score":3}'),
  (33, '{"score":3,"notes":"Dessert and coffee offered proactively"}'),
  (34, '{"score":3,"notes":"Thanked for custom on leaving"}'),
  (35, '{"score":3}'),
  (36, '{"score":3}'),
  (37, '{"score":3}'),
  (38, '{"score":3,"notes":"Outstanding food quality — perfect temperature. Best steaks we have ever had."}'),
  (39, '{"score":3,"notes":"Presentation was perfect"}'),
  (40, '{"score":3}'),
  (41, '{"score":3,"notes":"Sauces offered appropriately"}'),
  (42, '{"score":3}'),
  (43, '{"score":1,"notes":"Staff initially did not recognise the voucher and questioned where it was from. Eventually accepted. Bill presented on silver tray."}'),
  (44, '{"score":3,"notes":"Very clean; hot tap push button jammed and ran consistently — minor maintenance issue"}'),
  (45, '{"score":2,"notes":"Hot tap push button jammed in gents"}'),
  (46, '{"score":3}'),
  (47, '{"score":3,"notes":"Outstanding dining experience overall — only issue was restaurant temperature"}'),
  (48, '{"value":true,"notes":"Annie was just lovely — shared about her studies at St Andrews"}'),
  (49, '{"value":true,"notes":"Best steaks ever — superior to The Butchers Shop Glasgow"}'),
  (50, '{"value":true}'),
  (51, '{"value":true}'),
  (52, '{"value":true,"notes":"£138 total, £60 voucher = £78. Expensive but worth it for the quality — may wait until summer to return due to cold"}'),
  (53, '{"text":"Annie — no name tag but gave her name when asked. Lovely server, engaged with us personally about her studies. No other staff issues."}'),
  (54, '{"text":"Lunch visit. 2 x steaks (best we have ever had, superior to The Butchers Shop Glasgow). Wine. Total bill £138 less £60 voucher."}'),
  (55, '{"text":"Restaurant was extremely cold throughout — asked for extra heater which made little impact. Voucher not initially recognised by staff. Otherwise a faultless experience. Will return in summer."}')
),
qids as (
  select elem->>'id' as qid, (elem->>'order')::int as ord
  from public.proformas, jsonb_array_elements(questions) as elem
  where restaurant_id = 'aaaaaaaa-7777-4000-8000-000000000001'
)
insert into public.reports (id, assignment_id, diner_id, restaurant_id, answers, submitted_at, status)
select
  'ffffffff-7777-4000-8000-000000000001',
  'eeeeeeee-7777-4000-8000-000000000001',
  (select id from public.users where email = 'diner@5starx.co.uk'),
  'aaaaaaaa-7777-4000-8000-000000000001',
  (select jsonb_object_agg(qid, ans) from answer_map join qids using (ord)),
  '2025-12-08 17:00:00+00',
  'sent_to_restaurant';

-- ─── Piccolinos Newton Mearns — 19 Mar 2026 (Lesley Sim) ─────────────────────
-- Source: 5StarX Mystery Dine Report - La Vita Feedback - July 2025-2.docx
-- 2 pax. Rude manager on phone. Poor food. Unclean toilets. Final score: 144.

with answer_map(ord, ans) as (values
  (1,  '{"score":0,"notes":"Had to call 3 times before someone answered"}'),
  (2,  '{"score":0,"notes":"N/A — booked by phone; online not used"}'),
  (3,  '{"score":0,"notes":"Allergens not asked"}'),
  (4,  '{"score":0,"notes":"Special occasion not asked"}'),
  (5,  '{"score":0,"notes":"Manager was rude and borderline aggressive — shouting, put the phone down without saying goodbye"}'),
  (6,  '{"score":3,"notes":"Clean and tidy"}'),
  (7,  '{"score":3}'),
  (8,  '{"score":3}'),
  (9,  '{"score":3,"notes":"No offensive smells, lots of parked cars but quiet street"}'),
  (10, '{"score":0,"notes":"Not met at door — 2 people saw us enter and ignored us before eventually coming over"}'),
  (11, '{"score":0,"notes":"Host claimed booking didn''t exist; turned out it was booked under first name only"}'),
  (12, '{"score":3,"notes":"Received a nice table by the window"}'),
  (13, '{"score":3,"notes":"Nice traditional Italian feel"}'),
  (14, '{"score":3,"notes":"Not too loud, appropriate to the restaurant"}'),
  (15, '{"score":3,"notes":"Lovely décor"}'),
  (16, '{"score":3,"notes":"Large table for 4 for just 2 — nice"}'),
  (17, '{"score":3}'),
  (18, '{"score":3}'),
  (19, '{"score":3,"notes":"Uniform correct, correctly attired"}'),
  (20, '{"score":2,"notes":"Pleasant enough but clearly rushed and busy"}'),
  (21, '{"score":3,"notes":"Al a carte menu provided"}'),
  (22, '{"score":3}'),
  (23, '{"score":3}'),
  (24, '{"score":3}'),
  (26, '{"score":0,"notes":"Only given a small diet coke — not offered large or small; no water offered"}'),
  (27, '{"score":2,"notes":"Rushed — no rapport built"}'),
  (28, '{"score":0,"notes":"Never asked how food was; never offered dessert"}'),
  (29, '{"score":0,"notes":"Manager berated a large party seated at wrong table — made us feel very uncomfortable"}'),
  (30, '{"score":3}'),
  (32, '{"score":3}'),
  (33, '{"score":0,"notes":"Empty glasses for majority of the meal; never offered dessert or further courses"}'),
  (34, '{"score":2,"notes":"Brief goodbye only"}'),
  (35, '{"score":0,"notes":"Starters took 12 minutes — slightly over, though felt OK"}'),
  (36, '{"score":3}'),
  (37, '{"score":0,"notes":"No option to have a dessert offered"}'),
  (38, '{"score":0,"notes":"Both meals below average — Marry Me Pasta thick, stodgy, unpleasant; pizza edible but not tasty"}'),
  (39, '{"score":3,"notes":"Portion size as expected"}'),
  (40, '{"score":3}'),
  (41, '{"score":3}'),
  (42, '{"score":0,"notes":"Bill took a long time; owner at next table had to flag it to manager"}'),
  (43, '{"score":0,"notes":"Manager clearly annoyed when asked to process payment; card machine issue; no gratuity mentioned"}'),
  (44, '{"score":0,"notes":"Toilets did not smell fresh; no inspection all day; bins overflowing with used toilet roll"}'),
  (45, '{"score":0,"notes":"Bins overflowing with used toilet roll in cubicles"}'),
  (46, '{"score":3}'),
  (47, '{"score":2}'),
  (48, '{"value":false,"notes":"Would not recommend — service was poor"}'),
  (49, '{"value":false,"notes":"Both meals below average; left half our dishes"}'),
  (50, '{"value":true}'),
  (51, '{"value":true}'),
  (52, '{"value":false,"notes":"Not good value — left half our food as it was unpleasant"}'),
  (53, '{"text":"No names or badges worn. Waiter plopped a limoncello on our table after mains without explanation. Manager with thick Italian accent was extremely rude throughout. No one made an effort to improve our experience."}'),
  (54, '{"text":"Starters: Minestrone Soup and Honey Chicken. Mains: Marry Me Pasta (thick, stodgy, unpleasant — huge lumps of uncut peppers, processed chicken) and Meat Pizza (edible but not tasty). 1 lager, 1 red wine, 1 small diet coke."}'),
  (55, '{"text":"Woeful experience. Rude manager on phone before visit and rude in person. Food awful and seemingly processed. Toilets not cleaned. Final score 144. Would not return."}')
),
qids as (
  select elem->>'id' as qid, (elem->>'order')::int as ord
  from public.proformas, jsonb_array_elements(questions) as elem
  where restaurant_id = 'aaaaaaaa-8888-4000-8000-000000000001'
)
insert into public.reports (id, assignment_id, diner_id, restaurant_id, answers, submitted_at, status)
select
  'ffffffff-8888-4000-8000-000000000001',
  'eeeeeeee-8888-4000-8000-000000000001',
  (select id from public.users where email = 'diner@5starx.co.uk'),
  'aaaaaaaa-8888-4000-8000-000000000001',
  (select jsonb_object_agg(qid, ans) from answer_map join qids using (ord)),
  '2026-03-19 21:00:00+00',
  'sent_to_restaurant';

-- ─── ThunderCat — 13 Sept 2025 (Bucks Bar group) ─────────────────────────────
-- Source: Customer Experience Report - Bucks Bar group - 2025.pptx
-- Author: Lesley Sim. 2 pax. Lewis Capaldi playing in Glasgow — extremely busy.

with answer_map(ord, ans) as (values
  (1,  '{"score":3,"notes":"Googled ThunderCat, linked to OpenTable — easy process, text confirmation immediately with table time limit"}'),
  (2,  '{"score":3}'),
  (3,  '{"score":3}'),
  (4,  '{"score":3}'),
  (5,  '{"score":3}'),
  (6,  '{"score":2,"notes":"Area clean and tidy, no issues"}'),
  (7,  '{"score":2}'),
  (8,  '{"score":2,"notes":"Signage clearly displayed — couldn''t miss it"}'),
  (9,  '{"score":1,"notes":"Couldn''t describe the smell as bad but didn''t smell fresh"}'),
  (10, '{"score":2,"notes":"Made to feel welcome by all staff we came into contact with"}'),
  (11, '{"score":2,"notes":"No complaints with staff"}'),
  (12, '{"score":1,"notes":"Restaurant fully booked with no available tables — staff coped well given circumstances"}'),
  (13, '{"score":2,"notes":"Noise levels acceptable despite Lewis Capaldi concert filling the city"}'),
  (14, '{"score":2,"notes":"Nice acceptable level for a venue marketing to younger generation"}'),
  (15, '{"score":2}'),
  (16, '{"score":2,"notes":"Corner table on raised area opposite the bar"}'),
  (17, '{"score":2,"notes":"Menus clean; table clean, tidy, sturdy"}'),
  (18, '{"score":2,"notes":"Surroundings clean and tidy but exceptionally busy"}'),
  (19, '{"score":2,"notes":"All staff smart, hair tied back"}'),
  (20, '{"score":2,"notes":"No issues with staff at all"}'),
  (21, '{"score":1,"notes":"Seated but ordering process not fully explained due to busyness — staff coped well"}'),
  (22, '{"score":2,"notes":"Asked prior to being seated"}'),
  (23, '{"score":2,"notes":"After 4 minutes asked if ready to place order for both food and drinks together"}'),
  (24, '{"score":2,"notes":"7 minutes for drinks — due to very busy service; from commercial perspective earlier drinks = more sales"}'),
  (26, '{"score":2,"notes":"Server was knowledgeable about beer selection and made a recommendation"}'),
  (27, '{"score":2}'),
  (28, '{"score":0,"notes":"Did not ask how food was during or after the meal"}'),
  (29, '{"score":1,"notes":"Staff very busy; left with empty glasses and would have ordered more if approached"}'),
  (30, '{"score":0,"notes":"Table not cleared after first course; no additional food or drinks offered"}'),
  (32, '{"score":1,"notes":"No bone bag with wings but none required"}'),
  (33, '{"score":0,"notes":"Left with empty glasses; would have ordered more drinks if staff had approached us"}'),
  (34, '{"score":3,"notes":"On way from table to exit 3 different staff members thanked us and wished us a great day — excellent"}'),
  (36, '{"score":2,"notes":"Food after 17 minutes (order and drinks taken together, drinks after 7 mins)"}'),
  (38, '{"score":1,"notes":"Caesar salad mushy and covered in parmesan. Buttermilk chicken burger worst ever tasted. Wings piping hot and tasty. Burger nice but soggy."}'),
  (39, '{"score":1,"notes":"Presentation poor for some items. Note: burgers not served with chips as standard — must add as extra."}'),
  (40, '{"score":2}'),
  (41, '{"score":2}'),
  (42, '{"score":1,"notes":"Bill arrived after 6 minutes — all correct"}'),
  (43, '{"score":0,"notes":"Gratuity option not explained; server said cash preferred for tips — asked us directly"}'),
  (44, '{"score":1,"notes":"Female toilets poor — no toilet roll in first cubicle; second cubicle had unflushed used sanitary towel in bowl"}'),
  (45, '{"score":1,"notes":"Gents were OK"}'),
  (46, '{"score":2}'),
  (47, '{"score":1}'),
  (48, '{"value":false,"notes":"Wouldn''t recommend — to be fair probably not our target demographic as a couple in our 50s"}'),
  (49, '{"value":false,"notes":"Food was not for us: Caesar salad poor, chicken burger worst ever, burger ok, wings were the highlight"}'),
  (51, '{"value":true}'),
  (52, '{"value":false,"notes":"Not great value — food not enjoyed. Burgers should include chips as standard at this price point."}'),
  (53, '{"text":"Young Asian server — no name given. Also notable: a team member with light reddish hair and beard putting his heart and soul into clearing tables and mopping up spills — exemplary work. Note: Lewis Capaldi was playing in Glasgow, the entire city was packed."}'),
  (54, '{"text":"Caesar salad (mushy, overdressed), buttermilk chicken burger (worst ever tasted), wings (piping hot and tasty), burger (nice but soggy). All food arrived together — would have preferred starters served first. Burgers not served with chips as standard."}'),
  (55, '{"text":"Very busy due to Lewis Capaldi concert. Staff all pleasant under pressure. Left with empty glasses for much of the meal. Would have ordered more drinks if approached. Table clearing team member was exceptional. Not our target demographic but valid observations throughout."}')
),
qids as (
  select elem->>'id' as qid, (elem->>'order')::int as ord
  from public.proformas, jsonb_array_elements(questions) as elem
  where restaurant_id = 'aaaaaaaa-9999-4000-8000-000000000001'
)
insert into public.reports (id, assignment_id, diner_id, restaurant_id, answers, submitted_at, status)
select
  'ffffffff-9999-4000-8000-000000000001',
  'eeeeeeee-9999-4000-8000-000000000001',
  (select id from public.users where email = 'diner@5starx.co.uk'),
  'aaaaaaaa-9999-4000-8000-000000000001',
  (select jsonb_object_agg(qid, ans) from answer_map join qids using (ord)),
  '2025-09-13 16:30:00+00',
  'sent_to_restaurant';

-- ─── Bread Meats Bread Glasgow Fort — 15 Jan 2026 (BMB Group report) ──────────
-- Source: 5StarX Mystery Dine Feedback - BMB Group - November 2025 onwards.docx
-- 3 pax (1 honey chicken burger, 1 burger, 1 philly cheesesteak). Gents toilets disgraceful.

with answer_map(ord, ans) as (values
  (1,  '{"score":0,"notes":"Booking was by telephone — online N/A"}'),
  (2,  '{"score":3}'),
  (3,  '{"score":0,"notes":"Allergen question not included in phone booking"}'),
  (4,  '{"score":0,"notes":"Special occasion not asked"}'),
  (5,  '{"score":3,"notes":"Girl on phone had lovely telephone manner; call closed professionally"}'),
  (6,  '{"score":3,"notes":"Very impressive building"}'),
  (7,  '{"score":3,"notes":"No litter or untidiness, very well kept"}'),
  (8,  '{"score":3,"notes":"No obstructions"}'),
  (9,  '{"score":3,"notes":"No odour or offensive smells"}'),
  (10, '{"score":3,"notes":"Met and acknowledged promptly"}'),
  (11, '{"score":3,"notes":"Smiling and friendly"}'),
  (12, '{"score":3,"notes":"Restaurant was very quiet on arrival"}'),
  (13, '{"score":3,"notes":"Spacious and well kept"}'),
  (14, '{"score":3,"notes":"No issues with music"}'),
  (15, '{"score":2,"notes":"Nice enough but perhaps lacking in character"}'),
  (16, '{"score":3,"notes":"Table for 4 for 3 people"}'),
  (17, '{"score":2,"notes":"Cold coke served in warm glasses — otherwise clean"}'),
  (18, '{"score":3,"notes":"Staff cleaning nearby tables but nothing left out"}'),
  (19, '{"score":3,"notes":"Server had hair tied back in bandana"}'),
  (20, '{"score":3,"notes":"Server was lovely"}'),
  (21, '{"score":1,"notes":"No advice or information given about menu or ordering process"}'),
  (22, '{"score":3,"notes":"Asked about allergens as soon as we sat down"}'),
  (23, '{"score":0,"notes":"Waited almost 10 minutes for someone to offer drinks after being seated"}'),
  (24, '{"score":3,"notes":"Drinks arrived within 5 minutes once ordered"}'),
  (26, '{"score":0,"notes":"No upsell attempted"}'),
  (27, '{"score":2,"notes":"Did not interact with everyone at the table"}'),
  (28, '{"score":3,"notes":"Asked how food was during the main course"}'),
  (29, '{"score":3,"notes":"Very attentive to all tables"}'),
  (30, '{"score":0,"notes":"Table not cleared after first course"}'),
  (31, '{"score":0,"notes":"Ordered Philly cheesesteak — not asked cooking preference; discovered there was an option to have it rare"}'),
  (32, '{"score":3}'),
  (33, '{"score":0,"notes":"No upsell of additional drinks, sides or courses"}'),
  (34, '{"score":3,"notes":"Thanked for custom and said goodbye on leaving"}'),
  (35, '{"score":0,"notes":"Restaurant does not offer starters — N/A"}'),
  (36, '{"score":3}'),
  (37, '{"score":0,"notes":"No desserts on menu — N/A"}'),
  (38, '{"score":3,"notes":"Food correct and as expected"}'),
  (39, '{"score":1,"notes":"For the cost, portion sizes (particularly chips) were small"}'),
  (40, '{"score":0,"notes":"Coke glasses were warm from dishwasher"}'),
  (41, '{"score":2,"notes":"Chips were just OK, nothing special"}'),
  (42, '{"score":3}'),
  (43, '{"score":2,"notes":"Paid in standard manner; tip automatically added — not advised of this"}'),
  (44, '{"score":0,"notes":"Gents toilets: disgusting smell, stale urine all over the floor, door had been kicked in. Ladies: just OK but soap dispensers not fully stocked."}'),
  (45, '{"score":0,"notes":"Ladies toilet did not flush. Gents had a door which had been kicked in and stale urine all over the floor."}'),
  (46, '{"score":3}'),
  (47, '{"score":2}'),
  (48, '{"value":true,"notes":"Server and staff were all very nice and polite"}'),
  (49, '{"value":true,"notes":"Honey chicken burger and burger were nice"}'),
  (50, '{"value":false,"notes":"£9.50 for a glass of cheap wine is a rip off"}'),
  (51, '{"value":true,"notes":"Good location, plentiful parking, handy for the shops"}'),
  (52, '{"value":false,"notes":"For the quality and size the meal was expensive; Philly cheesesteak was greasy and bland"}'),
  (53, '{"text":"Server had hair tied in a bandana — very pleasant and doing their best. Could have offered more information about the menu and proactively offered drinks and additional courses."}'),
  (54, '{"text":"1 x Honey Chicken Burger, 1 x Burger, 1 x Philly Cheesesteak Toastie (greasy and bland), 1 x Cheese Chips, 1 x Bacon Chips, 2 x Coke Zero, 1 x Glass of wine (£9.50 — cheap and not worth it)."}'),
  (55, '{"text":"Toilets were unacceptable — particularly the gents where the smell and uncleanliness was very concerning. Ladies was just OK. Tip was automatically added to the bill without being informed. Total final score 197 in original report."}')
),
qids as (
  select elem->>'id' as qid, (elem->>'order')::int as ord
  from public.proformas, jsonb_array_elements(questions) as elem
  where restaurant_id = 'aaaaaaaa-aaaa-4000-8000-000000000001'
)
insert into public.reports (id, assignment_id, diner_id, restaurant_id, answers, submitted_at, status)
select
  'ffffffff-aaaa-4000-8000-000000000001',
  'eeeeeeee-aaaa-4000-8000-000000000001',
  (select id from public.users where email = 'diner@5starx.co.uk'),
  'aaaaaaaa-aaaa-4000-8000-000000000001',
  (select jsonb_object_agg(qid, ans) from answer_map join qids using (ord)),
  '2026-01-15 20:30:00+00',
  'sent_to_restaurant';

-- ─── 4. Ratings (calculated from scored answers in each report) ───────────────

delete from public.ratings
where id in (
  'fafafafa-2222-4000-8000-000000000001',
  'fafafafa-3333-4000-8000-000000000001',
  'fafafafa-4444-4000-8000-000000000001',
  'fafafafa-5555-4000-8000-000000000001',
  'fafafafa-6666-4000-8000-000000000001',
  'fafafafa-7777-4000-8000-000000000001',
  'fafafafa-8888-4000-8000-000000000001',
  'fafafafa-9999-4000-8000-000000000001',
  'fafafafa-aaaa-4000-8000-000000000001'
);

with report_scores as (
  select
    r.id as report_id,
    r.restaurant_id,
    r.submitted_at,
    sum((v->>'score')::numeric)  as total,
    count(v)                      as scored_count
  from public.reports r,
    jsonb_each(r.answers) as kv(k, v)
  where r.id in (
    'ffffffff-2222-4000-8000-000000000001',
    'ffffffff-3333-4000-8000-000000000001',
    'ffffffff-4444-4000-8000-000000000001',
    'ffffffff-5555-4000-8000-000000000001',
    'ffffffff-6666-4000-8000-000000000001',
    'ffffffff-7777-4000-8000-000000000001',
    'ffffffff-8888-4000-8000-000000000001',
    'ffffffff-9999-4000-8000-000000000001',
    'ffffffff-aaaa-4000-8000-000000000001'
  )
  and v ? 'score'
  group by r.id, r.restaurant_id, r.submitted_at
),
rating_ids(report_id, rating_id) as (
  values
    ('ffffffff-2222-4000-8000-000000000001'::uuid, 'fafafafa-2222-4000-8000-000000000001'::uuid),
    ('ffffffff-3333-4000-8000-000000000001'::uuid, 'fafafafa-3333-4000-8000-000000000001'::uuid),
    ('ffffffff-4444-4000-8000-000000000001'::uuid, 'fafafafa-4444-4000-8000-000000000001'::uuid),
    ('ffffffff-5555-4000-8000-000000000001'::uuid, 'fafafafa-5555-4000-8000-000000000001'::uuid),
    ('ffffffff-6666-4000-8000-000000000001'::uuid, 'fafafafa-6666-4000-8000-000000000001'::uuid),
    ('ffffffff-7777-4000-8000-000000000001'::uuid, 'fafafafa-7777-4000-8000-000000000001'::uuid),
    ('ffffffff-8888-4000-8000-000000000001'::uuid, 'fafafafa-8888-4000-8000-000000000001'::uuid),
    ('ffffffff-9999-4000-8000-000000000001'::uuid, 'fafafafa-9999-4000-8000-000000000001'::uuid),
    ('ffffffff-aaaa-4000-8000-000000000001'::uuid, 'fafafafa-aaaa-4000-8000-000000000001'::uuid)
)
insert into public.ratings (id, restaurant_id, report_id, score, calculated_at)
select
  ri.rating_id,
  rs.restaurant_id,
  rs.report_id,
  greatest(1.0, round((rs.total / (rs.scored_count * 3.0)) * 5.0, 2)) as score,
  rs.submitted_at
from report_scores rs
join rating_ids ri using (report_id);

-- ─── 5. Update avg_rating on all seeded restaurants ───────────────────────────

update public.restaurants r
set avg_rating = (
  select round(avg(score), 2)
  from public.ratings
  where restaurant_id = r.id
)
where r.id in (
  'aaaaaaaa-2222-4000-8000-000000000001',
  'aaaaaaaa-3333-4000-8000-000000000001',
  'aaaaaaaa-4444-4000-8000-000000000001',
  'aaaaaaaa-5555-4000-8000-000000000001',
  'aaaaaaaa-6666-4000-8000-000000000001',
  'aaaaaaaa-7777-4000-8000-000000000001',
  'aaaaaaaa-8888-4000-8000-000000000001',
  'aaaaaaaa-9999-4000-8000-000000000001',
  'aaaaaaaa-aaaa-4000-8000-000000000001'
);

-- ─── Verify ───────────────────────────────────────────────────────────────────

select
  r.name                                              as restaurant,
  to_char(s.date, 'DD Mon YYYY')                      as visit_date,
  rep.status                                          as report_status,
  jsonb_array_length(p.questions)                     as questions,
  (select count(*) from jsonb_each(rep.answers))      as answers_filled,
  round(rat.score, 2)                                 as star_rating
from public.restaurants r
join public.slots     s   on s.restaurant_id = r.id and s.id::text like 'dddddddd%'
join public.assignments a on a.slot_id = s.id
join public.reports   rep on rep.assignment_id = a.id
join public.proformas p   on p.restaurant_id = r.id
left join public.ratings rat on rat.report_id = rep.id
where r.id in (
  'aaaaaaaa-2222-4000-8000-000000000001',
  'aaaaaaaa-3333-4000-8000-000000000001',
  'aaaaaaaa-4444-4000-8000-000000000001',
  'aaaaaaaa-5555-4000-8000-000000000001',
  'aaaaaaaa-6666-4000-8000-000000000001',
  'aaaaaaaa-7777-4000-8000-000000000001',
  'aaaaaaaa-8888-4000-8000-000000000001',
  'aaaaaaaa-9999-4000-8000-000000000001',
  'aaaaaaaa-aaaa-4000-8000-000000000001'
)
order by s.date;
