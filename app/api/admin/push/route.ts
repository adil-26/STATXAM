import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendFcmMulticast } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { title, body: msgBody, url = '/', targetUserId } = body;

    if (!title || !msgBody) {
      return NextResponse.json({ success: false, error: 'Title and body are required' }, { status: 400 });
    }

    // 1. Fetch tokens
    let query = supabaseAdmin.from('device_tokens').select('token, user_id');
    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    }

    const { data: rows, error } = await query;

    if (error || !rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No registered device tokens found' }, { status: 404 });
    }

    const tokens = rows.map((r) => r.token).filter(Boolean);

    // 2. Multicast push via FCM
    const res = await sendFcmMulticast({
      tokens,
      title,
      body: msgBody,
      data: {
        url,
        type: 'broadcast',
      },
    });

    // 3. Log broadcast
    await supabaseAdmin.from('notifications_log').insert({
      user_id: targetUserId || 'broadcast_all',
      title,
      body: msgBody,
      data: { url, successCount: res.successCount, failureCount: res.failureCount },
      status: res.successCount > 0 ? 'sent' : 'failed',
    });

    return NextResponse.json({
      success: true,
      delivered: res.successCount,
      failed: res.failureCount,
      pruned: res.invalidTokensPruned,
      totalTokens: tokens.length,
    });
  } catch (err: any) {
    console.error('[AdminPushAPI] Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
