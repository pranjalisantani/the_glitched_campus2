'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../../context/AuthContext';
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Info,
  Compass
} from 'lucide-react';
import { apiFetch, getFreezeStatus } from '../../../lib/api';
import { LockedState } from '../../../components/ui/StateDisplays';
import { FreezeLockScreen } from '../../../components/ui/FreezeLockScreen';

interface Stage5Data {
  continuityVerified: boolean;
  selectionTimestamp: string;
  problem: {
    id: string;
    title: string;
    category: string;
    summary: string;
    fullDescription: string;
    stage4Instructions: string;
    stage4Deliverables: string[];
    stage5Instructions: string;
    stage5Deliverables: string[];
    isDemonstration: boolean;
  };
}

export default function Stage5Page() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [data, setData] = useState<Stage5Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [freezeReason, setFreezeReason] = useState<string | null>(null);
  const [requiresStage4, setRequiresStage4] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadStage5Data();
    }
  }, [user, authLoading, router]);

  const loadStage5Data = async () => {
    setLoading(true);
    setError(null);
    setRequiresStage4(false);

    try {
      const freeze = await getFreezeStatus().catch((): { isCompetitionFrozen: boolean; freezeReason?: string } => ({ isCompetitionFrozen: false }));
      if (freeze.isCompetitionFrozen) {
        setIsFrozen(true);
        setFreezeReason(freeze.freezeReason || null);
      }

      const res = await apiFetch<Stage5Data>('/stage5/problem');
      setData(res);
    } catch (err: any) {
      if (err.code === 'COMPETITION_FROZEN') {
        setIsFrozen(true);
        setFreezeReason(err.message || 'Competition frozen.');
      } else if (err.code === 'STAGE_LOCKED' || err.code === 'STAGE_CLOSED') {
        setIsLocked(true);
      } else if (err.code === 'STAGE4_SELECTION_REQUIRED') {
        setRequiresStage4(true);
      }
      setError(err.message || 'Failed to retrieve Stage 5 parameters.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center font-mono text-sm text-[#ff3366]">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#ff3366] border-t-transparent rounded-full animate-spin" />
          <span>Verifying Stage 4 to Stage 5 Architectural Continuity...</span>
        </div>
      </div>
    );
  }

  // Full-page lock screen when competition is frozen for participants
  if (isFrozen && user?.role !== 'admin') {
    return (
      <FreezeLockScreen
        freezeReason={freezeReason}
        onRefresh={loadStage5Data}
        isAdmin={false}
      />
    );
  }

  // Full-page locked screen when stage is locked
  if (isLocked && !isFrozen) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <LockedState
          stageName="Stage 5: Dynamic Defensive Implementation"
          reason="Access to Stage 5 is currently locked by competition administrators. Dynamic web defense deployment will unlock once authorized."
          actionHref="/stages"
          actionLabel="Return to Stage Map"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full flex-1 flex flex-col justify-between overflow-hidden">

      {/* Background: Atmospheric Mission Backdrop */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <Image
          src="/images/mission_briefing_bg.jpg"
          alt="Tactical Cyber Operations Grid"
          fill
          priority={false}
          className="object-cover object-center opacity-25 scale-105 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050608] via-[rgba(5,6,8,0.88)] to-[rgba(5,6,8,0.6)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-transparent to-[rgba(5,6,8,0.8)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_60%,rgba(255,51,102,0.08),transparent_50%)]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 flex flex-col">
        {/* Header Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[rgba(255,51,102,0.2)] font-mono text-xs">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(9,11,16,0.85)] border border-[rgba(255,51,102,0.3)] text-[var(--text-secondary)] hover:text-[#ff3366] hover:border-[#ff3366] transition-all shadow-[0_0_10px_rgba(255,51,102,0.15)]"
            >
              <ArrowLeft size={14} />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/stages"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(9,11,16,0.7)] border border-[rgba(255,255,255,0.08)] text-[var(--text-muted)] hover:text-white hover:border-[rgba(255,51,102,0.25)] transition-all"
            >
              <Compass size={14} />
              <span>Stage Map</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff3366] animate-pulse" />
            <span className="cyber-badge cyber-badge-critical">
              STAGE 05 // DYNAMIC APPLICATION
            </span>
          </div>
        </div>

        {/* Stage Hero Banner */}
        <div className="p-6 mb-8 rounded-2xl bg-[rgba(9,11,16,0.85)] border border-[rgba(255,51,102,0.25)] backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-[rgba(255,51,102,0.08)] border border-[rgba(255,51,102,0.25)]">
                <span className="w-2 h-2 rounded-full bg-[#ff3366] animate-pulse" aria-hidden="true" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#ff3366] font-bold">
                  SECTOR 05 PROTOCOL // FULL-STACK DYNAMIC APPLICATION
                </span>
              </div>

              <h1 className="glitch-title text-2xl sm:text-3xl font-bold font-mono text-white mb-2" data-text="Stage 5: Full-Stack Dynamic Web Application">
                Stage 5: Full-Stack Dynamic Web Application
              </h1>

              {/* Glowing angled cyber hash bars */}
              <div className="flex gap-1.5 my-2">
                <span className="w-4 h-1.5 -skew-x-12 bg-[#ff3366] opacity-95" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[#ff3366] opacity-80" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[#ff3366] opacity-60" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[#ff3366] opacity-40" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[#ff3366] opacity-20" />
              </div>

              <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed mt-2">
                Teams advance their static prototype into an interactive dynamic web application.
                The problem statement below was locked in during Stage 4 and verified through backend continuity.
                Teams develop locally without external hosting or repo link requirements.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[rgba(5,6,8,0.7)] border border-[rgba(255,51,102,0.2)] text-right font-mono text-xs text-[var(--text-dim)] shrink-0">
              <div>Stage 4 Continuity: <strong className="text-[#00ffa3]">VERIFIED</strong></div>
              <div className="text-[11px] text-[#ff3366] mt-1 font-semibold">Dynamic State & Logic</div>
            </div>
          </div>
        </div>

      {/* Stage 4 Selection Requirement Warning */}
      {requiresStage4 && (
        <div className="cyber-card p-8 text-center flex flex-col items-center border-[var(--status-warning)] mb-8">
          <AlertTriangle size={36} className="text-[var(--status-warning)] mb-3" />
          <h2 className="text-xl font-bold font-mono text-white mb-2">
            Stage 4 Selection Required
          </h2>
          <p className="text-xs text-[var(--text-secondary)] max-w-md font-mono leading-relaxed mb-6">
            Stage 5 requires architectural continuity with Stage 4.
            Your team has not yet locked in a problem statement in Stage 4.
            Please navigate to Stage 4 to make your selection first.
          </p>
          <Link href="/stage/4" className="cyber-button-primary text-xs py-2.5 px-6 flex items-center gap-2">
            <span>GO TO STAGE 4 // SELECT PROBLEM</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Locked Alert */}
      {error && !requiresStage4 && (
        <div className="mb-6 p-4 rounded bg-[rgba(255,51,102,0.12)] border border-[rgba(255,51,102,0.4)] flex items-center gap-3 text-xs font-mono text-[var(--status-critical)]">
          <Lock size={18} className="shrink-0" />
          <div>
            <strong className="block text-sm">Access Restrained</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {isLocked && !requiresStage4 && (
        <div className="cyber-card p-8 text-center flex flex-col items-center">
          <Lock size={36} className="text-[var(--status-warning)] mb-3" />
          <h2 className="text-xl font-bold font-mono text-white mb-2">Stage 5 Locked</h2>
          <p className="text-xs text-[var(--text-muted)] max-w-md font-mono mb-6">
            Stage 5 is locked by the event administrators. Await signal clearance.
          </p>
          <Link href="/dashboard" className="cyber-button-secondary text-xs">
            Return to Dashboard
          </Link>
        </div>
      )}

      {/* Dynamic Specifications & Problem Details */}
      {data && (
        <div className="space-y-6">

          {/* Continuity Verification Strip */}
          <div className="p-4 rounded bg-[rgba(0,255,163,0.06)] border border-[rgba(0,255,163,0.3)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-2 text-[#00ffa3]">
              <ShieldCheck size={16} />
              <span>SERVER CONTINUITY VERIFIED: Linked to Stage 4 Problem Selection</span>
            </div>
            <span className="text-[var(--text-dim)]">
              Locked since: {new Date(data.selectionTimestamp).toLocaleString()}
            </span>
          </div>

          {/* Assigned Problem Card */}
          <div className="cyber-card p-6 border border-[rgba(255,51,102,0.35)] bg-[rgba(255,51,102,0.02)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-[rgba(255,51,102,0.15)] text-[#ff3366] font-mono text-xs font-bold">
                {data.problem.category}
              </span>
              <span className="font-mono text-xs text-[var(--text-dim)]">
                Assigned Problem ID: {data.problem.id}
              </span>
            </div>

            <h2 className="text-2xl font-bold font-mono text-white mb-3">
              {data.problem.title}
            </h2>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-6">
              {data.problem.fullDescription}
            </p>

            {/* Stage 5 Dynamic Directives */}
            <div className="p-5 rounded bg-[var(--bg-input)] border border-[rgba(255,51,102,0.25)] mb-6">
              <h3 className="text-sm font-mono font-bold text-[#ff3366] mb-2 flex items-center gap-2">
                <Sparkles size={16} />
                <span>Stage 5 Dynamic Implementation Requirements:</span>
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
                {data.problem.stage5Instructions}
              </p>

              <span className="text-[10px] font-mono uppercase text-[var(--text-dim)] block mb-2">
                Required Dynamic Deliverables & Features:
              </span>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-[var(--text-muted)] font-mono">
                {data.problem.stage5Deliverables.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Stage 4 Prototype Reference */}
            <div className="p-4 rounded bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              <span className="text-[11px] font-mono uppercase text-[var(--text-dim)] block mb-1">
                Foundation from Stage 4 (Static Prototype):
              </span>
              <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                {data.problem.stage4Instructions}
              </p>
            </div>
          </div>

          {/* Local Development Protocol */}
          <div className="p-5 rounded-lg bg-[var(--bg-surface-1)] border border-[rgba(255,255,255,0.06)] flex items-start gap-3 text-xs font-mono text-[var(--text-muted)]">
            <Info size={16} className="text-[var(--cyan-primary)] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[var(--text-secondary)] block">Evaluation Protocol for Dynamic Web Application:</strong>
              Build your application locally using modern web frameworks (React, Vue, Next.js, or vanilla web technologies).
              Scoring judges will review your live local demo at your competition table during the presentation phase.
            </div>
          </div>

        </div>
      )}

      </div>
    </div>
  );
}
