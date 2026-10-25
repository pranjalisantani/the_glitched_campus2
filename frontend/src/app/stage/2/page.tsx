'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { apiFetch } from '../../../lib/api';
import { 
  Zap, 
  ArrowLeft, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Send, 
  KeyRound,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadChallenges();
    }
  }, [user, authLoading, router]);

  const loadChallenges = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<DecodeChallengeParticipant[]>('/stage2/challenges');
      setChallenges(data);
    } catch (err: any) {
      if (err.code === 'STAGE_LOCKED' || err.code === 'STAGE_CLOSED') {
        setIsLocked(true);
      }
      setError(err.message || 'Failed to load Stage 2 challenges.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (id: string, val: string) => {
    setInputs(prev => ({ ...prev, [id]: val }));
  };

  const handleRequestHint = async (ch: DecodeChallengeParticipant) => {
    if (ch.hintRevealed) return;
    if (!confirm('Requesting a decrypted hint will deduct 2 marks from your stage score (clamped at 0). Do you wish to continue?')) {
      return;
    }

    setHintingId(ch.id);
    try {
      const res = await apiFetch<{ hint: string; message: string }>(`/stage2/challenges/${ch.id}/hint`, {
        method: 'POST'
      });
      setChallenges(prev => prev.map(item => item.id === ch.id ? { ...item, hintRevealed: res.hint } : item));
    } catch (err: any) {
      alert(err.message || 'Failed to unlock hint.');
    } finally {
      setHintingId(null);
    }
  };

  const handleSubmitAnswer = async (ch: DecodeChallengeParticipant) => {
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
      setFeedbacks(prev => ({
        ...prev,
        [ch.id]: { correct: false, message: err.message || 'Submission error.' }
      }));
    } finally {
      setSubmittingId(null);
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

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
      
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-6">
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--violet-primary)] transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Return to Dashboard</span>
        </Link>

        <span className="cyber-badge cyber-badge-violet">
          STAGE 02 // DECODE & ENCODE
        </span>
      </div>

      {/* Stage Header */}
      <div className="cyber-card p-6 mb-8 border-t-4 border-t-[var(--violet-primary)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white mb-2">
              Stage 2: Cryptographic Payload Analysis
            </h1>
            <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              Examine the obfuscated strings recovered from compromised network perimeter nodes.
              Submit decoded plaintexts below. Strict attempt limit: maximum 3 attempts per challenge.
              Each hint used incurs a 2-mark deduction. Scores remain confidential to administrators.
            </p>
          </div>

          <div className="text-right font-mono text-xs text-[var(--text-dim)] shrink-0">
            <div>Maximum Stage Score: <strong className="text-white">10 Marks</strong></div>
            <div className="text-[11px] text-[var(--status-critical)] mt-1">Hint Cost: -2 Marks Each</div>
          </div>
        </div>
      </div>

      {/* Error / Locked Warning */}
      {error && (
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
                className={`cyber-card p-6 border transition-all ${
                  ch.isSolved 
                    ? 'border-[#00ffa3] shadow-[0_0_20px_rgba(0,255,163,0.1)]' 
                    : ch.isLockedOut 
                    ? 'border-[var(--status-critical)]' 
                    : 'border-[rgba(168,85,247,0.25)]'
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

                {/* Encoded Payload Display Container */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-mono text-[var(--text-dim)] tracking-wider uppercase">
                      Intercepted Cipher Payload:
                    </span>
                  </div>
                  <div className="cyber-terminal select-all break-all text-sm font-mono tracking-wider">
                    {ch.encodedPayload}
                  </div>
                </div>

                {/* Hint Section */}
                <div className="mb-4">
                  {ch.hintRevealed ? (
                    <div className="p-3 rounded bg-[rgba(168,85,247,0.1)] border border-[rgba(168,85,247,0.3)] text-xs font-mono text-[var(--violet-primary)] flex items-start gap-2">
                      <HelpCircle size={15} className="shrink-0 mt-0.5" />
                      <div>
                        <strong>DECRYPTED HINT (-2 MARKS APPLIED):</strong>
                        <p className="text-[var(--text-secondary)] mt-0.5">{ch.hintRevealed}</p>
                      </div>
                    </div>
                  ) : ch.hasHint && !ch.isSolved && !ch.isLockedOut ? (
                    <button
                      type="button"
                      onClick={() => handleRequestHint(ch)}
                      disabled={hintingId === ch.id}
                      className="text-xs font-mono text-[var(--violet-primary)] hover:text-[var(--violet-hover)] hover:underline flex items-center gap-1.5"
                    >
                      <KeyRound size={13} />
                      <span>{hintingId === ch.id ? 'Decrypting Hint...' : 'Request Decryption Hint (-2 Marks)'}</span>
                    </button>
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
                      value={inputs[ch.id] || ''}
                      onChange={(e) => handleInputChange(ch.id, e.target.value)}
                      placeholder="Enter decoded answer string..."
                      className="cyber-input flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSubmitAnswer(ch);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSubmitAnswer(ch)}
                      disabled={submittingId === ch.id || !inputs[ch.id]?.trim()}
                      className="cyber-button-primary text-xs py-2.5 px-5 shrink-0 w-full sm:w-auto"
                    >
                      {submittingId === ch.id ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
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

    </div>
  );
}
