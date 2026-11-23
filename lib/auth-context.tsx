'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { PilotProfile } from './types';
import { hideAppSplash } from './native-permissions';
import { supabase } from './supabase';
import { sendTelegramOtp, verifyTelegramOtpCode } from './supabase-service';
import { getApiUrl } from './api-config';

interface AuthContextType {
  user: PilotProfile | null;
  loading: boolean;
  login: (identity: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: Partial<PilotProfile> & { email?: string }, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  requestTelegramOtp: (mobile: string) => Promise<{ success: boolean; message: string }>;
  resetPasswordViaTelegramOtp: (otp: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
  logout: () => { },
  requestTelegramOtp: async () => ({ success: false, message: '' }),
  resetPasswordViaTelegramOtp: async () => ({ success: false }),
  refreshProfile: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PilotProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Client-side fetchMe gate (Runs inside native APK shell on mount)
  useEffect(() => {
    async function fetchMe() {
      try {
        // 1. Check for active Supabase session
        const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        const currentSbUser = sessionData?.session?.user;

        // 2. Check stored local session
        const stored = typeof window !== 'undefined' ? localStorage.getItem('statxam_pilot_session') : null;
        const targetUserId = currentSbUser?.id || (stored ? (JSON.parse(stored) as PilotProfile).id : null);

        if (targetUserId) {
          try {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', targetUserId)
              .maybeSingle();

            if (data) {
              const liveProfile: PilotProfile = {
                id: data.id,
                fullName: data.full_name,
                mobile: data.mobile,
                language: (data.language as any) || 'english',
                targetExam: data.target_exam || 'CBSE & Pan-India Board',
                targetInstitution: data.target_institution || 'National Merit Rank',
                estimatedRank: data.estimated_rank || 150,
                accuracy: Number(data.accuracy) || 88.0,
                streakDays: data.streak_days || 1,
                questionsSolved: data.questions_solved || 0,
                coins: (stored ? (JSON.parse(stored) as PilotProfile).coins : null) ?? 250,
                telegramLinked: Boolean(data.telegram_linked),
                telegramHandle: data.telegram_handle || '@statxambot',
              };
              setUser(liveProfile);
              localStorage.setItem('statxam_pilot_session', JSON.stringify(liveProfile));
              return;
            }
          } catch {
            // offline, keep cached parsed
          }

          if (stored) {
            setUser(JSON.parse(stored) as PilotProfile);
            return;
          } else if (currentSbUser) {
            const meta = currentSbUser.user_metadata || {};
            const fallbackProfile: PilotProfile = {
              id: currentSbUser.id,
              fullName: meta.full_name || currentSbUser.email?.split('@')[0] || 'Scholar',
              mobile: meta.mobile || currentSbUser.email || '',
              language: meta.language || 'english',
              targetExam: meta.target_exam || 'CBSE & Pan-India Board',
              targetInstitution: meta.target_institution || 'National Merit Rank',
              estimatedRank: 150,
              accuracy: 88.0,
              streakDays: 1,
              questionsSolved: 0,
              coins: 250,
              telegramLinked: false,
              telegramHandle: '@statxambot',
            };
            setUser(fallbackProfile);

            // Auto-provision profile in public.profiles to satisfy foreign key constraints
            Promise.resolve(
              supabase.from('profiles').upsert({
                id: currentSbUser.id,
                full_name: fallbackProfile.fullName,
                mobile: fallbackProfile.mobile,
                language: fallbackProfile.language,
                target_exam: fallbackProfile.targetExam,
                target_institution: fallbackProfile.targetInstitution,
                estimated_rank: 150,
                accuracy: 88.0,
                streak_days: 1,
                questions_solved: 0,
                telegram_linked: false,
                telegram_handle: '@statxambot',
              }, { onConflict: 'id' })
            ).catch(() => {});
            localStorage.setItem('statxam_pilot_session', JSON.stringify(fallbackProfile));
            return;
          }
        }

        // First time install or signed out: Start with NO user so scholar lands on Sign Up / Setup!
        setUser(null);
      } catch (err) {
        console.warn('[AuthGate] Failed reading stored session:', err);
        setUser(null);
      } finally {
        setLoading(false);
        hideAppSplash();
      }
    }
    fetchMe();
  }, []);

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        const liveProfile: PilotProfile = {
          id: data.id,
          fullName: data.full_name,
          mobile: data.mobile,
          targetExam: data.target_exam,
          targetInstitution: data.target_institution,
          estimatedRank: data.estimated_rank,
          accuracy: Number(data.accuracy),
          streakDays: data.streak_days,
          questionsSolved: data.questions_solved,
          coins: user.coins ?? 250,
          telegramLinked: data.telegram_linked,
          telegramHandle: data.telegram_handle,
        };
        setUser(liveProfile);
        localStorage.setItem('statxam_pilot_session', JSON.stringify(liveProfile));
      }
    } catch {
      // offline fallback
    }
  };

  const login = async (identity: string, pass: string) => {
    if (!identity || !identity.trim()) {
      return { success: false, error: 'Please enter your registered email or mobile number.' };
    }
    if (!pass || !pass.trim()) {
      return { success: false, error: 'Please enter your password.' };
    }

    setLoading(true);

    // 1. Direct Supabase Auth for email addresses (fastest & 100% native client safe)
    if (identity.includes('@')) {
      try {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: identity.trim().toLowerCase(),
          password: pass.trim(),
        });

        if (authErr) {
          return {
            success: false,
            error: authErr.message || 'Incorrect email or password. Please verify your credentials.',
          };
        }

        if (authData?.user) {
          const userId = authData.user.id;
          let dbProfile: any = null;
          try {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            dbProfile = data;
          } catch {
            // continue with metadata
          }

          const meta = authData.user.user_metadata || {};
          const clientUser: PilotProfile = {
            id: userId,
            fullName: dbProfile?.full_name || meta.full_name || authData.user.email?.split('@')[0] || 'Scholar',
            mobile: dbProfile?.mobile || meta.mobile || authData.user.email || identity.trim(),
            language: dbProfile?.language || meta.language || 'english',
            targetExam: dbProfile?.target_exam || meta.target_exam || 'CBSE & Pan-India Board',
            targetInstitution: dbProfile?.target_institution || meta.target_institution || 'National Merit Rank',
            estimatedRank: dbProfile?.estimated_rank || 150,
            accuracy: dbProfile ? Number(dbProfile.accuracy) : 88.0,
            streakDays: dbProfile?.streak_days || 1,
            questionsSolved: dbProfile?.questions_solved || 0,
            coins: 250,
            telegramLinked: Boolean(dbProfile?.telegram_linked),
            telegramHandle: dbProfile?.telegram_handle || '@statxambot',
          };

          setUser(clientUser);
          if (typeof window !== 'undefined') {
            localStorage.setItem('statxam_pilot_session', JSON.stringify(clientUser));
          }
          return { success: true };
        }
      } catch (err: any) {
        console.warn('[Auth] Direct Supabase login encountered network issue, trying API route...', err);
      }
    }

    // 2. Mobile number login or API fallback via getApiUrl
    try {
      const res = await fetch(getApiUrl('/api/auth/login/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity: identity.trim(),
          password: pass.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success || !data.user) {
        return {
          success: false,
          error: data.error || 'Authentication rejected. Please check your credentials.',
        };
      }

      const clientUser: PilotProfile = data.user;
      setUser(clientUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('statxam_pilot_session', JSON.stringify(clientUser));
      }
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Authentication failed. Please check your network and credentials.',
      };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data: Partial<PilotProfile> & { email?: string }, pass: string) => {
    if (!pass || pass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    setLoading(true);
    try {
      const targetEmail = data.email || (data.mobile && data.mobile.includes('@') ? data.mobile : '');

      let apiSuccess = false;
      let registeredUser: PilotProfile | null = null;
      let apiError = '';

      try {
        const res = await fetch(getApiUrl('/api/auth/register/'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: targetEmail,
            password: pass.trim(),
            fullName: data.fullName,
            mobile: data.mobile,
            language: data.language,
            targetExam: data.targetExam,
            targetInstitution: data.targetInstitution,
            accepted_terms_at: data.accepted_terms_at || new Date().toISOString(),
          }),
        });

        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success && json.user) {
          apiSuccess = true;
          registeredUser = json.user;
        } else {
          apiError = json.error || '';
        }
      } catch (e: any) {
        console.warn('[Signup] API route failed, attempting direct Supabase signup:', e);
      }

      if (apiSuccess && registeredUser) {
        setUser(registeredUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem('statxam_pilot_session', JSON.stringify(registeredUser));
        }
        return { success: true };
      }

      // Direct client fallback to Supabase Auth if API route is unreachable
      if (targetEmail) {
        const { data: sbData, error: sbErr } = await supabase.auth.signUp({
          email: targetEmail.toLowerCase().trim(),
          password: pass.trim(),
          options: {
            data: {
              full_name: data.fullName,
              mobile: data.mobile,
              language: data.language,
              target_exam: data.targetExam,
              target_institution: data.targetInstitution,
              accepted_terms_at: data.accepted_terms_at || new Date().toISOString(),
            },
          },
        });

        if (sbErr) {
          return { success: false, error: sbErr.message || apiError || 'Registration failed.' };
        }

        const userId = sbData.user?.id || `user-${Date.now()}`;
        const newProfile: PilotProfile = {
          id: userId,
          fullName: data.fullName || targetEmail.split('@')[0],
          mobile: data.mobile || targetEmail,
          email: targetEmail,
          language: data.language || 'english',
          targetExam: data.targetExam || 'CBSE & Pan-India Board',
          targetInstitution: data.targetInstitution || 'National Merit Rank',
          estimatedRank: 150,
          accuracy: 85.0,
          streakDays: 1,
          questionsSolved: 0,
          coins: 250,
          telegramLinked: false,
          telegramHandle: '@statxambot',
          accepted_terms_at: data.accepted_terms_at || new Date().toISOString(),
        };

        try {
          await supabase.from('profiles').upsert(
            {
              id: userId,
              full_name: newProfile.fullName,
              mobile: newProfile.mobile,
              language: newProfile.language,
              target_exam: newProfile.targetExam,
              target_institution: newProfile.targetInstitution,
              estimated_rank: newProfile.estimatedRank,
              accuracy: newProfile.accuracy,
              streak_days: newProfile.streakDays,
              questions_solved: newProfile.questionsSolved,
              telegram_linked: false,
              telegram_handle: '@statxambot',
              accepted_terms_at: newProfile.accepted_terms_at,
            },
            { onConflict: 'id' }
          );
        } catch {
          // ignore profile upsert error
        }

        setUser(newProfile);
        if (typeof window !== 'undefined') {
          localStorage.setItem('statxam_pilot_session', JSON.stringify(newProfile));
        }
        return { success: true };
      }

      return {
        success: false,
        error: apiError || 'Registration failed. Please check your details.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Account registration service error.',
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('statxam_pilot_session');
    }
    try {
      supabase.auth.signOut();
    } catch {
      // ignore
    }
  };

  const requestTelegramOtp = async (mobile: string) => {
    const res = await sendTelegramOtp(mobile);
    return {
      success: res.success,
      message: res.message,
    };
  };

  const resetPasswordViaTelegramOtp = async (otp: string, newPass: string) => {
    const res = await verifyTelegramOtpCode(user?.mobile || '+91 98765 43210', otp);
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        requestTelegramOtp,
        resetPasswordViaTelegramOtp,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
