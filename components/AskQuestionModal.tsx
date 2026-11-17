'use client';

import React, { useState } from 'react';
import { Question } from '@/lib/types';
import { triggerHaptic } from '@/lib/native-permissions';
import { callGroqChat, getActiveGroqApiKey, getActiveGroqModel } from '@/lib/groq-service';

interface AskQuestionModalProps {
  question: Question | null;
  paperTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onNextQuestion?: () => void;
  onPrevQuestion?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  questionIndex?: number;
  totalQuestions?: number;
}

export const AskQuestionModal: React.FC<AskQuestionModalProps> = ({
  question,
  paperTitle,
  isOpen,
  onClose,
  onNextQuestion,
  onPrevQuestion,
  hasPrev = false,
  hasNext = false,
  questionIndex = 0,
  totalQuestions = 1,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isAskingAi, setIsAskingAi] = useState(false);

  // Reset local state when question changes
  React.useEffect(() => {
    setSelectedOption(null);
    setIsChecked(false);
    setShowSolution(false);
    setAiExplanation(null);
    setIsAskingAi(false);
  }, [question?.id]);

  if (!isOpen || !question) return null;

  const isCorrect = selectedOption === question.correctOption;

  const handleOptionClick = (optId: string) => {
    if (isChecked) return;
    triggerHaptic('light');
    setSelectedOption(optId);
  };

  const handleCheckAnswer = () => {
    if (!selectedOption) return;
    setIsChecked(true);
    setShowSolution(true);
    triggerHaptic(isCorrect ? 'success' : 'medium');
  };

  const handleAskAiTutor = async () => {
    triggerHaptic('medium');
    setIsAskingAi(true);
    setAiExplanation(null);

    const prompt = `You are a warm, encouraging master board exam tutor.
Explain this exact question from "${paperTitle}":
Question: ${question.stem}
Options: ${question.options.map((o) => `${o.id}: ${o.text}`).join(' | ')}
Official Answer: Option ${question.correctOption}
Official Marking Scheme: ${question.solution}

Please provide:
1. Direct Explanation: Why Option ${question.correctOption} is correct in simple terms.
2. Step-by-Step Marking Rubric: Exactly how an examiner awards the ${question.marks} marks.
3. Common Pitfalls / Tips: What mistake students often make in this question.
Keep your response concise, clear, and structured in 3 bulleted sections.`;

    try {
      const response = await callGroqChat({
        messages: [{ role: 'user', content: prompt }],
        apiKey: getActiveGroqApiKey(),
        model: getActiveGroqModel(),
        temperature: 0.2,
        maxTokens: 1000,
      });
      setAiExplanation(response);
      triggerHaptic('success');
    } catch (err: any) {
      setAiExplanation(
        `AI Tutor Note: Option ${question.correctOption} is verified correct according to the official board answer key. Step rubric: ${question.solution}`
      );
    } finally {
      setIsAskingAi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#1c1815] border border-[#3e342e] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-[#241e1b] border-b border-[#3e342e] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#c2652a]/20 border border-[#c2652a]/40 text-[#f0a878] flex items-center justify-center font-bold text-xs font-mono">
              Q{questionIndex + 1}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#faf5ee]">
                  Question {questionIndex + 1} of {totalQuestions}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                  {question.marks} Marks
                </span>
              </div>
              <p className="text-[11px] text-[#a89f97] truncate max-w-sm">
                {paperTitle} • {question.topic}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#1c1815] hover:bg-[#342b26] border border-[#3e342e] text-[#a89f97] hover:text-[#faf5ee] flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Scrollable Question Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Question Stem */}
          <div className="p-4 rounded-2xl bg-[#241e1b] border border-[#342b26] space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#f0a878]">
              {question.id} • Section: {question.topic}
            </span>
            <p className="font-body text-sm sm:text-base text-[#faf5ee] leading-relaxed select-text">
              {question.stem}
            </p>
          </div>

          {/* Interactive Options */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#cec6be] font-semibold flex items-center justify-between">
              <span>Select Your Answer:</span>
              {isChecked && (
                <span
                  className={`text-[10px] font-bold ${
                    isCorrect ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isCorrect ? '✓ Correct Choice!' : '✕ Incorrect Choice'}
                </span>
              )}
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              {question.options.map((opt) => {
                const isSelected = selectedOption === opt.id;
                const isActualCorrect = opt.id === question.correctOption;

                let stateClasses =
                  'bg-[#241e1b] border-[#3e342e] text-[#cec6be] hover:border-[#c2652a]/60 hover:text-[#faf5ee]';

                if (isSelected && !isChecked) {
                  stateClasses = 'bg-[#c2652a]/20 border-[#c2652a] text-[#faf5ee] font-semibold';
                } else if (isChecked) {
                  if (isActualCorrect) {
                    stateClasses =
                      'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)]';
                  } else if (isSelected && !isCorrect) {
                    stateClasses = 'bg-rose-950/60 border-rose-500 text-rose-200 font-bold';
                  } else {
                    stateClasses = 'bg-[#1c1815] border-[#2e2622] text-[#78706a] opacity-60';
                  }
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isChecked}
                    onClick={() => handleOptionClick(opt.id)}
                    className={`p-3 sm:p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${stateClasses}`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                        isSelected && !isChecked
                          ? 'bg-[#c2652a] text-white'
                          : isChecked && isActualCorrect
                          ? 'bg-emerald-500 text-black'
                          : isChecked && isSelected
                          ? 'bg-rose-500 text-white'
                          : 'bg-[#1c1815] text-[#a89f97] border border-[#3e342e]'
                      }`}
                    >
                      {opt.id}
                    </span>
                    <span className="text-xs sm:text-sm font-body leading-relaxed flex-1">
                      {opt.text}
                    </span>
                    {isChecked && isActualCorrect && (
                      <span className="material-symbols-outlined text-emerald-400 text-[18px]">
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Check Answer / Toggle Solution */}
          {!isChecked ? (
            <button
              type="button"
              disabled={!selectedOption}
              onClick={handleCheckAnswer}
              className="w-full py-3 rounded-xl bg-[#c2652a] hover:bg-[#a85220] disabled:opacity-40 text-[#faf5ee] text-xs font-bold font-mono uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">done_all</span>
              <span>Submit &amp; Check Answer</span>
            </button>
          ) : (
            <div className="space-y-4 animate-in fade-in">
              {/* Step Rubric Box */}
              <div className="p-4 rounded-2xl bg-[#241e1b] border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>Official Step-by-Step Marking Rubric</span>
                  </span>
                  <span className="text-[#a89f97]">Award: {question.marks} Marks</span>
                </div>
                <p className="text-xs font-mono text-[#faf5ee] leading-relaxed whitespace-pre-wrap">
                  {question.solution}
                </p>
              </div>

              {/* Ask AI Doubt Tutor Button & Output */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleAskAiTutor}
                  disabled={isAskingAi}
                  className="w-full py-2.5 rounded-xl bg-[#2e2622] hover:bg-[#382f2a] border border-[#f0a878]/40 text-[#f0a878] text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  {isAskingAi ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#f0a878] border-t-transparent rounded-full animate-spin" />
                      <span>Asking AI Doubt Tutor...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">psychology</span>
                      <span>Ask AI Tutor to Explain This Question Step-by-Step</span>
                    </>
                  )}
                </button>

                {aiExplanation && (
                  <div className="p-4 rounded-2xl bg-[#14110f] border border-[#483d37] space-y-2 text-xs font-body animate-in zoom-in-95">
                    <div className="flex items-center gap-1.5 text-[#f0a878] font-mono text-[11px] font-bold">
                      <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                      <span>AI Doubt Tutor Explanation:</span>
                    </div>
                    <div className="text-[#faf5ee] text-xs leading-relaxed whitespace-pre-line font-body select-text">
                      {aiExplanation}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-3 sm:p-4 bg-[#241e1b] border-t border-[#3e342e] flex items-center justify-between shrink-0">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => {
              triggerHaptic('light');
              onPrevQuestion?.();
            }}
            className="px-3.5 py-2 rounded-xl bg-[#1c1815] hover:bg-[#2e2622] disabled:opacity-30 text-[#cec6be] text-xs font-mono flex items-center gap-1.5 border border-[#3e342e] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Previous</span>
          </button>

          <span className="text-[11px] font-mono text-[#a89f97]">
            {questionIndex + 1} / {totalQuestions}
          </span>

          <button
            type="button"
            disabled={!hasNext}
            onClick={() => {
              triggerHaptic('light');
              onNextQuestion?.();
            }}
            className="px-3.5 py-2 rounded-xl bg-[#c2652a] hover:bg-[#a85220] disabled:opacity-30 text-[#faf5ee] text-xs font-mono font-bold flex items-center gap-1.5 shadow-md transition-colors"
          >
            <span>Next</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
