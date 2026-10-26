'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, getApiBaseUrl } from '../../lib/api';
import { StageConfig } from './StageControlsTab';
import { 
  FlaskConical, 
  Play, 
  LogOut, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Key, 
  HelpCircle, 
  Download, 
  Database, 
  Layers, 
  Terminal, 
  RefreshCw,
  ArrowRight
} from 'lucide-react';

interface AdminTestModeTabProps {
  stages: StageConfig[];
}

interface TestSessionInfo {
  sessionId: string;
  adminId: string;
  adminEmail: string;
  createdAt: string;
  expiresAt: string;
  stage1Submission?: any;
  stage2?: any;
  stage3DatasetSelection?: any;
  stage4ProblemSelection?: any;
}

export function AdminTestModeTab({ stages }: AdminTestModeTabProps) {
  const [session, setSession] = useState<TestSessionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeStageTest, setActiveStageTest] = useState<'stage1' | 'stage2' | 'stage3' | 'stage4' | 'stage5'>('stage1');

  // Stage 1 Test States
  const [stage1Questions, setStage1Questions] = useState<any[]>([]);
  const [stage1Answers, setStage1Answers] = useState<Record<string, string>>({});
  const [stage1Result, setStage1Result] = useState<any | null>(null);

  // Stage 2 Test States
  const [stage2Challenges, setStage2Challenges] = useState<any[]>([]);
  const [stage2Summary, setStage2Summary] = useState<{ hintsUsedCount: number; deductionMarks: number }>({ hintsUsedCount: 0, deductionMarks: 0 });
  const [stage2Inputs, setStage2Inputs] = useState<Record<string, string>>({});
  const [stage2Feedback, setStage2Feedback] = useState<Record<string, { message: string; isCorrect: boolean }>>({});

  // Stage 3 Test States
  const [stage3Datasets, setStage3Datasets] = useState<any[]>([]);
  const [stage3Selection, setStage3Selection] = useState<any | null>(null);

  // Stage 4 Test States
  const [stage4Problems, setStage4Problems] = useState<any[]>([]);
  const [stage4Selection, setStage4Selection] = useState<any | null>(null);

  // Stage 5 Test States
  const [stage5Data, setStage5Data] = useState<any | null>(null);
  const [stage5Error, setStage5Error] = useState<string | null>(null);

  const showStatus = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const loadSessionStatus = useCallback(async (sessionId: string) => {
    setLoading(true);
    try {
      const res = await apiFetch<{ session: TestSessionInfo }>('/admin/test-mode/session', {
        headers: { 'x-test-session-id': sessionId }
      });
      setSession(res.session);
      if (res.session.stage1Submission) setStage1Result(res.session.stage1Submission);
      if (res.session.stage3DatasetSelection) setStage3Selection(res.session.stage3DatasetSelection);
      if (res.session.stage4ProblemSelection) setStage4Selection(res.session.stage4ProblemSelection);
    } catch {
      localStorage.removeItem('glitched_admin_test_session_id');
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check existing session from localStorage
  useEffect(() => {
    const savedSessionId = localStorage.getItem('glitched_admin_test_session_id');
    if (savedSessionId) {
      loadSessionStatus(savedSessionId);
    }
  }, [loadSessionStatus]);

  const handleStartSession = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ sessionId: string; message: string; createdAt: string; expiresAt: string }>('/admin/test-mode/session', {
        method: 'POST'
      });
      localStorage.setItem('glitched_admin_test_session_id', res.sessionId);
      await loadSessionStatus(res.sessionId);
      showStatus('Isolated test session initialized. You may now test all five stages safely.', 'success');
    } catch (err: any) {
      showStatus(err.message || 'Failed to initialize test session.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!session) return;
    if (!confirm('End current admin test session and purge all temporary test data?')) return;
    setLoading(true);
    try {
      await apiFetch('/admin/test-mode/session/end', {
        method: 'POST',
        headers: { 'x-test-session-id': session.sessionId }
      });
      localStorage.removeItem('glitched_admin_test_session_id');
      setSession(null);
      setStage1Result(null);
      setStage3Selection(null);
      setStage4Selection(null);
      setStage5Data(null);
      showStatus('Admin test session ended. All isolated test state has been purged.', 'info');
    } catch (err: any) {
      showStatus(err.message || 'Failed to end test session.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load data for active stage
  const loadStageTestData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const headers = { 'x-test-session-id': session.sessionId };

    try {
      if (activeStageTest === 'stage1') {
        const questions = await apiFetch<any[]>('/admin/test-mode/stage1/questions', { headers });
        setStage1Questions(questions);
      } else if (activeStageTest === 'stage2') {
        const res = await apiFetch<{ challenges: any[]; summary: any }>('/admin/test-mode/stage2/challenges', { headers });
        setStage2Challenges(res.challenges);
        setStage2Summary(res.summary);
      } else if (activeStageTest === 'stage3') {
        const res = await apiFetch<{ datasets: any[]; testSelection: any }>('/admin/test-mode/stage3/datasets', { headers });
        setStage3Datasets(res.datasets);
        setStage3Selection(res.testSelection);
      } else if (activeStageTest === 'stage4') {
        const res = await apiFetch<{ problems: any[]; testSelection: any }>('/admin/test-mode/stage4/problems', { headers });
        setStage4Problems(res.problems);
        setStage4Selection(res.testSelection);
      } else if (activeStageTest === 'stage5') {
        setStage5Error(null);
        try {
          const res = await apiFetch<any>('/admin/test-mode/stage5/problem', { headers });
          setStage5Data(res);
        } catch (err: any) {
          setStage5Data(null);
          setStage5Error(err.message || 'No Stage 4 test selection found.');
        }
      }
    } catch (err: any) {
      showStatus(err.message || 'Failed to load test stage data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [session, activeStageTest]);

  useEffect(() => {
    if (session) {
      loadStageTestData();
    }
  }, [session, activeStageTest, loadStageTestData]);

  /* ==========================================================================
     STAGE 1 HANDLERS
     ========================================================================== */
  const handleStage1SelectOption = (questionId: string, optionId: string) => {
    setStage1Answers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleStage1Submit = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await apiFetch<any>('/admin/test-mode/stage1/submit', {
        method: 'POST',
        headers: { 'x-test-session-id': session.sessionId },
        body: { answers: stage1Answers }
      });
      setStage1Result(res);
      showStatus(`Test assessment evaluated: ${res.score} / ${res.maxScore} marks. Real team records remain untouched.`, 'success');
    } catch (err: any) {
      showStatus(err.message || 'Stage 1 test submission failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================================
     STAGE 2 HANDLERS
     ========================================================================== */
  const handleStage2Attempt = async (challengeId: string) => {
    if (!session) return;
    const answer = stage2Inputs[challengeId];
    if (!answer) {
      showStatus('Please type an answer to test.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<any>(`/admin/test-mode/stage2/challenges/${challengeId}/attempt`, {
        method: 'POST',
        headers: { 'x-test-session-id': session.sessionId },
        body: { answer }
      });
      setStage2Feedback(prev => ({
        ...prev,
        [challengeId]: { message: res.message, isCorrect: res.isCorrect }
      }));
      await loadStageTestData();
      showStatus(res.message, res.isCorrect ? 'success' : 'info');
    } catch (err: any) {
      showStatus(err.message || 'Attempt failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStage2UnlockHint = async (challengeId: string) => {
    if (!session) return;
    if (!confirm('Unlock hint for this challenge in test mode? A 2-mark deduction will be simulated in this test session.')) return;

    setLoading(true);
    try {
      const res = await apiFetch<any>(`/admin/test-mode/stage2/challenges/${challengeId}/hint`, {
        method: 'POST',
        headers: { 'x-test-session-id': session.sessionId }
      });
      await loadStageTestData();
      showStatus(`Hint unlocked in test session. Penalty: -${res.deductionMarks} marks (test state only).`, 'info');
    } catch (err: any) {
      showStatus(err.message || 'Failed to unlock hint.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================================
     STAGE 3 HANDLERS
     ========================================================================== */
  const handleStage3Select = async (datasetId: string) => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await apiFetch<any>(`/admin/test-mode/stage3/datasets/${datasetId}/select`, {
        method: 'POST',
        headers: { 'x-test-session-id': session.sessionId }
      });
      setStage3Selection(res.selection);
      showStatus(res.message, 'success');
    } catch (err: any) {
      showStatus(err.message || 'Failed to select dataset in test mode.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStage3Download = async (datasetId: string, filename: string) => {
    if (!session) return;
    const downloadUrl = `${getApiBaseUrl()}/admin/test-mode/stage3/datasets/${datasetId}/download`;

    try {
      const token = localStorage.getItem('glitched_auth_token');
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-test-session-id': session.sessionId
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Test download failed.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showStatus(`Authorized test download complete for ${filename}.`, 'success');
    } catch (err: any) {
      showStatus(err.message || 'Test download rejected.', 'error');
    }
  };

  /* ==========================================================================
     STAGE 4 HANDLERS
     ========================================================================== */
  const handleStage4Select = async (problemId: string) => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await apiFetch<any>(`/admin/test-mode/stage4/problems/${problemId}/select`, {
        method: 'POST',
        headers: { 'x-test-session-id': session.sessionId }
      });
      setStage4Selection(res.selection);
      showStatus(res.message, 'success');
    } catch (err: any) {
      showStatus(err.message || 'Failed to select problem statement.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Mode Banner */}
      <div className="cyber-card p-6 border-[#ffaa00] bg-[rgba(255,170,0,0.04)] shadow-[0_0_30px_rgba(255,170,0,0.12)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffaa00] animate-pulse" />
              <span className="font-mono text-xs font-bold tracking-widest uppercase text-[#ffaa00]">
                ⚡ ADMIN TEST MODE // SECURE ISOLATED SANDBOX
              </span>
            </div>
            <h2 className="text-xl font-bold font-mono text-white">
              Administrator End-to-End Stage Simulator
            </h2>
            <p className="text-xs font-mono text-[var(--text-secondary)]">
              All test actions, submissions, hint deductions, and dataset selections operate strictly inside an ephemeral in-memory test session. Real team scores, attempts, and live stage locks remain 100% unaltered.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!session ? (
              <button
                onClick={handleStartSession}
                disabled={loading}
                className="px-4 py-2.5 rounded font-mono text-xs font-bold bg-[#ffaa00] text-black hover:bg-[#ffbb22] transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,170,0,0.3)]"
              >
                <Play size={14} />
                <span>Initialize Test Session</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={loadStageTestData}
                  disabled={loading}
                  className="cyber-button-secondary text-xs px-3 py-2 flex items-center gap-1.5"
                  title="Refresh Test Data"
                >
                  <RefreshCw size={12} />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={handleEndSession}
                  disabled={loading}
                  className="px-3 py-2 rounded font-mono text-xs font-bold border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-1.5"
                >
                  <LogOut size={13} />
                  <span>Exit Test Mode</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Active Session Telemetry Bar */}
        {session && (
          <div className="mt-4 pt-4 border-t border-[rgba(255,170,0,0.2)] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div>
              <span className="text-[var(--text-dim)]">Active Session ID: </span>
              <span className="text-[#ffaa00] font-bold">{session.sessionId}</span>
            </div>
            <div>
              <span className="text-[var(--text-dim)]">Operator: </span>
              <span className="text-white">{session.adminEmail}</span>
            </div>
            <div>
              <span className="text-[var(--text-dim)]">Sandbox TTL: </span>
              <span className="text-[#00ffa3]">2-Hour Auto-Purge Window</span>
            </div>
          </div>
        )}
      </div>

      {statusMessage && (
        <div className={`p-4 rounded text-xs font-mono flex items-center gap-2 ${
          statusMessage.type === 'success' ? 'bg-[rgba(0,255,163,0.12)] border border-[rgba(0,255,163,0.4)] text-[#00ffa3]' :
          statusMessage.type === 'error' ? 'bg-red-500/10 border border-red-500/40 text-red-400' :
          'bg-[rgba(0,245,255,0.1)] border border-[rgba(0,245,255,0.3)] text-[var(--cyan-primary)]'
        }`}>
          {statusMessage.type === 'success' && <CheckCircle size={15} />}
          {statusMessage.type === 'error' && <XCircle size={15} />}
          {statusMessage.type === 'info' && <AlertTriangle size={15} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {!session ? (
        <div className="cyber-card p-12 text-center space-y-4">
          <FlaskConical size={48} className="mx-auto text-[#ffaa00]/60 animate-bounce" />
          <h3 className="text-lg font-bold font-mono text-white">No Active Admin Test Session</h3>
          <p className="text-xs font-mono text-[var(--text-secondary)] max-w-lg mx-auto">
            Click &ldquo;Initialize Test Session&rdquo; above to mount an isolated test sandbox. This allows you to preview questions, test answer evaluation, simulate decode attempts and lockout rules, test dataset downloads, and verify Stage 4/5 continuity without impacting live competition participants.
          </p>
          <button
            onClick={handleStartSession}
            disabled={loading}
            className="px-5 py-2.5 rounded font-mono text-xs font-bold bg-[#ffaa00] text-black hover:bg-[#ffbb22] transition-all inline-flex items-center gap-2"
          >
            <Play size={14} />
            <span>Start Test Session Now</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stage Switcher */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { id: 'stage1', label: '1. Bit Blitz (Quiz)', desc: 'Question & Score Evaluation' },
              { id: 'stage2', label: '2. Decode & Encode', desc: 'Attempts & Hint Deductions' },
              { id: 'stage3', label: '3. Dataset EDA', desc: 'Selection & Secure Download' },
              { id: 'stage4', label: '4. Static Prototype', desc: 'Problem Statement Lock' },
              { id: 'stage5', label: '5. Dynamic Website', desc: 'Continuity Verification' }
            ].map(stage => {
              const liveConfig = stages.find(s => s.id === stage.id);
              const isLocked = liveConfig ? liveConfig.status === 'LOCKED' : false;
              const isCurrent = activeStageTest === stage.id;

              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStageTest(stage.id as any)}
                  className={`p-3 rounded text-left transition-all font-mono border ${
                    isCurrent
                      ? 'bg-[rgba(255,170,0,0.15)] border-[#ffaa00] text-white shadow-[0_0_15px_rgba(255,170,0,0.2)]'
                      : 'bg-[var(--bg-card)] border-[rgba(0,245,255,0.15)] text-[var(--text-secondary)] hover:border-[#ffaa00]/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs">{stage.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      isLocked ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-[#00ffa3]/20 text-[#00ffa3] border border-[#00ffa3]/30'
                    }`}>
                      {isLocked ? 'LOCKED' : 'OPEN'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-dim)] truncate">{stage.desc}</p>
                </button>
              );
            })}
          </div>

          {/* ==========================================================================
             STAGE 1 TEST RUNNER
             ========================================================================== */}
          {activeStageTest === 'stage1' && (
            <div className="cyber-card p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[rgba(0,245,255,0.15)] pb-4">
                <div>
                  <h3 className="text-base font-bold font-mono text-white flex items-center gap-2">
                    <Terminal size={18} className="text-[#ffaa00]" />
                    <span>Stage 1 Test Runner: Bit Blitz Evaluation</span>
                  </h3>
                  <p className="text-xs font-mono text-[var(--text-dim)]">
                    Simulate quiz submission. Shows instant correctness evaluation, correct answers, and explanations in test mode. No countdown timer is present.
                  </p>
                </div>

                <button
                  onClick={handleStage1Submit}
                  disabled={loading || stage1Questions.length === 0}
                  className="cyber-button-primary text-xs py-2 px-4 flex items-center gap-2 self-start md:self-auto"
                >
                  <CheckCircle size={14} />
                  <span>Submit Test Quiz Answers</span>
                </button>
              </div>

              {stage1Result && (
                <div className="p-4 rounded bg-[rgba(0,255,163,0.08)] border border-[rgba(0,255,163,0.3)] space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">Test Submission Result (Isolated Sandbox)</span>
                    <span className="text-[#00ffa3] font-bold text-base">{stage1Result.score} / {stage1Result.maxScore} marks</span>
                  </div>
                  <p className="text-[var(--text-secondary)]">
                    Correct Answers: <strong>{stage1Result.correctAnswersCount} / {stage1Result.totalQuestions}</strong>. Stored under test session <code className="text-[#ffaa00]">{session.sessionId}</code>. Real team records: <strong>UNCHANGED</strong>.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {stage1Questions.map((q, idx) => {
                  const evalResult = stage1Result?.questionResults?.[q.id];
                  const chosenOpt = stage1Answers[q.id];

                  return (
                    <div key={q.id} className="p-4 rounded bg-[var(--bg-input)] border border-[rgba(0,245,255,0.12)] space-y-3 font-mono text-xs">
                      <div className="flex items-start justify-between gap-4">
                        <span className="font-bold text-white">Q{idx + 1}. {q.prompt}</span>
                        {evalResult && (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            evalResult.isCorrect ? 'bg-[#00ffa3]/20 text-[#00ffa3]' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {evalResult.isCorrect ? 'CORRECT' : 'INCORRECT'}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {q.options.map((opt: any) => {
                          const isSelected = chosenOpt === opt.id;
                          const isCorrectOpt = evalResult && evalResult.correctOptionId === opt.id;

                          return (
                            <button
                              key={opt.id}
                              onClick={() => handleStage1SelectOption(q.id, opt.id)}
                              className={`p-2.5 rounded text-left transition-all border ${
                                isSelected
                                  ? 'bg-[rgba(0,245,255,0.2)] border-[var(--cyan-primary)] text-white'
                                  : isCorrectOpt
                                  ? 'bg-[rgba(0,255,163,0.15)] border-[#00ffa3] text-white'
                                  : 'bg-[var(--bg-card)] border-[rgba(255,255,255,0.08)] text-[var(--text-secondary)] hover:text-white'
                              }`}
                            >
                              <span className="font-bold text-[var(--cyan-primary)] mr-2">{opt.id}.</span>
                              <span>{opt.text}</span>
                            </button>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="p-2.5 rounded bg-[rgba(255,170,0,0.06)] border border-[#ffaa00]/30 text-[11px] text-[var(--text-secondary)]">
                          <strong className="text-[#ffaa00]">Admin Note / Explanation: </strong>
                          <span>{q.explanation}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==========================================================================
             STAGE 2 TEST RUNNER
             ========================================================================== */}
          {activeStageTest === 'stage2' && (
            <div className="cyber-card p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[rgba(0,245,255,0.15)] pb-4">
                <div>
                  <h3 className="text-base font-bold font-mono text-white flex items-center gap-2">
                    <Key size={18} className="text-[#ffaa00]" />
                    <span>Stage 2 Test Runner: Decode & Encode Validation</span>
                  </h3>
                  <p className="text-xs font-mono text-[var(--text-dim)]">
                    Test 3-attempt limit, lockout enforcement, and 2-mark hint deduction inside this test session.
                  </p>
                </div>

                <div className="flex items-center gap-4 font-mono text-xs">
                  <div>
                    <span className="text-[var(--text-dim)]">Hints Used: </span>
                    <span className="text-white font-bold">{stage2Summary.hintsUsedCount}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-dim)]">Test Deduction: </span>
                    <span className="text-red-400 font-bold">-{stage2Summary.deductionMarks} marks</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {stage2Challenges.map((ch, idx) => {
                  const feedback = stage2Feedback[ch.id];
                  const attemptsLeft = ch.maxAttempts - ch.attemptsUsed;

                  return (
                    <div key={ch.id} className="p-4 rounded bg-[var(--bg-input)] border border-[rgba(0,245,255,0.12)] space-y-4 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">Challenge #{idx + 1}: {ch.title}</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            ch.isSolved ? 'bg-[#00ffa3]/20 text-[#00ffa3]' :
                            ch.isLockedOut ? 'bg-red-500/20 text-red-400' :
                            'bg-[rgba(0,245,255,0.15)] text-[var(--cyan-primary)]'
                          }`}>
                            {ch.isSolved ? 'SOLVED' : ch.isLockedOut ? 'LOCKED OUT' : `${attemptsLeft} Attempt(s) Left`}
                          </span>
                        </div>
                      </div>

                      <p className="text-[var(--text-secondary)]">{ch.description}</p>

                      <div className="p-3 rounded bg-[var(--bg-card)] border border-[rgba(0,245,255,0.2)]">
                        <span className="text-[10px] text-[var(--text-dim)] block mb-1">ENCODED CIPHERTEXT:</span>
                        <code className="text-[#00ffa3] font-mono break-all">{ch.encodedPayload}</code>
                      </div>

                      {ch.expectedAnswer && (
                        <div className="text-[11px] text-[var(--text-dim)]">
                          <span className="text-[#ffaa00]">Expected Plaintext (Admin Reference): </span>
                          <code className="text-white font-bold">{ch.expectedAnswer}</code>
                        </div>
                      )}

                      {/* Hint section */}
                      {ch.hintRevealed ? (
                        <div className="p-3 rounded bg-[rgba(255,170,0,0.08)] border border-[#ffaa00]/30 text-[11px] text-white">
                          <strong className="text-[#ffaa00]">Test Session Hint: </strong>
                          <span>{ch.hintRevealed}</span>
                        </div>
                      ) : ch.hasHint && (
                        <button
                          onClick={() => handleStage2UnlockHint(ch.id)}
                          disabled={loading || ch.isSolved}
                          className="text-[11px] font-bold text-[#ffaa00] hover:underline flex items-center gap-1.5"
                        >
                          <HelpCircle size={13} />
                          <span>Unlock Hint (Simulates 2-mark deduction in test state)</span>
                        </button>
                      )}

                      {/* Attempt Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={ch.isLockedOut ? 'Terminal locked out for this challenge' : 'Enter test answer...'}
                          disabled={ch.isSolved || ch.isLockedOut || loading}
                          value={stage2Inputs[ch.id] || ''}
                          onChange={(e) => setStage2Inputs(prev => ({ ...prev, [ch.id]: e.target.value }))}
                          className="flex-1 cyber-input text-xs"
                        />
                        <button
                          onClick={() => handleStage2Attempt(ch.id)}
                          disabled={ch.isSolved || ch.isLockedOut || loading}
                          className="cyber-button-primary text-xs px-4"
                        >
                          Test Attempt
                        </button>
                      </div>

                      {feedback && (
                        <div className={`p-2 rounded text-[11px] ${
                          feedback.isCorrect ? 'text-[#00ffa3]' : 'text-red-400'
                        }`}>
                          {feedback.message}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==========================================================================
             STAGE 3 TEST RUNNER
             ========================================================================== */}
          {activeStageTest === 'stage3' && (
            <div className="cyber-card p-6 space-y-6">
              <div className="border-b border-[rgba(0,245,255,0.15)] pb-4">
                <h3 className="text-base font-bold font-mono text-white flex items-center gap-2">
                  <Database size={18} className="text-[#ffaa00]" />
                  <span>Stage 3 Test Runner: Dataset Selection & Authorized Download</span>
                </h3>
                <p className="text-xs font-mono text-[var(--text-dim)]">
                  Simulate team dataset selection. Downloads are authorized only for the currently selected dataset in this test session.
                </p>
              </div>

              {stage3Selection && (
                <div className="p-4 rounded bg-[rgba(0,255,163,0.08)] border border-[rgba(0,255,163,0.3)] font-mono text-xs flex items-center justify-between">
                  <div>
                    <span className="text-[var(--text-dim)]">Current Test Session Selection: </span>
                    <strong className="text-white">{stage3Selection.datasetName}</strong>
                    <span className="text-[var(--text-dim)] ml-2">({stage3Selection.datasetId})</span>
                  </div>
                  <span className="text-[#00ffa3] font-bold">AUTHORIZED FOR DOWNLOAD</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stage3Datasets.map(dataset => {
                  const isSelected = stage3Selection && stage3Selection.datasetId === dataset.id;

                  return (
                    <div
                      key={dataset.id}
                      className={`p-4 rounded font-mono text-xs space-y-3 border transition-all ${
                        isSelected
                          ? 'bg-[rgba(0,255,163,0.06)] border-[#00ffa3]'
                          : 'bg-[var(--bg-input)] border-[rgba(0,245,255,0.12)]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-white text-sm">{dataset.name}</h4>
                          <span className="text-[10px] text-[var(--cyan-primary)] font-bold">{dataset.format} {'//'} {dataset.size}</span>
                        </div>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-[#00ffa3]/20 text-[#00ffa3] font-bold">
                            SELECTED IN TEST
                          </span>
                        )}
                      </div>

                      <p className="text-[var(--text-secondary)]">{dataset.description}</p>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => handleStage3Select(dataset.id)}
                          disabled={loading || isSelected}
                          className={`text-xs px-3 py-1.5 rounded font-bold transition-all ${
                            isSelected
                              ? 'bg-[var(--bg-card)] text-[var(--text-dim)] cursor-default'
                              : 'cyber-button-primary'
                          }`}
                        >
                          {isSelected ? 'Currently Selected' : 'Select for Test Session'}
                        </button>

                        <button
                          onClick={() => handleStage3Download(dataset.id, dataset.filename)}
                          disabled={loading}
                          className={`text-xs px-3 py-1.5 rounded font-bold border transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'border-[#00ffa3] text-[#00ffa3] hover:bg-[#00ffa3]/10'
                              : 'border-white/20 text-[var(--text-secondary)] hover:text-white'
                          }`}
                          title={isSelected ? 'Download authorized' : 'Download unauthorized (demonstrates 403 enforcement)'}
                        >
                          <Download size={13} />
                          <span>Test Download</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==========================================================================
             STAGE 4 TEST RUNNER
             ========================================================================== */}
          {activeStageTest === 'stage4' && (
            <div className="cyber-card p-6 space-y-6">
              <div className="border-b border-[rgba(0,245,255,0.15)] pb-4">
                <h3 className="text-base font-bold font-mono text-white flex items-center gap-2">
                  <Layers size={18} className="text-[#ffaa00]" />
                  <span>Stage 4 Test Runner: Static Prototype Problem Selection</span>
                </h3>
                <p className="text-xs font-mono text-[var(--text-dim)]">
                  Select a problem statement within this test session. This selection strictly controls Stage 5 continuity testing.
                </p>
              </div>

              {stage4Selection && (
                <div className="p-4 rounded bg-[rgba(0,255,163,0.08)] border border-[rgba(0,255,163,0.3)] font-mono text-xs flex items-center justify-between">
                  <div>
                    <span className="text-[var(--text-dim)]">Locked Test Problem Selection: </span>
                    <strong className="text-white">{stage4Selection.problemTitle}</strong>
                  </div>
                  <button
                    onClick={() => setActiveStageTest('stage5')}
                    className="text-xs text-[#00ffa3] hover:underline flex items-center gap-1 font-bold"
                  >
                    <span>Verify Stage 5 Continuity</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stage4Problems.map(prob => {
                  const isSelected = stage4Selection && stage4Selection.problemId === prob.id;

                  return (
                    <div
                      key={prob.id}
                      className={`p-4 rounded font-mono text-xs space-y-3 border transition-all ${
                        isSelected
                          ? 'bg-[rgba(0,255,163,0.06)] border-[#00ffa3]'
                          : 'bg-[var(--bg-input)] border-[rgba(0,245,255,0.12)]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-white text-sm">{prob.title}</h4>
                          <span className="text-[10px] text-[var(--cyan-primary)] font-bold">{prob.category}</span>
                        </div>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-[#00ffa3]/20 text-[#00ffa3] font-bold">
                            LOCKED FOR TEST
                          </span>
                        )}
                      </div>

                      <p className="text-[var(--text-secondary)]">{prob.summary}</p>

                      <div className="pt-2">
                        <button
                          onClick={() => handleStage4Select(prob.id)}
                          disabled={loading || isSelected}
                          className={`text-xs px-4 py-2 rounded font-bold transition-all ${
                            isSelected
                              ? 'bg-[var(--bg-card)] text-[var(--text-dim)] cursor-default'
                              : 'cyber-button-primary'
                          }`}
                        >
                          {isSelected ? 'Locked in Test Session' : 'Lock Selection in Test Session'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==========================================================================
             STAGE 5 TEST RUNNER
             ========================================================================== */}
          {activeStageTest === 'stage5' && (
            <div className="cyber-card p-6 space-y-6">
              <div className="border-b border-[rgba(0,245,255,0.15)] pb-4">
                <h3 className="text-base font-bold font-mono text-white flex items-center gap-2">
                  <Play size={18} className="text-[#ffaa00]" />
                  <span>Stage 5 Test Runner: Dynamic Website Continuity</span>
                </h3>
                <p className="text-xs font-mono text-[var(--text-dim)]">
                  Verifies that Stage 5 strictly inherits the problem statement selected in Stage 4 test mode, without falling back to any real participant team selection.
                </p>
              </div>

              {stage5Error ? (
                <div className="p-6 rounded bg-red-500/10 border border-red-500/40 font-mono text-xs space-y-4">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                    <AlertTriangle size={18} />
                    <span>Stage 4 Test Selection Required (Error 400)</span>
                  </div>
                  <p className="text-white">
                    {stage5Error}
                  </p>
                  <p className="text-[var(--text-secondary)]">
                    In participant mode, teams cannot access Stage 5 without selecting a problem statement in Stage 4. In admin test mode, this rule is strictly preserved: the test session must have a Stage 4 selection. It never falls back to a participant team&apos;s selection.
                  </p>
                  <button
                    onClick={() => setActiveStageTest('stage4')}
                    className="cyber-button-primary text-xs py-2 px-4 flex items-center gap-2"
                  >
                    <span>Go to Stage 4 Test Runner to Select Problem</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ) : stage5Data ? (
                <div className="space-y-6 font-mono text-xs">
                  <div className="p-4 rounded bg-[rgba(0,255,163,0.08)] border border-[rgba(0,255,163,0.3)] space-y-1">
                    <div className="flex items-center gap-2 text-[#00ffa3] font-bold text-sm">
                      <CheckCircle size={16} />
                      <span>CONTINUITY VERIFIED: Problem Inherited from Test Session</span>
                    </div>
                    <p className="text-[var(--text-secondary)]">
                      Selection Timestamp: <strong>{new Date(stage5Data.selectionTimestamp).toLocaleString()}</strong>
                    </p>
                  </div>

                  <div className="cyber-card p-6 space-y-4">
                    <div className="border-b border-[rgba(0,245,255,0.15)] pb-3">
                      <span className="text-[10px] text-[var(--cyan-primary)] font-bold">{stage5Data.problem.category}</span>
                      <h4 className="text-lg font-bold text-white mt-1">{stage5Data.problem.title}</h4>
                      <p className="text-[var(--text-secondary)] mt-1">{stage5Data.problem.summary}</p>
                    </div>

                    <div className="space-y-2">
                      <strong className="text-white text-xs block">STAGE 5 ADVANCED SPECIFICATIONS & DELIVERABLES:</strong>
                      <p className="text-[var(--text-secondary)] leading-relaxed">
                        {stage5Data.problem.stage5Instructions || stage5Data.problem.fullDescription}
                      </p>
                      {stage5Data.problem.stage5Deliverables && (
                        <div className="p-3 rounded bg-[var(--bg-input)] border border-[rgba(0,245,255,0.15)] mt-3">
                          <strong className="text-[var(--cyan-primary)] block mb-1">Required Deliverables:</strong>
                          <span className="text-white">{stage5Data.problem.stage5Deliverables}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-xs font-mono text-[var(--text-dim)]">
                  Loading Stage 5 continuity telemetry...
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
