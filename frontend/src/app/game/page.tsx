'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { GameShell } from '../../components/ui/GameShell';
import { PrimaryButton } from '../../components/ui/Buttons';
import { LoadingState } from '../../components/ui/StateDisplays';
import {
  ArrowRight,
  UserCheck,
  Lock,
  ShieldCheck
} from 'lucide-react';

export default function GameEntryPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <GameShell
        title="ENTRY TERMINAL"
        subtitle="Verifying clearance credentials with event gateway..."
        backHref="/"
        backLabel="Return to Briefing"
      >
        <LoadingState message="Interrogating session authentication state..." />
      </GameShell>
    );
  }

  return (
    <GameShell
      title="COMPETITION ENTRY GATEWAY"
      subtitle="Verify your team's operational status and initialize your competition workspace."
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Game Entry' }
      ]}
      backHref="/"
      backLabel="Return to Briefing"
    >
      <div className="w-full max-w-3xl mx-auto my-auto py-6">
        {user ? (
          /* Authenticated Participant View */
          <div className="cyber-card p-8 border-[var(--cyan-border)] shadow-[0_0_35px_rgba(0,245,255,0.15)] flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-xl bg-[rgba(0,245,255,0.12)] border border-[rgba(0,245,255,0.35)] flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,245,255,0.3)]">
              <UserCheck size={32} className="text-[var(--cyan-primary)]" aria-hidden="true" />
            </div>

            <span className="font-mono text-xs uppercase tracking-widest text-[var(--cyan-primary)] mb-1">
              CLEARANCE VERIFIED // ACTIVE SESSION
            </span>
            <h2 className="text-2xl sm:text-3xl font-mono font-bold text-white mb-2">
              Welcome, Team {user.teamName}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans max-w-lg mb-6">
              Your terminal session is authenticated. You may proceed directly to the Five-Stage Progression Map or access your operational telemetry dashboard.
            </p>

            {/* Team Details Capsule */}
            <div className="w-full max-w-md p-4 rounded-lg bg-[var(--bg-surface-2)] border border-[rgba(0,245,255,0.15)] mb-8 text-left font-mono text-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[rgba(255,255,255,0.06)]">
                <span className="text-[var(--text-dim)]">TEAM IDENTIFIER</span>
                <span className="text-[var(--text-primary)] font-bold">{user.teamName}</span>
              </div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[rgba(255,255,255,0.06)]">
                <span className="text-[var(--text-dim)]">PRIMARY CONTACT</span>
                <span className="text-[var(--text-secondary)]">{user.email}</span>
              </div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[rgba(255,255,255,0.06)]">
                <span className="text-[var(--text-dim)]">SECURITY ROLE</span>
                <span className="text-[var(--cyan-primary)] uppercase">{user.role}</span>
              </div>
              <div>
                <span className="text-[var(--text-dim)] block mb-1.5">TEAM ROSTER</span>
                <div className="flex flex-wrap gap-1.5">
                  {user.members.map((member, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-[rgba(0,245,255,0.08)] border border-[rgba(0,245,255,0.2)] text-[11px] text-[var(--cyan-primary)]"
                    >
                      {member}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="w-full max-w-sm">
              <PrimaryButton
                href="/dashboard"
                icon={<ArrowRight size={16} />}
                className="w-full py-3 text-sm shadow-md"
                aria-label="Open Dashboard"
              >
                OPEN TEAM DASHBOARD
              </PrimaryButton>
            </div>

            {/* Admin shortcut if applicable */}
            {user.role === 'admin' && (
              <div className="mt-6 pt-5 border-t border-[rgba(255,255,255,0.06)] w-full max-w-sm flex justify-center">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 text-xs font-mono text-[var(--violet-primary)] hover:underline"
                >
                  <ShieldCheck size={14} aria-hidden="true" />
                  <span>Access Administrator Operations Console</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          /* Unauthenticated Participant View */
          <div className="cyber-card p-8 border-[rgba(255,255,255,0.08)] shadow-lg flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-lg bg-[rgba(255,183,3,0.1)] border border-[rgba(255,183,3,0.25)] flex items-center justify-center mb-4">
              <Lock size={26} className="text-[var(--status-warning)]" aria-hidden="true" />
            </div>

            <span className="font-mono text-xs uppercase tracking-widest text-[var(--status-warning)] mb-1">
              AUTHENTICATION REQUIRED // ACCESS GATE
            </span>
            <h2 className="text-2xl font-mono font-bold text-white mb-2">
              Identity Clearance Required
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans max-w-md mb-6 leading-relaxed">
              Competition stages and challenges require an active team session. Please log in with your team credentials to continue.
            </p>

            {/* Single Primary Action Button */}
            <div className="w-full max-w-sm mb-4">
              <PrimaryButton
                href="/login"
                icon={<ArrowRight size={16} />}
                className="w-full py-3 text-sm"
                aria-label="Proceed to Login"
              >
                CONTINUE TO LOGIN
              </PrimaryButton>
            </div>

            <div className="text-xs font-mono text-[var(--text-muted)]">
              Need to register?{' '}
              <Link href="/register" className="text-[var(--cyan-primary)] hover:underline">
                Create team account
              </Link>
            </div>

            <div className="mt-6 pt-5 border-t border-[rgba(255,255,255,0.06)] w-full max-w-sm flex items-center justify-between text-xs font-mono text-[var(--text-dim)]">
              <Link
                href="/stages"
                className="hover:text-white transition-colors"
              >
                Preview Stages
              </Link>
              <Link
                href="/"
                className="hover:text-white transition-colors"
              >
                Return to Overview
              </Link>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  );
}
