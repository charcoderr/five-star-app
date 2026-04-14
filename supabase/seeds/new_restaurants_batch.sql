-- ─── Seed: New Restaurant Batch ──────────────────────────────────────────────
-- Sources (all real 5StarX mystery dine reports from data/ and Downloads/):
--   • Mezcal Glasgow                (Feb 2026)
--   • Spanish Butcher Glasgow       (JR 2025)
--   • Dalziel Park / Lisini Pub Co  (Dec 2025)
--   • Porter & Rye Glasgow          (Dec 2025)
--   • Piccolinos Newton Mearns      (March 2026)
--   • ThunderCat Glasgow            (Bucks Bar group, Sept 2025)
--   • Bread Meats Bread Glasgow Fort (BMB Group, Jan 2026)
--
-- Each restaurant gets the standard 55-question 5StarX proforma + one open slot.
-- Idempotent: safe to re-run.
--
-- Apply with:
--   supabase db query --linked --file supabase/seeds/new_restaurants_batch.sql

-- ─── 1. Restaurants ──────────────────────────────────────────────────────────

insert into public.restaurants (id, name, address, cuisine_type, contact_email, subscription_status, subscription_plan)
values
  (
    'aaaaaaaa-4444-4000-8000-000000000001',
    'Mezcal',
    '1 Bothwell Street, Glasgow G2 6NL',
    'Spanish / Mexican Tapas',
    'hello@mezcalglasgow.co.uk',
    'active', 'standard'
  ),
  (
    'aaaaaaaa-5555-4000-8000-000000000001',
    'The Spanish Butcher',
    '80 Miller Street, Glasgow G1 1DT',
    'Spanish Steakhouse',
    'info@thespanishbutcher.com',
    'active', 'standard'
  ),
  (
    'aaaaaaaa-6666-4000-8000-000000000001',
    'Dalziel Park Hotel & Golf Club',
    '100 Hagen Drive, Motherwell ML1 5RZ',
    'Modern British',
    'restaurant@dalzielpark.co.uk',
    'active', 'standard'
  ),
  (
    'aaaaaaaa-7777-4000-8000-000000000001',
    'Porter & Rye',
    '221 Ingram Street, Glasgow G1 1DA',
    'Steakhouse',
    'info@porterandrye.com',
    'active', 'standard'
  ),
  (
    'aaaaaaaa-8888-4000-8000-000000000001',
    'Piccolinos Newton Mearns',
    'Greenlaw Village, Newton Mearns, Glasgow G77 6LX',
    'Italian',
    'newtonmearns@piccolino.co.uk',
    'active', 'standard'
  ),
  (
    'aaaaaaaa-9999-4000-8000-000000000001',
    'ThunderCat',
    '33 Miller Street, Glasgow G1 1EB',
    'American / Burgers',
    'hello@thundercatglasgow.co.uk',
    'active', 'standard'
  ),
  (
    'aaaaaaaa-aaaa-4000-8000-000000000001',
    'Bread Meats Bread Glasgow Fort',
    'Glasgow Fort Shopping Centre, Glasgow G34 9DL',
    'Burgers & American',
    'glasgowfort@breadmeatsbread.com',
    'active', 'standard'
  )
on conflict (id) do update set
  name                = excluded.name,
  address             = excluded.address,
  cuisine_type        = excluded.cuisine_type,
  contact_email       = excluded.contact_email,
  subscription_status = excluded.subscription_status;

-- ─── 2. Proformas (standard 5StarX 55-question set for all 7 restaurants) ────

-- Wipe any existing proformas for these restaurants
delete from public.proformas
where restaurant_id in (
  'aaaaaaaa-4444-4000-8000-000000000001',
  'aaaaaaaa-5555-4000-8000-000000000001',
  'aaaaaaaa-6666-4000-8000-000000000001',
  'aaaaaaaa-7777-4000-8000-000000000001',
  'aaaaaaaa-8888-4000-8000-000000000001',
  'aaaaaaaa-9999-4000-8000-000000000001',
  'aaaaaaaa-aaaa-4000-8000-000000000001'
);

-- Build question bank once, insert proforma for each restaurant
with q(label, category, type, required, ord, photo, locked) as (
  values
    -- BOOKING
    ('Online booking easy to navigate (or phone answered within 3-5 rings)',          'Booking',    'scored',    true,   1, false, false),
    ('Preferred date and time allocated',                                             'Booking',    'scored',    true,   2, false, false),
    ('Asked about allergens / food intolerances during booking',                      'Booking',    'scored',    true,   3, false, false),
    ('Asked about any special occasion',                                              'Booking',    'scored',    true,   4, false, false),
    ('Booking confirmation enthusiastic, professional, friendly',                     'Booking',    'scored',    true,   5, false, false),

    -- EXTERNAL
    ('Approach to restaurant — first impressions clean and welcoming',                'External',   'scored',    true,   6, true,  false),
    ('Cleanliness around the vicinity (no litter, cigarette ends, spills)',           'External',   'scored',    true,   7, true,  false),
    ('Signage clear, lighting operational, no obstructions',                          'External',   'scored',    true,   8, true,  false),
    ('External smells acceptable (no drains, bins, smoking near entrance)',           'External',   'scored',    true,   9, false, false),

    -- INTERNAL
    ('Met at the door with a smile and warm welcome',                                 'Internal',   'scored',    true,  10, false, false),
    ('Host gave you their full attention (not sidetracked)',                          'Internal',   'scored',    true,  11, false, false),
    ('Table was ready on arrival',                                                    'Internal',   'scored',    true,  12, false, false),
    ('Ambiance on entry — smells, music level, first impression',                     'Internal',   'scored',    true,  13, false, false),
    ('Music appropriate to the venue and not too loud',                               'Internal',   'scored',    true,  14, false, false),
    ('Décor clean, well-maintained, lighting working',                                'Internal',   'scored',    true,  15, true,  false),
    ('Table large enough for party, clean and sturdy',                                'Internal',   'scored',    true,  16, true,  false),
    ('Cutlery, glasses and crockery all clean (no watermarks or smears)',             'Internal',   'scored',    true,  17, true,  false),
    ('No visible cleaning materials or maintenance issues in dining area',            'Internal',   'scored',    true,  18, false, false),

    -- SERVICE
    ('Server uniform tidy, hair up, correct attire',                                  'Service',    'scored',    true,  19, false, false),
    ('General demeanour — smile, friendly, engaged',                                  'Service',    'scored',    true,  20, false, false),
    ('Menus provided and explained, specials mentioned',                              'Service',    'scored',    true,  21, false, false),
    ('Asked about allergens and assisted with menu choice if needed',                 'Service',    'scored',    true,  22, false, false),
    ('Drinks offered within 4 minutes of being seated',                               'Service',    'scored',    true,  23, false, false),
    ('Drinks arrived within 5 minutes, correct and as described',                     'Service',    'scored',    true,  24, false, false),
    ('Wine service — bottle shown, opened at table, taste offered (if applicable)',   'Service',    'scored',    false, 25, false, false),
    ('Upsold glass size / bottle of water as appropriate',                            'Service',    'scored',    false, 26, false, false),
    ('Server interacted with everyone at the table',                                  'Service',    'scored',    true,  27, false, false),
    ('Server asked how the meal was during and after each course',                    'Service',    'scored',    true,  28, false, false),
    ('Server attentive to other tables — hard-working, not flustered',                'Service',    'scored',    true,  29, false, false),
    ('Table cleared promptly after each course',                                      'Service',    'scored',    true,  30, false, false),
    ('Offered accompanying sides / steak asked how cooked (if applicable)',           'Service',    'scored',    false, 31, false, false),
    ('Appropriate cutlery provided for each dish',                                    'Service',    'scored',    true,  32, false, false),
    ('Upsold additional drinks, sides, or courses at relevant moments',               'Service',    'scored',    false, 33, false, false),
    ('Thanked for your custom on departure, welcomed back',                           'Service',    'scored',    true,  34, false, false),

    -- DINING
    ('Starters arrived within 10 minutes of ordering',                                'Dining',     'scored',    true,  35, false, false),
    ('Mains arrived within 15 minutes of starters being cleared',                     'Dining',     'scored',    true,  36, false, false),
    ('Desserts arrived within 10 minutes of ordering',                                'Dining',     'scored',    false, 37, false, false),
    ('Food correct, taste as expected and at the right temperature',                  'Dining',     'scored',    true,  38, true,  false),
    ('Presentation and portion size appropriate for the price',                       'Dining',     'scored',    true,  39, true,  false),
    ('Glasses chilled, crockery not hot from dishwasher/heat lamp',                   'Dining',     'scored',    true,  40, false, false),
    ('All side dishes good quality; matching items across party consistent',          'Dining',     'scored',    true,  41, false, false),
    ('Bill arrived within 3 minutes of requesting',                                   'Dining',     'scored',    true,  42, false, false),
    ('Card payment taken discreetly, gratuity option clear',                          'Dining',     'scored',    true,  43, false, false),

    -- FACILITIES
    ('Amenities (toilets) clean, tidy, soap and paper stocked',                       'Facilities', 'scored',    true,  44, true,  false),
    ('Cubicles clean, no maintenance issues (e.g. loose seats)',                      'Facilities', 'scored',    true,  45, true,  false),
    ('Fire exits signposted and clear of obstructions',                               'Facilities', 'scored',    true,  46, true,  false),
    ('Overall venue clean and well-maintained throughout',                            'Facilities', 'scored',    true,  47, false, false),

    -- WRAP UP (locked)
    ('Would you recommend your server(s) based on this visit?',                       'Wrap Up',    'yes_no',    true,  48, false, true),
    ('Would you recommend your meals?',                                               'Wrap Up',    'yes_no',    true,  49, false, true),
    ('Would you recommend your drinks?',                                              'Wrap Up',    'yes_no',    true,  50, false, true),
    ('Would you recommend the venue overall?',                                        'Wrap Up',    'yes_no',    true,  51, false, true),
    ('Good value for money?',                                                         'Wrap Up',    'yes_no',    true,  52, false, true),
    ('Describe your server(s) — names or brief descriptions',                         'Wrap Up',    'free_text', false, 53, false, true),
    ('Food ordered and your thoughts on each dish',                                   'Wrap Up',    'free_text', true,  54, false, true),
    ('Any additional comments, observations or complaints (and how handled)',         'Wrap Up',    'free_text', false, 55, false, true)
),
questions_array as (
  select jsonb_agg(
    jsonb_build_object(
      'id',          gen_random_uuid()::text,
      'label',       label,
      'category',    category,
      'type',        type,
      'required',    required,
      'order',       ord,
      'photoPrompt', photo,
      'locked',      locked
    )
    order by ord
  ) as questions
  from q
),
restaurant_proformas(rid, title) as (
  values
    ('aaaaaaaa-4444-4000-8000-000000000001'::uuid, 'Mezcal — Mystery Dine Report'),
    ('aaaaaaaa-5555-4000-8000-000000000001'::uuid, 'The Spanish Butcher — Mystery Dine Report'),
    ('aaaaaaaa-6666-4000-8000-000000000001'::uuid, 'Dalziel Park — Mystery Dine Report'),
    ('aaaaaaaa-7777-4000-8000-000000000001'::uuid, 'Porter & Rye — Mystery Dine Report'),
    ('aaaaaaaa-8888-4000-8000-000000000001'::uuid, 'Piccolinos Newton Mearns — Mystery Dine Report'),
    ('aaaaaaaa-9999-4000-8000-000000000001'::uuid, 'ThunderCat — Mystery Dine Report'),
    ('aaaaaaaa-aaaa-4000-8000-000000000001'::uuid, 'Bread Meats Bread Glasgow Fort — Mystery Dine Report')
)
insert into public.proformas (restaurant_id, title, questions, version)
select rid, title, questions, 1
from restaurant_proformas cross join questions_array;

-- ─── 3. Open slots (staggered dates, 19:30 each) ─────────────────────────────

insert into public.slots (id, restaurant_id, date, time, max_covers, status, created_by)
select id, restaurant_id, date, time::time, max_covers, 'open',
       (select id from public.users where role = 'admin' limit 1)
from (values
  ('bbbbbbbb-4444-4000-8000-000000000001'::uuid, 'aaaaaaaa-4444-4000-8000-000000000001'::uuid, (current_date + interval  '7 days')::date, '19:30', 2),
  ('bbbbbbbb-5555-4000-8000-000000000001'::uuid, 'aaaaaaaa-5555-4000-8000-000000000001'::uuid, (current_date + interval  '9 days')::date, '19:30', 2),
  ('bbbbbbbb-6666-4000-8000-000000000001'::uuid, 'aaaaaaaa-6666-4000-8000-000000000001'::uuid, (current_date + interval '11 days')::date, '19:00', 2),
  ('bbbbbbbb-7777-4000-8000-000000000001'::uuid, 'aaaaaaaa-7777-4000-8000-000000000001'::uuid, (current_date + interval '13 days')::date, '19:30', 2),
  ('bbbbbbbb-8888-4000-8000-000000000001'::uuid, 'aaaaaaaa-8888-4000-8000-000000000001'::uuid, (current_date + interval '15 days')::date, '18:45', 2),
  ('bbbbbbbb-9999-4000-8000-000000000001'::uuid, 'aaaaaaaa-9999-4000-8000-000000000001'::uuid, (current_date + interval '17 days')::date, '19:00', 2),
  ('bbbbbbbb-aaaa-4000-8000-000000000001'::uuid, 'aaaaaaaa-aaaa-4000-8000-000000000001'::uuid, (current_date + interval '19 days')::date, '18:15', 3)
) as t(id, restaurant_id, date, time, max_covers)
on conflict (id) do update set
  date   = excluded.date,
  time   = excluded.time,
  status = 'open';

-- ─── Verify ──────────────────────────────────────────────────────────────────

select
  r.name                                   as restaurant,
  r.cuisine_type,
  jsonb_array_length(p.questions)          as questions,
  s.date                                   as slot_date,
  s.time                                   as slot_time
from public.restaurants r
left join public.proformas p on p.restaurant_id = r.id
left join public.slots     s on s.restaurant_id = r.id
where r.id in (
  'aaaaaaaa-4444-4000-8000-000000000001',
  'aaaaaaaa-5555-4000-8000-000000000001',
  'aaaaaaaa-6666-4000-8000-000000000001',
  'aaaaaaaa-7777-4000-8000-000000000001',
  'aaaaaaaa-8888-4000-8000-000000000001',
  'aaaaaaaa-9999-4000-8000-000000000001',
  'aaaaaaaa-aaaa-4000-8000-000000000001'
)
order by s.date;
