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
        const stored = typeof window !== 'undefined' ? localStorage.getItem('statxam_pilot_session') : null;
        if (stored) {
          const parsed = JSON.parse(stored) as PilotProfile;
          setUser(parsed);

          // Try to sync latest stats from Supabase
          try {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', parsed.id)
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
                coins: parsed.coins ?? 250,
                telegramLinked: data.telegram_linked,
                telegramHandle: data.telegram_handle,
              };
              setUser(liveProfile);
              localStorage.setItem('statxam_pilot_session', JSON.stringify(liveProfile));
            }
          } catch {
            // offline, keep cached parsed
          }
        } else {
          // First time install or signed out: Start with NO user so scholar lands on Sign Up / Setup!
          setUser(null);
        }
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
      // Offline fallback: check if client can reach supabase directly with Supabase Auth
      try {
        if (identity.includes('@')) {
          const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
            email: identity.trim().toLowerCase(),
            password: pass.trim(),
          });
          if (!authErr && authData?.user) {
            const { data: p } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .maybeSingle();

            const clientUser: PilotProfile = {
              id: authData.user.id,
              fullName: p?.full_name || authData.user.email?.split('@')[0] || 'Scholar',
              mobile: p?.mobile || authData.user.email || identity,
              language: p?.language || 'english',
              targetExam: p?.target_exam || 'CBSE & Pan-India Board',
              targetInstitution: p?.target_institution || 'National Merit Rank',
              estimatedRank: p?.estimated_rank || 150,
              accuracy: p ? Number(p.accuracy) : 85.0,
              streakDays: p?.streak_days || 1,
              questionsSolved: p?.questions_solved || 0,
              coins: 250,
              telegramLinked: Boolean(p?.telegram_linked),
              telegramHandle: p?.telegram_handle || '@statxambot',
            };
            setUser(clientUser);
            localStorage.setItem('statxam_pilot_session', JSON.stringify(clientUser));
            return { success: true };
          }
        }
      } catch {
        // network offline
      }

      return {
        success: false,
        error: err?.message || 'Authentication failed. Please check your credentials.',
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
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.user) {
        return {
          success: false,
          error: json.error || 'Registration failed. Please check your details.',
        };
      }

      const clientUser: PilotProfile = json.user;
      setUser(clientUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('statxam_pilot_session', JSON.stringify(clientUser));
      }
      return { success: true };
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
