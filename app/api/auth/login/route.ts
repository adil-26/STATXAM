import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://jhtaafwthjksheemcybv.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { identity, password } = body;

    if (!identity || !identity.trim()) {
      return NextResponse.json({ success: false, error: 'Please enter your registered email or phone number.' }, { status: 400 });
    }

    if (!password || !password.trim()) {
      return NextResponse.json({ success: false, error: 'Please enter your password.' }, { status: 400 });
    }

    const trimmedIdentity = identity.trim();
    let targetEmail = '';

    const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: { persistSession: false },
    });

    if (trimmedIdentity.includes('@')) {
      targetEmail = trimmedIdentity.toLowerCase();
    } else {
      // Identity is a mobile number - resolve associated email
      const cleanDigits = trimmedIdentity.replace(/\D/g, '');
      const normalizedMobile = trimmedIdentity.startsWith('+91') ? trimmedIdentity : `+91 ${trimmedIdentity}`;

      // Look up profiles table
      const { data: profile } = await sbAdmin
        .from('profiles')
        .select('*')
        .or(`mobile.eq.${normalizedMobile},mobile.ilike.%${cleanDigits}%`)
        .limit(1)
        .maybeSingle();

      if (profile) {
        if (profile.mobile && profile.mobile.includes('@')) {
          targetEmail = profile.mobile.toLowerCase();
        } else {
          // Check auth.users by ID
          const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${profile.id}`, {
            headers: {
              apikey: SUPABASE_SECRET_KEY,
              Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
              'User-Agent': 'node',
            },
          });
          if (userRes.ok) {
            const userJson = await userRes.json();
            if (userJson?.email) {
              targetEmail = userJson.email;
            }
          }
        }
      }

      if (!targetEmail) {
        // Fallback: check admin users list for mobile metadata
        const searchRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
          headers: {
            apikey: SUPABASE_SECRET_KEY,
            Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
            'User-Agent': 'node',
          },
        });
        if (searchRes.ok) {
          const searchJson = await searchRes.json();
          const userList = Array.isArray(searchJson?.users) ? searchJson.users : [];
          const found = userList.find((u: any) =>
            u.user_metadata?.mobile?.replace(/\D/g, '').includes(cleanDigits) ||
            u.phone?.replace(/\D/g, '').includes(cleanDigits)
          );
          if (found?.email) {
            targetEmail = found.email;
          }
        }
      }

      if (!targetEmail) {
        return NextResponse.json({
          success: false,
          error: 'No account found matching this mobile number. Please check the number or sign in with your email address.',
        }, { status: 404 });
      }
    }

    // 2. Authenticate against Supabase GoTrue Auth
    const sbClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const { data: authData, error: authError } = await sbClient.auth.signInWithPassword({
      email: targetEmail,
      password: password.trim(),
    });

    if (authError || !authData?.user) {
      // Explicitly reject invalid password with HTTP 401
      return NextResponse.json({
        success: false,
        error: 'Incorrect password. Please verify your password and try again.',
      }, { status: 401 });
    }

    // 3. User authenticated! Fetch profile details
    const userId = authData.user.id;
    let liveProfile: any = null;

    try {
      const { data: dbProfile } = await sbAdmin
        .from('profiles')
        .select('*')
        .or(`id.eq.${userId},mobile.eq.${targetEmail}`)
        .limit(1)
        .maybeSingle();
      liveProfile = dbProfile;
    } catch {
      // continue to fallback
    }

    const meta = authData.user.user_metadata || {};
    const clientProfile = {
      id: userId,
      fullName: liveProfile?.full_name || meta.full_name || targetEmail.split('@')[0],
      mobile: liveProfile?.mobile || meta.mobile || targetEmail,
      email: targetEmail,
      language: liveProfile?.language || meta.language || 'english',
      targetExam: liveProfile?.target_exam || meta.target_exam || 'CBSE & Pan-India Board',
      targetInstitution: liveProfile?.target_institution || meta.target_institution || 'National Merit Rank',
      estimatedRank: liveProfile?.estimated_rank || 150,
      accuracy: liveProfile ? Number(liveProfile.accuracy) : 88.0,
      streakDays: liveProfile?.streak_days || 1,
      questionsSolved: liveProfile?.questions_solved || 0,
      coins: 250,
      telegramLinked: Boolean(liveProfile?.telegram_linked),
      telegramHandle: liveProfile?.telegram_handle || '@statxambot',
    };

    return NextResponse.json({
      success: true,
      user: clientProfile,
      session: authData.session,
    });
  } catch (error: any) {
    console.error('[LoginAPI] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Authentication service error' }, { status: 500 });
  }
}
