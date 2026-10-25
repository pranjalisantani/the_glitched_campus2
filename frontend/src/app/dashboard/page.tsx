'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { 
  Users, 
  Terminal, 
  Zap, 
  Database, 
  Layout, 
  Code2, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  RefreshCw, 
  ArrowRight, 
  AlertCircle,
  Clock,
  ShieldAlert
} from 'lucide-react';

interface StageConfig {
  id: string;
  name: string;
  order: number;
  status: 'LOCKED' | 'OPEN' | 'CLOSED';
  description: string;
  maxScore?: number;
}

interface TeamProgressData {
  stage1: {
    hasSubmitted: boolean;
    submittedAt: string | null;
  };
  stage2: {
    hintsUsed: number;
    challenges: Record<string, any>;
  };
  stage3: {
    hasSelected: boolean;
    selection: { datasetName: string; selectedAt: string } | null;
  };
  stage4: {
    hasSelected: boolean;
    selection: { problemTitle: string; selectedAt: string } | null;
  };
  stage5: {
    hasSelectedProblem: boolean;
    selectedProblemTitle: string | null;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [stages, setStages] = useState<StageConfig[]>([]);
  const [progress, setProgress] = useState<TeamProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [stagesData, meData] = await Promise.all([
        apiFetch<StageConfig[]>('/stages'),
        apiFetch<{ progress: TeamProgressData }>('/auth/me')
      ]);
      setStages(stagesData);
      setProgress(meData.progress);
      setErrorNotice(null);
    } catch (err: any) {
      console.warn('Dashboard sync failed:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchDashboardData();
      const interval = setInterval(() => fetchDashboardData(), 8000); // 8s live refresh
      return () => clearInterval(interval);
    }
  }, [user, authLoading, router, fetchDashboardData]);

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center font-mono text-sm text-[var(--cyan-primary)]">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[var(--cyan-primary)] border-t-transparent rounded-full animate-spin" />
          <span>Synchronizing team telemetry records...</span>
        </div>
      </div>
    );
  }

  const getStageIcon = (order: number) => {
    switch (order) {
      case 1: return <Terminal size={22} className="text-[var(--cyan-primary)]" />;
      case 2: return <Zap size={22} className="text-[var(--violet-primary)]" />;
      case 3: return <Database size={22} className="text-[#00ffa3]" />;
      case 4: return <Layout size={22} className="text-[#ffb703]" />;
      case 5: return <Code2 size={22} className="text-[#ff3366]" />;
      default: return <Terminal size={22} />;
    }
  };

  const getProgressStatus = (order: number) => {
    if (!progress) return null;

    switch (order) {
      case 1:
        return progress.stage1.hasSubmitted ? (
          <span className="text-[11px] font-mono text-[#00ffa3] flex items-center gap-1">
            <CheckCircle2 size={13} />
            <span>Assessment Submitted</span>
          </span>
        ) : (
          <span className="text-[11px] font-mono text-[var(--text-dim)]">
            Awaiting Submission
          </span>
        );
      case 2:
        const solvedCount = Object.values(progress.stage2.challenges || {}).filter((c: any) => c.isSolved).length;
        return (
          <span className="text-[11px] font-mono text-[var(--text-secondary)]">
            {solvedCount} Decoded | {progress.stage2.hintsUsed} Hint(s) Used
          </span>
        );
      case 3:
        return progress.stage3.hasSelected ? (
          <span className="text-[11px] font-mono text-[#00ffa3] flex items-center gap-1">
            <CheckCircle2 size={13} />
            <span className="truncate max-w-[180px]">{progress.stage3.selection?.datasetName}</span>
          </span>
        ) : (
          <span className="text-[11px] font-mono text-[var(--text-dim)]">
            Dataset Not Selected
          </span>
        );
      case 4:
        return progress.stage4.hasSelected ? (
          <span className="text-[11px] font-mono text-[#00ffa3] flex items-center gap-1">
            <CheckCircle2 size={13} />
            <span className="truncate max-w-[180px]">{progress.stage4.selection?.problemTitle}</span>
          </span>
        ) : (
          <span className="text-[11px] font-mono text-[var(--text-dim)]">
            Problem Not Selected
          </span>
        );
      case 5:
        return progress.stage5.hasSelectedProblem ? (
          <span className="text-[11px] font-mono text-[#00ffa3] flex items-center gap-1">
            <CheckCircle2 size={13} />
            <span>Continuity Active</span>
          </span>
        ) : (
          <span className="text-[11px] font-mono text-[var(--text-dim)]">
            Requires Stage 4 Selection
          </span>
        );
      default:
        return null;
    }
  };

  const handleCardClick = (stage: StageConfig) => {
    if (stage.status === 'LOCKED') {
      setErrorNotice(`${stage.name} is currently locked by the administrator. Await event clearance.`);
      return;
    }
    router.push(`/stage/${stage.order}`);
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col">
      
      {/* Team Header Banner */}
      <div className="w-full cyber-card p-6 mb-8 border-[var(--cyan-border)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="hud-dot" />
            <span className="font-mono text-xs text-[var(--cyan-primary)] uppercase tracking-wider">
              OPERATIONAL WORKSPACE
            </span>
          </div>
          <h1 className="text-3xl font-bold font-mono text-white">
            Team: {user?.teamName}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs font-mono text-[var(--text-muted)] flex items-center gap-1">
              <Users size={14} />
              <span>Members:</span>
            </span>
            {user?.members.map((member, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded bg-[rgba(0,245,255,0.08)] border border-[rgba(0,245,255,0.2)] text-xs font-mono text-[var(--cyan-primary)]"
              >
                {member}
              </span>
            ))}
          </div>
        </div>

        {/* Sync telemetry action */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="cyber-button-secondary text-xs px-4 py-2 flex items-center gap-2"
            title="Refresh stage statuses from server"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Sync Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* Temporary Alert Notice */}
      {errorNotice && (
        <div 
          role="alert" 
          className="mb-6 p-4 rounded bg-[rgba(255,183,3,0.12)] border border-[rgba(255,183,3,0.4)] flex items-center justify-between text-xs font-mono text-[var(--status-warning)]"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{errorNotice}</span>
          </div>
          <button 
            onClick={() => setErrorNotice(null)}
            className="text-[var(--text-muted)] hover:text-white ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 5 Stage Cards */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold font-mono text-white flex items-center gap-2">
          <ShieldAlert size={20} className="text-[var(--cyan-primary)]" />
          <span>STAGE OPERATIONAL CARDS</span>
        </h2>
        <span className="text-xs font-mono text-[var(--text-dim)]">
          Auto-polling every 8 seconds
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {stages.map((stage) => {
          const isOpen = stage.status === 'OPEN';
          const isClosed = stage.status === 'CLOSED';
          const isLocked = stage.status === 'LOCKED';

          return (
            <div
              key={stage.id}
              onClick={() => handleCardClick(stage)}
              className={`cyber-card p-6 flex flex-col justify-between cursor-pointer transition-all ${
                isOpen 
                  ? 'border-[var(--cyan-primary)] shadow-[0_0_20px_rgba(0,245,255,0.2)] hover:shadow-[0_0_30px_rgba(0,245,255,0.4)] hover:-translate-y-1' 
                  : isClosed
                  ? 'border-[rgba(255,51,102,0.3)] opacity-75'
                  : 'border-[rgba(255,255,255,0.1)] opacity-70 hover:opacity-90'
              }`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded bg-[rgba(0,245,255,0.08)] border border-[rgba(0,245,255,0.2)]">
                      {getStageIcon(stage.order)}
                    </div>
                    <span className="font-mono text-xs text-[var(--text-dim)] uppercase">
                      Stage 0{stage.order}
                    </span>
                  </div>

                  {isOpen && (
                    <span className="cyber-badge cyber-badge-success flex items-center gap-1">
                      <Unlock size={12} />
                      <span>OPEN</span>
                    </span>
                  )}
                  {isClosed && (
                    <span className="cyber-badge cyber-badge-critical flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      <span>CLOSED</span>
                    </span>
                  )}
                  {isLocked && (
                    <span className="cyber-badge cyber-badge-warning flex items-center gap-1">
                      <Lock size={12} />
                      <span>LOCKED</span>
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold font-mono text-white mb-2">
                  {stage.name}
                </h3>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
                  {stage.description}
                </p>
              </div>

              {/* Progress and Action Footer */}
              <div className="pt-4 border-t border-[rgba(0,245,255,0.12)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono text-[var(--text-dim)]">Status:</span>
                  {getProgressStatus(stage.order)}
                </div>

                {isOpen ? (
                  <button className="cyber-button-primary w-full text-xs py-2 flex items-center justify-center gap-1.5">
                    <span>ENTER TERMINAL</span>
                    <ArrowRight size={14} />
                  </button>
                ) : isClosed ? (
                  <button disabled className="cyber-button-secondary w-full text-xs py-2 opacity-50 cursor-not-allowed">
                    STAGE CONCLUDED
                  </button>
                ) : (
                  <button disabled className="cyber-button-secondary w-full text-xs py-2 opacity-60 cursor-not-allowed flex items-center justify-center gap-1.5">
                    <Lock size={13} />
                    <span>LOCKED BY ADMIN</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
