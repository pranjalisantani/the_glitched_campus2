'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { apiFetch } from '../../../lib/api';
import { 
  Layout, 
  ArrowLeft, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  ArrowRight, 
  Layers, 
  FileCode2,
  Cpu
} from 'lucide-react';

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
      const [pList, selRes] = await Promise.all([
        apiFetch<ProblemStatement[]>('/stage4/problems'),
        apiFetch<{ selection: SelectionRecord | null }>('/stage4/my-selection')
      ]);
      setProblems(pList);
      setCurrentSelection(selRes.selection);
    } catch (err: any) {
      if (err.code === 'STAGE_LOCKED' || err.code === 'STAGE_CLOSED') {
        setIsLocked(true);
      }
      setError(err.message || 'Failed to load Stage 4 problems.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProblem = async (problem: ProblemStatement) => {
    if (currentSelection) return;
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

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
      
      {/* Header Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] hover:text-[#ffb703] transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Return to Dashboard</span>
        </Link>

        <span className="cyber-badge cyber-badge-warning">
          STAGE 04 // STATIC PROTOTYPE
        </span>
      </div>

      {/* Stage Banner */}
      <div className="cyber-card p-6 mb-8 border-t-4 border-t-[#ffb703]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white mb-2">
              Stage 4: Architectural Defensive UI Prototype
            </h1>
            <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              Select one problem statement once. Your team will construct a high-fidelity static UI prototype locally. 
              No source-code uploads or deployed links are required. 
              The problem chosen here carries over directly into Stage 5 (Dynamic Website).
            </p>
          </div>

          <div className="text-right font-mono text-xs text-[var(--text-dim)] shrink-0">
            <div>Local Frontend Prototyping</div>
            <div className="text-[11px] text-[#ffb703] mt-1">Carries into Stage 5</div>
          </div>
        </div>
      </div>

      {/* Active Selection Banner */}
      {currentSelection && (
        <div className="cyber-card p-6 mb-8 border-[#ffb703] bg-[rgba(255,183,3,0.04)] shadow-[0_0_20px_rgba(255,183,3,0.15)]">
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
                className={`cyber-card p-6 border transition-all ${
                  isSelected
                    ? 'border-[#ffb703] shadow-[0_0_25px_rgba(255,183,3,0.15)]'
                    : hasChosenOther
                    ? 'opacity-50 border-[rgba(255,255,255,0.06)]'
                    : 'border-[rgba(255,183,3,0.25)] hover:border-[#ffb703]'
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
                      disabled={selectingId === prob.id}
                      className="cyber-button-primary text-xs py-2.5 px-6 flex items-center gap-2"
                    >
                      {selectingId === prob.id ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
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
      <div className="mt-12 p-4 rounded bg-[var(--bg-surface-1)] border border-[rgba(0,245,255,0.15)] flex items-start gap-3 text-xs font-mono text-[var(--text-muted)]">
        <Info size={16} className="text-[var(--cyan-primary)] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[var(--text-secondary)] block">No Remote Code Repository Submissions Required:</strong>
          Teams design and develop prototypes on their local machines. Judges inspect deliverables live during designated assessment sessions.
        </div>
      </div>

    </div>
  );
}
