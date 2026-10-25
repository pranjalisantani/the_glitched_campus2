'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../../context/AuthContext';
import { apiFetch, getFreezeStatus } from '../../../lib/api';
import {
  ArrowLeft,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Send,
  KeyRound,
  Lightbulb,
  ShieldCheck,
  PauseCircle,
  Compass,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { LockedState } from '../../../components/ui/StateDisplays';
import { FreezeLockScreen } from '../../../components/ui/FreezeLockScreen';

interface DecodeChallengeParticipant {
  id: string;
  title: string;
  description: string;
  encodedPayload: string;
  hasHint: boolean;
  hintRevealed?: string;
  isActive: boolean;
  isSolved: boolean;
  attemptsUsed: number;
  maxAttempts: number;
  isLockedOut: boolean;
  isDemonstration: boolean;
}

const STORAGE_KEY_S2_INPUTS = 'glitched_campus_s2_inputs';

export default function Stage2Page() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [challenges, setChallenges] = useState<DecodeChallengeParticipant[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, { correct: boolean; message: string }>>({});
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [hintingId, setHintingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [freezeReason, setFreezeReason] = useState<string | null>(null);
  const [eventNotice, setEventNotice] = useState<string | null>(null);

  // Fullscreen & integrity supervision state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningReason, setWarningReason] = useState<string>('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionTime, setSubmissionTime] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showExitWarningModal, setShowExitWarningModal] = useState(false);

  // Debounce timestamp tracker for background audit logging
  const lastLoggedRef = useRef<Record<string, number>>({});

  // Supervised event logging with client-side rate throttling
  const logEvent = useCallback(async (
    eventType: 'tab_blur' | 'tab_focus' | 'copy_attempt' | 'cut_attempt' | 'paste_attempt' | 'context_menu',
    details?: string
  ) => {
    const now = Date.now();
    const last = lastLoggedRef.current[eventType] || 0;
    if (now - last < 1500) {
      return;
    }
    lastLoggedRef.current[eventType] = now;

    try {
      await apiFetch('/stage1/log-event', {
        method: 'POST',
        body: { eventType, details }
      });
    } catch {
      // background logging pass
    }
  }, []);

  // Enter Fullscreen mode (user gesture triggered)
  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);
      setShowWarningModal(false);
    } catch (err) {
      console.warn('Fullscreen entry rejected by browser:', err);
    }
  }, []);

  // Exit Fullscreen mode
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      setIsFullscreen(false);
    } catch {
      // pass
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadChallenges();
    }
  }, [user, authLoading, router]);

  // Stage 2 Supervision: Tab visibility, fullscreen tracking & clipboard restrictions
  useEffect(() => {
    if (isLocked) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(isCurrentlyFullscreen);
      if (!isCurrentlyFullscreen && !isLocked) {
        setShowWarningModal(true);
        setWarningReason('Fullscreen assessment mode was exited. For competition integrity, participants are requested to maintain fullscreen mode.');
        logEvent('tab_blur', 'Stage 2: Participant exited fullscreen mode');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setShowWarningModal(true);
        setWarningReason('Tab switch or window minimization detected. Navigating away from the active sector is monitored.');
        logEvent('tab_blur', 'Stage 2: Participant navigated away from challenge window (tab switch / window minimize)');
      } else {
        logEvent('tab_focus', 'Stage 2: Participant returned to challenge window');
      }
    };

    const handleBlur = () => {
      logEvent('tab_blur', 'Stage 2: Window focus lost');
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      logEvent('copy_attempt', 'Stage 2: Participant attempted to copy challenge content');
      setEventNotice('Notice: Copying challenge payloads and text is disabled in Stage 2.');
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      logEvent('cut_attempt', 'Stage 2: Participant attempted to cut challenge content');
      setEventNotice('Notice: Text cutting is restricted in Stage 2.');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      logEvent('paste_attempt', 'Stage 2: Participant attempted to paste into assessment sector');
      setEventNotice('Notice: Direct clipboard paste is disabled in assessment area. Please type answers manually.');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logEvent('context_menu', 'Stage 2: Right-click context menu triggered');
      setEventNotice('Notice: Context menu is disabled in Stage 2.');
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isLocked, logEvent]);

  // Stage 2 active assessment exit restrictions: prevent in-site navigation, browser back, and reload
  useEffect(() => {
    const isAssessmentActive = !hasSubmitted && !isLocked && !isFrozen && user?.role !== 'admin' && challenges.length > 0;
    if (!isAssessmentActive) return;

    // 1. Browser navigation / tab closure / refresh warning
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Assessment in progress. Your challenge drafts are saved, but you must finalize before leaving.';
      return e.returnValue;
    };

    // 2. Browser history popstate (back button) interception
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      setShowExitWarningModal(true);
      logEvent('tab_blur', 'Stage 2: Participant attempted browser back navigation during assessment');
    };

    // 3. In-site link click interception (Navbar, dashboard, stage map)
    const handleDocumentClickCapture = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      // Prevent navigation away from active assessment
      e.preventDefault();
      e.stopPropagation();
      setShowExitWarningModal(true);
      logEvent('tab_blur', `Stage 2: Participant attempted in-site navigation to ${href}`);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleDocumentClickCapture, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleDocumentClickCapture, true);
    };
  }, [hasSubmitted, isLocked, isFrozen, user, challenges.length, logEvent]);

  const loadChallenges = async () => {
    setLoading(true);
    setError(null);
    try {
      const freeze = await getFreezeStatus().catch((): { isCompetitionFrozen: boolean; freezeReason?: string } => ({ isCompetitionFrozen: false }));
      if (freeze.isCompetitionFrozen) {
        setIsFrozen(true);
        setFreezeReason(freeze.freezeReason || null);
      }

      // Check if Stage 2 already completed
      const statusRes = await apiFetch<{ hasSubmitted: boolean; submittedAt: string | null }>('/stage2/status').catch(() => null);
      if (statusRes?.hasSubmitted) {
        setHasSubmitted(true);
        setSubmissionTime(statusRes.submittedAt);
        try {
          localStorage.removeItem(STORAGE_KEY_S2_INPUTS);
        } catch {}
      }

      // Safe GET with auto-retry
      const data = await apiFetch<DecodeChallengeParticipant[]>('/stage2/challenges');
      setChallenges(data);

      // Hydrate saved input drafts from localStorage
      try {
        const cached = localStorage.getItem(STORAGE_KEY_S2_INPUTS);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') {
            setInputs(parsed);
          }
        }
      } catch {
        // pass
      }
    } catch (err: any) {
      if (err.code === 'COMPETITION_FROZEN') {
        setIsFrozen(true);
        setFreezeReason(err.message || 'Competition frozen.');
      } else if (err.code === 'STAGE_LOCKED' || err.code === 'STAGE_CLOSED') {
        setIsLocked(true);
      }
      setError(err.message || 'Failed to load Stage 2 challenges.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (id: string, val: string) => {
    setInputs(prev => {
      const next = { ...prev, [id]: val };
      try {
        localStorage.setItem(STORAGE_KEY_S2_INPUTS, JSON.stringify(next));
      } catch {
        // pass
      }
      return next;
    });
  };

  const handleRequestHint = async (ch: DecodeChallengeParticipant) => {
    if (ch.hintRevealed || ch.isSolved || ch.isLockedOut || isFrozen) return;
    if (!confirm('⚠️ CONFIRM HINT REQUEST (-2 MARKS)\n\nRequesting a decrypted hint will deduct 2 marks from your Stage 2 score (stage cap: 10 marks, clamped at 0).\n\nThis 2-mark deduction cannot be undone once revealed.\n\nDo you wish to continue and decrypt the hint?')) {
      return;
    }

    setHintingId(ch.id);
    try {
      const res = await apiFetch<{ hint: string; message: string }>(`/stage2/challenges/${ch.id}/hint`, {
        method: 'POST'
      });
      setChallenges(prev => prev.map(item => item.id === ch.id ? { ...item, hintRevealed: res.hint } : item));
    } catch (err: any) {
      if (err.code === 'COMPETITION_FROZEN') {
        setIsFrozen(true);
        alert('Action blocked: Competition is globally frozen by administrator.');
        return;
      }
      if (err.code === 'NETWORK_TIMEOUT' || err.code === 'NETWORK_ERROR') {
        // Safe check whether hint was already applied before timing out
        try {
          const fresh = await apiFetch<DecodeChallengeParticipant[]>('/stage2/challenges');
          setChallenges(fresh);
          const found = fresh.find(item => item.id === ch.id);
          if (found?.hintRevealed) {
            return;
          }
        } catch {
          // pass through
        }
      }
      alert(err.message || 'Failed to unlock hint.');
    } finally {
      setHintingId(null);
    }
  };

  const handleSubmitAnswer = async (ch: DecodeChallengeParticipant) => {
    if (isFrozen) {
      alert('Submissions are paused while competition is frozen by administrator.');
      return;
    }

    const answer = inputs[ch.id]?.trim();
    if (!answer) return;

    setSubmittingId(ch.id);
    try {
      const res = await apiFetch<{
        isCorrect: boolean;
        attemptsRemaining: number;
        isLockedOut: boolean;
        message: string;
      }>(`/stage2/challenges/${ch.id}/submit`, {
        method: 'POST',
        body: { answer }
      });

      // Update local feedback
      setFeedbacks(prev => ({
        ...prev,
        [ch.id]: { correct: res.isCorrect, message: res.message }
      }));

      // Update challenge state
      setChallenges(prev => prev.map(item => {
        if (item.id === ch.id) {
          return {
            ...item,
            isSolved: res.isCorrect,
            attemptsUsed: item.maxAttempts - res.attemptsRemaining,
            isLockedOut: res.isLockedOut
          };
        }
        return item;
      }));
    } catch (err: any) {
      if (err.code === 'COMPETITION_FROZEN') {
        setIsFrozen(true);
        setFeedbacks(prev => ({
          ...prev,
          [ch.id]: { correct: false, message: 'Submission blocked: Competition is currently frozen by administrator.' }
        }));
        return;
      }

      // Low-network recovery: DO NOT blindly resubmit (which could consume an attempt). Query status!
      if (err.code === 'NETWORK_TIMEOUT' || err.code === 'NETWORK_ERROR') {
        try {
          const freshChallenges = await apiFetch<DecodeChallengeParticipant[]>('/stage2/challenges');
          setChallenges(freshChallenges);
          const updated = freshChallenges.find(item => item.id === ch.id);
          if (updated && (updated.isSolved || updated.attemptsUsed > ch.attemptsUsed)) {
            setFeedbacks(prev => ({
              ...prev,
              [ch.id]: {
                correct: updated.isSolved,
                message: updated.isSolved
                  ? 'Status recovered: Challenge was solved before the connection timed out!'
                  : 'Status recovered: Attempt recorded before connection timed out.'
              }
            }));
            return;
          }
        } catch {
          // Status recovery query also failed
        }
        setFeedbacks(prev => ({
          ...prev,
          [ch.id]: { correct: false, message: 'Network interruption during submission. Your input was preserved. Please verify connection and retry.' }
        }));
        return;
      }

      setFeedbacks(prev => ({
        ...prev,
        [ch.id]: { correct: false, message: err.message || 'Submission error.' }
      }));
    } finally {
      setSubmittingId(null);
    }
  };

  const handleFinalizeStage2 = async () => {
    if (isFrozen) {
      alert('Action paused: Competition is globally frozen by administrator.');
      return;
    }

    const unsolved = challenges.filter(c => !c.isSolved && !c.isLockedOut).length;
    if (unsolved > 0) {
      if (!confirm(`You still have ${unsolved} active cipher payload(s) unneutralized. Are you sure you wish to conclude this sector and finalize your Stage 2 submission?`)) {
        return;
      }
    }

    setIsFinalizing(true);
    try {
      const res = await apiFetch<{ message: string; completedAt: string }>('/stage2/complete', {
        method: 'POST'
      });
      setHasSubmitted(true);
      setSubmissionTime(res.completedAt);
      try {
        localStorage.removeItem(STORAGE_KEY_S2_INPUTS);
      } catch {}
      exitFullscreen();
    } catch (err: any) {
      alert(err.message || 'Failed to submit and finalize Stage 2.');
    } finally {
      setIsFinalizing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center font-mono text-sm text-[var(--violet-primary)]">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[var(--violet-primary)] border-t-transparent rounded-full animate-spin" />
          <span>Accessing Stage 2 Cryptographic Matrix...</span>
        </div>
      </div>
    );
  }

  // Full-page lock screen when competition is frozen for participants
  if (isFrozen && user?.role !== 'admin') {
    return (
      <FreezeLockScreen
        freezeReason={freezeReason}
        onRefresh={loadChallenges}
        isAdmin={false}
      />
    );
  }

  // Full-page locked screen when stage is locked
  if (isLocked && !isFrozen) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <LockedState
          stageName="Stage 2: Cryptographic Payload Analysis & Decoding"
          reason="Access to Stage 2 is currently locked by competition administrators. Challenges and payload terminals will open once authorized."
          actionHref="/stages"
          actionLabel="Return to Stage Map"
        />
      </div>
    );
  }

  const hintsUsedCount = challenges.filter(c => Boolean(c.hintRevealed)).length;
  const totalDeductionMarks = Math.min(10, hintsUsedCount * 2);
  const solvedCount = challenges.filter(c => c.isSolved).length;

  return (
    <div className="relative w-full flex-1 flex flex-col justify-between overflow-hidden select-none">

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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(168,85,247,0.1),transparent_50%)]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 flex flex-col">
        {/* Tactical Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[rgba(168,85,247,0.2)] font-mono text-xs">
          <div className="flex items-center gap-2 sm:gap-3">
            {hasSubmitted ? (
              <>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(9,11,16,0.85)] border border-[rgba(168,85,247,0.3)] text-[var(--text-secondary)] hover:text-[var(--violet-primary)] hover:border-[var(--violet-primary)] transition-all shadow-[0_0_10px_rgba(168,85,247,0.15)]"
                >
                  <ArrowLeft size={14} />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/stages"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(9,11,16,0.7)] border border-[rgba(255,255,255,0.08)] text-[var(--text-muted)] hover:text-white hover:border-[rgba(168,85,247,0.25)] transition-all"
                >
                  <Compass size={14} />
                  <span>Stage Map</span>
                </Link>
              </>
            ) : (
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,183,3,0.08)] border border-[rgba(255,183,3,0.3)] text-[11px] text-[var(--status-warning)] font-mono"
                title="Active assessment sector: Navigation away is locked until final submission"
              >
                <Lock size={12} className="animate-pulse" />
                <span>SECTOR LOCKDOWN // ASSESSMENT ACTIVE</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!isLocked && (
              <button
                type="button"
                onClick={isFullscreen ? exitFullscreen : enterFullscreen}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs transition-all ${
                  isFullscreen
                    ? 'bg-[rgba(0,255,163,0.12)] border-[rgba(0,255,163,0.4)] text-[#00ffa3] shadow-[0_0_12px_rgba(0,255,163,0.2)]'
                    : 'bg-[rgba(168,85,247,0.1)] border-[rgba(168,85,247,0.35)] text-[var(--violet-primary)] hover:bg-[rgba(168,85,247,0.2)] shadow-[0_0_10px_rgba(168,85,247,0.15)]'
                }`}
                title={isFullscreen ? 'Exit Fullscreen Supervision' : 'Enter Fullscreen Assessment Mode'}
              >
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                <span>{isFullscreen ? 'FULLSCREEN ACTIVE' : 'ENTER FULLSCREEN'}</span>
              </button>
            )}
            <span className="cyber-badge cyber-badge-violet">
              STAGE 02 // DECODE & ENCODE
            </span>
          </div>
        </div>

        {/* Stage Hero Title */}
        <div className="p-6 mb-8 rounded-2xl bg-[rgba(9,11,16,0.85)] border border-[rgba(168,85,247,0.25)] backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-[rgba(168,85,247,0.08)] border border-[rgba(168,85,247,0.25)]">
                <span className="w-2 h-2 rounded-full bg-[var(--violet-primary)] animate-pulse" aria-hidden="true" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--violet-primary)] font-bold">
                  SECTOR 02 PROTOCOL // CRYPTOGRAPHIC PAYLOAD ANALYSIS
                </span>
              </div>

              <h1 className="glitch-title text-2xl sm:text-3xl font-bold font-mono text-white mb-2" data-text="Stage 2: Cryptographic Payload Analysis">
                Stage 2: Cryptographic Payload Analysis
              </h1>

              {/* Glowing angled cyber hash bars */}
              <div className="flex gap-1.5 my-2">
                <span className="w-4 h-1.5 -skew-x-12 bg-[var(--violet-primary)] opacity-95" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[var(--violet-primary)] opacity-80" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[var(--violet-primary)] opacity-60" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[var(--violet-primary)] opacity-40" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[var(--violet-primary)] opacity-20" />
              </div>

              <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed mt-2">
                Examine the obfuscated strings recovered from compromised network perimeter nodes.
                Copy payloads freely to your local decryption environments and terminals.
                Submit decoded plaintexts below. Strict limit: maximum 3 attempts per challenge.
                Each hint used incurs a 2-mark deduction. Scores remain confidential to administrators.
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
              {/* Live Hints Used Counter */}
              <div className="p-3.5 rounded-xl bg-[rgba(168,85,247,0.08)] border border-[rgba(168,85,247,0.25)] text-left font-mono min-w-[125px] shadow-sm">
                <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider block">Hints Used</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base font-bold text-[var(--violet-primary)]">{hintsUsedCount}</span>
                  <span className="text-[10px] text-[var(--text-dim)]">/ {challenges.length}</span>
                </div>
                <span className="text-[10px] text-[var(--status-critical)] block font-semibold">
                  {totalDeductionMarks > 0 ? `-${totalDeductionMarks} Marks` : '0 Marks Deducted'}
                </span>
              </div>

              {/* Stage Score Ceiling */}
              <div className="p-3.5 rounded-xl bg-[rgba(5,6,8,0.7)] border border-[rgba(255,255,255,0.08)] text-left font-mono min-w-[125px] shadow-sm">
                <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider block">Score Cap</span>
                <div className="text-base font-bold text-white mt-0.5">
                  {Math.max(0, 10 - totalDeductionMarks)} <span className="text-[10px] text-[var(--text-dim)]">/ 10 pts</span>
                </div>
                <span className="text-[10px] text-[#00ffa3] block font-semibold">
                  {solvedCount}/{challenges.length} Solved
                </span>
                {!isLocked && (
                  <div className={`text-[9px] mt-1 font-bold uppercase tracking-wider ${isFullscreen ? 'text-[#00ffa3]' : 'text-yellow-400'}`}>
                    {isFullscreen ? '● Fullscreen Active' : '○ Fullscreen Mode'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Assessment Exit Lockdown Warning Modal */}
      {showExitWarningModal && !hasSubmitted && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md cyber-card p-6 border-2 border-[var(--status-warning)] shadow-[0_0_40px_rgba(255,183,3,0.3)] text-center">
            <div className="w-14 h-14 rounded-full bg-[rgba(255,183,3,0.15)] border border-[var(--status-warning)] flex items-center justify-center mx-auto mb-4">
              <Lock size={28} className="text-[var(--status-warning)] animate-pulse" />
            </div>

            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--status-warning)] font-bold block mb-1">
              SECTOR LOCKDOWN // ASSESSMENT IN PROGRESS
            </span>
            <h3 className="font-mono text-lg font-bold text-white mb-2">
              Cryptographic Assessment Active
            </h3>

            <p className="text-xs text-[var(--text-secondary)] font-mono leading-relaxed mb-4">
              Participants must remain in this assessment sector until finalizing submission. Navigating away is disabled for competition evaluation integrity.
            </p>

            <div className="p-3 rounded-lg bg-[rgba(0,255,163,0.06)] border border-[rgba(0,255,163,0.25)] text-[11px] text-[#00ffa3] font-mono text-left mb-5 leading-normal flex items-start gap-2">
              <ShieldCheck size={16} className="shrink-0 mt-0.5" />
              <span>Your decoded challenge inputs and attempt history are safely saved in browser storage. Click the button below to resume and finalize your assessment.</span>
            </div>

            <button
              type="button"
              onClick={() => setShowExitWarningModal(false)}
              className="cyber-button-primary w-full py-2.5 px-5 text-xs font-mono uppercase tracking-wider"
            >
              Resume Assessment
            </button>
          </div>
        </div>
      )}

      {/* Integrity Supervision Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md cyber-card p-6 border-2 border-[var(--status-warning)] shadow-[0_0_40px_rgba(255,183,3,0.25)] text-center">
            <div className="w-14 h-14 rounded-full bg-[rgba(255,183,3,0.15)] border border-[var(--status-warning)] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-[var(--status-warning)] animate-pulse" />
            </div>

            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--status-warning)] font-bold block mb-1">
              SECURITY MONITORING NOTICE
            </span>
            <h3 className="font-mono text-lg font-bold text-white mb-2">
              Cryptographic Sector Window Disrupted
            </h3>

            <p className="text-xs text-[var(--text-secondary)] font-mono leading-relaxed mb-4">
              {warningReason || 'Focus disruption detected. Tab switches, window minimization, and fullscreen exits are logged with a timestamp for event proctoring review.'}
            </p>

            <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-white/10 text-[10px] text-gray-400 font-mono text-left mb-5 leading-normal">
              <strong>Supervision Disclosure:</strong> Client-side browser checks assist event evaluators in maintaining assessment integrity. These automated signals do not guarantee the detection of all external aids.
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-center font-mono text-xs">
              <button
                type="button"
                onClick={enterFullscreen}
                className="cyber-button-primary py-2.5 px-5 flex items-center justify-center gap-1.5"
              >
                <Maximize2 size={14} />
                <span>Return to Fullscreen</span>
              </button>
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="cyber-button-secondary py-2.5 px-4"
              >
                Dismiss Notice
              </button>
            </div>
          </div>
        </div>
      )}

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
              Submissions and hint requests are temporarily paused by the primary administrator.
              {freezeReason && ` Reason: "${freezeReason}".`}
              You may continue reviewing cipher payloads and working offline.
            </p>
          </div>
        </div>
      )}

      {/* Supervised Event Warning Notice */}
      {eventNotice && (
        <div
          role="alert"
          className="mb-6 p-3 rounded bg-[rgba(255,183,3,0.1)] border border-[rgba(255,183,3,0.25)] flex items-center justify-between text-xs font-mono text-[var(--status-warning)]"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{eventNotice}</span>
          </div>
          <button onClick={() => setEventNotice(null)} className="text-[var(--text-muted)] hover:text-white ml-2 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Error / Locked Warning */}
      {error && !isFrozen && (
        <div className="mb-6 p-4 rounded bg-[rgba(255,51,102,0.12)] border border-[rgba(255,51,102,0.4)] flex items-center gap-3 text-xs font-mono text-[var(--status-critical)]">
          <Lock size={18} className="shrink-0" />
          <div>
            <strong className="block text-sm">Access Restricted</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {hasSubmitted ? (
        <div className="cyber-card p-8 text-center flex flex-col items-center border border-[rgba(0,255,163,0.3)]">
          <div className="w-14 h-14 rounded-full bg-[rgba(0,255,163,0.1)] border border-[rgba(0,255,163,0.3)] flex items-center justify-center mb-4">
            <CheckCircle2 size={28} className="text-[#00ffa3]" />
          </div>
          <h2 className="glitch-title text-2xl font-bold font-mono text-white mb-2" data-text="Stage 2 Cryptographic Assessment Finalized">
            Stage 2 Cryptographic Assessment Finalized
          </h2>
          <p className="max-w-md text-xs text-[var(--text-secondary)] font-mono leading-relaxed mb-4">
            Your team&apos;s decoded anomaly payloads and hint usage have been finalized and recorded on the server.
            Active assessment restrictions have been released.
          </p>
          {submissionTime && (
            <span className="text-[11px] font-mono text-[var(--text-dim)] mb-6">
              Timestamp of Record: {new Date(submissionTime).toLocaleString()}
            </span>
          )}

          <div className="mt-6 flex flex-wrap gap-4 justify-center">
            <Link href="/stage/3" className="cyber-button-primary text-xs py-2.5 px-6">
              Advance to Stage 03 (Dataset EDA)
            </Link>
            <Link href="/dashboard" className="cyber-button-secondary text-xs py-2.5 px-6">
              Return to Operations Dashboard
            </Link>
          </div>
        </div>
      ) : isLocked ? (
        <div className="cyber-card p-8 text-center flex flex-col items-center">
          <Lock size={36} className="text-[var(--status-warning)] mb-3" />
          <h2 className="text-xl font-bold font-mono text-white mb-2">Stage 2 Locked</h2>
          <p className="text-xs text-[var(--text-muted)] max-w-md font-mono mb-6">
            The administrator has not unlocked Stage 2 yet. Please monitor the event schedule.
          </p>
          <Link href="/dashboard" className="cyber-button-secondary text-xs">
            Return to Dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {challenges.map((ch, idx) => {
            const attemptsLeft = Math.max(0, ch.maxAttempts - ch.attemptsUsed);
            const feedback = feedbacks[ch.id];

            return (
              <div
                key={ch.id}
                className={`cyber-card p-6 transition-all ${
                  ch.isSolved
                    ? 'border border-[rgba(0,255,163,0.35)] bg-[rgba(0,255,163,0.02)]'
                    : ch.isLockedOut
                    ? 'border border-[rgba(255,51,102,0.35)] bg-[rgba(255,51,102,0.02)]'
                    : 'border border-[rgba(255,255,255,0.06)] hover:border-[rgba(168,85,247,0.3)]'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[rgba(168,85,247,0.15)] text-[var(--violet-primary)] font-mono text-xs font-bold">
                      CHALLENGE 0{idx + 1}
                    </span>
                    <h3 className="text-base font-bold font-mono text-white">
                      {ch.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {ch.isSolved && (
                      <span className="cyber-badge cyber-badge-success flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        <span>SOLVED</span>
                      </span>
                    )}
                    {ch.isLockedOut && (
                      <span className="cyber-badge cyber-badge-critical flex items-center gap-1">
                        <Lock size={12} />
                        <span>ATTEMPTS EXHAUSTED</span>
                      </span>
                    )}
                    {!ch.isSolved && !ch.isLockedOut && (
                      <span className="text-[11px] font-mono text-[var(--text-dim)]">
                        Attempts remaining: <strong className="text-white">{attemptsLeft}</strong> / 3
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
                  {ch.description}
                </p>

                {/* Encoded Payload Display Container - Supervised assessment area */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-mono text-[var(--text-dim)] tracking-wider uppercase">
                      Intercepted Cipher Payload:
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-dim)]">
                      [Protected Assessment Sector]
                    </span>
                  </div>
                  <div className="cyber-terminal select-none break-all text-sm font-mono tracking-wider">
                    {ch.encodedPayload}
                  </div>
                </div>

                {/* Hint Section */}
                <div className="mb-4">
                  {ch.hintRevealed ? (
                    <div className="p-3.5 sm:p-4 rounded-lg bg-[rgba(168,85,247,0.08)] border border-[rgba(168,85,247,0.3)] shadow-[0_0_15px_rgba(168,85,247,0.12)] text-xs font-mono">
                      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[rgba(168,85,247,0.2)]">
                        <div className="flex items-center gap-2 text-[var(--violet-primary)] font-bold">
                          <Lightbulb size={16} className="shrink-0 text-[var(--violet-primary)]" />
                          <span className="tracking-wider uppercase">DECRYPTED HINT (-2 MARKS APPLIED)</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(168,85,247,0.2)] text-[var(--violet-primary)] border border-[rgba(168,85,247,0.35)] shrink-0">
                          REVEALED
                        </span>
                      </div>
                      <p className="text-[var(--text-secondary)] leading-relaxed font-sans sm:font-mono text-xs sm:text-[13px] select-text">
                        {ch.hintRevealed}
                      </p>
                    </div>
                  ) : ch.hasHint && !ch.isSolved && !ch.isLockedOut ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-[rgba(168,85,247,0.04)] border border-[rgba(168,85,247,0.18)]">
                      <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)]">
                        <AlertTriangle size={14} className="text-[var(--violet-primary)] shrink-0" />
                        <span>Decryption intelligence available. Incurs a <strong>-2 mark</strong> deduction from stage score.</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRequestHint(ch)}
                        disabled={hintingId === ch.id || isFrozen}
                        aria-label={`Request decryption hint for ${ch.title} with 2 marks deduction`}
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer w-full sm:w-auto shrink-0 select-none
                          bg-[rgba(168,85,247,0.12)] border border-[var(--violet-primary)] text-[var(--violet-primary)]
                          shadow-[0_0_15px_rgba(168,85,247,0.25)]
                          hover:bg-[rgba(168,85,247,0.25)] hover:border-[#c084fc] hover:text-white
                          hover:shadow-[0_0_24px_rgba(168,85,247,0.5)]
                          focus:outline-none focus:ring-2 focus:ring-[var(--violet-primary)] focus:ring-offset-2 focus:ring-offset-[#090b10]
                          active:scale-[0.98]
                          disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none
                          ${isFrozen ? 'opacity-40 cursor-not-allowed' : ''}
                        `}
                      >
                        {hintingId === ch.id ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-[var(--violet-primary)] border-t-transparent rounded-full animate-spin" />
                            <span>DECRYPTING HINT...</span>
                          </>
                        ) : (
                          <>
                            <KeyRound size={14} className="shrink-0" />
                            <span>REQUEST HINT (-2 MARKS)</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Feedback Announcement */}
                {feedback && (
                  <div
                    role="alert"
                    className={`mb-4 p-3 rounded text-xs font-mono flex items-center gap-2 ${
                      feedback.correct
                        ? 'bg-[rgba(0,255,163,0.12)] border border-[rgba(0,255,163,0.35)] text-[#00ffa3]'
                        : 'bg-[rgba(255,51,102,0.12)] border border-[rgba(255,51,102,0.35)] text-[var(--status-critical)]'
                    }`}
                  >
                    {feedback.correct ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <span>{feedback.message}</span>
                  </div>
                )}

                {/* Answer Submission Controls */}
                {!ch.isSolved && !ch.isLockedOut ? (
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <input
                      type="text"
                      disabled={isFrozen}
                      value={inputs[ch.id] || ''}
                      onChange={(e) => handleInputChange(ch.id, e.target.value)}
                      placeholder="Enter decoded answer string..."
                      className={`cyber-input flex-1 ${isFrozen ? 'opacity-70 cursor-not-allowed' : ''}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSubmitAnswer(ch);
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        setEventNotice('Notice: Direct clipboard paste is restricted in assessment sectors. Please type your answer.');
                      }}
                      onContextMenu={(e) => e.preventDefault()}
                    />
                    <button
                      type="button"
                      onClick={() => handleSubmitAnswer(ch)}
                      disabled={submittingId === ch.id || !inputs[ch.id]?.trim() || isFrozen}
                      className={`cyber-button-primary text-xs py-2.5 px-5 shrink-0 w-full sm:w-auto ${
                        isFrozen ? 'opacity-50 cursor-not-allowed bg-gray-700 border-gray-600 text-gray-300' : ''
                      }`}
                    >
                      {submittingId === ch.id ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : isFrozen ? (
                        <span>FROZEN</span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <Send size={13} />
                          <span>Submit Attempt</span>
                        </span>
                      )}
                    </button>
                  </div>
                ) : ch.isSolved ? (
                  <div className="text-xs font-mono text-[#00ffa3] flex items-center gap-1.5">
                    <ShieldCheck size={16} />
                    <span>Payload neutralized. Verification recorded on server.</span>
                  </div>
                ) : (
                  <div className="text-xs font-mono text-[var(--status-critical)] flex items-center gap-1.5">
                    <Lock size={16} />
                    <span>Submission gate locked. Maximum attempts reached.</span>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Stage 2 Completion & Navigation Bar */}
      {!hasSubmitted && !isLocked && challenges.length > 0 && (
        <div className="cyber-card p-4 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-20 bg-[rgba(9,11,16,0.95)] backdrop-blur border border-[rgba(168,85,247,0.35)] shadow-lg font-mono">
          <div className="text-xs text-[var(--text-secondary)]">
            Stage 2 Status: <strong className="text-[var(--violet-primary)]">{solvedCount}</strong> of {challenges.length} neutralized
            {hintsUsedCount > 0 && (
              <span className="text-[var(--status-critical)] ml-2">(-{totalDeductionMarks} pts hints)</span>
            )}
          </div>

          <button
            type="button"
            disabled={isFinalizing}
            onClick={handleFinalizeStage2}
            className="cyber-button-primary text-xs py-2.5 px-6 flex items-center gap-2"
          >
            {isFinalizing ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            <span>FINALIZE & SUBMIT STAGE 2</span>
          </button>
        </div>
      )}

      </div>
    </div>
  );
}
