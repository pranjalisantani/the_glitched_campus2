'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { GameShell } from '../../components/ui/GameShell';
import { PrimaryButton, GhostButton } from '../../components/ui/Buttons';
import { LoadingState } from '../../components/ui/StateDisplays';
import { 
  ShieldAlert, 
  ArrowRight, 
  UserCheck, 
  Lock, 
  Map, 
  LayoutDashboard, 
  UserPlus, 
  KeyRound,
  ShieldCheck,
  Cpu
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

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
              <PrimaryButton
                href="/stages"
                icon={<Map size={16} />}
                className="w-full py-3 text-sm shadow-[0_0_20px_rgba(0,245,255,0.35)]"
                aria-label="Enter Stage Map"
              >
                ENTER STAGE MAP
              </PrimaryButton>

              <GhostButton
                href="/dashboard"
                icon={<LayoutDashboard size={16} />}
                className="w-full py-3 text-sm"
                aria-label="Open Team Dashboard"
              >
                TEAM DASHBOARD
              </GhostButton>
            </div>

            {/* Admin shortcut if applicable */}
            {user.role === 'admin' && (
              <div className="mt-6 pt-6 border-t border-[rgba(0,245,255,0.1)] w-full max-w-md flex justify-center">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 text-xs font-mono text-[var(--violet-primary)] hover:text-[var(--violet-hover)] focus-visible:underline"
                >
                  <ShieldCheck size={14} aria-hidden="true" />
                  <span>Access Administrator Operations Console</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          /* Unauthenticated Participant View */
          <div className="cyber-card p-8 border-[var(--cyan-border)] shadow-[0_0_35px_rgba(0,0,0,0.8)] flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-xl bg-[rgba(255,183,3,0.12)] border border-[rgba(255,183,3,0.35)] flex items-center justify-center mb-4">
              <Lock size={30} className="text-[var(--status-warning)]" aria-hidden="true" />
            </div>

            <span className="font-mono text-xs uppercase tracking-widest text-[var(--status-warning)] mb-1">
              AUTHENTICATION REQUIRED // ACCESS GATE
            </span>
            <h2 className="text-2xl sm:text-3xl font-mono font-bold text-white mb-2">
              Identity Clearance Required
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans max-w-lg mb-8 leading-relaxed">
              Competition stages, questions, challenges, and datasets require an active team terminal session. Please authenticate your registered team or create a new team profile.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
              <PrimaryButton
                href="/login"
                icon={<KeyRound size={16} />}
                className="w-full py-3 text-sm"
                aria-label="Proceed to Login"
              >
                AUTHENTICATE IDENTITY
              </PrimaryButton>

              <GhostButton
                href="/register"
                icon={<UserPlus size={16} />}
                className="w-full py-3 text-sm"
                aria-label="Register Team"
              >
                REGISTER NEW TEAM
              </GhostButton>
            </div>

            <div className="mt-8 pt-6 border-t border-[rgba(0,245,255,0.1)] w-full max-w-md flex items-center justify-between text-xs font-mono text-[var(--text-dim)]">
              <Link
                href="/stages"
                className="hover:text-[var(--cyan-primary)] transition-colors focus-visible:underline"
              >
                Preview Stage Map
              </Link>
              <Link
                href="/"
                className="hover:text-[var(--cyan-primary)] transition-colors focus-visible:underline"
              >
                Return to Briefing
              </Link>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  );
}
