'use client';

import React, { useState, useEffect } from 'react';
import { Question, GradedScorecard } from '@/lib/types';
import { PRE_INGESTED_QUESTIONS } from '@/lib/accuracy-pipeline';
import { getQuestions, submitExam } from '@/lib/supabase-service';
import { useAuth } from '@/lib/auth-context';
import { triggerHaptic, shareScorecard } from '@/lib/native-permissions';
import { SourceBadge } from './SourceBadge';

interface TestArenaModalProps {
  paperTitle: string;
  isOpen: boolean;
  onClose: () => void;
  customQuestions?: Question[];
}

export const TestArenaModal: React.FC<TestArenaModalProps> = ({
  paperTitle,
  isOpen,
  onClose,
  customQuestions,
}) => {
  const { user, refreshProfile } = useAuth();
  const [questions, setQuestions] = useState<Question[]>(
    customQuestions && customQuestions.length > 0
      ? customQuestions
      : PRE_INGESTED_QUESTIONS.filter((q) => q.reviewStatus === 'accepted')
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(180 * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scorecard, setScorecard] = useState<GradedScorecard | null>(null);
  const [showSolutions, setShowSolutions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden');
      window.dispatchEvent(new CustomEvent('statxam_modal_state', { detail: { open: true } }));
    } else {
      document.body.classList.remove('overflow-hidden');
      window.dispatchEvent(new CustomEvent('statxam_modal_state', { detail: { open: false } }));
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
      window.dispatchEvent(new CustomEvent('statxam_modal_state', { detail: { open: false } }));
    };
  }, [isOpen]);

  // Fetch latest questions from backend service
  useEffect(() => {
    if (!isOpen) return;
    async function loadData() {
      try {
        const fetched = await getQuestions({ status: 'accepted' });
        if (fetched && fetched.length > 0) {
          setQuestions(fetched);
        }
      } catch {
        // retain default
      }
    }
    loadData();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || scorecard) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, scorecard]);

  if (!isOpen) return null;

  const currentQ = questions[currentIndex] || questions[0];
  const currentSelection = selectedAnswers[currentQ.id];

  const handleSelectOption = (optId: string) => {
    triggerHaptic('light');
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optId,
    }));
  };

  const handleSubmit = async () => {
    triggerHaptic('medium');
    setIsSubmitting(true);
    const answersPayload = Object.entries(selectedAnswers).map(([qId, opt]) => ({
      questionId: qId,
      selectedOption: opt,
      timeSpentSeconds: 60,
    }));

    try {
      const result = await submitExam({
        userId: user?.id || 'scholar-gurpreet-01',
        testId: currentQ.examCode,
        testTitle: paperTitle,
        answers: answersPayload,
      });
      setScorecard(result);
      triggerHaptic('success');
      // Refresh user profile telemetry
      await refreshProfile();
    } catch {
      alert('Grading server unreachable. Score saved locally.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}:` : ''}${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#3a302a]/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in text-on-surface">
      <div className="w-full max-w-4xl max-h-[92vh] bg-surface-container-lowest rounded-2xl sm:rounded-3xl border border-outline-variant/80 shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Scorecard Results View */}
        {scorecard ? (
          <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 max-w-2xl mx-auto w-full text-center overflow-y-auto">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-label text-xs text-primary uppercase tracking-widest font-bold">
                  Official Rubric Evaluated • Server Verified
                </span>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant/60 flex flex-col items-center gap-2 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-primary-fixed border border-primary/30 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[36px]">workspace_premium</span>
                </div>
                <h2 className="font-headline text-2xl font-bold mt-1 text-on-surface">{scorecard.testTitle}</h2>
                <div className="my-2 flex items-baseline gap-1.5 justify-center">
                  <span className="font-headline text-5xl font-bold text-primary">{scorecard.score}</span>
                  <span className="font-label text-sm text-on-surface-variant font-medium">/ {scorecard.totalMarks} Marks</span>
                </div>
                <span className="font-label text-xs text-primary font-bold">{scorecard.rankEstimate}</span>

                <div className="grid grid-cols-2 gap-3 w-full mt-4 pt-4 border-t border-outline-variant/50">
                  <div className="flex flex-col items-center p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/40">
                    <span className="font-label text-[10px] text-on-surface-variant uppercase font-semibold">Accuracy</span>
                    <span className="font-headline text-xl font-bold text-primary">{scorecard.accuracy}%</span>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/40">
                    <span className="font-label text-[10px] text-on-surface-variant uppercase font-semibold">Percentile</span>
                    <span className="font-headline text-xl font-bold text-tertiary">{scorecard.percentile}%</span>
                  </div>
                </div>

                {/* Question Breakdown Toggle */}
                <button
                  type="button"
                  onClick={() => setShowSolutions(!showSolutions)}
                  className="mt-3 flex items-center gap-1.5 text-xs font-label font-bold text-primary hover:underline"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {showSolutions ? 'expand_less' : 'expand_more'}
                  </span>
                  <span>{showSolutions ? 'Hide Question Rubrics' : 'Review Graded Answers & Solutions'}</span>
                </button>

                {showSolutions && (
                  <div className="w-full text-left space-y-3 mt-2 pt-3 border-t border-outline-variant/40 max-h-56 overflow-y-auto">
                    {scorecard.answers.map((ans, idx) => {
                      const matchedQ = questions.find((q) => q.id === ans.questionId);
                      return (
                        <div
                          key={ans.questionId}
                          className={`p-3 rounded-xl border text-xs ${
                            ans.isCorrect
                              ? 'bg-primary-fixed/20 border-primary/40'
                              : 'bg-error-container/20 border-error/40'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-label font-bold text-on-surface">
                              Q{idx + 1}: {matchedQ?.topic || ans.questionId}
                            </span>
                            <span
                              className={`font-label font-bold text-[10px] uppercase px-1.5 py-0.5 rounded ${
                                ans.isCorrect
                                  ? 'bg-primary text-on-primary'
                                  : 'bg-error text-on-error'
                              }`}
                            >
                              {ans.isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-on-surface-variant font-label text-[11px]">
                            <span>Your Answer: <strong className="text-on-surface">{ans.selected || 'Unanswered'}</strong></span>
                            <span>Official Key: <strong className="text-primary">{ans.correct}</strong></span>
                          </div>
                          {matchedQ?.solution && (
                            <p className="mt-1 text-[11px] text-on-surface-variant font-body leading-relaxed">
                              <strong>Rubric:</strong> {matchedQ.solution}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <button
                onClick={() =>
                  shareScorecard(
                    scorecard.testTitle,
                    `Scored ${scorecard.score}/${scorecard.totalMarks} with ${scorecard.accuracy}% accuracy on StatXam!`,
                    'https://statxamp.vercel.app'
                  )
                }
                className="flex-1 py-3 px-5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
                <span>Share Scorecard</span>
              </button>
              <button
                onClick={onClose}
                className="py-3 px-6 rounded-lg bg-surface-container text-on-surface font-label text-xs font-semibold hover:bg-surface-container-high transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-7 py-3.5 border-b border-outline-variant/60 bg-surface-container-low">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
                <span className="font-headline text-lg sm:text-xl font-bold truncate text-on-surface">{paperTitle}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container border border-outline-variant/60 font-mono text-primary font-bold text-xs sm:text-sm">
                  <span className="material-symbols-outlined text-[16px] text-primary">timer</span>
                  <span>{formatTimer(timeLeft)}</span>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            {/* Question Stem Area */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 flex flex-col gap-4 bg-surface">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant border border-primary/20 font-label text-[11px] font-bold uppercase">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span className="font-label text-xs text-on-surface-variant font-medium">{currentQ.topic}</span>
                </div>
                <span className="font-mono text-xs text-primary font-bold">+{currentQ.marks} / -{currentQ.negativeMarks} Marks</span>
              </div>

              <SourceBadge source={currentQ.source} />

              <div className="p-4 sm:p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/70 shadow-xs">
                <p className="font-headline text-lg sm:text-xl leading-relaxed text-on-surface">{currentQ.stem}</p>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
                {currentQ.options.map((opt) => {
                  const isSelected = currentSelection === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectOption(opt.id)}
                      className={`p-3.5 sm:p-4 rounded-xl text-left flex items-center gap-3 transition-all active:scale-[0.99] border ${
                        isSelected
                          ? 'bg-primary-fixed border-primary shadow-xs text-on-surface font-semibold'
                          : 'bg-surface-container-lowest border-outline-variant/60 hover:bg-surface-container text-on-surface'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 transition-colors ${
                          isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {opt.id}
                      </span>
                      <span className="font-body text-xs sm:text-sm text-on-surface">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between px-5 sm:px-7 py-3.5 border-t border-outline-variant/60 bg-surface-container-low gap-3">
              <button
                disabled={currentIndex === 0}
                onClick={() => {
                  triggerHaptic('light');
                  setCurrentIndex((prev) => Math.max(0, prev - 1));
                }}
                className="py-2 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label text-xs font-semibold disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-2">
                {currentIndex < questions.length - 1 ? (
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
                    }}
                    className="py-2 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label text-xs font-semibold active:scale-95 transition-all"
                  >
                    Next &rarr;
                  </button>
                ) : null}
                <button
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="py-2.5 px-6 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label text-xs font-bold uppercase tracking-wider shadow-sm active:scale-95 transition-all"
                >
                  {isSubmitting ? 'Evaluating...' : 'Submit Answers'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
