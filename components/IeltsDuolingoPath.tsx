'use client';

import React, { useState } from 'react';
import { triggerHaptic } from '@/lib/native-permissions';
import { useAuth } from '@/lib/auth-context';

export interface IeltsUnit {
  id: string;
  unitNumber: number;
  title: string;
  description: string;
  targetBand: string;
  color: string;
  lessons: {
    id: string;
    title: string;
    type: 'reading' | 'listening' | 'writing' | 'speaking';
    status: 'completed' | 'active' | 'locked';
    xp: number;
    challenge: {
      question: string;
      passage?: string;
      type: 'true_false_not_given' | 'word_bank' | 'multiple_choice';
      options?: string[];
      wordBank?: string[];
      correctAnswer: string;
      explanation: string;
    };
  }[];
}

export const SEED_IELTS_UNITS: IeltsUnit[] = [
  {
    id: 'unit-1',
    unitNumber: 1,
    title: 'Unit 1: Academic Reading & Inference',
    description: 'Master True / False / Not Given and speed-scanning academic texts.',
    targetBand: 'Band 7.5 - 8.0',
    color: '#c2652a',
    lessons: [
      {
        id: 'u1-l1',
        title: 'True / False / Not Given Protocols',
        type: 'reading',
        status: 'completed',
        xp: 25,
        challenge: {
          passage:
            'The Sahara desert experiences extreme diurnal temperature fluctuations, often plunging from 48°C at midday to near freezing at night due to rapid heat radiation under clear skies.',
          question: 'According to the text: Daytime Sahara temperatures never exceed 45°C.',
          type: 'true_false_not_given',
          options: ['TRUE', 'FALSE', 'NOT GIVEN'],
          correctAnswer: 'FALSE',
          explanation:
            'The passage explicitly mentions temperatures often reaching 48°C at midday, contradicting the statement.',
        },
      },
      {
        id: 'u1-l2',
        title: 'Matching Headings & Topic Sentences',
        type: 'reading',
        status: 'active',
        xp: 30,
        challenge: {
          passage:
            'Urban green canopies reduce heat-island effects while absorbing particulate pollutants from automotive exhaust.',
          question: 'Assemble the optimal lexical summary for environmental mitigation:',
          type: 'word_bank',
          wordBank: ['Vegetation', 'mitigates', 'urban', 'thermal', 'pollution', 'rapidly'],
          correctAnswer: 'Vegetation mitigates urban thermal pollution',
          explanation:
            'High-scoring IELTS summaries prioritize nominalization and academic cohesion.',
        },
      },
      {
        id: 'u1-l3',
        title: 'Summary Completion Drills',
        type: 'reading',
        status: 'locked',
        xp: 35,
        challenge: {
          question: 'Which connector indicates concession in formal Task 2 essays?',
          type: 'multiple_choice',
          options: ['Notwithstanding', 'Furthermore', 'Consequently', 'Namely'],
          correctAnswer: 'Notwithstanding',
          explanation:
            '"Notwithstanding" indicates concession or contrast, fulfilling Band 8+ Lexical Resource criteria.',
        },
      },
    ],
  },
  {
    id: 'unit-2',
    unitNumber: 2,
    title: 'Unit 2: Listening & Audio Decoding',
    description: 'Decode fast Australian, British, and North American speech without losing focus.',
    targetBand: 'Band 8.0+',
    color: '#0284c7',
    lessons: [
      {
        id: 'u2-l1',
        title: 'Section 1: Number & Spelled Names',
        type: 'listening',
        status: 'locked',
        xp: 25,
        challenge: {
          question: 'In UK academic registration, "Double O" is phonetically noted as:',
          type: 'multiple_choice',
          options: ['OO', 'W', 'Zero Zero', 'Two O'],
          correctAnswer: 'OO',
          explanation:
            'British native speakers standardly dictate identical consecutive letters as "Double [letter]".',
        },
      },
      {
        id: 'u2-l2',
        title: 'Section 4: University Lecture Monologue',
        type: 'listening',
        status: 'locked',
        xp: 40,
        challenge: {
          question: 'Signpost phrases like "Turning now to our third variable" signal:',
          type: 'multiple_choice',
          options: ['A major thematic transition', 'The conclusion', 'A contradiction', 'An informal anecdote'],
          correctAnswer: 'A major thematic transition',
          explanation:
            'Signposting in Section 4 guides the candidate to the next set of fill-in items on the question sheet.',
        },
      },
    ],
  },
  {
    id: 'unit-3',
    unitNumber: 3,
    title: 'Unit 3: Writing Task 1 & Task 2 Rubrics',
    description: 'Learn Band 9 Cohesion, Task Achievement, and Lexical Variety.',
    targetBand: 'Band 8.5',
    color: '#16a34a',
    lessons: [
      {
        id: 'u3-l1',
        title: 'Task 1: Overview Statement Crafting',
        type: 'writing',
        status: 'locked',
        xp: 35,
        challenge: {
          question: 'An optimal Task 1 Overview paragraph must:',
          type: 'multiple_choice',
          options: [
            'Highlight principal trends without citing raw data figures',
            'List every individual number from the chart',
            'Give personal recommendations and opinions',
            'Copy the question prompt word-for-word',
          ],
          correctAnswer: 'Highlight principal trends without citing raw data figures',
          explanation:
            'Band 7+ criteria strictly penalize raw figure citations in the overview; save exact numbers for body paragraphs.',
        },
      },
    ],
  },
];

export function IeltsDuolingoPath() {
  const { user } = useAuth();
  const [activeChallenge, setActiveChallenge] = useState<any | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [wordBankSelection, setWordBankSelection] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [hearts, setHearts] = useState(5);
  const [streakDays] = useState(7);
  const [userCoins, setUserCoins] = useState(user?.coins ?? 250);

  const handleOpenLesson = (lesson: any) => {
    if (lesson.status === 'locked') {
      triggerHaptic('error');
      return;
    }
    triggerHaptic('medium');
    setActiveChallenge(lesson.challenge);
    setSelectedOption(null);
    setWordBankSelection([]);
    setFeedback(null);
  };

  const handleWordTileTap = (word: string) => {
    triggerHaptic('light');
    if (wordBankSelection.includes(word)) {
      setWordBankSelection(wordBankSelection.filter((w) => w !== word));
    } else {
      setWordBankSelection([...wordBankSelection, word]);
    }
  };

  const handleCheckAnswer = () => {
    if (!activeChallenge) return;

    let studentAnswer = '';
    if (activeChallenge.type === 'word_bank') {
      studentAnswer = wordBankSelection.join(' ');
    } else {
      studentAnswer = selectedOption || '';
    }

    const isCorrect = studentAnswer.trim().toLowerCase() === activeChallenge.correctAnswer.trim().toLowerCase();

    if (isCorrect) {
      triggerHaptic('success');
      setUserCoins((prev) => prev + 15);
      setFeedback({
        isCorrect: true,
        message: `Excellent! Band 8.5+ Precision. ${activeChallenge.explanation}`,
      });
    } else {
      triggerHaptic('error');
      setHearts((prev) => Math.max(0, prev - 1));
      setFeedback({
        isCorrect: false,
        message: `Not quite. Correct answer: "${activeChallenge.correctAnswer}". ${activeChallenge.explanation}`,
      });
    }
  };

  const handleCloseModal = () => {
    triggerHaptic('light');
    setActiveChallenge(null);
    setFeedback(null);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 space-y-6 select-none animate-in fade-in duration-200">
      {/* Top Duolingo-Style HUD Header */}
      <div className="bg-[#ffffff] rounded-2xl border border-[#e8dccb] p-3 shadow-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-500/10 text-orange-700 font-headline font-bold text-xs">
          <span className="text-sm">🔥</span>
          <span>{streakDays} Day Streak</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-800 font-mono font-bold text-xs">
          <span className="material-symbols-outlined text-[16px] text-amber-600">monetization_on</span>
          <span>{userCoins} Coins</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-500/10 text-red-600 font-headline font-bold text-xs">
          <span className="text-sm">❤️</span>
          <span>{hearts}/5</span>
        </div>
      </div>

      {/* Target Band Banner */}
      <div className="bg-gradient-to-r from-[#c2652a] via-[#d46d2c] to-[#a8531e] rounded-2xl p-4 text-[#faf5ee] shadow-sm flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="text-[10px] font-mono tracking-widest uppercase text-[#faf5ee]/80 font-bold">
            IELTS Academic 2026
          </span>
          <h2 className="font-headline text-lg font-extrabold">Winding Unit Path</h2>
          <p className="text-xs text-[#faf5ee]/90">Target: Band 8.5+ with instant AI scoring</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-[#faf5ee]/15 border border-[#faf5ee]/30 flex flex-col items-center justify-center shrink-0">
          <span className="text-[10px] uppercase font-mono font-bold">Target</span>
          <span className="text-sm font-black font-headline">8.5</span>
        </div>
      </div>

      {/* Winding Unit Path */}
      <div className="space-y-8 py-2">
        {SEED_IELTS_UNITS.map((unit) => (
          <div key={unit.id} className="space-y-4">
            {/* Unit Header Card */}
            <div className="bg-[#ffffff] rounded-2xl border border-[#e8dccb] p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-[#c2652a] tracking-wider">
                  {unit.targetBand}
                </span>
                <span className="text-[11px] font-headline font-semibold text-[#6e5a49]">
                  {unit.lessons.filter((l) => l.status === 'completed').length}/{unit.lessons.length} Completed
                </span>
              </div>
              <h3 className="font-headline text-base font-bold text-[#2b2118]">{unit.title}</h3>
              <p className="text-xs text-[#6e5a49]">{unit.description}</p>
            </div>

            {/* Winding Path Nodes */}
            <div className="flex flex-col items-center space-y-6 pt-2">
              {unit.lessons.map((lesson, idx) => {
                // Alternating horizontal offset for iconic Duolingo winding road
                const offsetClass =
                  idx % 3 === 0 ? 'translate-x-0' : idx % 3 === 1 ? '-translate-x-8 sm:-translate-x-12' : 'translate-x-8 sm:translate-x-12';

                return (
                  <div key={lesson.id} className={`flex flex-col items-center transition-all ${offsetClass}`}>
                    <button
                      type="button"
                      onClick={() => handleOpenLesson(lesson)}
                      disabled={lesson.status === 'locked'}
                      className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-md ${
                        lesson.status === 'completed'
                          ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-white shadow-amber-500/25 border-4 border-amber-300'
                          : lesson.status === 'active'
                          ? 'bg-gradient-to-b from-[#c2652a] to-[#a8531e] text-white shadow-[#c2652a]/35 border-4 border-[#f0a878] animate-bounce'
                          : 'bg-[#e8dccb] text-[#9c8979] border-4 border-[#d4c4b0] opacity-70 cursor-not-allowed'
                      }`}
                    >
                      {/* Active Indicator Tooltip */}
                      {lesson.status === 'active' && (
                        <div className="absolute -top-7 px-2.5 py-0.5 rounded-full bg-[#2b2118] text-[#faf5ee] text-[10px] font-headline font-bold uppercase tracking-wider shadow-sm animate-pulse whitespace-nowrap">
                          START
                        </div>
                      )}

                      <span className="material-symbols-outlined text-[26px]">
                        {lesson.status === 'completed'
                          ? 'check'
                          : lesson.status === 'active'
                          ? 'play_arrow'
                          : 'lock'}
                      </span>
                    </button>

                    <span className="text-[11px] font-headline font-bold text-[#2b2118] mt-2 text-center max-w-[130px] line-clamp-1">
                      {lesson.title}
                    </span>
                    <span className="text-[9px] font-mono text-[#6e5a49]">+{lesson.xp} XP</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Challenge Modal (Duolingo Style) */}
      {activeChallenge && (
        <div className="fixed inset-0 z-9999 bg-[#2b2118]/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#ffffff] rounded-t-[32px] sm:rounded-[32px] border border-[#e8dccb] p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom-8 duration-250 max-h-[90vh] overflow-y-auto">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-[#e8dccb]/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#c2652a] text-[20px]">
                  school
                </span>
                <span className="font-headline text-xs font-bold uppercase tracking-wider text-[#c2652a]">
                  IELTS Challenge
                </span>
              </div>
              <button onClick={handleCloseModal} className="text-[#6e5a49] hover:text-[#2b2118]">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Reading Passage Snippet (if present) */}
            {activeChallenge.passage && (
              <div className="p-3.5 rounded-2xl bg-[#f8f3ec] border border-[#e8dccb] text-xs text-[#2b2118] leading-relaxed font-body italic">
                &ldquo;{activeChallenge.passage}&rdquo;
              </div>
            )}

            {/* Question Stem */}
            <div className="space-y-1">
              <h4 className="font-headline text-base font-bold text-[#2b2118]">
                {activeChallenge.question}
              </h4>
            </div>

            {/* Challenge Type A: Multiple Choice or True / False */}
            {activeChallenge.options && (
              <div className="space-y-2.5">
                {activeChallenge.options.map((opt: string) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedOption(opt);
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left text-xs font-headline font-bold transition-all active:scale-98 ${
                      selectedOption === opt
                        ? 'bg-[#c2652a]/15 border-[#c2652a] text-[#c2652a] shadow-2xs'
                        : 'bg-[#f3ebe0]/60 border-[#e8dccb] text-[#2b2118] hover:bg-[#f3ebe0]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Challenge Type B: Word-Bank Tiles */}
            {activeChallenge.wordBank && (
              <div className="space-y-3">
                {/* Sentence Assembled Area */}
                <div className="min-h-12 p-3 rounded-2xl bg-[#f3ebe0]/80 border-2 border-dashed border-[#c2652a]/40 flex flex-wrap gap-1.5 items-center">
                  {wordBankSelection.length === 0 ? (
                    <span className="text-xs text-[#9c8979] italic font-body">
                      Tap tiles below to assemble your answer...
                    </span>
                  ) : (
                    wordBankSelection.map((w, i) => (
                      <span
                        key={i}
                        onClick={() => handleWordTileTap(w)}
                        className="px-2.5 py-1 rounded-xl bg-[#c2652a] text-[#faf5ee] text-xs font-headline font-bold shadow-2xs cursor-pointer active:scale-95 transition-transform"
                      >
                        {w}
                      </span>
                    ))
                  )}
                </div>

                {/* Available Word Tiles */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {activeChallenge.wordBank.map((word: string) => {
                    const isPicked = wordBankSelection.includes(word);
                    return (
                      <button
                        key={word}
                        type="button"
                        onClick={() => handleWordTileTap(word)}
                        disabled={isPicked}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-headline font-bold transition-all active:scale-95 shadow-2xs ${
                          isPicked
                            ? 'bg-[#e8dccb] text-transparent border-transparent cursor-not-allowed opacity-30'
                            : 'bg-[#ffffff] text-[#2b2118] border-[#e8dccb] hover:border-[#c2652a]'
                        }`}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Feedback Banner */}
            {feedback && (
              <div
                className={`p-4 rounded-2xl border text-xs space-y-1 animate-in zoom-in-95 ${
                  feedback.isCorrect
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-red-50 border-red-300 text-red-900'
                }`}
              >
                <div className="flex items-center gap-1.5 font-headline font-bold">
                  <span className="material-symbols-outlined text-[18px]">
                    {feedback.isCorrect ? 'check_circle' : 'cancel'}
                  </span>
                  <span>{feedback.isCorrect ? 'Correct! +15 Coins' : 'Incorrect'}</span>
                </div>
                <p className="leading-relaxed">{feedback.message}</p>
              </div>
            )}

            {/* Bottom Modal Actions */}
            <div className="pt-2">
              {!feedback ? (
                <button
                  type="button"
                  onClick={handleCheckAnswer}
                  className="w-full h-12 rounded-2xl bg-[#c2652a] hover:bg-[#a8531e] text-[#faf5ee] font-headline font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-98"
                >
                  Check Answer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full h-12 rounded-2xl bg-[#2b2118] hover:bg-[#1f1712] text-[#faf5ee] font-headline font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-98"
                >
                  Continue &rarr;
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
