import { ProformaQuestion } from '../types';

// Default proforma template based on the Buck's Bar Group report structure.
// This is used when a restaurant is first set up and has no custom proforma.

export const DEFAULT_PROFORMA_QUESTIONS: Omit<ProformaQuestion, 'id'>[] = [
  // --- BOOKING ---
  { category: 'Booking', type: 'scored', label: 'Acknowledgement via email / social media', required: true, order: 1 },
  { category: 'Booking', type: 'scored', label: 'Informed of booking allocation timings through confirmation', required: true, order: 2 },

  // --- EXTERNAL ---
  { category: 'External', type: 'scored', label: 'Approach to venue — clean, tidy, hazard free', required: true, order: 3 },
  { category: 'External', type: 'scored', label: 'Outside lighting operational', required: true, order: 4 },
  { category: 'External', type: 'scored', label: 'Restaurant signage clearly displayed', required: true, order: 5 },
  { category: 'External', type: 'scored', label: 'Ashtrays empty and clean', required: false, order: 6 },
  { category: 'External', type: 'scored', label: 'Outdoor tables clear and clean', required: false, order: 7 },

  // --- INTERNAL: Arrival ---
  { category: 'Internal', type: 'scored', label: 'All lighting operational', required: true, order: 8 },
  { category: 'Internal', type: 'scored', label: 'Entranceway clean and trip hazard free', required: true, order: 9 },
  { category: 'Internal', type: 'scored', label: 'Fragrance / smell on arrival', required: true, order: 10 },
  { category: 'Internal', type: 'scored', label: 'Noise levels in building acceptable', required: true, order: 11 },
  { category: 'Internal', type: 'scored', label: 'Greeting — eye contact, host at welcome desk, smile and acknowledgement', required: true, order: 12 },
  { category: 'Internal', type: 'scored', label: 'Made to feel welcome by all staff', required: true, order: 13 },
  { category: 'Internal', type: 'scored', label: 'Staff appropriately dressed — neat and tidy', required: true, order: 14 },
  { category: 'Internal', type: 'scored', label: 'Seated immediately, menu explained, ordering process explained', required: true, order: 15 },
  { category: 'Internal', type: 'scored', label: 'Made aware of food and drink daily specials', required: true, order: 16 },
  { category: 'Internal', type: 'scored', label: 'Asked about allergens and assisted with appropriate menu choice', required: true, order: 17 },

  // --- INTERNAL: Service ---
  { category: 'Service', type: 'scored', label: 'Drinks order taken within 4 minutes', required: true, order: 18 },
  { category: 'Service', type: 'scored', label: 'Drinks arrived within 5 minutes, order correct, glasses chilled/cold', required: true, order: 19 },
  { category: 'Service', type: 'scored', label: 'Amendment requests accepted', required: true, order: 20 },
  { category: 'Service', type: 'scored', label: 'Menus clean — drink, food and specials', required: true, order: 21 },
  { category: 'Service', type: 'scored', label: 'Table clean, tidy and sturdy', required: true, order: 22 },
  { category: 'Service', type: 'scored', label: 'Surroundings clean and tidy', required: true, order: 23 },
  { category: 'Service', type: 'scored', label: 'Food order taken within 10 minutes, arrived within 20 minutes, correct and correct temperature', required: true, order: 24 },
  { category: 'Service', type: 'scored', label: 'Appropriate tableware provided (cutlery, etc.)', required: true, order: 25 },

  // --- INTERNAL: Dining ---
  { category: 'Dining', type: 'scored', label: 'Food presentation, quality, and all dishes arrived together', required: true, order: 26 },
  { category: 'Dining', type: 'scored', label: 'Server asked how your meal was during the meal', required: true, order: 27 },
  { category: 'Dining', type: 'scored', label: 'Non-verbal communication — eye contact, server attentive at all times', required: true, order: 28 },
  { category: 'Dining', type: 'scored', label: 'Table cleared after the first course', required: true, order: 29 },
  { category: 'Dining', type: 'scored', label: 'Additional food or drinks offered', required: true, order: 30 },
  { category: 'Dining', type: 'scored', label: 'Final bill arrived within 3 minutes and was correct', required: true, order: 31 },
  { category: 'Dining', type: 'scored', label: 'Advised of gratuity option on the card machine', required: true, order: 32 },
  { category: 'Dining', type: 'scored', label: 'Bill presentation — tray, comment card, pen', required: true, order: 33 },
  { category: 'Dining', type: 'scored', label: 'Door host on door on way out', required: false, order: 34 },
  { category: 'Dining', type: 'scored', label: 'Thanked for custom on way out', required: true, order: 35 },

  // --- FACILITIES ---
  { category: 'Facilities', type: 'scored', label: 'Amenities — clean, tidy, fully operational, toilet roll and soap dispenser full', required: true, order: 36 },
  { category: 'Facilities', type: 'scored', label: 'Fire exits clear of hazards and door shut', required: true, order: 37 },
  { category: 'Facilities', type: 'scored', label: 'Team members — friendly, approachable, made you feel welcome', required: true, order: 38 },
  { category: 'Facilities', type: 'yes_no', label: 'Would you recommend the team members based on this visit?', required: true, order: 39 },
  { category: 'Facilities', type: 'yes_no', label: 'Would you recommend the venue based on this visit?', required: true, order: 40 },
  { category: 'Facilities', type: 'scored', label: 'Value for money', required: true, order: 41 },

  // --- CONCLUSION ---
  { category: 'Conclusion', type: 'free_text', label: 'Describe your server(s) — names or descriptions', required: false, order: 42 },
  { category: 'Conclusion', type: 'free_text', label: 'Food ordered and your thoughts on each dish', required: true, order: 43 },
  { category: 'Conclusion', type: 'free_text', label: 'Any additional comments or observations', required: false, order: 44 },
];

export const PROFORMA_CATEGORIES = ['Booking', 'External', 'Internal', 'Service', 'Dining', 'Facilities', 'Conclusion'] as const;
export type ProformaCategory = typeof PROFORMA_CATEGORIES[number];
