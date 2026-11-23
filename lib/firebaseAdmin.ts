import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getMessaging, MulticastMessage, SendResponse } from 'firebase-admin/messaging';
import { supabaseAdmin } from './supabase';

let firebaseApp: App | null = null;

export function getFirebaseAdminApp(): App | null {
  if (firebaseApp) return firebaseApp;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseApp = existingApps[0];
    return firebaseApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[FirebaseAdmin] Missing Firebase Admin credentials in environment variables.');
    return null;
  }

  // Handle escaped newlines in Vercel environment variables
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  try {
    firebaseApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    return firebaseApp;
  } catch (err) {
    console.error('[FirebaseAdmin] Failed initializing Firebase Admin SDK:', err);
    return null;
  }
}

export interface SendPushParams {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

/**
 * Sends a push notification to multiple device tokens via FCM HTTP v1.
 * Automatically prunes unregistered or invalid device tokens from the device_tokens table.
 */
export async function sendFcmMulticast(params: SendPushParams): Promise<{
  successCount: number;
  failureCount: number;
  invalidTokensPruned: number;
}> {
  const { tokens, title, body, data = {}, imageUrl } = params;

  if (!tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokensPruned: 0 };
  }

  const app = getFirebaseAdminApp();
  if (!app) {
    console.warn('[FirebaseAdmin] Push skipped: Firebase Admin App not initialized.');
    return { successCount: 0, failureCount: tokens.length, invalidTokensPruned: 0 };
  }

  // Deduplicate tokens
  const uniqueTokens = Array.from(new Set(tokens)).filter((t) => t && t.trim().length > 10);
  if (uniqueTokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokensPruned: 0 };
  }

  const message: MulticastMessage = {
    tokens: uniqueTokens,
    notification: {
      title,
      body,
      ...(imageUrl ? { imageUrl } : {}),
    },
    data: {
      ...data,
      click_action: data.url || '/messages',
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        color: '#c2652a',
        channelId: 'statxam_alerts',
      },
    },
    webpush: {
      notification: {
        icon: '/icon.png',
        badge: '/icon.png',
      },
      fcmOptions: {
        link: data.url || '/messages',
      },
    },
  };

  try {
    const messaging = getMessaging(app);
    const response = await messaging.sendEachForMulticast(message);

    const invalidTokens: string[] = [];
    response.responses.forEach((resp: SendResponse, idx: number) => {
      if (!resp.success && resp.error) {
        const code = resp.error.code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          invalidTokens.push(uniqueTokens[idx]);
        }
      }
    });

    // Auto-prune dead/stale tokens from Supabase device_tokens
    if (invalidTokens.length > 0) {
      try {
        await supabaseAdmin
          .from('device_tokens')
          .delete()
          .in('token', invalidTokens);
        console.log(`[FirebaseAdmin] Auto-pruned ${invalidTokens.length} dead FCM tokens.`);
      } catch (pruneErr) {
        console.warn('[FirebaseAdmin] Warning: Token auto-prune failed:', pruneErr);
      }
    }

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokensPruned: invalidTokens.length,
    };
  } catch (err) {
    console.error('[FirebaseAdmin] Error sending multicast message:', err);
    return { successCount: 0, failureCount: uniqueTokens.length, invalidTokensPruned: 0 };
  }
}
