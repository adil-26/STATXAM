import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: reports, error } = await supabaseAdmin
      .from('user_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!reports || reports.length === 0) {
      return NextResponse.json({ success: true, reports: [], openCount: 0 });
    }

    // Augment with reporter and reported profiles
    const userIds = Array.from(
      new Set(reports.flatMap((r) => [r.reporter_id, r.reported_user_id]).filter(Boolean))
    );

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, mobile, target_exam')
      .in('id', userIds);

    const profileMap = new Map<string, any>();
    if (profiles) {
      profiles.forEach((p) => {
        profileMap.set(p.id, {
          id: p.id,
          fullName: p.full_name,
          mobile: p.mobile,
          targetExam: p.target_exam,
        });
      });
    }

    const augmented = reports.map((r) => ({
      ...r,
      reporter: profileMap.get(r.reporter_id) || { id: r.reporter_id, fullName: 'Unknown' },
      reportedUser: profileMap.get(r.reported_user_id) || { id: r.reported_user_id, fullName: 'Unknown' },
    }));

    const openCount = augmented.filter((r) => r.status === 'open').length;

    return NextResponse.json({
      success: true,
      reports: augmented,
      openCount,
    });
  } catch (err: any) {
    console.error('[AdminModerationAPI] Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { reportId, status, adminNotes, action, targetUserId } = body;

    if (action === 'ban' && targetUserId) {
      // Ban/freeze user profile
      await supabaseAdmin
        .from('profiles')
        .update({ target_institution: 'Suspended Account' })
        .eq('id', targetUserId);

      return NextResponse.json({ success: true, message: `User ${targetUserId} suspended successfully` });
    }

    if (!reportId || !status) {
      return NextResponse.json({ success: false, error: 'Report ID and status are required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('user_reports')
      .update({
        status,
        admin_notes: adminNotes || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Report marked as ${status}` });
  } catch (err: any) {
    console.error('[AdminModerationAPI] Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
