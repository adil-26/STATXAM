'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { triggerHaptic } from '@/lib/native-permissions';
import { clearOfflineCache } from '@/lib/supabase-service';
import { ContributePaperModal } from '@/components/ContributePaperModal';
import { getStudentCoins, getPaperContributions, PaperContribution } from '@/lib/contributions-service';
import { ScholarNote } from '@/lib/types';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, logout, requestTelegramOtp } = useAuth();

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [cacheSize, setCacheSize] = useState('12.4 MB');
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [coins, setCoins] = useState(250);
  const [myContributions, setMyContributions] = useState<PaperContribution[]>([]);
  const [toggles, setToggles] = useState({
    focusMode: false,
    haptics: true,
    autoDownload: true,
  });

  // Scholar Study Notes & Revision Vault State
  const [notes, setNotes] = useState<ScholarNote[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteSubject, setNewNoteSubject] = useState('Mathematics');
  const [newNoteContent, setNewNoteContent] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Load coins, contributions, and scholar study notes
  useEffect(() => {
    if (!user) return;
    const studentId = user.id;
    setCoins(getStudentCoins(studentId));
    const allContribs = getPaperContributions();
    setMyContributions(allContribs.filter((c) => c.studentId === studentId || c.studentName === user.fullName));

    // Load scholar study notes from localStorage
    const savedNotesKey = `statxam_scholar_notes_${studentId}`;
    try {
      const stored = localStorage.getItem(savedNotesKey);
      if (stored) {
        setNotes(JSON.parse(stored));
      } else {
        // Seed default high-yield notes for board exams & IELTS
        const defaultNotes: ScholarNote[] = [
          {
            id: `note-${Date.now()}-1`,
            studentId,
            title: 'Quadratic Equation & Step Marking Rules',
            subject: 'Mathematics',
            content:
              'Standard form: ax² + bx + c = 0.\nDiscriminant D = b² - 4ac.\n• D > 0: Two distinct real roots\n• D = 0: Two equal real roots (x = -b / 2a)\n• D < 0: No real roots (complex roots in Class 11)\nQuadratic Formula: x = (-b ± √D) / (2a).\nStep Marking: Always write a=, b=, c= values explicitly on the first step for 1/2 mark!',
            createdAt: new Date().toLocaleDateString(),
          },
          {
            id: `note-${Date.now()}-2`,
            studentId,
            title: "Snell's Law & Prism Refraction",
            subject: 'Science',
            content:
              'Snell\'s Law: sin(i) / sin(r) = μ₂ / μ₁ = constant.\nPrism Formula: μ = sin((A + δm) / 2) / sin(A / 2).\nWhere A = Angle of Prism, δm = Minimum Deviation Angle.\nExaminer Tip: On all ray diagrams, directional arrows on incident, refracted, and emergent rays are mandatory.',
            createdAt: new Date().toLocaleDateString(),
          },
          {
            id: `note-${Date.now()}-3`,
            studentId,
            title: '15-Minute Reading Period Strategy',
            subject: 'Strategy & Tips',
            content:
              '• 0-5 mins: Skim the question paper to gauge difficulty distribution.\n• 5-15 mins: Plan solution steps for Section C (3-mark) and Section D (5-mark) questions.\n• Solve highest-weightage numerical problems first while concentration is highest.',
            createdAt: new Date().toLocaleDateString(),
          },
        ];
        setNotes(defaultNotes);
        localStorage.setItem(savedNotesKey, JSON.stringify(defaultNotes));
      }
    } catch {
      // LocalStorage error fallback
    }

    const handleCoinsUpdated = (e: any) => {
      setCoins(getStudentCoins(studentId));
      const updatedContribs = getPaperContributions();
      setMyContributions(updatedContribs.filter((c) => c.studentId === studentId || c.studentName === user.fullName));
    };

    window.addEventListener('statxam_coins_updated', handleCoinsUpdated);
    window.addEventListener('statxam_contributions_updated', handleCoinsUpdated);

    return () => {
      window.removeEventListener('statxam_coins_updated', handleCoinsUpdated);
      window.removeEventListener('statxam_contributions_updated', handleCoinsUpdated);
    };
  }, [user]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  };

  const handleToggle = (key: keyof typeof toggles) => {
    triggerHaptic('light');
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTestOtp = async () => {
    if (!user) return;
    triggerHaptic('medium');
    const res = await requestTelegramOtp(user.mobile);
    showToast(res.message);
  };

  // Study Notes Handlers
  const handleSaveNewNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newNoteTitle.trim() || !newNoteContent.trim()) return;

    triggerHaptic('success');
    const newNote: ScholarNote = {
      id: `note-${Date.now()}`,
      studentId: user.id,
      title: newNoteTitle.trim(),
      subject: newNoteSubject,
      content: newNoteContent.trim(),
      createdAt: new Date().toLocaleDateString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    try {
      localStorage.setItem(`statxam_scholar_notes_${user.id}`, JSON.stringify(updated));
    } catch {}

    setNewNoteTitle('');
    setNewNoteContent('');
    setShowAddNoteModal(false);
    showToast('Revision note saved to your Scholar Vault!');
  };

  const handleDeleteNote = (noteId: string) => {
    if (!user) return;
    triggerHaptic('medium');
    const updated = notes.filter((n) => n.id !== noteId);
    setNotes(updated);
    try {
      localStorage.setItem(`statxam_scholar_notes_${user.id}`, JSON.stringify(updated));
    } catch {}
    showToast('Revision note deleted.');
  };

  const handleCopyNote = (content: string) => {
    triggerHaptic('medium');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(content);
    }
    showToast('Study note / formula copied to clipboard!');
  };

  const filteredNotes = notes.filter((note) => {
    const matchesSubject = selectedSubject === 'All' || note.subject === selectedSubject;
    const matchesQuery =
      searchQuery.trim() === '' ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesQuery;
  });

  const handleExportData = () => {
    if (!user) return;
    triggerHaptic('medium');
    const studentData = {
      name: user.fullName,
      mobile: user.mobile,
      targetExam: user.targetExam,
      targetInstitution: user.targetInstitution,
      rankEstimate: user.estimatedRank,
      accuracy: `${user.accuracy}%`,
      streakDays: user.streakDays,
      questionsSolved: user.questionsSolved,
      lastSeenAt: user.last_seen_at || new Date().toISOString(),
      scholarNotes: notes,
      activePlugins: [
        '@capacitor/camera',
        '@capacitor/keyboard',
        '@capacitor/splash-screen',
        '@capacitor/status-bar',
        '@capacitor/share',
        '@capacitor/network',
        '@capacitor/haptics',
        '@capacitor/device',
      ],
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(studentData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statxam_student_profile_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Student profile, study metrics, and revision notes exported (.json)');
  };

  const handleClearCache = () => {
    triggerHaptic('heavy');
    clearOfflineCache();
    setCacheSize('0.0 MB');
    showToast('Local offline cache cleared (12.4 MB freed)');
  };

  const handleSignOut = () => {
    triggerHaptic('heavy');
    logout();
    router.push('/auth/login');
  };

  if (loading || !user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-label uppercase tracking-widest text-primary font-bold">
          Authenticating Scholar Profile...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-6 space-y-6">
      {/* Page Header with Real-Time Online Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
            Account &amp; Settings
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5 font-body">
            Manage your student profile, revision notes, board targets, offline papers, and device preferences.
          </p>
        </div>

        {/* Live Online & Synced Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 text-xs font-bold font-label self-start sm:self-auto shadow-2xs">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span>Online &amp; Synced (Live Vault v2.4)</span>
        </div>
      </div>

      {/* Responsive 12-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Profile & Security */}
        <div className="lg:col-span-5 space-y-6">
          {/* Profile Card */}
          <div className="bg-surface-container-low border border-outline-variant/60 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-surface-container border-2 border-primary/30 flex items-center justify-center font-bold text-2xl text-primary">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'S'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-surface-container-lowest flex items-center justify-center border border-outline-variant/50">
                  <span className="material-symbols-outlined text-[13px] text-primary">verified</span>
                </div>
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <h2 className="font-headline text-xl font-bold text-on-surface truncate">
                  {user.fullName}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-primary font-label font-semibold">
                  <span className="material-symbols-outlined text-[14px]">flag</span>
                  <span className="truncate">{user.targetExam || 'National Board Exam'}</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container text-on-surface-variant text-xs self-start border border-outline-variant/50 font-label">
                  <span className="material-symbols-outlined text-[13px] text-primary">school</span>
                  <span className="truncate">{user.targetInstitution || 'Target: Merit Rank'}</span>
                </div>

                {/* Live Activity & Last Seen Indicator */}
                <div className="flex items-center gap-2 mt-2.5 text-[11px]">
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active Now</span>
                  </span>
                  <span className="text-on-surface-variant">
                    Last active: Just now
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-outline-variant/50 text-center font-label">
              <div className="bg-surface-container-lowest rounded-xl p-2.5 border border-outline-variant/40">
                <span className="text-[10px] text-on-surface-variant uppercase font-semibold block">State Rank</span>
                <span className="font-headline text-base font-bold text-primary mt-0.5 block">
                  #{user?.estimatedRank || 142}
                </span>
              </div>
              <div className="bg-surface-container-lowest rounded-xl p-2.5 border border-outline-variant/40">
                <span className="text-[10px] text-on-surface-variant uppercase font-semibold block">Accuracy</span>
                <span className="font-headline text-base font-bold text-on-surface mt-0.5 block">
                  {user?.accuracy || 89.4}%
                </span>
              </div>
              <div className="bg-surface-container-lowest rounded-xl p-2.5 border border-outline-variant/40">
                <span className="text-[10px] text-on-surface-variant uppercase font-semibold block">Streak</span>
                <span className="font-headline text-base font-bold text-primary mt-0.5 block">
                  {user?.streakDays || 7} Days
                </span>
              </div>
            </div>
          </div>

          {/* Scholar Reward Wallet & Bounty Contributions Card */}
          <div className="bg-surface-container-low border border-outline-variant/60 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">toll</span>
                <h3 className="font-headline text-lg font-bold text-on-surface">Scholar Wallet &amp; Bounties</h3>
              </div>
              <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                <span>🪙</span>
                <span>{coins} Coins</span>
              </span>
            </div>

            <p className="text-xs text-on-surface-variant font-body">
              Contribute missing past year question papers to our 20-year catalog. Earn <strong>+150 Coins</strong> for every paper approved by administrators!
            </p>

            <button
              onClick={() => {
                triggerHaptic('medium');
                setShowContributeModal(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-label font-bold uppercase tracking-wider transition-all shadow-xs active:scale-98"
            >
              <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
              <span>Check Vault &amp; Upload Missing Paper</span>
            </button>

            {/* My Contributions List */}
            <div className="space-y-2 pt-2 border-t border-outline-variant/50">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold font-label uppercase text-on-surface-variant">
                  My Paper Contributions ({myContributions.length})
                </span>
                <span className="text-[10px] text-on-surface-variant font-mono">Bounty Status</span>
              </div>

              {myContributions.length === 0 ? (
                <p className="text-[11px] text-on-surface-variant italic py-1">
                  No paper contributions yet. Search the archive and upload missing years to earn coins!
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {myContributions.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/60 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-on-surface truncate">
                          {c.boardCode} {c.classLevel} {c.subject} ({c.year})
                        </p>
                        <p className="text-[10px] text-on-surface-variant truncate">
                          {c.paperSet || 'Standard'} • {new Date(c.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {c.status === 'approved' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            +150 Coins
                          </span>
                        ) : c.status === 'rejected' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
                            Rejected
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            Pending Review
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Account Security & Password Recovery */}
          <div className="bg-surface-container-low border border-outline-variant/60 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">lock_reset</span>
                <h3 className="font-headline text-lg font-bold text-on-surface">Security &amp; Recovery</h3>
              </div>
              <span className="text-xs text-primary font-bold font-label bg-primary-fixed px-2 py-0.5 rounded-full border border-primary/20">
                OTP Active
              </span>
            </div>

            {/* Phone Number */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">smartphone</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-on-surface-variant font-label font-medium">Registered Mobile</span>
                  <span className="text-xs font-semibold text-on-surface font-mono">{user.mobile}</span>
                </div>
              </div>
              <span className="text-[11px] text-primary font-bold font-label">Verified</span>
            </div>

            {/* Telegram 2FA Recovery Bot Card */}
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/60 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface font-headline">Telegram Account Link</h4>
                    <p className="text-[11px] text-on-surface-variant font-body">1-Tap OTP login &amp; fast password reset</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-label bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Linked</span>
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-primary">{user?.telegramHandle || '@statxambot'}</span>
                <span className="text-[10px] text-on-surface-variant font-mono">ID: tg-{user?.id?.slice(0, 8) || 'verified'}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-outline-variant/40">
                <a
                  href={`https://t.me/statxambot?start=link_${user?.id || 'session'}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => triggerHaptic('medium')}
                  className="py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/60 text-on-surface text-xs font-label font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-primary">open_in_new</span>
                  <span>Open Bot</span>
                </a>
                <button
                  type="button"
                  onClick={handleTestOtp}
                  className="py-2 px-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-2xs flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px]">sms</span>
                  <span>Test OTP</span>
                </button>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleExportData}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/60 text-on-surface text-xs font-label font-semibold transition-all active:scale-98 shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">download_for_offline</span>
              <span>Export Performance &amp; Study History (.json)</span>
            </button>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-error-container/40 hover:bg-error-container text-error border border-error/30 text-xs font-label font-bold uppercase tracking-wider transition-all active:scale-98"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>Sign Out of StatXam</span>
            </button>
          </div>
        </div>

        {/* Right Column (7 cols): Study Notes Vault, Architecture, Preferences & Admin Review Link */}
        <div className="lg:col-span-7 space-y-6">
          {/* Scholar Study Notes & Chapter Revision Vault */}
          <div className="bg-surface-container-low border border-outline-variant/60 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">edit_note</span>
                </div>
                <div>
                  <h3 className="font-headline text-lg font-bold text-on-surface">
                    Scholar Revision Vault &amp; Notes
                  </h3>
                  <p className="text-[11px] text-on-surface-variant font-body">
                    All chapter cheat-sheets, formulas, and examiner tips saved in your profile
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setShowAddNoteModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold font-label transition-all shadow-xs active:scale-95 self-start sm:self-auto"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Add Note</span>
              </button>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {['All', 'Mathematics', 'Science', 'Strategy & Tips', 'General'].map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedSubject(sub);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-label font-bold transition-all shrink-0 ${
                      selectedSubject === sub
                        ? 'bg-primary text-on-primary shadow-2xs'
                        : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-outline-variant/50'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search formulas, concepts, or chapter topics..."
                  className="w-full pl-9 pr-4 py-2 bg-surface-container-lowest rounded-xl border border-outline-variant/60 text-xs text-on-surface focus:outline-none focus:border-primary font-body"
                />
              </div>
            </div>

            {/* Notes List */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {filteredNotes.length === 0 ? (
                <div className="text-center py-8 text-on-surface-variant space-y-2 bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-4">
                  <span className="material-symbols-outlined text-3xl text-primary/60">note_stack</span>
                  <p className="text-xs font-bold text-on-surface">No revision notes found</p>
                  <p className="text-[11px]">
                    Click &ldquo;Add Note&rdquo; above to save your first formula or chapter concept!
                  </p>
                </div>
              ) : (
                filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/60 space-y-2.5 shadow-2xs transition-all hover:border-primary/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-on-surface font-headline leading-tight">
                          {note.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                            {note.subject}
                          </span>
                          <span className="text-[10px] text-on-surface-variant font-mono">
                            {note.createdAt}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyNote(note.content)}
                          title="Copy Note Content"
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">content_copy</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          title="Delete Note"
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-surface-container/50 rounded-lg border border-outline-variant/30 text-xs text-on-surface leading-relaxed whitespace-pre-wrap font-sans">
                      {note.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Architecture & Native Shell Details */}
          <div className="bg-surface-container-low border border-outline-variant/60 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">devices</span>
                <h3 className="font-headline text-lg font-bold text-on-surface">App Architecture &amp; Offline Shell</h3>
              </div>
              <span className="text-xs font-mono text-on-surface-variant bg-surface-container px-2 py-0.5 rounded border border-outline-variant/50">
                Capacitor 8
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/60 flex flex-col shadow-xs">
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-label font-semibold">
                  Shell Runtime
                </span>
                <span className="text-xs font-bold text-on-surface mt-0.5 font-headline">StatXam Android v2.4.0</span>
                <span className="text-[11px] text-primary mt-1 flex items-center gap-1 font-label font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Bundled Offline APK Shell
                </span>
              </div>
              <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/60 flex flex-col shadow-xs">
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-label font-semibold">
                  Remote Backend &amp; DB
                </span>
                <span className="text-xs font-bold text-on-surface mt-0.5 truncate font-headline">Supabase Cloud</span>
                <span className="text-[11px] text-on-surface-variant mt-1 truncate font-mono">statxam.vercel.app/api</span>
              </div>
            </div>

            {/* AI Neural Launch Animation Trigger */}
            <button
              onClick={() => {
                triggerHaptic('medium');
                window.dispatchEvent(new CustomEvent('statxam_replay_ai_intro'));
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-primary/15 via-[#f0a878]/15 to-primary/15 hover:from-primary/25 hover:to-primary/25 text-primary border border-primary/30 text-xs font-headline font-bold transition-all active:scale-98 shadow-2xs"
            >
              <span className="material-symbols-outlined text-[18px]">psychology</span>
              <span>Replay AI Neural Launch Intro</span>
            </button>

            {/* Offline Storage Cache */}
            <div className="bg-surface-container-lowest rounded-xl p-3.5 border border-outline-variant/60 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">folder_zip</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface font-headline">Offline Question Bank &amp; Papers</span>
                  <span className="text-[11px] text-on-surface-variant font-body">10 Punjab Board Papers cached locally</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-primary font-mono">{cacheSize}</span>
                <button
                  onClick={handleClearCache}
                  className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-label font-semibold transition-all"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Active Native Plugins */}
            <div className="space-y-2 pt-1 border-t border-outline-variant/40">
              <span className="text-xs text-on-surface-variant font-label font-medium">
                Installed Native Feature Plugins
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: '@capacitor/camera', desc: 'Camera & OCR' },
                  { name: '@capacitor/keyboard', desc: 'Keyboard Insets' },
                  { name: '@capacitor/splash-screen', desc: 'Branded Launch' },
                  { name: '@capacitor/status-bar', desc: 'Theme Overlay' },
                  { name: '@capacitor/share', desc: 'Scorecard Share' },
                  { name: '@capacitor/network', desc: 'Offline Watcher' },
                  { name: '@capacitor/haptics', desc: 'Touch Feedback' },
                  { name: '@capacitor/device', desc: 'Device Specs' },
                ].map((plugin) => (
                  <span
                    key={plugin.name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container border border-outline-variant/60 text-xs text-on-surface"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="font-mono text-[11px]">{plugin.name}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Admin Portal Navigation Card */}
            <Link
              href="/admin"
              className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/60 hover:border-primary/50 transition-all group shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary-fixed text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors font-headline">
                    Administrator Command Portal
                  </h4>
                  <p className="text-[11px] text-on-surface-variant font-body">
                    Drive PDF Ingestion, Groq AI Synthesizer, Question Review &amp; Telegram 2FA
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-primary text-[18px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </Link>
          </div>

          {/* Study Preferences */}
          <div className="bg-surface-container-low border border-outline-variant/60 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
              <h3 className="font-headline text-lg font-bold text-on-surface">Study Preferences</h3>
            </div>

            <div className="flex flex-col divide-y divide-outline-variant/40">
              {/* Focus Mode */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-container text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">center_focus_strong</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-on-surface font-headline">Deep Focus Study Mode</h4>
                    <p className="text-[11px] text-on-surface-variant font-body">Minimal distraction timer and HUD</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('focusMode')}
                  className={`relative w-11 h-6 rounded-full p-0.5 transition-colors ${
                    toggles.focusMode ? 'bg-primary' : 'bg-surface-container-high'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${
                      toggles.focusMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Haptics */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-container text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">vibration</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-on-surface font-headline">Haptic Touch Feedback</h4>
                    <p className="text-[11px] text-on-surface-variant font-body">Tactile confirmation on MCQ option selection</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('haptics')}
                  className={`relative w-11 h-6 rounded-full p-0.5 transition-colors ${
                    toggles.haptics ? 'bg-primary' : 'bg-surface-container-high'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${
                      toggles.haptics ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Auto Download Papers */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-container text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">cloud_sync</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-on-surface font-headline">Auto-Cache Papers on Wi-Fi</h4>
                    <p className="text-[11px] text-on-surface-variant font-body">Automatically cache new official board papers for offline study</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('autoDownload')}
                  className={`relative w-11 h-6 rounded-full p-0.5 transition-colors ${
                    toggles.autoDownload ? 'bg-primary' : 'bg-surface-container-high'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${
                      toggles.autoDownload ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Study Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#e8dccb] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">post_add</span>
                <h3 className="font-headline text-lg font-bold text-on-surface">Add Revision Note</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddNoteModal(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveNewNote} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                  Topic / Title
                </label>
                <input
                  type="text"
                  required
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="e.g. Real Numbers &amp; Fundamental Theorem of Arithmetic"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/60 text-xs text-on-surface focus:outline-none focus:border-primary font-body"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                  Subject Category
                </label>
                <select
                  value={newNoteSubject}
                  onChange={(e) => setNewNoteSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/60 text-xs text-on-surface focus:outline-none focus:border-primary font-body"
                >
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science (Physics / Chem / Bio)</option>
                  <option value="English">English / IELTS</option>
                  <option value="Strategy & Tips">Strategy &amp; Exam Tips</option>
                  <option value="General">General Revision</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                  Formula / Core Notes / Examiner Tips
                </label>
                <textarea
                  required
                  rows={4}
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Write formulas, key steps, or critical board examiner warnings..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/60 text-xs text-on-surface focus:outline-none focus:border-primary font-body"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant/60 text-xs font-bold text-on-surface-variant hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold uppercase tracking-wider hover:bg-primary/90 shadow-xs active:scale-95 transition-all"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribute Paper Modal */}
      <ContributePaperModal
        isOpen={showContributeModal}
        onClose={() => setShowContributeModal(false)}
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full bg-[#3a302a] text-[#faf5ee] shadow-xl flex items-center gap-2 text-xs font-label z-50 animate-fade-in border border-outline-variant/30">
          <span className="material-symbols-outlined text-[16px] text-primary-fixed-dim">info</span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
