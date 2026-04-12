export type UserRole = 'admin' | 'diner' | 'restaurant';

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
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
  date: string;
  time: string;
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
  slot?: Slot;
}

export interface ProformaQuestion {
  id: string;
  type: 'yes_no' | 'star_rating' | 'number' | 'free_text';
  label: string;
  required: boolean;
  order: number;
}

export interface Proforma {
  id: string;
  restaurant_id: string;
  title: string;
  questions: ProformaQuestion[];
  version: number;
  created_at: string;
}

export interface Report {
  id: string;
  assignment_id: string;
  diner_id: string;
  restaurant_id: string;
  answers: Record<string, string | number | boolean>;
  submitted_at: string | null;
  status: 'draft' | 'submitted' | 'reviewed';
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
