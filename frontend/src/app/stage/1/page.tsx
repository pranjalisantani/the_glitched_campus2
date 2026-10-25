'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../../context/AuthContext';
import { apiFetch, getFreezeStatus } from '../../../lib/api';
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Send,
  PauseCircle,
  Compass,
  ShieldCheck,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { LockedState } from '../../../components/ui/StateDisplays';
import { FreezeLockScreen } from '../../../components/ui/FreezeLockScreen';

interface QuizOption {
  id: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
  isDemonstration: boolean;
}

const STORAGE_KEY_S1_ANSWERS = 'glitched_campus_s1_answers';

export default function Stage1Page() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [freezeReason, setFreezeReason] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionTime, setSubmissionTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [eventNotice, setEventNotice] = useState<string | null>(null);

  // Fullscreen & integrity supervision state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningReason, setWarningReason] = useState<string>('');
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
    // Throttle duplicate event logging to max once every 1.5 seconds per event type
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
      // Background audit logging shouldn't crash quiz interface
    }
  }, []);

  // Enter Fullscreen mode (must be triggered by user gesture)
  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);
      setShowWarningModal(false);
    } catch (err) {
      console.warn('Fullscreen entry rejected by client browser:', err);
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
      loadQuiz();
    }
  }, [user, authLoading, router]);

  // Stage 1 strict client supervision: copy, cut, paste, right-click, blur, tab visibility, fullscreen change
  useEffect(() => {
    if (hasSubmitted || isLocked) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(isCurrentlyFullscreen);
      if (!isCurrentlyFullscreen && !hasSubmitted && !isLocked) {
        setShowWarningModal(true);
        setWarningReason('Fullscreen assessment mode was exited. For event integrity, participants are requested to remain in fullscreen mode.');
        logEvent('tab_blur', 'Participant exited fullscreen mode');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setShowWarningModal(true);
        setWarningReason('Tab switch or window minimization detected. Navigating away from the active assessment is monitored.');
        logEvent('tab_blur', 'Participant navigated away from quiz window (tab switch / window minimize)');
        setEventNotice('Notice: Tab focus switch recorded for competition auditing.');
      } else {
        logEvent('tab_focus', 'Participant returned to quiz window');
      }
    };

    const handleBlur = () => {
      logEvent('tab_blur', 'Window blur event recorded');
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      logEvent('copy_attempt', 'Participant attempted to copy question content');
      setEventNotice('Copy restriction active: Assessment text copying is disabled in Stage 1.');
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      logEvent('cut_attempt', 'Participant attempted to cut question content');
      setEventNotice('Cut restriction active: Text cutting is disabled in Stage 1.');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      logEvent('paste_attempt', 'Participant attempted to paste into assessment area');
      setEventNotice('Paste restriction active: Pasting is disabled in Stage 1 assessment.');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logEvent('context_menu', 'Right-click context menu triggered');
      setEventNotice('Notice: Right-click context menu is disabled in Stage 1.');
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
  }, [hasSubmitted, isLocked, logEvent]);

  // Stage 1 active assessment exit restrictions: prevent in-site navigation, browser back, and reload
  useEffect(() => {
    const isAssessmentActive = !hasSubmitted && !isLocked && !isFrozen && user?.role !== 'admin' && questions.length > 0;
    if (!isAssessmentActive) return;

    // 1. Browser navigation / tab closure / refresh warning
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Assessment in progress. Your answers are saved, but you must submit your assessment before leaving.';
      return e.returnValue;
    };

    // 2. Browser history popstate (back button) interception
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      setShowExitWarningModal(true);
      logEvent('tab_blur', 'Participant attempted browser back navigation during active assessment');
    };

    // 3. In-site link click interception (Navbar, breadcrumbs, dashboard, stage map)
    const handleDocumentClickCapture = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      // Prevent navigation away from active assessment
      e.preventDefault();
      e.stopPropagation();
      setShowExitWarningModal(true);
      logEvent('tab_blur', `Participant attempted in-site navigation to ${href}`);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleDocumentClickCapture, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleDocumentClickCapture, true);
    };
  }, [hasSubmitted, isLocked, isFrozen, user, questions.length, logEvent]);

  const loadQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      // Check competition freeze status
      const freeze = await getFreezeStatus().catch((): { isCompetitionFrozen: boolean; freezeReason?: string } => ({ isCompetitionFrozen: false }));
      if (freeze.isCompetitionFrozen) {
        setIsFrozen(true);
        setFreezeReason(freeze.freezeReason || null);
      }

      // Check if already submitted
      const statusRes = await apiFetch<{ hasSubmitted: boolean; submittedAt: string | null }>('/stage1/status');
      if (statusRes.hasSubmitted) {
        setHasSubmitted(true);
        setSubmissionTime(statusRes.submittedAt);
        try {
          localStorage.removeItem(STORAGE_KEY_S1_ANSWERS);
        } catch {}
      } else {
        // Hydrate saved answers from localStorage if present
        try {
          const cached = localStorage.getItem(STORAGE_KEY_S1_ANSWERS);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === 'object') {
              setAnswers(parsed);
            }
          }
        } catch {
          // pass
        }
      }

      // Fetch questions (safe GET with auto-retry)
      const qData = await apiFetch<QuizQuestion[]>('/stage1/questions');
      setQuestions(qData);
    } catch (err: any) {
      if (err.code === 'COMPETITION_FROZEN') {
        setIsFrozen(true);
        setFreezeReason(err.message || 'Competition frozen.');
      } else if (err.code === 'STAGE_LOCKED' || err.code === 'STAGE_CLOSED') {
        setIsLocked(true);
      }
      setError(err.message || 'Failed to load quiz stage.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (hasSubmitted || isFrozen) return;
    setAnswers(prev => {
      const next = {
        ...prev,
        [questionId]: optionId
      };
      try {
        localStorage.setItem(STORAGE_KEY_S1_ANSWERS, JSON.stringify(next));
      } catch {
        // pass
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFrozen) {
      setError('Cannot submit while the competition is frozen by the administrator.');
      return;
    }

    setError(null);

    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      if (!confirm(`You have answered ${answeredCount} of ${questions.length} questions. Are you sure you want to finalize your submission?`)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{ message: string; submittedAt: string }>('/stage1/submit', {
        method: 'POST',
        body: { answers }
      });
      setHasSubmitted(true);
      setSubmissionTime(res.submittedAt);
      try {
        localStorage.removeItem(STORAGE_KEY_S1_ANSWERS);
      } catch {}
      exitFullscreen();
    } catch (err: any) {
      if (err.code === 'COMPETITION_FROZEN') {
        setIsFrozen(true);
        setError('Submission blocked: Competition was globally frozen by the administrator. Your selected answers remain intact.');
        return;
      }

      // Low-network recovery: Never blindly retry a mutation. Verify if server already recorded submission!
      if (err.code === 'NETWORK_TIMEOUT' || err.code === 'NETWORK_ERROR' || err.message?.toLowerCase().includes('network')) {
        try {
          const verifyStatus = await apiFetch<{ hasSubmitted: boolean; submittedAt: string | null }>('/stage1/status');
          if (verifyStatus.hasSubmitted) {
            setHasSubmitted(true);
            setSubmissionTime(verifyStatus.submittedAt);
            setEventNotice('Submission recovered: Your answers were successfully recorded on the server before the network timed out.');
            return;
          }
        } catch {
          // Status recovery query also failed or inconclusive
        }
        setError('Network interruption occurred during transmission. Your answers remain saved in your browser. Please verify your connection and click Submit again.');
        return;
      }

      setError(err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center font-mono text-sm text-[var(--cyan-primary)]">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[var(--cyan-primary)] border-t-transparent rounded-full animate-spin" />
          <span>Accessing Stage 1 encrypted terminal...</span>
        </div>
      </div>
    );
  }

  // Full-page lock screen when competition is frozen for participants
  if (isFrozen && user?.role !== 'admin') {
    return (
      <FreezeLockScreen
        freezeReason={freezeReason}
        onRefresh={loadQuiz}
        isAdmin={false}
      />
    );
  }

  // Full-page locked screen when stage is locked
  if (isLocked && !isFrozen) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <LockedState
          stageName="Stage 1: Technical Security Assessment (Bit Blitz)"
          reason="Access to Stage 1 is currently locked by competition administrators. Live questions and submission verification remain suspended until authorized."
          actionHref="/stages"
          actionLabel="Return to Stage Map"
        />
      </div>
    );
  }

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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_35%,rgba(0,245,255,0.08),transparent_50%)]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 flex flex-col">
        {/* Tactical Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[rgba(0,245,255,0.15)] font-mono text-xs">
          <div className="flex items-center gap-2 sm:gap-3">
            {hasSubmitted ? (
              <>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(9,11,16,0.85)] border border-[rgba(0,245,255,0.25)] text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] hover:border-[var(--cyan-primary)] transition-all shadow-[0_0_10px_rgba(0,245,255,0.1)]"
                >
                  <ArrowLeft size={14} />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/stages"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(9,11,16,0.7)] border border-[rgba(255,255,255,0.08)] text-[var(--text-muted)] hover:text-white hover:border-[rgba(0,245,255,0.2)] transition-all"
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
            {!hasSubmitted && !isLocked && (
              <button
                type="button"
                onClick={isFullscreen ? exitFullscreen : enterFullscreen}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs transition-all ${
                  isFullscreen
                    ? 'bg-[rgba(0,255,163,0.12)] border-[rgba(0,255,163,0.4)] text-[#00ffa3] shadow-[0_0_12px_rgba(0,255,163,0.2)]'
                    : 'bg-[rgba(0,245,255,0.08)] border-[rgba(0,245,255,0.35)] text-[var(--cyan-primary)] hover:bg-[rgba(0,245,255,0.18)] shadow-[0_0_10px_rgba(0,245,255,0.15)]'
                }`}
                title={isFullscreen ? 'Exit Fullscreen Supervision' : 'Enter Fullscreen Assessment Mode'}
              >
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                <span>{isFullscreen ? 'FULLSCREEN ACTIVE' : 'ENTER FULLSCREEN'}</span>
              </button>
            )}
            <span className="cyber-badge cyber-badge-cyan">
              STAGE 01 // BIT BLITZ
            </span>
          </div>
        </div>

        {/* Stage Hero Title */}
        <div className="p-6 mb-8 rounded-2xl bg-[rgba(9,11,16,0.85)] border border-[rgba(0,245,255,0.22)] backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-[rgba(0,245,255,0.06)] border border-[rgba(0,245,255,0.2)]">
                <span className="w-2 h-2 rounded-full bg-[var(--cyan-primary)] animate-pulse" aria-hidden="true" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-primary)] font-bold">
                  SECTOR 01 PROTOCOL // TECHNICAL SECURITY ASSESSMENT
                </span>
              </div>

              <h1 className="glitch-title text-2xl sm:text-3xl font-bold font-mono text-white mb-2" data-text="Stage 1: Technical Security Assessment">
                Stage 1: Technical Security Assessment
              </h1>

              {/* Glowing angled cyber hash bars */}
              <div className="flex gap-1.5 my-2">
                <span className="w-4 h-1.5 -skew-x-12 bg-[var(--cyan-primary)] opacity-95" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[var(--cyan-primary)] opacity-80" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[var(--cyan-primary)] opacity-60" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[var(--cyan-primary)] opacity-40" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[var(--cyan-primary)] opacity-20" />
              </div>

              <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed mt-2">
                Answer the multiple-choice questions below. Each question features 4 potential answers.
                No negative marking applies. Browser focus switches, right-clicks, copy, cut, paste attempts, and fullscreen exits are monitored and logged for event integrity.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[rgba(5,6,8,0.7)] border border-[rgba(0,245,255,0.15)] text-right font-mono text-xs text-[var(--text-dim)] shrink-0">
              <div>Maximum Score: <strong className="text-white">10 Marks</strong></div>
              <div className="text-[11px] text-[var(--cyan-primary)] mt-1 flex items-center justify-end gap-1">
                <ShieldCheck size={12} />
                <span>Single Final Submission</span>
              </div>
              {!hasSubmitted && !isLocked && (
                <div className={`text-[10px] mt-1.5 font-bold uppercase tracking-wider ${isFullscreen ? 'text-[#00ffa3]' : 'text-yellow-400'}`}>
                  {isFullscreen ? '● Fullscreen Active' : '○ Fullscreen Available'}
                </div>
              )}
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
              Active Assessment Sector Locked
            </h3>

            <p className="text-xs text-[var(--text-secondary)] font-mono leading-relaxed mb-4">
              Participants must remain in this assessment sector until submitting answers. Navigating away is disabled for competition evaluation integrity.
            </p>

            <div className="p-3 rounded-lg bg-[rgba(0,255,163,0.06)] border border-[rgba(0,255,163,0.25)] text-[11px] text-[#00ffa3] font-mono text-left mb-5 leading-normal flex items-start gap-2">
              <ShieldCheck size={16} className="shrink-0 mt-0.5" />
              <span>Your selected answers are safely preserved in browser storage. Click the button below to resume and finalize your assessment.</span>
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
      {showWarningModal && !hasSubmitted && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md cyber-card p-6 border-2 border-[var(--status-warning)] shadow-[0_0_40px_rgba(255,183,3,0.25)] text-center">
            <div className="w-14 h-14 rounded-full bg-[rgba(255,183,3,0.15)] border border-[var(--status-warning)] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-[var(--status-warning)] animate-pulse" />
            </div>

            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--status-warning)] font-bold block mb-1">
              SECURITY MONITORING NOTICE
            </span>
            <h3 className="font-mono text-lg font-bold text-white mb-2">
              Assessment Window Disrupted
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
          className="mb-6 p-4 rounded bg-[rgba(255,183,3,0.1)] border border-[var(--status-warning)] flex items-start gap-3 text-xs font-mono text-white"
        >
          <PauseCircle size={20} className="text-[var(--status-warning)] shrink-0 mt-0.5 animate-pulse" />
          <div>
            <strong className="block text-sm text-[var(--status-warning)] font-bold mb-1">
              GLOBAL COMPETITION FREEZE ACTIVE
            </strong>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              The primary administrator has temporarily frozen live competition submissions.
              {freezeReason && ` Reason: "${freezeReason}".`}
              Your selected answers are safely preserved in this window. Submissions will reopen when the freeze is lifted.
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

      {/* Error / Locked Alert */}
      {error && !isFrozen && (
        <div className="mb-6 p-4 rounded bg-[rgba(255,51,102,0.1)] border border-[rgba(255,51,102,0.3)] flex items-center gap-3 text-xs font-mono text-[var(--status-critical)]">
          <Lock size={18} className="shrink-0" />
          <div>
            <strong className="block text-sm">Stage Access Restrained</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Post-Submission Locked View */}
      {hasSubmitted ? (
        <div className="cyber-card p-8 text-center flex flex-col items-center border border-[rgba(0,255,163,0.3)]">
          <div className="w-14 h-14 rounded-full bg-[rgba(0,255,163,0.1)] border border-[rgba(0,255,163,0.3)] flex items-center justify-center mb-4">
            <CheckCircle2 size={28} className="text-[#00ffa3]" />
          </div>
          <h2 className="glitch-title text-2xl font-bold font-mono text-white mb-2" data-text="Assessment Successfully Recorded">
            Assessment Successfully Recorded
          </h2>
          <p className="max-w-md text-xs text-[var(--text-secondary)] font-mono leading-relaxed mb-4">
            Your team&apos;s answers have been securely received and recorded on the server for centralized evaluation.
            In compliance with competition rules, participant scores and correct answers remain confidential.
          </p>
          {submissionTime && (
            <span className="text-[11px] font-mono text-[var(--text-dim)]">
              Timestamp of Record: {new Date(submissionTime).toLocaleString()}
            </span>
          )}

          <div className="mt-6 flex gap-4">
            <Link href="/dashboard" className="cyber-button-primary text-xs py-2.5 px-6">
              Return to Operations Dashboard
            </Link>
          </div>
        </div>
      ) : isLocked ? (
        <div className="cyber-card p-8 text-center flex flex-col items-center border border-[rgba(255,255,255,0.06)]">
          <Lock size={32} className="text-[var(--status-warning)] mb-3" />
          <h2 className="text-xl font-bold font-mono text-white mb-2">Stage 1 Locked</h2>
          <p className="text-xs text-[var(--text-muted)] max-w-md font-mono mb-6">
            The administrator has not authorized live submissions for this stage yet. Please wait for official announcement.
          </p>
          <Link href="/dashboard" className="cyber-button-secondary text-xs">
            Return to Dashboard
          </Link>
        </div>
      ) : (
        /* Live Quiz Form */
        <form onSubmit={handleSubmit} className="space-y-6">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="cyber-card p-6 border border-[rgba(255,255,255,0.06)] hover:border-[rgba(0,245,255,0.22)] transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded bg-[rgba(0,245,255,0.08)] text-[var(--cyan-primary)] font-mono text-xs font-bold">
                  Q0{idx + 1}
                </span>
                {q.isDemonstration && (
                  <span className="text-[10px] font-mono text-[var(--text-dim)] uppercase">
                    [DEMONSTRATION QUESTION]
                  </span>
                )}
              </div>

              <h3 className="text-base font-semibold text-white mb-4 leading-snug">
                {q.prompt}
              </h3>

              <div className="space-y-2.5">
                {q.options.map(opt => {
                  const isSelected = answers[q.id] === opt.id;
                  return (
                    <label
                      key={opt.id}
                      onClick={() => handleSelectOption(q.id, opt.id)}
                      className={`flex items-center gap-3 p-3.5 rounded-md border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[rgba(0,245,255,0.08)] border-[var(--cyan-primary)] text-white'
                          : 'bg-[var(--bg-input)] border-[rgba(255,255,255,0.06)] hover:border-[rgba(0,245,255,0.18)] text-[var(--text-secondary)]'
                      } ${isFrozen ? 'opacity-80 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`question-${q.id}`}
                        value={opt.id}
                        disabled={isFrozen}
                        checked={isSelected}
                        onChange={() => handleSelectOption(q.id, opt.id)}
                        className="sr-only"
                      />
                      <span className={`w-6 h-6 rounded flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                        isSelected
                          ? 'bg-[var(--cyan-primary)] text-black'
                          : 'bg-[rgba(255,255,255,0.06)] text-[var(--text-dim)]'
                      }`}>
                        {opt.id}
                      </span>
                      <span className="text-sm font-sans flex-1">
                        {opt.text}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Submission Bar */}
          <div className="cyber-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-20 bg-[rgba(9,11,16,0.95)] backdrop-blur border border-[rgba(0,245,255,0.25)] shadow-lg">
            <div className="text-xs font-mono text-[var(--text-secondary)]">
              Answered: <strong className="text-[var(--cyan-primary)]">{Object.keys(answers).length}</strong> of {questions.length} questions
            </div>

            <button
              type="submit"
              disabled={submitting || isFrozen}
              className={`cyber-button-primary text-xs py-2.5 px-6 flex items-center gap-2 ${
                isFrozen ? 'opacity-50 cursor-not-allowed bg-gray-700 border-gray-600 text-gray-300' : ''
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>TRANSMITTING ANSWERS...</span>
                </>
              ) : isFrozen ? (
                <>
                  <PauseCircle size={14} className="text-[var(--status-warning)]" />
                  <span>SUBMISSIONS FROZEN BY ADMIN</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>COMPLETE TEST & SUBMIT ASSESSMENT</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      </div>
    </div>
  );
}
