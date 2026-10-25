'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { STAGES_METADATA } from '../../lib/stages';
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
  Shield,
  Radio,
  Crosshair,
  Play
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
    challenges: Record<string, { isSolved?: boolean; attemptsUsed?: number }>;
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

  // Stage completion evaluator based on real application state
  const isStageCompleted = useCallback((order: number): boolean => {
    if (!progress) return false;
    switch (order) {
      case 1:
        return Boolean(progress.stage1?.hasSubmitted);
      case 2: {
        const challenges = progress.stage2?.challenges || {};
        const entries = Object.values(challenges);
        return entries.length > 0 && entries.every((c) => c.isSolved);
      }
      case 3:
        return Boolean(progress.stage3?.hasSelected);
      case 4:
        return Boolean(progress.stage4?.hasSelected);
      case 5:
        return Boolean(progress.stage5?.hasSelectedProblem);
      default:
        return false;
    }
  }, [progress]);

  // Compute completed count and progress percentage
  const completedCount = useMemo(() => {
    return [1, 2, 3, 4, 5].filter(num => isStageCompleted(num)).length;
  }, [isStageCompleted]);

  const progressPercentage = Math.round((completedCount / 5) * 100);

  // Compute active / next actionable stage
  const activeStage = useMemo(() => {
    if (!stages.length) return null;
    // Find first stage that is OPEN and not yet completed
    for (const s of stages) {
      if (s.status === 'OPEN' && !isStageCompleted(s.order)) {
        return s;
      }
    }
    // If all open are completed, return last open stage or first stage
    const openStages = stages.filter(s => s.status === 'OPEN');
    return openStages[openStages.length - 1] || stages[0];
  }, [stages, isStageCompleted]);

  const getStageIcon = (order: number) => {
    switch (order) {
      case 1: return <Terminal size={20} className="text-[var(--cyan-primary)]" />;
      case 2: return <Zap size={20} className="text-[var(--violet-primary)]" />;
      case 3: return <Database size={20} className="text-[#00ffa3]" />;
      case 4: return <Layout size={20} className="text-[#ffb703]" />;
      case 5: return <Code2 size={20} className="text-[#ff3366]" />;
      default: return <Terminal size={20} />;
    }
  };

  const getStageDetail = (order: number): { label: string; isComplete: boolean } => {
    if (!progress) return { label: 'Syncing telemetry...', isComplete: false };

    switch (order) {
      case 1:
        return progress.stage1.hasSubmitted
          ? { label: 'Security assessment submitted', isComplete: true }
          : { label: 'Awaiting submission', isComplete: false };
      case 2: {
        const challenges = progress.stage2.challenges || {};
        const entries = Object.values(challenges);
        const solved = entries.filter((c) => c.isSolved).length;
        const total = entries.length || 3;
        const hints = progress.stage2.hintsUsed || 0;
        return solved === total && total > 0
          ? { label: `All ${solved} cipher payloads neutralized`, isComplete: true }
          : { label: `${solved}/${total} solved | ${hints} hint(s) used`, isComplete: solved > 0 };
      }
      case 3:
        return progress.stage3.hasSelected
          ? { label: `Committed: ${progress.stage3.selection?.datasetName || 'Dataset selected'}`, isComplete: true }
          : { label: 'Dataset selection pending', isComplete: false };
      case 4:
        return progress.stage4.hasSelected
          ? { label: `Assigned: ${progress.stage4.selection?.problemTitle || 'Directive locked'}`, isComplete: true }
          : { label: 'Problem statement unassigned', isComplete: false };
      case 5:
        return progress.stage5.hasSelectedProblem
          ? { label: `Continuity: ${progress.stage5.selectedProblemTitle || 'Verified'}`, isComplete: true }
          : progress.stage4.hasSelected
          ? { label: 'Ready for dynamic implementation', isComplete: false }
          : { label: 'Requires Stage 4 selection first', isComplete: false };
      default:
        return { label: 'Awaiting telemetry', isComplete: false };
    }
  };

  const handleStageClick = (stage: StageConfig) => {
    if (stage.status === 'LOCKED') {
      setErrorNotice(`${stage.name} is currently locked by event administrators. Await signal clearance.`);
      return;
    }
    router.push(`/stage/${stage.order}`);
  };

  const handleContinueMission = () => {
    if (!activeStage) return;
    if (activeStage.status === 'LOCKED') {
      setErrorNotice('The next mission sector is currently locked. Please monitor event coordinator announcements.');
      return;
    }
    router.push(`/stage/${activeStage.order}`);
  };

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center font-mono text-sm text-[var(--cyan-primary)]">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[var(--cyan-primary)] border-t-transparent rounded-full animate-spin" />
          <span>Mounting tactical mission war room telemetry...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full flex-1 flex flex-col justify-between overflow-hidden">

      {/* Background: Tactical Cyber War Room Backdrop */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <Image
          src="/images/mission_briefing_bg.jpg"
          alt="Tactical Cyber War Room Environment"
          fill
          priority
          className="object-cover object-center opacity-30 scale-105 transition-transform duration-1000 ease-out"
        />
        {/* Atmosphere Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050608] via-[rgba(5,6,8,0.85)] to-[rgba(5,6,8,0.5)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-transparent to-[rgba(5,6,8,0.7)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_35%,rgba(0,245,255,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_60%,rgba(168,85,247,0.08),transparent_50%)]" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex-1 flex flex-col gap-8">

        {/* Tactical Header Bar */}
        <div className="w-full p-5 sm:p-6 rounded-2xl bg-[rgba(9,11,16,0.85)] border border-[rgba(255,255,255,0.08)] backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--cyan-primary)] animate-pulse" aria-hidden="true" />
              <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--cyan-primary)] font-bold">
                TACTICAL MISSION BRIEFING // SECTOR 07
              </span>
            </div>

            <h1 className="glitch-title text-2xl sm:text-3xl font-black font-mono text-white tracking-tight" data-text={`SQUAD: ${user?.teamName || ''}`}>
              SQUAD: {user?.teamName}
            </h1>

            {/* Operatives List */}
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <span className="text-xs font-mono text-[var(--text-muted)] flex items-center gap-1">
                <Users size={13} className="text-[var(--cyan-primary)]" />
                <span>Unit Operatives:</span>
              </span>
              {user?.members.map((member, i) => (
                <span
                  key={i}
                  className="px-2.5 py-0.5 rounded-full bg-[rgba(0,245,255,0.06)] border border-[rgba(0,245,255,0.2)] text-xs font-mono text-[var(--cyan-primary)]"
                >
                  {member}
                </span>
              ))}
            </div>
          </div>

          {/* Telemetry Actions & Overall Progress Meter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-[rgba(255,255,255,0.06)]">

            {/* Progress Telemetry */}
            <div className="font-mono text-right flex flex-col items-start sm:items-end">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                INVESTIGATION CLEARANCE
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl font-black text-white">{completedCount} / 5</span>
                <span className="text-xs text-[var(--cyan-primary)] font-bold">({progressPercentage}%)</span>
              </div>
              {/* Mini Progress Bar */}
              <div className="w-32 h-1.5 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden mt-1.5">
                <div
                  className="h-full bg-gradient-to-r from-[var(--cyan-primary)] to-[var(--violet-primary)] transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Sync telemetry action */}
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="cyber-button-secondary text-xs px-3.5 py-2 flex items-center gap-2 shrink-0 cursor-pointer"
              title="Refresh telemetry from server"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync Telemetry'}</span>
            </button>
          </div>
        </div>

        {/* Temporary Alert Notice */}
        {errorNotice && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-[rgba(255,183,3,0.12)] border border-[rgba(255,183,3,0.35)] flex items-center justify-between text-xs font-mono text-[var(--status-warning)] shadow-lg"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorNotice}</span>
            </div>
            <button
              onClick={() => setErrorNotice(null)}
              className="text-[var(--text-muted)] hover:text-white ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Prominent Current Mission Dossier / Floating HUD */}
        {activeStage && (
          <div className="w-full p-6 sm:p-8 rounded-2xl bg-[rgba(9,11,16,0.85)] border border-[rgba(0,245,255,0.35)] backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.85),0_0_20px_rgba(0,245,255,0.12)] relative overflow-hidden">

            {/* Ambient Background Glow Spot */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(circle,rgba(0,245,255,0.08),transparent_70%)] pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

              {/* Left Column: Mission Narrative & CTA */}
              <div className="lg:col-span-8 flex flex-col items-start text-left">

                {/* Sector Clearance Pill */}
                <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-[rgba(0,245,255,0.08)] border border-[rgba(0,245,255,0.25)] font-mono text-xs text-[var(--cyan-primary)] font-bold">
                  <Crosshair size={13} className="animate-spin text-[var(--cyan-primary)]" />
                  <span>ACTIVE DIRECTIVE // OBJECTIVE 0{activeStage.order}</span>
                </div>

                {/* Stage Title */}
                <h2 className="text-2xl sm:text-4xl font-black font-mono text-white tracking-tight mb-2">
                  {activeStage.name}
                </h2>

                {/* Directive Narrative */}
                <p className="text-sm sm:text-base text-[var(--text-secondary)] font-sans leading-relaxed max-w-2xl mb-6">
                  {STAGES_METADATA.find(m => m.number === activeStage.order)?.description || activeStage.description}
                </p>

                {/* Real Application State Information */}
                <div className="flex flex-wrap items-center gap-4 mb-8 font-mono text-xs">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-[var(--text-secondary)]">
                    <Radio size={14} className="text-[var(--cyan-primary)]" />
                    <span>Status: <strong className="text-white">{getStageDetail(activeStage.order).label}</strong></span>
                  </div>

                  {activeStage.maxScore && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-[var(--text-secondary)]">
                      <Shield size={14} className="text-[var(--violet-primary)]" />
                      <span>Max Potential: <strong className="text-white">{activeStage.maxScore} Marks</strong></span>
                    </div>
                  )}
                </div>

                {/* The ONE Visually Dominant Primary Action: CONTINUE MISSION */}
                <div>
                  <button
                    onClick={handleContinueMission}
                    disabled={activeStage.status === 'LOCKED'}
                    id="continue-mission-cta"
                    className="group relative inline-flex items-center gap-3 px-8 sm:px-10 py-4 rounded-full bg-[rgba(0,245,255,0.18)] hover:bg-[rgba(0,245,255,0.28)] border-2 border-[var(--cyan-primary)] text-white font-mono text-sm sm:text-base font-bold tracking-wider uppercase cyber-cta-glow transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <span className="text-[var(--cyan-primary)] group-hover:text-white transition-colors">
                      {isStageCompleted(activeStage.order) ? 'REVIEW MISSION DIRECTIVE' : 'CONTINUE MISSION'}
                    </span>
                    <ArrowRight
                      size={18}
                      className="text-[var(--cyan-primary)] group-hover:text-white transition-transform duration-300 group-hover:translate-x-1.5"
                      aria-hidden="true"
                    />
                  </button>
                </div>

              </div>

              {/* Right Column: Tactical Mission Dossier Intel */}
              <div className="lg:col-span-4 flex flex-col gap-4 font-mono text-xs">
                <div className="p-5 rounded-xl bg-[rgba(5,6,8,0.7)] border border-[rgba(255,255,255,0.08)]">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] mb-3 pb-2 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                    <span>SECTOR CLEARANCE DOSSIER</span>
                    <span className="text-[var(--cyan-primary)]">SYS_AUTH_OK</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-muted)]">Security Perimeter:</span>
                      <span className="text-white font-bold">Glitched Matrix</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-muted)]">Enforcement:</span>
                      <span className="text-[#00ffa3]">Server Verified</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-muted)]">Anti-Cheat Supervision:</span>
                      <span className="text-[var(--cyan-primary)]">Active</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-muted)]">Stage Continuity:</span>
                      <span className="text-[var(--violet-primary)]">Enforced</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tactical Sector Progression Map (5 Connected Nodes) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold font-mono tracking-wider text-white uppercase flex items-center gap-2">
              <Crosshair size={16} className="text-[var(--cyan-primary)]" />
              <span>FIVE-SECTOR OPERATION SEQUENCE</span>
            </h3>
            <span className="text-xs font-mono text-[var(--text-dim)]">
              Click node to inspect sector terminal
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {stages.map((stage) => {
              const isComplete = isStageCompleted(stage.order);
              const isOpen = stage.status === 'OPEN';
              const isActive = activeStage?.order === stage.order;
              const detail = getStageDetail(stage.order);

              return (
                <div
                  key={stage.id}
                  onClick={() => handleStageClick(stage)}
                  className={`p-5 rounded-2xl flex flex-col justify-between transition-all duration-300 backdrop-blur-xl relative cursor-pointer ${
                    isComplete
                      ? 'bg-[rgba(0,255,163,0.03)] border border-[rgba(0,255,163,0.35)] hover:border-[#00ffa3] shadow-[0_0_20px_rgba(0,255,163,0.08)]'
                      : isActive
                      ? 'bg-[rgba(0,245,255,0.05)] border-2 border-[var(--cyan-primary)] shadow-[0_0_25px_rgba(0,245,255,0.2)] transform -translate-y-1'
                      : isOpen
                      ? 'bg-[rgba(9,11,16,0.85)] border border-[rgba(255,255,255,0.12)] hover:border-[var(--cyan-primary)] hover:bg-[rgba(9,11,16,0.95)]'
                      : 'bg-[rgba(9,11,16,0.6)] border border-[rgba(255,255,255,0.05)] opacity-60 hover:opacity-85'
                  }`}
                >
                  <div>
                    {/* Header Row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]">
                          {getStageIcon(stage.order)}
                        </div>
                        <span className="font-mono text-[11px] text-[var(--text-dim)] font-bold">
                          0{stage.order}
                        </span>
                      </div>

                      {/* Status Badges */}
                      {isComplete ? (
                        <span className="cyber-badge cyber-badge-success flex items-center gap-1">
                          <CheckCircle2 size={11} />
                          <span>SOLVED</span>
                        </span>
                      ) : isActive ? (
                        <span className="cyber-badge cyber-badge-cyan flex items-center gap-1 font-bold">
                          <Play size={10} className="fill-current" />
                          <span>ACTIVE</span>
                        </span>
                      ) : isOpen ? (
                        <span className="cyber-badge cyber-badge-cyan flex items-center gap-1">
                          <Unlock size={11} />
                          <span>OPEN</span>
                        </span>
                      ) : (
                        <span className="cyber-badge cyber-badge-warning flex items-center gap-1">
                          <Lock size={11} />
                          <span>LOCKED</span>
                        </span>
                      )}
                    </div>

                    {/* Stage Name */}
                    <h4 className="text-base font-bold font-mono text-white mb-1.5">
                      {stage.name}
                    </h4>

                    {/* Stage Subtitle / Category */}
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--cyan-primary)] mb-3">
                      {STAGES_METADATA.find(m => m.number === stage.order)?.category || 'Forensics'}
                    </div>

                    {/* Progress Detail */}
                    <p className="text-xs text-[var(--text-secondary)] font-mono leading-relaxed mb-4">
                      {detail.label}
                    </p>
                  </div>

                  {/* Node Bottom Action */}
                  <div className="pt-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between text-xs font-mono">
                    {isOpen ? (
                      <span className="text-[var(--cyan-primary)] flex items-center gap-1 font-bold group-hover:underline">
                        <span>Access Terminal</span>
                        <ArrowRight size={12} />
                      </span>
                    ) : (
                      <span className="text-[var(--text-dim)] flex items-center gap-1">
                        <Lock size={11} />
                        <span>Locked</span>
                      </span>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
