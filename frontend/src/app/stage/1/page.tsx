'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { apiFetch } from '../../../lib/api';
import { 
  Terminal, 
  ShieldAlert, 
  ArrowLeft, 
  CheckCircle2, 
  Lock, 
  AlertTriangle, 
  Eye, 
  Send,
  HelpCircle
} from 'lucide-react';

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

export default function Stage1Page() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionTime, setSubmissionTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [eventNotice, setEventNotice] = useState<string | null>(null);

  // Supervised tab event logging
  const logEvent = useCallback(async (eventType: 'tab_blur' | 'tab_focus' | 'copy_attempt' | 'context_menu', details?: string) => {
    try {
      await apiFetch('/stage1/log-event', {
        method: 'POST',
        body: { eventType, details }
      });
    } catch {
      // Background logging shouldn't crash UI
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

  // Tab switch & visibility change listeners
  useEffect(() => {
    if (hasSubmitted || isLocked) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logEvent('tab_blur', 'Participant navigated away from quiz window');
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
      setEventNotice('Copy restriction active: Assessment text copying is disabled.');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logEvent('context_menu', 'Right click context menu opened');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [hasSubmitted, isLocked, logEvent]);

  const loadQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      // Check if already submitted
      const statusRes = await apiFetch<{ hasSubmitted: boolean; submittedAt: string | null }>('/stage1/status');
      if (statusRes.hasSubmitted) {
        setHasSubmitted(true);
        setSubmissionTime(statusRes.submittedAt);
      }

      // Fetch questions
      const qData = await apiFetch<QuizQuestion[]>('/stage1/questions');
      setQuestions(qData);
    } catch (err: any) {
      if (err.code === 'STAGE_LOCKED' || err.code === 'STAGE_CLOSED') {
        setIsLocked(true);
      }
      setError(err.message || 'Failed to load quiz stage.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (hasSubmitted) return;
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (err: any) {
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

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 select-none">
      
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-6">
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--cyan-primary)] transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Return to Dashboard</span>
        </Link>

        <span className="cyber-badge cyber-badge-cyan">
          STAGE 01 // TECHNICAL QUIZ
        </span>
      </div>

      {/* Stage Hero Title */}
      <div className="cyber-card p-6 mb-8 border-t-4 border-t-[var(--cyan-primary)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white mb-2">
              Stage 1: Technical Security Assessment
            </h1>
            <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              Answer the multiple-choice questions below. Each question features 4 potential answers. 
              No negative marking applies. Browser focus switches and copy attempts are monitored for event integrity.
            </p>
          </div>

          <div className="text-right font-mono text-xs text-[var(--text-dim)] shrink-0">
            <div>Maximum Score: <strong className="text-white">10 Marks</strong></div>
            <div className="text-[11px] text-[var(--cyan-primary)] mt-1">Configurable Evaluation Rule</div>
          </div>
        </div>
      </div>

      {/* Supervised Event Warning Notice */}
      {eventNotice && (
        <div 
          role="alert" 
          className="mb-6 p-3 rounded bg-[rgba(255,183,3,0.12)] border border-[rgba(255,183,3,0.35)] flex items-center justify-between text-xs font-mono text-[var(--status-warning)]"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{eventNotice}</span>
          </div>
          <button onClick={() => setEventNotice(null)} className="text-[var(--text-muted)] hover:text-white ml-2">
            OK
          </button>
        </div>
      )}

      {/* Error / Locked Alert */}
      {error && (
        <div className="mb-6 p-4 rounded bg-[rgba(255,51,102,0.12)] border border-[rgba(255,51,102,0.4)] flex items-center gap-3 text-xs font-mono text-[var(--status-critical)]">
          <Lock size={18} className="shrink-0" />
          <div>
            <strong className="block text-sm">Stage Access Restrained</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Post-Submission Locked View */}
      {hasSubmitted ? (
        <div className="cyber-card p-8 text-center flex flex-col items-center border-[#00ffa3] shadow-[0_0_30px_rgba(0,255,163,0.15)]">
          <div className="w-16 h-16 rounded-full bg-[rgba(0,255,163,0.15)] border border-[rgba(0,255,163,0.4)] flex items-center justify-center mb-4">
            <CheckCircle2 size={32} className="text-[#00ffa3]" />
          </div>
          <h2 className="text-2xl font-bold font-mono text-white mb-2">
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

          <div className="mt-8 flex gap-4">
            <Link href="/dashboard" className="cyber-button-primary text-xs py-2.5 px-6">
              Return to Operations Dashboard
            </Link>
          </div>
        </div>
      ) : isLocked ? (
        <div className="cyber-card p-8 text-center flex flex-col items-center">
          <Lock size={36} className="text-[var(--status-warning)] mb-3" />
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
              className="cyber-card p-6 border-[rgba(0,245,255,0.15)] hover:border-[rgba(0,245,255,0.35)] transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded bg-[rgba(0,245,255,0.1)] text-[var(--cyan-primary)] font-mono text-xs font-bold">
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
                          ? 'bg-[rgba(0,245,255,0.12)] border-[var(--cyan-primary)] shadow-[0_0_15px_rgba(0,245,255,0.2)] text-white' 
                          : 'bg-[var(--bg-input)] border-[rgba(255,255,255,0.08)] hover:border-[rgba(0,245,255,0.25)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${q.id}`}
                        value={opt.id}
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
          <div className="cyber-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-20 bg-[rgba(15,19,28,0.95)] backdrop-blur border-[var(--cyan-primary)]">
            <div className="text-xs font-mono text-[var(--text-secondary)]">
              Answered: <strong className="text-[var(--cyan-primary)]">{Object.keys(answers).length}</strong> of {questions.length} questions
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="cyber-button-primary text-xs py-2.5 px-6 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>TRANSMITTING ANSWERS...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>FINALIZE & SUBMIT ASSESSMENT</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
