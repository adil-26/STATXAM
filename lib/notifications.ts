'use client';

import { Capacitor } from '@capacitor/core';
import { PushNotifications, ActionPerformed, Token } from '@capacitor/push-notifications';
import { supabase } from './supabase';
import { getApiUrl } from './api-config';

/**
 * Registers a device push token in Supabase device_tokens table.
 */
export async function registerDeviceToken(
  userId: string,
  token: string,
  platform: 'android' | 'web' | 'ios'
): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl('/api/notifications/token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, token, platform }),
    });
    if (res.ok) {
      return true;
    }
  } catch (err) {
    console.warn('[Notifications] API token registration failed, trying direct Supabase:', err);
  }

  // Direct Supabase fallback
  try {
    const { error } = await supabase.from('device_tokens').upsert(
      {
        user_id: userId,
        token,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    );
    return !error;
  } catch {
    return false;
  }
}

/**
 * Initializes push notifications for both native Android APK and web browsers.
 */
export async function initPushNotifications(
  userId: string,
  onNavigate?: (path: string) => void
): Promise<void> {
  if (typeof window === 'undefined' || !userId) return;

  // 1. Native Capacitor Platform (Android APK)
  if (Capacitor.isNativePlatform()) {
    try {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('[Notifications] Push permission denied by user.');
        return;
      }

      // Register device with native APNS / FCM
      await PushNotifications.register();

      // Listen for registration token
      await PushNotifications.addListener('registration', async (token: Token) => {
        if (token && token.value) {
          console.log('[Notifications] Native FCM Token received:', token.value.substring(0, 15) + '...');
          await registerDeviceToken(userId, token.value, 'android');
        }
      });

      // Handle notification error
      await PushNotifications.addListener('registrationError', (err: any) => {
        console.warn('[Notifications] Push registration error:', err);
      });

      // Handle notification click / tap action
      await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (notification: ActionPerformed) => {
          const data = notification.notification.data;
          if (data?.conversationId) {
            const targetUrl = `/messages?c=${data.conversationId}`;
            if (onNavigate) {
              onNavigate(targetUrl);
            } else {
              window.location.href = targetUrl;
            }
          } else if (data?.url) {
            if (onNavigate) {
              onNavigate(data.url);
            } else {
              window.location.href = data.url;
            }
          }
        }
      );
    } catch (nativeErr) {
      console.warn('[Notifications] Native push setup failed:', nativeErr);
    }
    return;
  }

  // 2. Web Browser Push (PWA / Chrome)
  if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('[Notifications] Web push service worker registered with scope:', registration.scope);
    } catch (swErr) {
      console.warn('[Notifications] Service worker registration failed:', swErr);
    }
  }
}
