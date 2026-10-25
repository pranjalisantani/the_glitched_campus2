'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { apiFetch } from '../../../lib/api';
import { 
  Code2, 
  ArrowLeft, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  ArrowRight, 
  Sparkles, 
  Terminal,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

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
      const res = await apiFetch<Stage5Data>('/stage5/problem');
      setData(res);
    } catch (err: any) {
      if (err.code === 'STAGE_LOCKED' || err.code === 'STAGE_CLOSED') {
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

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
      
      {/* Header Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] hover:text-[#ff3366] transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Return to Dashboard</span>
        </Link>

        <span className="cyber-badge cyber-badge-critical">
          STAGE 05 // DYNAMIC APPLICATION
        </span>
      </div>

      {/* Stage Banner */}
      <div className="cyber-card p-6 mb-8 border-t-4 border-t-[#ff3366]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white mb-2">
              Stage 5: Full-Stack Dynamic Web Application
            </h1>
            <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              Teams advance their static prototype into an interactive dynamic web application. 
              The problem statement below was locked in during Stage 4 and verified through backend continuity.
              Teams develop locally without external hosting or repo link requirements.
            </p>
          </div>

          <div className="text-right font-mono text-xs text-[var(--text-dim)] shrink-0">
            <div>Stage 4 Continuity: <strong className="text-[#00ffa3]">VERIFIED</strong></div>
            <div className="text-[11px] text-[#ff3366] mt-1">Dynamic State & Logic</div>
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
          <div className="cyber-card p-6 border-[#ff3366] shadow-[0_0_25px_rgba(255,51,102,0.12)]">
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
            <div className="p-5 rounded bg-[var(--bg-input)] border border-[rgba(255,51,102,0.3)] mb-6">
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
            <div className="p-4 rounded bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)]">
              <span className="text-[11px] font-mono uppercase text-[var(--text-dim)] block mb-1">
                Foundation from Stage 4 (Static Prototype):
              </span>
              <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                {data.problem.stage4Instructions}
              </p>
            </div>
          </div>

          {/* Local Development Protocol */}
          <div className="p-5 rounded-lg bg-[var(--bg-surface-1)] border border-[rgba(0,245,255,0.15)] flex items-start gap-3 text-xs font-mono text-[var(--text-muted)]">
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
  );
}
