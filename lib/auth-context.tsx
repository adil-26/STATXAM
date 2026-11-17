'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { PilotProfile } from './types';
import { hideAppSplash } from './native-permissions';
import { supabase } from './supabase';
import { sendTelegramOtp, verifyTelegramOtpCode } from './supabase-service';

interface AuthContextType {
  user: PilotProfile | null;
  loading: boolean;
  login: (phone: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: Partial<PilotProfile>, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDemo: (customProfile?: Partial<PilotProfile>) => void;
  logout: () => void;
  requestTelegramOtp: (mobile: string) => Promise<{ success: boolean; message: string }>;
  resetPasswordViaTelegramOtp: (otp: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

export const DEFAULT_DEMO_PROFILE: PilotProfile = {
  id: 'scholar-allindia-01',
  fullName: 'Aarav Sharma',
  mobile: '+91 98765 43210',
  language: 'english',
  targetExam: 'CBSE Class 10',
  targetInstitution: 'Top 500 State Merit',
  estimatedRank: 120,
  accuracy: 88.5,
  streakDays: 7,
  questionsSolved: 450,
  coins: 250,
  telegramLinked: true,
  telegramHandle: '@statxambot',
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
  loginAsDemo: () => { },
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
          // Do NOT auto-login. Start cleanly so student lands on Sign Up / Setup first!
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

  const login = async (phone: string, pass: string) => {
    setLoading(true);
    try {
      const normalizedMobile = phone.startsWith('+91') ? phone : `+91 ${phone.trim()}`;

      // 1. Try fetching existing user from Supabase
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('mobile', normalizedMobile)
          .single();

        if (!error && data) {
          const remoteProfile: PilotProfile = {
            id: data.id,
            fullName: data.full_name,
            mobile: data.mobile,
            targetExam: data.target_exam,
            targetInstitution: data.target_institution,
            estimatedRank: data.estimated_rank,
            accuracy: Number(data.accuracy),
            streakDays: data.streak_days,
            questionsSolved: data.questions_solved,
            telegramLinked: data.telegram_linked,
            telegramHandle: data.telegram_handle,
          };
          setUser(remoteProfile);
          localStorage.setItem('statxam_pilot_session', JSON.stringify(remoteProfile));
          return { success: true };
        }
      } catch {
        // remote failed, fall through to local
      }

      // 2. Local fallback
      const profile: PilotProfile = {
        ...DEFAULT_DEMO_PROFILE,
        id: `scholar-${phone.replace(/\D/g, '').slice(-4) || '01'}`,
        mobile: normalizedMobile,
      };
      setUser(profile);
      localStorage.setItem('statxam_pilot_session', JSON.stringify(profile));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Authentication rejected' };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data: Partial<PilotProfile>, pass: string) => {
    setLoading(true);
    try {
      const newProfile: PilotProfile = {
        id: `scholar-${Date.now()}`,
        fullName: data.fullName || 'New Scholar',
        mobile: data.mobile || '+91 98765 43210',
        language: data.language || 'english',
        targetExam: data.targetExam || 'CBSE Class 10',
        targetInstitution: data.targetInstitution || 'State Merit Rank',
        estimatedRank: 150,
        accuracy: 85.0,
        streakDays: 1,
        questionsSolved: 0,
        telegramLinked: true,
        telegramHandle: '@statxambot',
      };

      // Attempt remote profile insertion
      try {
        await supabase.from('profiles').insert({
          id: newProfile.id,
          full_name: newProfile.fullName,
          mobile: newProfile.mobile,
          language: newProfile.language,
          target_exam: newProfile.targetExam,
          target_institution: newProfile.targetInstitution,
          estimated_rank: newProfile.estimatedRank,
          accuracy: newProfile.accuracy,
          streak_days: newProfile.streakDays,
          questions_solved: newProfile.questionsSolved,
          telegram_linked: newProfile.telegramLinked,
          telegram_handle: newProfile.telegramHandle,
        });
      } catch (err) {
        console.warn('[Auth] Remote profile insert warning:', err);
      }

      setUser(newProfile);
      localStorage.setItem('statxam_pilot_session', JSON.stringify(newProfile));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = (customProfile?: Partial<PilotProfile>) => {
    const demo = {
      ...DEFAULT_DEMO_PROFILE,
      ...customProfile,
    };
    setUser(demo);
    if (typeof window !== 'undefined') {
      localStorage.setItem('statxam_pilot_session', JSON.stringify(demo));
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('statxam_pilot_session');
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
        loginAsDemo,
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
