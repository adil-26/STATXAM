import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, token, platform } = body;

    if (!userId || !token) {
      return NextResponse.json({ success: false, error: 'User ID and Token are required' }, { status: 400 });
    }

    const cleanPlatform = ['android', 'web', 'ios'].includes(platform) ? platform : 'android';

    const { error } = await supabaseAdmin
      .from('device_tokens')
      .upsert(
        {
          user_id: userId,
          token: token.trim(),
          platform: cleanPlatform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,token' }
      );

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Device token registered' });
  } catch (err: any) {
    console.error('[DeviceTokenAPI] Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
