import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendFcmMulticast } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Supabase Database Webhook Endpoint: Triggered on INSERT into public.messages.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify Webhook Secret
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
    const incomingSecret = req.headers.get('x-webhook-secret');

    if (webhookSecret && incomingSecret !== webhookSecret) {
      console.warn('[WebhookNotify] Unauthorized webhook call: Secret mismatch');
      return NextResponse.json({ success: false, error: 'Unauthorized webhook call' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const record = payload.record || payload;

    const {
      conversation_id,
      sender_id,
      recipient_id,
      content,
      message_type = 'text',
    } = record;

    if (!recipient_id || !sender_id || !content) {
      return NextResponse.json({ success: false, error: 'Incomplete message record payload' }, { status: 400 });
    }

    // Skip self-messages
    if (sender_id === recipient_id) {
      return NextResponse.json({ success: true, message: 'Self-message skipped' });
    }

    // 2. Check if recipient has blocked sender
    const { data: block } = await supabaseAdmin
      .from('user_blocks')
      .select('*')
      .eq('blocker_id', recipient_id)
      .eq('blocked_id', sender_id)
      .maybeSingle();

    if (block) {
      console.log(`[WebhookNotify] Notification suppressed: Recipient ${recipient_id} blocked Sender ${sender_id}`);
      return NextResponse.json({ success: true, message: 'Notification suppressed due to user block' });
    }

    // 3. Fetch Sender profile for notification title
    const { data: senderProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, target_exam')
      .eq('id', sender_id)
      .maybeSingle();

    const senderName = senderProfile?.full_name || 'StatXam Scholar';

    // 4. Fetch Recipient Device Tokens
    const { data: tokenRows, error: tokenError } = await supabaseAdmin
      .from('device_tokens')
      .select('token')
      .eq('user_id', recipient_id);

    if (tokenError || !tokenRows || tokenRows.length === 0) {
      console.log(`[WebhookNotify] No active device tokens found for recipient ${recipient_id}`);
      return NextResponse.json({ success: true, message: 'No registered device tokens' });
    }

    const tokens = tokenRows.map((r) => r.token).filter(Boolean);

    // 5. Send Multicast Push Notification via FCM HTTP v1
    const bodyPreview = message_type === 'call_invitation'
      ? 'Incoming voice/video study call...'
      : content.length > 90
      ? `${content.substring(0, 87)}...`
      : content;

    const pushResult = await sendFcmMulticast({
      tokens,
      title: `${senderName} • StatXam`,
      body: bodyPreview,
      data: {
        type: 'chat',
        conversationId: conversation_id || '',
        senderId: sender_id,
        recipientId: recipient_id,
        url: `/messages?c=${conversation_id}`,
      },
    });

    // 6. Log notification
    await supabaseAdmin.from('notifications_log').insert({
      user_id: recipient_id,
      title: `${senderName} • StatXam`,
      body: bodyPreview,
      data: {
        type: 'chat',
        conversation_id,
        sender_id,
        successCount: pushResult.successCount,
      },
      status: pushResult.successCount > 0 ? 'sent' : 'failed',
    });

    return NextResponse.json({
      success: true,
      delivered: pushResult.successCount,
      failed: pushResult.failureCount,
      pruned: pushResult.invalidTokensPruned,
    });
  } catch (err: any) {
    console.error('[WebhookNotify] Internal error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error processing webhook' }, { status: 500 });
  }
}
