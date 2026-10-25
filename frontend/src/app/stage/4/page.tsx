'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../../context/AuthContext';
import { apiFetch, getFreezeStatus } from '../../../lib/api';
import {
  ArrowLeft,
  Lock,
  CheckCircle2,
  Info,
  ArrowRight,
  Compass,
  PauseCircle,
  Layers
} from 'lucide-react';
import { LockedState } from '../../../components/ui/StateDisplays';
import { FreezeLockScreen } from '../../../components/ui/FreezeLockScreen';

interface ProblemStatement {
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
}

interface SelectionRecord {
  problemId: string;
  problemTitle: string;
  selectedAt: string;
}

export default function Stage4Page() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [problems, setProblems] = useState<ProblemStatement[]>([]);
  const [currentSelection, setCurrentSelection] = useState<SelectionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [freezeReason, setFreezeReason] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadStage4Data();
    }
  }, [user, authLoading, router]);

  const loadStage4Data = async () => {
    setLoading(true);
    setError(null);
    try {
      const freeze = await getFreezeStatus().catch((): { isCompetitionFrozen: boolean; freezeReason?: string } => ({ isCompetitionFrozen: false }));
      if (freeze.isCompetitionFrozen) {
        setIsFrozen(true);
        setFreezeReason(freeze.freezeReason || null);
      }

      const [pList, selRes] = await Promise.all([
        apiFetch<ProblemStatement[]>('/stage4/problems'),
        apiFetch<{ selection: SelectionRecord | null }>('/stage4/my-selection')
      ]);
      setProblems(pList);
      setCurrentSelection(selRes.selection);
    } catch (err: any) {
      if (err.code === 'COMPETITION_FROZEN') {
        setIsFrozen(true);
        setFreezeReason(err.message || 'Competition frozen.');
      } else if (err.code === 'STAGE_LOCKED' || err.code === 'STAGE_CLOSED') {
        setIsLocked(true);
      }
      setError(err.message || 'Failed to load Stage 4 problems.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProblem = async (problem: ProblemStatement) => {
    if (currentSelection || isFrozen) return;
    if (!confirm(`Confirm selection of "${problem.title}"?\n\nCRITICAL: Each team selects one problem statement. This selection is permanent and will automatically carry over as your required challenge for Stage 5 Dynamic Website.`)) {
      return;
    }

    setSelectingId(problem.id);
    try {
      const res = await apiFetch<{ selection: SelectionRecord }>('/stage4/select', {
        method: 'POST',
        body: { problemId: problem.id }
      });
      setCurrentSelection(res.selection);
    } catch (err: any) {
      if (err.code === 'COMPETITION_FROZEN') {
        setIsFrozen(true);
        alert('Action blocked: Competition is globally frozen by administrator. Problem selection paused.');
        return;
      }

      // Low-network recovery: check if selection was saved before timeout
      if (err.code === 'NETWORK_TIMEOUT' || err.code === 'NETWORK_ERROR') {
        try {
          const checkSel = await apiFetch<{ selection: SelectionRecord | null }>('/stage4/my-selection');
          if (checkSel.selection) {
            setCurrentSelection(checkSel.selection);
            return;
          }
        } catch {
          // ignore
        }
      }
      alert(err.message || 'Problem statement selection failed.');
    } finally {
      setSelectingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center font-mono text-sm text-[#ffb703]">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#ffb703] border-t-transparent rounded-full animate-spin" />
          <span>Mounting Stage 4 Architectural Blueprint Terminals...</span>
        </div>
      </div>
    );
  }

  // Full-page lock screen when competition is frozen for participants
  if (isFrozen && user?.role !== 'admin') {
    return (
      <FreezeLockScreen
        freezeReason={freezeReason}
        onRefresh={loadStage4Data}
        isAdmin={false}
      />
    );
  }

  // Full-page locked screen when stage is locked
  if (isLocked && !isFrozen) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <LockedState
          stageName="Stage 4: Static Prototype Blueprint Selection"
          reason="Access to Stage 4 is currently locked by competition administrators. Problem statements and blueprint selection are suspended until authorized."
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_40%,rgba(255,183,3,0.08),transparent_50%)]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 flex flex-col">
        {/* Header Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[rgba(255,183,3,0.2)] font-mono text-xs">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(9,11,16,0.85)] border border-[rgba(255,183,3,0.3)] text-[var(--text-secondary)] hover:text-[#ffb703] hover:border-[#ffb703] transition-all shadow-[0_0_10px_rgba(255,183,3,0.15)]"
            >
              <ArrowLeft size={14} />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/stages"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(9,11,16,0.7)] border border-[rgba(255,255,255,0.08)] text-[var(--text-muted)] hover:text-white hover:border-[rgba(255,183,3,0.25)] transition-all"
            >
              <Compass size={14} />
              <span>Stage Map</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ffb703] animate-pulse" />
            <span className="cyber-badge cyber-badge-warning">
              STAGE 04 // STATIC PROTOTYPE
            </span>
          </div>
        </div>

        {/* Stage Hero Banner */}
        <div className="p-6 mb-8 rounded-2xl bg-[rgba(9,11,16,0.85)] border border-[rgba(255,183,3,0.25)] backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-[rgba(255,183,3,0.08)] border border-[rgba(255,183,3,0.25)]">
                <span className="w-2 h-2 rounded-full bg-[#ffb703] animate-pulse" aria-hidden="true" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#ffb703] font-bold">
                  SECTOR 04 PROTOCOL // ARCHITECTURAL DEFENSIVE UI PROTOTYPE
                </span>
              </div>

              <h1 className="glitch-title text-2xl sm:text-3xl font-bold font-mono text-white mb-2" data-text="Stage 4: Architectural Defensive UI Prototype">
                Stage 4: Architectural Defensive UI Prototype
              </h1>

              {/* Glowing angled cyber hash bars */}
              <div className="flex gap-1.5 my-2">
                <span className="w-4 h-1.5 -skew-x-12 bg-[#ffb703] opacity-95" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[#ffb703] opacity-80" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[#ffb703] opacity-60" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[#ffb703] opacity-40" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[#ffb703] opacity-20" />
              </div>

              <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed mt-2">
                Select one problem statement once. Your team will construct a high-fidelity static UI prototype locally.
                No source-code uploads or deployed links are required.
                The problem chosen here carries over directly into Stage 5 (Dynamic Website).
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[rgba(5,6,8,0.7)] border border-[rgba(255,183,3,0.2)] text-right font-mono text-xs text-[var(--text-dim)] shrink-0">
              <div className="text-[var(--text-secondary)]">Frontend Prototyping</div>
              <div className="text-[11px] text-[#ffb703] mt-1 font-semibold">Carries into Stage 5</div>
            </div>
          </div>
        </div>

      {/* Global Competition Freeze Banner */}
      {isFrozen && (
        <div
          role="alert"
          className="mb-6 p-4 rounded bg-[rgba(255,183,3,0.15)] border-2 border-[var(--status-warning)] flex items-start gap-3 text-xs font-mono text-white shadow-[0_0_20px_rgba(255,183,3,0.2)]"
        >
          <PauseCircle size={22} className="text-[var(--status-warning)] shrink-0 mt-0.5 animate-pulse" />
          <div>
            <strong className="block text-sm text-[var(--status-warning)] font-bold mb-1">
              GLOBAL COMPETITION FREEZE ACTIVE
            </strong>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Problem selections are temporarily paused by the primary administrator.
              {freezeReason && ` Reason: "${freezeReason}".`}
              You may continue reviewing statements and working offline on your local prototypes.
            </p>
          </div>
        </div>
      )}

      {/* Active Selection Banner */}
      {currentSelection && (
        <div className="cyber-card p-6 mb-8 border border-[rgba(255,183,3,0.35)] bg-[rgba(255,183,3,0.03)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 size={18} className="text-[#ffb703]" />
                <span className="font-mono text-xs uppercase tracking-wider text-[#ffb703] font-bold">
                  ASSIGNED PROBLEM STATEMENT
                </span>
              </div>
              <h2 className="text-xl font-bold font-mono text-white">
                {currentSelection.problemTitle}
              </h2>
              <span className="text-[11px] font-mono text-[var(--text-dim)]">
                Selection timestamp: {new Date(currentSelection.selectedAt).toLocaleString()}
              </span>
            </div>

            <Link
              href="/stage/5"
              className="cyber-button-primary text-xs py-2.5 px-5 flex items-center gap-2"
            >
              <span>PREVIEW STAGE 5 CONTINUITY</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Locked Warning */}
      {error && !isFrozen && (
        <div className="mb-6 p-4 rounded bg-[rgba(255,51,102,0.12)] border border-[rgba(255,51,102,0.4)] flex items-center gap-3 text-xs font-mono text-[var(--status-critical)]">
          <Lock size={18} className="shrink-0" />
          <div>
            <strong className="block text-sm">Access Restricted</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {isLocked ? (
        <div className="cyber-card p-8 text-center flex flex-col items-center">
          <Lock size={36} className="text-[var(--status-warning)] mb-3" />
          <h2 className="text-xl font-bold font-mono text-white mb-2">Stage 4 Locked</h2>
          <p className="text-xs text-[var(--text-muted)] max-w-md font-mono mb-6">
            Stage 4 is currently locked by the administrators. Await event signal.
          </p>
          <Link href="/dashboard" className="cyber-button-secondary text-xs">
            Return to Dashboard
          </Link>
        </div>
      ) : (
        /* Problem Statements Grid */
        <div className="space-y-6">
          {problems.map((prob) => {
            const isSelected = currentSelection?.problemId === prob.id;
            const hasChosenOther = currentSelection && !isSelected;

            return (
              <div
                key={prob.id}
                className={`cyber-card p-6 transition-all ${
                  isSelected
                    ? 'border border-[rgba(255,183,3,0.4)] bg-[rgba(255,183,3,0.02)]'
                    : hasChosenOther
                    ? 'opacity-40 border border-[rgba(255,255,255,0.04)]'
                    : 'border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,183,3,0.3)]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[rgba(255,183,3,0.15)] text-[#ffb703] font-mono text-xs font-bold">
                      {prob.category}
                    </span>
                    {prob.isDemonstration && (
                      <span className="text-[10px] font-mono text-[var(--text-dim)] uppercase">
                        [DEMONSTRATION STATEMENT]
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <span className="cyber-badge cyber-badge-warning flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      <span>SELECTED PROBLEM</span>
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold font-mono text-white mb-2">
                  {prob.title}
                </h3>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
                  {prob.fullDescription}
                </p>

                {/* Stage 4 Directives */}
                <div className="p-4 rounded bg-[var(--bg-input)] border border-[rgba(255,255,255,0.08)] mb-4">
                  <h4 className="text-xs font-mono font-bold text-[#ffb703] mb-1 flex items-center gap-1.5">
                    <Layers size={14} />
                    <span>Stage 4 Prototyping Directives:</span>
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
                    {prob.stage4Instructions}
                  </p>

                  <span className="text-[10px] font-mono uppercase text-[var(--text-dim)] block mb-1">
                    Key Architectural Deliverables:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-xs text-[var(--text-muted)] font-mono">
                    {prob.stage4Deliverables.map((deliv, dIdx) => (
                      <li key={dIdx}>{deliv}</li>
                    ))}
                  </ul>
                </div>

                {/* Selection Action */}
                <div className="pt-4 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between">
                  {isSelected ? (
                    <div className="text-xs font-mono text-[#ffb703] flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      <span>Assigned to team. Build your static layout on your local environment.</span>
                    </div>
                  ) : hasChosenOther ? (
                    <span className="text-xs font-mono text-[var(--text-dim)]">
                      Another problem statement selected for this team
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSelectProblem(prob)}
                      disabled={selectingId === prob.id || isFrozen}
                      className={`cyber-button-primary text-xs py-2.5 px-6 flex items-center gap-2 ${
                        isFrozen ? 'opacity-50 cursor-not-allowed bg-gray-700 border-gray-600 text-gray-300' : ''
                      }`}
                    >
                      {selectingId === prob.id ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : isFrozen ? (
                        <span>SELECTION FROZEN</span>
                      ) : (
                        <span>SELECT THIS PROBLEM STATEMENT (ONE-TIME)</span>
                      )}
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Advisory Notice */}
      <div className="mt-12 p-4 rounded bg-[var(--bg-surface-1)] border border-[rgba(255,255,255,0.06)] flex items-start gap-3 text-xs font-mono text-[var(--text-muted)]">
        <Info size={16} className="text-[var(--cyan-primary)] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[var(--text-secondary)] block">No Remote Code Repository Submissions Required:</strong>
          Teams design and develop prototypes on their local machines. Judges inspect deliverables live during designated assessment sessions.
        </div>
      </div>

      </div>
    </div>
  );
}
