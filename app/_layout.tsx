import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { AppUser } from '../types';
import { registerPushToken, useNotificationListeners } from '../hooks/useNotifications';

const queryClient = new QueryClient();

function AuthGuard() {
  const { session, user, isLoading, setSession, setUser, setLoading } = useAuthStore();
  const segments = useSegments();

  // Set up push notification listeners (tap-to-navigate)
  useNotificationListeners();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUser(data as AppUser);
        // Register push token for this device
        registerPushToken(session.user.id).catch(() => {});
      }
      setLoading(false);
    }).catch(() => {
      // Network failure — clear loading so user reaches login screen
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUser(data as AppUser);
        registerPushToken(session.user.id).catch(() => {});
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = segments[0] as string | undefined;
    const inAuthGroup = firstSegment === '(auth)';
    const atRoot = !firstSegment;

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }

    // Logged in but still on the auth stack or the root index — route by role
    if (session && user && (inAuthGroup || atRoot)) {
      routeByRole(user);
    }
  }, [session, user, isLoading, segments]);

  return null;
}

async function routeByRole(user: AppUser) {
  if (user.role === 'admin') {
    router.replace('/(admin)/dashboard');
    return;
  }

  if (user.role === 'restaurant') {
    router.replace('/(restaurant)/dashboard');
    return;
  }

  if (user.role === 'diner') {
    // Check if pending approval
    if ((user as any).status === 'pending_approval') {
      router.replace('/(auth)/pending-approval');
      return;
    }

    // Check if T&Cs have been signed
    const { data: tcs } = await supabase
      .from('tcs_agreements')
      .select('id')
      .eq('diner_id', user.id)
      .order('signed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!tcs) {
      router.replace('/(auth)/terms');
      return;
    }

    router.replace('/(diner)/home');
  }
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
