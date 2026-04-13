-- ─── Seed: La Vita Buchanan Street ──────────────────────────────────────────
-- Creates a sample restaurant client with a full mystery-dine proforma
-- adapted from the 5StarX "La Vita - July 2025" Word doc. Condensed and
-- restructured for mobile use; photo prompts added where visual evidence
-- adds value (exteriors, table, food, amenities).
--
-- Idempotent: re-running will update the existing proforma instead of
-- creating duplicates.
--
-- Apply with:
--   supabase db query --linked --file supabase/seeds/la_vita.sql

-- 1. Restaurant
insert into public.restaurants (id, name, address, cuisine_type, contact_email, subscription_status, subscription_plan)
values (
  'aaaaaaaa-1111-4000-8000-000000000001',
  'La Vita Buchanan Street',
  '184 Buchanan St, Glasgow G1 2LW',
  'Italian',
  'info@lavitabuchananstreet.co.uk',
  'trial',
  'standard'
)
on conflict (id) do update set
  name = excluded.name,
  address = excluded.address,
  cuisine_type = excluded.cuisine_type,
  contact_email = excluded.contact_email;

-- 2. Build the proforma questions as a jsonb array via a CTE + VALUES list
with q(label, category, type, required, ord, photo, locked) as (
  values
    -- BOOKING: enquiry, phone handling, confirmation
    ('Online booking easy to navigate (or phone answered within 3-5 rings)',          'Booking',    'scored',    true,   1, false, false),
    ('Preferred date and time allocated',                                             'Booking',    'scored',    true,   2, false, false),
    ('Asked about allergens / food intolerances during booking',                      'Booking',    'scored',    true,   3, false, false),
    ('Asked about any special occasion',                                              'Booking',    'scored',    true,   4, false, false),
    ('Booking confirmation enthusiastic, professional, friendly',                     'Booking',    'scored',    true,   5, false, false),

    -- EXTERNAL: approach, kerb appeal, cleanliness
    ('Approach to restaurant — first impressions clean and welcoming',                'External',   'scored',    true,   6, true,  false),
    ('Cleanliness around the vicinity (no litter, cigarette ends, spills)',           'External',   'scored',    true,   7, true,  false),
    ('Signage clear, lighting operational, no obstructions',                          'External',   'scored',    true,   8, true,  false),
    ('External smells acceptable (no drains, bins, smoking near entrance)',           'External',   'scored',    true,   9, false, false),

    -- INTERNAL: Arrival + Welcome
    ('Met at the door with a smile and warm welcome',                                 'Internal',   'scored',    true,  10, false, false),
    ('Host gave you their full attention (not sidetracked)',                          'Internal',   'scored',    true,  11, false, false),
    ('Table was ready on arrival',                                                    'Internal',   'scored',    true,  12, false, false),
    ('Ambiance on entry — smells, music level, first impression',                     'Internal',   'scored',    true,  13, false, false),
    ('Music appropriate to the venue and not too loud',                               'Internal',   'scored',    true,  14, false, false),
    ('Décor clean, well-maintained, lighting working',                                'Internal',   'scored',    true,  15, true,  false),
    ('Table large enough for party, clean and sturdy',                                'Internal',   'scored',    true,  16, true,  false),
    ('Cutlery, glasses and crockery all clean (no watermarks or smears)',             'Internal',   'scored',    true,  17, true,  false),
    ('No visible cleaning materials or maintenance issues in dining area',            'Internal',   'scored',    true,  18, false, false),

    -- SERVICE: Team presentation and attentiveness
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

    -- DINING: Food, drink, timings, bill
    ('Starters arrived within 10 minutes of ordering',                                'Dining',     'scored',    true,  35, false, false),
    ('Mains arrived within 15 minutes of starters being cleared',                     'Dining',     'scored',    true,  36, false, false),
    ('Desserts arrived within 10 minutes of ordering',                                'Dining',     'scored',    false, 37, false, false),
    ('Food correct, taste as expected and at the right temperature',                  'Dining',     'scored',    true,  38, true,  false),
    ('Presentation and portion size appropriate for the price',                       'Dining',     'scored',    true,  39, true,  false),
    ('Glasses chilled, crockery not hot from dishwasher/heat lamp',                   'Dining',     'scored',    true,  40, false, false),
    ('All side dishes good quality; matching items across party consistent',          'Dining',     'scored',    true,  41, false, false),
    ('Bill arrived within 3 minutes of requesting',                                   'Dining',     'scored',    true,  42, false, false),
    ('Card payment taken discreetly, gratuity option clear',                          'Dining',     'scored',    true,  43, false, false),

    -- FACILITIES: Amenities / fire exits / overall venue
    ('Amenities (toilets) clean, tidy, soap and paper stocked',                       'Facilities', 'scored',    true,  44, true,  false),
    ('Cubicles clean, no maintenance issues (e.g. loose seats)',                      'Facilities', 'scored',    true,  45, true,  false),
    ('Fire exits signposted and clear of obstructions',                               'Facilities', 'scored',    true,  46, true,  false),
    ('Overall venue clean and well-maintained throughout',                            'Facilities', 'scored',    true,  47, false, false),

    -- WRAP UP: Recommendations + conclusion (locked)
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
-- 3. Wipe any existing proforma for La Vita so we insert fresh
wipe as (
  delete from public.proformas where restaurant_id = 'aaaaaaaa-1111-4000-8000-000000000001' returning 1
)
-- 4. Insert the active proforma
insert into public.proformas (restaurant_id, title, questions, version)
select 'aaaaaaaa-1111-4000-8000-000000000001', 'La Vita — Mystery Dine Report', questions, 1
from questions_array;

-- Verify
select
  r.name as restaurant,
  p.title as proforma,
  p.version,
  jsonb_array_length(p.questions) as question_count
from public.restaurants r
left join public.proformas p on p.restaurant_id = r.id
where r.id = 'aaaaaaaa-1111-4000-8000-000000000001'
order by p.version desc
limit 1;
