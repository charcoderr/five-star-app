import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ─── Foreground notification behaviour ───────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Register device push token ───────────────────────────────────────────────
export async function registerPushToken(userId: string) {
  if (!Device.isDevice) return; // simulators can't get real tokens

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Upsert token into users table
  // Requires push_token column on users — included in migration 002
  await supabase.from('users').update({ push_token: token }).eq('id', userId);
}

// ─── Navigate on notification tap ────────────────────────────────────────────
function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as Record<string, string>;
  if (!data?.type) return;

  switch (data.type) {
    case 'assignment_confirmed':
    case 'assignment_reminder':
      if (data.assignmentId) {
        router.push('/(diner)/my-assignments');
      }
      break;
    case 'voucher_issued':
      router.push('/(diner)/vouchers');
      break;
    case 'report_reviewed':
      router.push('/(diner)/my-assignments');
      break;
    case 'new_slot':
      router.push('/(diner)/home');
      break;
    case 'new_application':
      router.push('/(admin)/diners');
      break;
  }
}

// ─── Hook: set up listeners (call once from root layout) ─────────────────────
export function useNotificationListeners() {
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );
    return () => responseListener.current?.remove();
  }, []);
}

// ─── In-app notifications from DB ────────────────────────────────────────────
export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  data: Record<string, string> | null;
  created_at: string;
}

export function useMyNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
    enabled: !!userId,
    refetchInterval: 30_000, // poll every 30s for new notifications
  });
}

export function useUnreadCount(userId: string | undefined) {
  const { data } = useMyNotifications(userId);
  return data?.filter(n => !n.read).length ?? 0;
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
