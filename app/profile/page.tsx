'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { triggerHaptic } from '@/lib/native-permissions';
import { clearOfflineCache } from '@/lib/supabase-service';
import { ContributePaperModal } from '@/components/ContributePaperModal';
import { getStudentCoins, getPaperContributions, PaperContribution } from '@/lib/contributions-service';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, requestTelegramOtp } = useAuth();

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

  useEffect(() => {
    const studentId = user?.id || 'scholar-allindia-01';
    setCoins(getStudentCoins(studentId));
    const allContribs = getPaperContributions();
    setMyContributions(allContribs.filter((c) => c.studentId === studentId || c.studentName === user?.fullName));

    const handleCoinsUpdated = (e: any) => {
      setCoins(getStudentCoins(studentId));
      const updatedContribs = getPaperContributions();
      setMyContributions(updatedContribs.filter((c) => c.studentId === studentId || c.studentName === user?.fullName));
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
    triggerHaptic('medium');
    const res = await requestTelegramOtp(user?.mobile || '+91 98765 43210');
    showToast(res.message);
  };

  const handleExportData = () => {
    triggerHaptic('medium');
    const studentData = {
      name: user?.fullName || 'Gurpreet Singh',
      mobile: user?.mobile || '+91 98765 43210',
      targetExam: user?.targetExam || 'PSEB Class 10',
      targetInstitution: user?.targetInstitution || 'Punjab State Merit',
      rankEstimate: user?.estimatedRank || 142,
      accuracy: `${user?.accuracy || 89.4}%`,
      streakDays: user?.streakDays || 7,
      questionsSolved: user?.questionsSolved || 1280,
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
    showToast('Student profile and study metrics exported (.json)');
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

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
            Account &amp; Settings
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5 font-body">
            Manage your student profile, board targets, offline papers, and device preferences.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed border border-primary/20 text-on-primary-fixed-variant text-xs font-bold font-label self-start sm:self-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span>Active Scholar Session</span>
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
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-surface-container border-2 border-primary/30">
                  <img
                    alt="Student Profile"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDYz7LNgDpP0_-v2fINlidy4Fj2w1pfCFUhFkd7H-89srni8b-3Wy4TDInR6TNuOn4W2Ucy1NYd9TXciooYatxltgyB40xCEyNbmxi58GG8S0vaPR7_DE_qNInL71Hb2-LwiO6cn5TorclWYzQOxb7dw-hzvfnjHjkUxer6LGSxENP6Lwe68PCeDq1_dORFT4fOMdT8RzkWk1T-4yLthvB3bSoroSolatHZd7gCXmpq"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-surface-container-lowest flex items-center justify-center border border-outline-variant/50">
                  <span className="material-symbols-outlined text-[13px] text-primary">verified</span>
                </div>
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <h2 className="font-headline text-xl font-bold text-on-surface truncate">
                  {user?.fullName || 'Gurpreet Singh'}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-primary font-label font-semibold">
                  <span className="material-symbols-outlined text-[14px]">flag</span>
                  <span className="truncate">{user?.targetExam || 'PSEB Class 10 Punjab Board'}</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container text-on-surface-variant text-xs self-start border border-outline-variant/50 font-label">
                  <span className="material-symbols-outlined text-[13px] text-primary">school</span>
                  <span className="truncate">{user?.targetInstitution || 'Target: State Top 500 Merit'}</span>
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
                  <span className="text-xs font-semibold text-on-surface font-mono">{user?.mobile || '+91 98765 43210'}</span>
                </div>
              </div>
              <span className="text-[11px] text-primary font-bold font-label">Verified</span>
            </div>

            {/* Telegram 2FA Recovery Bot Card */}
            <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[16px]">send</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface font-headline">Telegram Password Reset</h4>
                    <p className="text-[11px] text-on-surface-variant font-body">Zero email dependence, instant bot OTP</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-outline-variant/40">
                <span className="text-xs font-mono text-primary font-semibold">{user?.telegramHandle || '@statxambot'}</span>
                <button
                  onClick={handleTestOtp}
                  className="px-3 py-1 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-xs"
                >
                  Send Test OTP
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

        {/* Right Column (7 cols): Architecture, Preferences & Admin Review Link */}
        <div className="lg:col-span-7 space-y-6">
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
                  className={`relative w-11 h-6 rounded-full p-0.5 transition-colors ${toggles.focusMode ? 'bg-primary' : 'bg-surface-container-high'
                    }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${toggles.focusMode ? 'translate-x-5' : 'translate-x-0'
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
                  className={`relative w-11 h-6 rounded-full p-0.5 transition-colors ${toggles.haptics ? 'bg-primary' : 'bg-surface-container-high'
                    }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${toggles.haptics ? 'translate-x-5' : 'translate-x-0'
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
                  className={`relative w-11 h-6 rounded-full p-0.5 transition-colors ${toggles.autoDownload ? 'bg-primary' : 'bg-surface-container-high'
                    }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${toggles.autoDownload ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

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