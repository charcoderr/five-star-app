import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { AppUser } from '../types';

interface AuthState {
  session: Session | null;
  user: AppUser | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  signOut: () => set({ session: null, user: null }),
}));
