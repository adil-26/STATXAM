'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { triggerHaptic } from '@/lib/native-permissions';

export type ExamMode = 'indian' | 'ielts';

interface ExamModeContextType {
  mode: ExamMode;
  setMode: (mode: ExamMode) => void;
  toggleMode: () => void;
}

const ExamModeContext = createContext<ExamModeContextType | undefined>(undefined);

export function ExamModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ExamMode>('indian');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('statxam_mode') as ExamMode | null;
      if (saved === 'indian' || saved === 'ielts') {
        setModeState(saved);
      }
    }
  }, []);

  const setMode = (newMode: ExamMode) => {
    setModeState(newMode);
    triggerHaptic('light');
    if (typeof window !== 'undefined') {
      localStorage.setItem('statxam_mode', newMode);
      window.dispatchEvent(new CustomEvent('statxam_exam_mode_changed', { detail: { mode: newMode } }));
    }
  };

  const toggleMode = () => {
    setMode(mode === 'indian' ? 'ielts' : 'indian');
  };

  return (
    <ExamModeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </ExamModeContext.Provider>
  );
}

export function useExamMode() {
  const ctx = useContext(ExamModeContext);
  if (!ctx) {
    throw new Error('useExamMode must be used inside an ExamModeProvider');
  }
  return ctx;
}
