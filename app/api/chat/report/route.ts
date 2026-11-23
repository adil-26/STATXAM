import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { reporterId, reportedUserId, messageId, reason } = body;

    if (!reporterId || !reportedUserId || !reason || !reason.trim()) {
      return NextResponse.json({ success: false, error: 'Missing required report fields' }, { status: 400 });
    }

    const { data: inserted, error } = await supabaseAdmin
      .from('user_reports')
      .insert({
        reporter_id: reporterId,
        reported_user_id: reportedUserId,
        message_id: messageId || null,
        reason: reason.trim(),
        status: 'open',
      })
      .select('*')
      .single();

    if (error || !inserted) {
      return NextResponse.json({ success: false, error: error?.message || 'Failed to submit report' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Report submitted successfully. Our safety moderation team will review this report.',
      reportId: inserted.id,
    });
  } catch (err: any) {
    console.error('[ReportAPI] Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
