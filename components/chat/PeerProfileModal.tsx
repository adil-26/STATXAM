'use client';

import React from 'react';
import { PilotProfile, ScholarNote } from '@/lib/types';
import { triggerHaptic } from '@/lib/native-permissions';

interface PeerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  peerUser: PilotProfile;
  isOnline: boolean;
}

export function PeerProfileModal({
  isOpen,
  onClose,
  peerUser,
  isOnline,
}: PeerProfileModalProps) {
  if (!isOpen) return null;

  // Sample peer study notes shared in their academic profile
  const sharedNotes: ScholarNote[] = [
    {
      id: 'sn-peer-1',
      studentId: peerUser.id,
      title: 'Quadratic Equation & Step Marking',
      subject: 'Mathematics',
      content:
        'Real roots exist when D = b² - 4ac ≥ 0. Quadratic formula: x = (-b ± √D) / 2a. Examiner Tip: Always write a=, b=, c= explicitly on the left margin for 1/2 step mark!',
      createdAt: 'Today, 11:20 AM',
    },
    {
      id: 'sn-peer-2',
      studentId: peerUser.id,
      title: "Snell's Law & Prism Refraction",
      subject: 'Science',
      content:
        'Refractive Index μ = sin((A + δm)/2) / sin(A/2). In CBSE/State ray diagrams, arrows indicating light ray propagation direction are strictly mandatory.',
      createdAt: 'Yesterday',
    },
    {
      id: 'sn-peer-3',
      studentId: peerUser.id,
      title: '15-Minute Reading Period Strategy',
      subject: 'Strategy & Tips',
      content:
        'Do not start solving in reading time. Identify 5-mark Section C & D questions first. Plan solution steps mentally before writing starts.',
      createdAt: '2 days ago',
    },
  ];

  const handleCopyNote = (text: string) => {
    triggerHaptic('medium');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    alert('Copied study note to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#ffffff] rounded-3xl border border-[#e8dccb] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#c2652a]/15 via-[#faf5ee] to-[#c2652a]/10 p-5 border-b border-[#e8dccb] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-[#c2652a] text-white flex items-center justify-center font-bold text-xl shadow-xs">
                {peerUser.fullName.charAt(0).toUpperCase()}
              </div>
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-[#2b2118]">
                  {peerUser.fullName}
                </h3>
                <span className="material-symbols-outlined text-[16px] text-[#c2652a]">verified</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono font-bold text-[#c2652a] bg-[#c2652a]/10 px-2 py-0.5 rounded-md border border-[#c2652a]/20">
                  @{peerUser.username || 'scholar'}
                </span>
                <span className="text-xs text-[#6e5a49]">
                  {peerUser.targetExam || 'National Board Exam'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                  }`}
                />
                <span
                  className={`text-[11px] font-semibold ${
                    isOnline ? 'text-emerald-700' : 'text-[#6e5a49]'
                  }`}
                >
                  {isOnline ? 'Active now' : 'Last seen recently'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-[#2b2118] flex items-center justify-center border border-[#e8dccb] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 bg-[#faf5ee]/40">
          {/* Quick Academic Metrics */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-white rounded-2xl border border-[#e8dccb] shadow-2xs">
              <span className="text-[10px] text-[#6e5a49] uppercase font-bold tracking-wider block">
                Merit Rank
              </span>
              <span className="font-serif text-base font-bold text-[#c2652a] mt-0.5 block">
                #{peerUser.estimatedRank || 118}
              </span>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-[#e8dccb] shadow-2xs">
              <span className="text-[10px] text-[#6e5a49] uppercase font-bold tracking-wider block">
                Accuracy
              </span>
              <span className="font-serif text-base font-bold text-[#2b2118] mt-0.5 block">
                {peerUser.accuracy || 91.2}%
              </span>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-[#e8dccb] shadow-2xs">
              <span className="text-[10px] text-[#6e5a49] uppercase font-bold tracking-wider block">
                Streak
              </span>
              <span className="font-serif text-base font-bold text-[#c2652a] mt-0.5 block">
                {peerUser.streakDays || 7} Days
              </span>
            </div>
          </div>

          {/* Academic Target */}
          <div className="p-3 bg-white rounded-2xl border border-[#e8dccb] shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#c2652a] text-[20px]">school</span>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#6e5a49] block">
                  Target Institution / Goal
                </span>
                <span className="text-xs font-semibold text-[#2b2118]">
                  {peerUser.targetInstitution || 'State Merit Board Top 100'}
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#c2652a]/10 text-[#c2652a] border border-[#c2652a]/20">
              Verified Scholar
            </span>
          </div>

          {/* Peer Study Notes Vault */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#c2652a] text-[18px]">
                  edit_note
                </span>
                <h4 className="font-serif text-sm font-bold text-[#2b2118]">
                  Notes &amp; Formulas in Profile ({sharedNotes.length})
                </h4>
              </div>
              <span className="text-[10px] text-[#6e5a49]">Public Study Vault</span>
            </div>

            <div className="space-y-2.5">
              {sharedNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-3.5 bg-white rounded-2xl border border-[#e8dccb] shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2b2118]">{note.title}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#faf5ee] border border-[#e8dccb] text-[#c2652a]">
                      {note.subject}
                    </span>
                  </div>
                  <p className="text-xs text-[#3d3024] leading-relaxed whitespace-pre-wrap font-sans">
                    {note.content}
                  </p>
                  <div className="flex items-center justify-between pt-1.5 border-t border-[#e8dccb]/50">
                    <span className="text-[10px] text-[#6e5a49]">{note.createdAt}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyNote(note.content)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#c2652a] hover:text-[#a8521e] active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-[13px]">content_copy</span>
                      <span>Copy Formula</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-[#e8dccb] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#c2652a] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#a8521e] transition-colors active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
