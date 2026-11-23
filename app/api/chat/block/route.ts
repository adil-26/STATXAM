import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { blockerId, blockedId, action = 'block' } = body;

    if (!blockerId || !blockedId) {
      return NextResponse.json({ success: false, error: 'Both blockerId and blockedId required' }, { status: 400 });
    }

    if (blockerId === blockedId) {
      return NextResponse.json({ success: false, error: 'Cannot block yourself' }, { status: 400 });
    }

    if (action === 'unblock') {
      const { error } = await supabaseAdmin
        .from('user_blocks')
        .delete()
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: 'User unblocked' });
    } else {
      const { error } = await supabaseAdmin
        .from('user_blocks')
        .upsert(
          {
            blocker_id: blockerId,
            blocked_id: blockedId,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'blocker_id,blocked_id' }
        );

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: 'User blocked' });
    }
  } catch (err: any) {
    console.error('[BlockAPI] Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
