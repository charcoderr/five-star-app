import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { AppUser } from '../types';

interface AuthState {
  session: Session | null;
  user: AppUser | null;
  isLoading: boolean;
  splashComplete: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  setSplashComplete: (done: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  splashComplete: false,
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setSplashComplete: (splashComplete) => set({ splashComplete }),
  signOut: () => set({ session: null, user: null }),
}));
