'use client';

import React, { useState, useEffect } from 'react';
import { UserReport } from '@/lib/types';
import { triggerHaptic } from '@/lib/native-permissions';
import { getApiUrl } from '@/lib/api-config';

export default function AdminModerationPage() {
  const [activeTab, setActiveTab] = useState<'reports' | 'push'>('reports');
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'reviewed' | 'resolved' | 'dismissed'>('all');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Push broadcast state
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushUrl, setPushUrl] = useState('/');
  const [sendingPush, setSendingPush] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/admin/moderation'));
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.reports)) {
          setReports(json.reports);
        }
      }
    } catch (err) {
      console.warn('[AdminModeration] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    triggerHaptic('medium');
    try {
      const res = await fetch(getApiUrl('/api/admin/moderation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status: newStatus }),
      });
      if (res.ok) {
        showToast(`Report updated to ${newStatus}`);
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: newStatus as any } : r))
        );
      }
    } catch {
      showToast('Failed to update report');
    }
  };

  const handleSuspendUser = async (targetUserId: string, userName: string) => {
    if (!confirm(`Are you sure you want to suspend @${userName}? They will not be able to interact on the platform.`)) {
      return;
    }
    triggerHaptic('error');
    try {
      const res = await fetch(getApiUrl('/api/admin/moderation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ban', targetUserId }),
      });
      if (res.ok) {
        showToast(`Scholar @${userName} suspended successfully`);
      }
    } catch {
      showToast('Suspension action failed');
    }
  };

  const handleSendPushBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushBody.trim()) return;

    triggerHaptic('medium');
    setSendingPush(true);
    try {
      const res = await fetch(getApiUrl('/api/admin/push'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pushTitle.trim(),
          body: pushBody.trim(),
          url: pushUrl.trim(),
        }),
      });

      const json = await res.json().catch(() => ({}));
      setSendingPush(false);

      if (res.ok && json.success) {
        triggerHaptic('success');
        showToast(`Broadcast delivered to ${json.delivered} devices! (${json.failed} failed)`);
        setPushTitle('');
        setPushBody('');
      } else {
        triggerHaptic('error');
        alert(json.error || 'Failed to dispatch push broadcast');
      }
    } catch (err: any) {
      setSendingPush(false);
      alert(err?.message || 'Network error sending push');
    }
  };

  const filteredReports = reports.filter((r) => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  const openCount = reports.filter((r) => r.status === 'open').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#c2652a] text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3e342e]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#c2652a] text-2xl">gavel</span>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#faf5ee]">
              UGC Moderation &amp; Push Broadcaster
            </h1>
          </div>
          <p className="text-xs text-[#a89f97] mt-1">
            Compliant with Google Play &amp; Indus Appstore User-Generated Content safety requirements
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center bg-[#241e1b] rounded-xl p-1 border border-[#3e342e]">
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('reports');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'reports'
                ? 'bg-[#c2652a] text-[#faf5ee]'
                : 'text-[#a89f97] hover:text-[#faf5ee]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">flag</span>
            <span>UGC Reports ({openCount})</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('push');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'push'
                ? 'bg-[#c2652a] text-[#faf5ee]'
                : 'text-[#a89f97] hover:text-[#faf5ee]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">campaign</span>
            <span>Push Broadcaster</span>
          </button>
        </div>
      </div>

      {activeTab === 'reports' ? (
        /* UGC Reports Panel */
        <div className="space-y-4">
          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {(['all', 'open', 'reviewed', 'resolved', 'dismissed'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg font-medium capitalize border transition-colors ${
                  statusFilter === filter
                    ? 'bg-[#c2652a]/20 border-[#c2652a] text-[#f0a878]'
                    : 'bg-[#241e1b] border-[#3e342e] text-[#a89f97] hover:text-[#faf5ee]'
                }`}
              >
                {filter} {filter === 'open' && `(${openCount})`}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-[#a89f97]">
              <div className="w-8 h-8 border-2 border-[#c2652a] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading moderation queue...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#241e1b] border border-[#3e342e] space-y-2">
              <span className="material-symbols-outlined text-4xl text-emerald-500">verified_user</span>
              <p className="text-sm font-semibold text-[#faf5ee]">No Reports in Queue</p>
              <p className="text-xs text-[#a89f97]">All student interactions are clear and aligned with UGC safety rules.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 rounded-2xl bg-[#241e1b] border border-[#3e342e] space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          report.status === 'open'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : report.status === 'resolved'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-zinc-500/20 text-zinc-400'
                        }`}
                      >
                        {report.status}
                      </span>
                      <span className="text-[#a89f97]">
                        {new Date(report.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'reviewed')}
                        className="px-2.5 py-1 rounded-lg bg-[#302824] hover:bg-[#3d332e] text-[#faf5ee] text-[11px]"
                      >
                        Review
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'resolved')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px]"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                        className="px-2.5 py-1 rounded-lg bg-zinc-600/20 hover:bg-zinc-600/30 text-zinc-300 text-[11px]"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleSuspendUser(report.reported_user_id, report.reportedUser?.fullName || 'User')}
                        className="px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 text-[11px]"
                      >
                        Suspend User
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#1c1815] border border-[#3e342e]/60 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[#a89f97] text-[11px]">
                      <span>
                        Reporter: <strong className="text-[#faf5ee]">{report.reporter?.fullName || report.reporter_id}</strong>
                      </span>
                      <span>
                        Reported: <strong className="text-red-400">@{report.reportedUser?.fullName || report.reported_user_id}</strong>
                      </span>
                    </div>
                    <p className="text-[#f2ece4] font-medium">{report.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Push Broadcaster Panel */
        <div className="max-w-2xl bg-[#241e1b] rounded-2xl border border-[#3e342e] p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="font-headline text-lg font-bold text-[#faf5ee]">
              Broadcast FCM Push Notification
            </h2>
            <p className="text-xs text-[#a89f97] leading-relaxed">
              Dispatch high-priority push notifications to all registered Android APKs and Web PWA scholars via Firebase Cloud Messaging HTTP v1.
            </p>
          </div>

          <form onSubmit={handleSendPushBroadcast} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-[#faf5ee] uppercase tracking-wider text-[10px]">
                Notification Title
              </label>
              <input
                type="text"
                value={pushTitle}
                onChange={(e) => setPushTitle(e.target.value)}
                placeholder="e.g. CBSE 2024 Math Paper Solutions Live!"
                className="w-full bg-[#1c1815] border border-[#3e342e] rounded-xl px-3.5 py-2.5 text-xs text-[#faf5ee] focus:outline-none focus:border-[#c2652a]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[#faf5ee] uppercase tracking-wider text-[10px]">
                Message Body
              </label>
              <textarea
                value={pushBody}
                onChange={(e) => setPushBody(e.target.value)}
                placeholder="e.g. 20-year solved question papers with official step rubrics are now available in your cockpit."
                className="w-full bg-[#1c1815] border border-[#3e342e] rounded-xl px-3.5 py-2.5 text-xs text-[#faf5ee] focus:outline-none focus:border-[#c2652a] resize-none h-24"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[#faf5ee] uppercase tracking-wider text-[10px]">
                Target In-App Link (Action URL)
              </label>
              <input
                type="text"
                value={pushUrl}
                onChange={(e) => setPushUrl(e.target.value)}
                placeholder="/practice or /ai-tutor or /messages"
                className="w-full bg-[#1c1815] border border-[#3e342e] rounded-xl px-3.5 py-2.5 text-xs text-[#faf5ee] focus:outline-none focus:border-[#c2652a]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={sendingPush || !pushTitle.trim() || !pushBody.trim()}
                className="w-full py-3 rounded-xl bg-[#c2652a] hover:bg-[#a85220] text-white text-xs font-bold uppercase tracking-wider shadow-md flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.99]"
              >
                {sendingPush ? (
                  <span>Dispatching to FCM Network...</span>
                ) : (
                  <>
                    <span>Send Push Broadcast</span>
                    <span className="material-symbols-outlined text-[16px]">send</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
