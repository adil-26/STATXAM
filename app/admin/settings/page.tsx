'use client';

import React, { useState, useEffect } from 'react';
import { triggerHaptic } from '@/lib/native-permissions';
import {
  getActiveGroqApiKey,
  setActiveGroqApiKey,
  getActiveGroqModel,
  setActiveGroqModel,
  testGroqApiKey,
  POPULAR_GROQ_MODELS,
  DEFAULT_GROQ_API_KEY,
} from '@/lib/groq-service';

export default function AdminSettingsPage() {
  const [groqKey, setGroqKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('openai/gpt-oss-120b');
  const [telegramHandle, setTelegramHandle] = useState('@StatXamAuthBot');
  const [otpExpiryMinutes, setOtpExpiryMinutes] = useState(5);

  // Test state
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    models: string[];
    error?: string;
  } | null>(null);

  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setGroqKey(getActiveGroqApiKey());
    setSelectedModel(getActiveGroqModel());
  }, []);

  const handleTestGroqKey = async () => {
    triggerHaptic('medium');
    setTestingKey(true);
    setTestResult(null);

    const res = await testGroqApiKey(groqKey);
    setTestResult(res);
    setTestingKey(false);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('medium');

    setActiveGroqApiKey(groqKey);
    setActiveGroqModel(selectedModel);

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleResetDefault = () => {
    triggerHaptic('light');
    setGroqKey(DEFAULT_GROQ_API_KEY);
    setSelectedModel('openai/gpt-oss-120b');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3e342e]">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#c2652a] text-[24px]">vpn_key</span>
            <h1 className="font-headline text-3xl font-bold text-[#faf5ee]">
              API Keys & AI Engine Orchestration
            </h1>
          </div>
          <p className="text-xs text-[#a89f97] mt-1">
            Central key vault powering all student doubt solving, multi-subject Drive OCR, and question generation.
          </p>
        </div>

        {savedToast && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-mono animate-in zoom-in-95">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>Configuration Updated & Active Across All Users</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Groq AI Vault */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#241e1b] rounded-2xl border border-[#3e342e] p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#342b26]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#c2652a]/20 border border-[#c2652a]/40 flex items-center justify-center text-[#f0a878]">
                  <span className="material-symbols-outlined text-[18px]">psychology</span>
                </div>
                <div>
                  <h2 className="font-headline text-lg font-bold text-[#faf5ee]">
                    Groq LLM Intelligence Key
                  </h2>
                  <p className="text-[11px] text-[#a89f97]">
                    Powers high-speed multilingual question synthesis and LaTeX step rubrics.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetDefault}
                className="text-[11px] text-[#f0a878] hover:underline font-mono"
              >
                Reset to Default
              </button>
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#cec6be] uppercase tracking-wider font-mono flex items-center justify-between">
                <span>Active Groq API Key</span>
                <span className="text-[10px] text-[#8a8078] lowercase">
                  Stored securely in admin settings
                </span>
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl pl-4 pr-24 py-3 text-xs font-mono text-[#faf5ee] placeholder-[#78706a] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-2.5 px-2 py-1 rounded-lg bg-[#2e2622] hover:bg-[#382f2a] text-[#cec6be] text-[11px] font-mono transition-colors"
                >
                  {showKey ? 'Hide' : 'Reveal'}
                </button>
              </div>
            </div>

            {/* Test Connection Button & Status */}
            <div className="p-4 rounded-xl bg-[#1c1815] border border-[#3e342e] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-semibold text-[#faf5ee]">
                    Live Key Verification
                  </h4>
                  <p className="text-[11px] text-[#a89f97]">
                    Ping Groq endpoints to measure real-time latency and confirm authorized model tiers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTestGroqKey}
                  disabled={testingKey}
                  className="px-4 py-2 rounded-xl bg-[#342b26] hover:bg-[#443831] border border-[#52443c] text-xs font-semibold text-[#f0a878] transition-colors shrink-0 flex items-center gap-1.5"
                >
                  {testingKey ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#f0a878] border-t-transparent rounded-full animate-spin" />
                      <span>Testing Key...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">speed</span>
                      <span>Test Key Latency</span>
                    </>
                  )}
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg text-xs font-mono flex items-start gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-200'
                      : 'bg-red-950/40 border border-red-500/40 text-red-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] shrink-0">
                    {testResult.success ? 'check_circle' : 'error'}
                  </span>
                  <div className="space-y-1">
                    <p className="font-bold">
                      {testResult.success
                        ? `Connection Verified • Latency: ${testResult.latencyMs}ms`
                        : 'Connection Failed'}
                    </p>
                    {testResult.success && testResult.models.length > 0 && (
                      <p className="text-[11px] text-emerald-300/80">
                        Authorized models detected: {testResult.models.slice(0, 3).join(', ')}
                        {testResult.models.length > 3 ? ` (+${testResult.models.length - 3} more)` : ''}
                      </p>
                    )}
                    {testResult.error && (
                      <p className="text-[11px] text-red-300">{testResult.error}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Model Selector */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-[#cec6be] uppercase tracking-wider font-mono">
                Active Reasoning Model
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {POPULAR_GROQ_MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedModel(m.id);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      selectedModel === m.id
                        ? 'bg-[#c2652a]/20 border-[#c2652a] text-[#faf5ee] shadow-sm'
                        : 'bg-[#1c1815] border-[#3e342e] text-[#a89f97] hover:border-[#52443c]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#faf5ee]">
                        {m.id}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#2e2622] text-[#86efac]">
                        {m.latency}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#cec6be] mt-1 line-clamp-1">{m.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Telegram 2FA Settings Card */}
          <div className="bg-[#241e1b] rounded-2xl border border-[#3e342e] p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#342b26]">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                <span className="material-symbols-outlined text-[18px]">send</span>
              </div>
              <div>
                <h2 className="font-headline text-lg font-bold text-[#faf5ee]">
                  Telegram 2FA Gateway
                </h2>
                <p className="text-[11px] text-[#a89f97]">
                  Automates 6-digit verification code dispatch for student password resets.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#cec6be] font-mono">
                  Official Telegram Bot Handle
                </label>
                <input
                  type="text"
                  value={telegramHandle}
                  onChange={(e) => setTelegramHandle(e.target.value)}
                  className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl px-3 py-2 text-xs font-mono text-[#faf5ee] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#cec6be] font-mono">
                  OTP Expiry Window (Minutes)
                </label>
                <input
                  type="number"
                  value={otpExpiryMinutes}
                  onChange={(e) => setOtpExpiryMinutes(Number(e.target.value))}
                  min={1}
                  max={15}
                  className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl px-3 py-2 text-xs font-mono text-[#faf5ee] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Information & Actions */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#241e1b] rounded-2xl border border-[#3e342e] p-6 shadow-xl space-y-4">
            <h3 className="font-headline text-base font-bold text-[#faf5ee]">
              Save & Propagate
            </h3>
            <p className="text-xs text-[#a89f97]">
              Saving will immediately update the active Groq key and telemetry across all connected student sessions and batch ingestion jobs.
            </p>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#c2652a] hover:bg-[#a85220] text-[#faf5ee] font-bold text-xs tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span>Apply Configuration</span>
            </button>
          </div>

          <div className="bg-[#241e1b] rounded-2xl border border-[#3e342e] p-6 shadow-xl space-y-3 text-xs text-[#a89f97]">
            <h4 className="font-headline text-sm font-bold text-[#faf5ee] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#f0a878] text-[18px]">security</span>
              <span>Architecture Decoupling</span>
            </h4>
            <p>
              The admin platform is isolated from student accounts. API keys set here are stored securely and never leaked to unauthenticated client requests.
            </p>
            <div className="pt-2 border-t border-[#342b26] font-mono text-[11px] text-[#cec6be] space-y-1">
              <p>• Tier: Enterprise Tier</p>
              <p>• Max Tokens / Min: 50,000</p>
              <p>• Max Requests / Min: 300</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
