import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    // 1. Fetch conversations where user is a participant
    const { data: convs, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (convError) {
      return NextResponse.json({ success: false, error: convError.message }, { status: 500 });
    }

    if (!convs || convs.length === 0) {
      return NextResponse.json({ success: true, conversations: [] });
    }

    // 2. Filter out conversations with blocked users
    const otherUserIds = convs.map((c) => (c.participant_a === userId ? c.participant_b : c.participant_a));

    const { data: blocks } = await supabaseAdmin
      .from('user_blocks')
      .select('*')
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

    const blockedSet = new Set<string>();
    if (blocks) {
      blocks.forEach((b) => {
        if (b.blocker_id === userId) blockedSet.add(b.blocked_id);
        if (b.blocked_id === userId) blockedSet.add(b.blocker_id);
      });
    }

    const allowedConvs = convs.filter((c) => {
      const otherId = c.participant_a === userId ? c.participant_b : c.participant_a;
      return !blockedSet.has(otherId);
    });

    // 3. Fetch other user profiles
    const cleanOtherIds = Array.from(new Set(allowedConvs.map((c) => (c.participant_a === userId ? c.participant_b : c.participant_a))));
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, mobile, language, target_exam, target_institution, estimated_rank, accuracy, streak_days, telegram_handle')
      .in('id', cleanOtherIds);

    const profileMap = new Map<string, any>();
    if (profiles) {
      profiles.forEach((p) => {
        profileMap.set(p.id, {
          id: p.id,
          fullName: p.full_name,
          mobile: p.mobile,
          language: p.language,
          targetExam: p.target_exam,
          targetInstitution: p.target_institution,
          estimatedRank: p.estimated_rank,
          accuracy: Number(p.accuracy),
          streakDays: p.streak_days,
          telegramHandle: p.telegram_handle,
        });
      });
    }

    // 4. Augment with unread counts
    const augmentedConvs = await Promise.all(
      allowedConvs.map(async (conv) => {
        const otherId = conv.participant_a === userId ? conv.participant_b : conv.participant_a;
        const otherProfile = profileMap.get(otherId) || {
          id: otherId,
          fullName: 'Scholar',
          targetExam: 'Board Exam',
        };

        const { count } = await supabaseAdmin
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('recipient_id', userId)
          .is('read_at', null);

        return {
          ...conv,
          otherUser: otherProfile,
          unreadCount: count || 0,
        };
      })
    );

    return NextResponse.json({ success: true, conversations: augmentedConvs });
  } catch (err: any) {
    console.error('[ConversationsAPI] Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, targetUserId } = body;

    if (!userId || !targetUserId) {
      return NextResponse.json({ success: false, error: 'Both userId and targetUserId are required' }, { status: 400 });
    }

    if (userId === targetUserId) {
      return NextResponse.json({ success: false, error: 'Cannot start conversation with yourself' }, { status: 400 });
    }

    // 1. Check if either user is blocked
    const { data: block } = await supabaseAdmin
      .from('user_blocks')
      .select('*')
      .or(`and(blocker_id.eq.${userId},blocked_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_id.eq.${userId})`)
      .limit(1)
      .maybeSingle();

    if (block) {
      return NextResponse.json({ success: false, error: 'Cannot message this user due to privacy/blocking settings.' }, { status: 403 });
    }

    // 2. Ensure both participants have profile records in public.profiles to satisfy foreign key constraints
    const ensureProfileExists = async (pid: string) => {
      const { data: prof } = await supabaseAdmin.from('profiles').select('id').eq('id', pid).maybeSingle();
      if (!prof) {
        let email = '';
        let fullName = 'Scholar';
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(pid);
          if (authUser?.user) {
            email = authUser.user.email || '';
            fullName = authUser.user.user_metadata?.full_name || email.split('@')[0] || 'Scholar';
          }
        } catch {
          // ignore
        }
        await supabaseAdmin.from('profiles').upsert({
          id: pid,
          full_name: fullName,
          mobile: email || pid,
          language: 'english',
          target_exam: 'CBSE & Pan-India Board',
          target_institution: 'National Merit Rank',
          estimated_rank: 150,
          accuracy: 88.0,
          streak_days: 1,
          questions_solved: 0,
          telegram_linked: false,
          telegram_handle: '@statxambot',
        }, { onConflict: 'id' });
      }
    };

    await Promise.all([ensureProfileExists(userId), ensureProfileExists(targetUserId)]);

    // 3. Check if conversation already exists
    const { data: existing } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .or(`and(participant_a.eq.${userId},participant_b.eq.${targetUserId}),and(participant_a.eq.${targetUserId},participant_b.eq.${userId})`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Fetch other profile
      const { data: otherProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();

      return NextResponse.json({
        success: true,
        conversation: {
          ...existing,
          otherUser: otherProfile ? {
            id: otherProfile.id,
            fullName: otherProfile.full_name,
            targetExam: otherProfile.target_exam,
            accuracy: Number(otherProfile.accuracy),
          } : undefined,
        },
      });
    }

    // 3. Create conversation
    const { data: created, error } = await supabaseAdmin
      .from('conversations')
      .insert({
        participant_a: userId,
        participant_b: targetUserId,
        last_message_preview: 'Conversation started',
      })
      .select('*')
      .single();

    if (error || !created) {
      return NextResponse.json({ success: false, error: error?.message || 'Could not create conversation' }, { status: 500 });
    }

    const { data: otherProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      conversation: {
        ...created,
        otherUser: otherProfile ? {
          id: otherProfile.id,
          fullName: otherProfile.full_name,
          targetExam: otherProfile.target_exam,
          accuracy: Number(otherProfile.accuracy),
        } : undefined,
      },
    });
  } catch (err: any) {
    console.error('[ConversationsAPI] Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
