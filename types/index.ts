export type UserRole = 'admin' | 'diner' | 'restaurant';

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
  city?: string;
  status: 'active' | 'pending_approval' | 'suspended';
  created_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  cuisine_type: string;
  contact_email: string;
  subscription_status: 'active' | 'inactive' | 'trial';
  avg_rating: number | null;
}

export interface Slot {
  id: string;
  restaurant_id: string;
  // Legacy fixed-slot fields (kept for seeded historical data — nullable now)
  date: string | null;
  time: string | null;
  // Voucher-opportunity fields (new workflow)
  voucher_expiry: string | null;
  notes: string | null;
  max_covers: number;
  status: 'open' | 'claimed' | 'completed' | 'cancelled';
  created_by: string;
  restaurant?: Restaurant;
}

export interface Assignment {
  id: string;
  slot_id: string;
  diner_id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  voucher_id?: string;
  // Booking the diner entered after Wendy approved them (new workflow)
  booking_date?: string | null;
  booking_time?: string | null;
  booking_notes?: string | null;
  // Receipt photo for reimbursement (no-voucher flow)
  receipt_path?: string | null;
  slot?: Slot;
}

export type QuestionType = 'scored' | 'yes_no' | 'free_text';
export type QuestionCategory = 'Booking' | 'External' | 'Internal' | 'Service' | 'Dining' | 'Facilities' | 'Conclusion';

export interface ProformaQuestion {
  id: string;
  type: QuestionType;
  category: string;       // string so restaurants can add custom sections
  label: string;
  required: boolean;
  order: number;
  photoPrompt?: boolean;  // diner shown "Add photo" button under this question
  locked?: boolean;       // cannot be removed (Wrap Up / Conclusion questions)
}

export interface Proforma {
  id: string;
  restaurant_id: string;
  title: string;
  questions: ProformaQuestion[];
  version: number;
  created_at: string;
}

export interface ReportAnswer {
  score?: number;       // 0–3 for scored questions
  value?: boolean;      // for yes_no
  text?: string;        // for free_text or notes on any question
  notes?: string;       // additional notes on scored questions
  photo_url?: string;   // signed URL for per-question photo (if photoPrompt)
}

export interface Report {
  id: string;
  assignment_id: string;
  diner_id: string;
  restaurant_id: string;
  answers: Record<string, ReportAnswer>;
  submitted_at: string | null;
  status: 'draft' | 'submitted' | 'under_review' | 'sent_to_restaurant';
}

export interface Voucher {
  id: string;
  assignment_id: string;
  diner_id: string;
  value: number;
  qr_code: string;
  status: 'issued' | 'redeemed' | 'expired';
  issued_at: string;
}
