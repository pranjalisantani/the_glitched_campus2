'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PauseCircle, RefreshCw, LayoutDashboard, Compass, ShieldAlert } from 'lucide-react';

interface FreezeLockScreenProps {
  freezeReason?: string | null;
  frozenAt?: string | null;
  frozenByEmail?: string | null;
  onRefresh?: () => Promise<void> | void;
  isAdmin?: boolean;
}

export const FreezeLockScreen: React.FC<FreezeLockScreenProps> = ({
  freezeReason,
  frozenAt,
  frozenByEmail,
  onRefresh,
  isAdmin = false,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualSync = async () => {
    if (!onRefresh) {
      window.location.reload();
      return;
    }
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="relative min-h-[85vh] w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      {/* Background Cyber Grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[#050608]/95" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,183,3,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.85)_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto">
        {/* Main Lock Card */}
        <div className="cyber-card p-6 sm:p-10 border-2 border-[var(--status-warning)] bg-[rgba(10,13,20,0.95)] shadow-[0_0_50px_rgba(255,183,3,0.22)] text-center rounded-2xl">

          {/* Security Protocol Header Badge */}
          <div className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full bg-[rgba(255,183,3,0.12)] border border-[rgba(255,183,3,0.35)]">
            <span className="w-2 h-2 rounded-full bg-[var(--status-warning)] animate-ping" />
            <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--status-warning)] font-bold">
              INCIDENT COMMAND CLEARANCE // DIRECTIVE: PAUSE
            </span>
          </div>

          {/* Warning Icon Badge */}
          <div className="w-20 h-20 rounded-2xl bg-[rgba(255,183,3,0.1)] border-2 border-[var(--status-warning)] flex items-center justify-center mx-auto mb-6 shadow-[0_0_25px_rgba(255,183,3,0.3)]">
            <PauseCircle size={42} className="text-[var(--status-warning)] animate-pulse" />
          </div>

          <h1 className="glitch-title text-2xl sm:text-3xl font-bold font-mono text-white mb-3" data-text="Global Competition Freeze Active">
            Global Competition Freeze Active
          </h1>

          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-mono leading-relaxed max-w-lg mx-auto mb-6">
            The competition has been temporarily frozen by event administration.
            All stage submissions, payload evaluations, and sector progressions are temporarily paused.
          </p>

          {/* Freeze Announcement & Preserved Data Box */}
          <div className="p-4 sm:p-5 rounded-xl bg-black/60 border border-[rgba(255,183,3,0.25)] text-left font-mono text-xs text-gray-300 space-y-2.5 mb-6 shadow-inner">
            <div className="flex items-start gap-2">
              <span className="text-[var(--status-warning)] font-bold shrink-0">Announcement:</span>
              <span className="text-white font-medium">
                {freezeReason || 'Scheduled administrative pause / technical evaluation in progress.'}
              </span>
            </div>

            {frozenAt && (
              <div className="flex items-center gap-2 text-[11px] text-[var(--text-dim)]">
                <span>Enacted Timestamp:</span>
                <span className="text-gray-400">{new Date(frozenAt).toLocaleString()}</span>
              </div>
            )}

            {frozenByEmail && (
              <div className="flex items-center gap-2 text-[11px] text-[var(--text-dim)]">
                <span>Authorized Operator:</span>
                <span className="text-gray-400">{frozenByEmail}</span>
              </div>
            )}

            <div className="pt-2 border-t border-white/10 text-[11px] text-[#00ffa3] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ffa3]" />
              <span>Team scores, input drafts, and stage progress are securely preserved on the server.</span>
            </div>
          </div>

          {/* Administrative Direct Bypass Notice */}
          {isAdmin && (
            <div className="mb-6 p-3 rounded-lg bg-[rgba(0,245,255,0.08)] border border-[rgba(0,245,255,0.3)] text-xs font-mono text-left flex items-center justify-between">
              <div className="flex items-center gap-2 text-[var(--cyan-primary)]">
                <ShieldAlert size={16} />
                <span>Administrator account detected: You can manage or lift the freeze.</span>
              </div>
              <Link
                href="/admin"
                className="px-3 py-1 rounded bg-[var(--cyan-primary)]/20 hover:bg-[var(--cyan-primary)]/30 text-[var(--cyan-primary)] text-[11px] font-bold transition-colors"
              >
                Go to Admin
              </Link>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-xs">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isRefreshing}
              className="px-5 py-2.5 rounded-lg font-bold bg-[rgba(255,183,3,0.15)] text-[var(--status-warning)] border border-[rgba(255,183,3,0.4)] hover:bg-[rgba(255,183,3,0.25)] flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(255,183,3,0.15)]"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? 'Synchronizing Status...' : 'Check Status'}</span>
            </button>

            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-lg font-semibold bg-white/5 text-gray-300 border border-white/15 hover:bg-white/10 hover:text-white flex items-center gap-2 transition-all"
            >
              <LayoutDashboard size={14} />
              <span>Return to Dashboard</span>
            </Link>

            <Link
              href="/stages"
              className="px-4 py-2.5 rounded-lg text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Compass size={14} />
              <span>Stage Map</span>
            </Link>
          </div>
        </div>

        {/* Footer Guidance */}
        <p className="mt-4 text-center font-mono text-[11px] text-[var(--text-dim)]">
          Live operations and scoring will resume automatically as soon as Incident Command lifts the freeze.
        </p>
      </div>
    </div>
  );
};
