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
    const {
      email,
      password,
      fullName,
      mobile,
      targetExam = 'CBSE & Pan-India Board',
      targetInstitution = 'National Merit Rank',
      language = 'english',
    } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'A valid email address is required.' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (fullName || 'Scholar').trim();
    const cleanMobile = mobile ? mobile.trim() : cleanEmail;

    // 1. Create or Update user in Supabase Auth via Admin API
    let userId = '';
    const adminHeaders = {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'node',
    };

    // Check if user already exists in auth.users
    const searchRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'GET',
      headers: adminHeaders,
    });

    let existingUser: any = null;
    if (searchRes.ok) {
      const searchJson = await searchRes.json();
      const userList = Array.isArray(searchJson?.users) ? searchJson.users : [];
      existingUser = userList.find((u: any) => u.email?.toLowerCase() === cleanEmail);
    }

    if (existingUser) {
      // Update password and confirm email for existing user
      userId = existingUser.id;
      const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({
          password: password.trim(),
          email_confirm: true,
          user_metadata: {
            full_name: cleanName,
            mobile: cleanMobile,
            target_exam: targetExam,
            target_institution: targetInstitution,
            language,
          },
        }),
      });

      if (!updateRes.ok) {
        const errJson = await updateRes.json().catch(() => ({}));
        return NextResponse.json({ success: false, error: errJson?.message || 'Failed to update account password' }, { status: 400 });
      }
    } else {
      // Create fresh user in Supabase Auth
      const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          email: cleanEmail,
          password: password.trim(),
          email_confirm: true,
          user_metadata: {
            full_name: cleanName,
            mobile: cleanMobile,
            target_exam: targetExam,
            target_institution: targetInstitution,
            language,
          },
        }),
      });

      const createJson = await createRes.json();
      if (!createRes.ok || !createJson?.id) {
        return NextResponse.json({ success: false, error: createJson?.message || 'Failed to create user in authentication server' }, { status: 400 });
      }
      userId = createJson.id;
    }

    // 2. Upsert profile into public.profiles
    const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: { persistSession: false },
    });

    const userProfile = {
      id: userId || `scholar-${Date.now()}`,
      full_name: cleanName,
      mobile: cleanMobile,
      language,
      target_exam: targetExam,
      target_institution: targetInstitution,
      estimated_rank: 150,
      accuracy: 85.0,
      streak_days: 1,
      questions_solved: 0,
      telegram_linked: false,
      telegram_handle: '@statxambot',
    };

    try {
      await sbAdmin.from('profiles').upsert(userProfile, { onConflict: 'id' });
    } catch (dbErr) {
      console.warn('[RegisterAPI] Profile upsert warning:', dbErr);
    }

    // 3. Return canonical client profile
    const clientProfile = {
      id: userProfile.id,
      fullName: userProfile.full_name,
      mobile: userProfile.mobile,
      email: cleanEmail,
      language: userProfile.language as any,
      targetExam: userProfile.target_exam,
      targetInstitution: userProfile.target_institution,
      estimatedRank: userProfile.estimated_rank,
      accuracy: userProfile.accuracy,
      streakDays: userProfile.streak_days,
      questionsSolved: userProfile.questions_solved,
      coins: 250,
      telegramLinked: userProfile.telegram_linked,
      telegramHandle: userProfile.telegram_handle,
    };

    return NextResponse.json({
      success: true,
      user: clientProfile,
    });
  } catch (error: any) {
    console.error('[RegisterAPI] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal registration failure' }, { status: 500 });
  }
}
