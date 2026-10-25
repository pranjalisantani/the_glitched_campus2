import React from 'react';
import {
  Terminal,
  Zap,
  Database,
  Layout,
  Code2,
  ArrowRight,
  Lock,
  Radio
} from 'lucide-react';
import { ResolvedStage } from '../../lib/stage-adapter';
import { StageStatusBadge } from './StageStatusBadge';
import { PrimaryButton, GhostButton } from './Buttons';

interface StageNodeProps {
  stage: ResolvedStage;
  className?: string;
  isFirst?: boolean;
  isLast?: boolean;
}

export const StageNode: React.FC<StageNodeProps> = ({ stage, className = '' }) => {
  const { meta, status, progressDetail, actionLabel, actionHref, isActionable, maxScore } = stage;

  const getStageIcon = (number: number) => {
    switch (number) {
      case 1:
        return <Terminal size={22} className="text-[var(--cyan-primary)]" />;
      case 2:
        return <Zap size={22} className="text-[var(--violet-primary)]" />;
      case 3:
        return <Database size={22} className="text-[#00ffa3]" />;
      case 4:
        return <Layout size={22} className="text-[#ffb703]" />;
      case 5:
        return <Code2 size={22} className="text-[#ff3366]" />;
      default:
        return <Radio size={22} />;
    }
  };

  const getTacticalSpecPill = (number: number) => {
    switch (number) {
      case 1:
        return { label: 'SUPERVISED PROTOCOL', color: 'text-[var(--cyan-primary)] border-[rgba(0,245,255,0.25)] bg-[rgba(0,245,255,0.06)]' };
      case 2:
        return { label: '3-ATTEMPT FORENSIC LIMIT', color: 'text-[var(--violet-primary)] border-[rgba(168,85,247,0.25)] bg-[rgba(168,85,247,0.06)]' };
      case 3:
        return { label: 'ONE-TIME SELECTION LOCK', color: 'text-[#00ffa3] border-[rgba(0,255,163,0.25)] bg-[rgba(0,255,163,0.06)]' };
      case 4:
        return { label: 'FEEDS STAGE 5 ARCHITECTURE', color: 'text-[#ffb703] border-[rgba(255,183,3,0.25)] bg-[rgba(255,183,3,0.06)]' };
      case 5:
        return { label: 'CONTINUITY GATED DEPLOYMENT', color: 'text-[#ff3366] border-[rgba(255,51,102,0.25)] bg-[rgba(255,51,102,0.06)]' };
      default:
        return { label: 'ACTIVE SECTOR', color: 'text-white border-white/20 bg-white/5' };
    }
  };

  const getContainerStyling = () => {
    switch (status) {
      case 'available':
        return 'border-[rgba(0,245,255,0.35)] shadow-[0_0_25px_rgba(0,245,255,0.18)] hover:border-[var(--cyan-primary)] hover:shadow-[0_0_35px_rgba(0,245,255,0.3)] bg-[rgba(9,11,16,0.85)]';
      case 'in-progress':
        return 'border-[var(--violet-primary)] shadow-[0_0_30px_rgba(168,85,247,0.25)] hover:border-[var(--violet-hover)] hover:shadow-[0_0_40px_rgba(168,85,247,0.35)] bg-[rgba(9,11,16,0.9)]';
      case 'completed':
        return 'border-[rgba(0,255,163,0.35)] shadow-[0_0_20px_rgba(0,255,163,0.12)] hover:border-[var(--status-success)] bg-[rgba(9,11,16,0.85)]';
      case 'locked':
      default:
        return 'border-[rgba(255,255,255,0.08)] bg-[rgba(9,11,16,0.65)] opacity-85 hover:opacity-95';
    }
  };

  const specPill = getTacticalSpecPill(meta.number);

  return (
    <article
      aria-label={`Stage ${meta.number}: ${meta.title} - Status: ${status}`}
      className={`rounded-2xl backdrop-blur-xl border p-6 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group focus-within:ring-2 focus-within:ring-[var(--cyan-primary)] ${getContainerStyling()} ${className}`}
    >
      {/* Top glowing ambient accent line */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${
          status === 'completed'
            ? 'bg-gradient-to-r from-transparent via-[#00ffa3] to-transparent opacity-80'
            : status === 'in-progress'
            ? 'bg-gradient-to-r from-transparent via-[var(--violet-primary)] to-transparent opacity-90'
            : status === 'available'
            ? 'bg-gradient-to-r from-transparent via-[var(--cyan-primary)] to-transparent opacity-80'
            : 'bg-transparent'
        }`}
      />

      <div>
        {/* Node Header Row: Sector Designation & Status Badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border shrink-0 transition-transform duration-300 group-hover:scale-105 ${
              status === 'completed'
                ? 'bg-[rgba(0,255,163,0.08)] border-[rgba(0,255,163,0.3)] shadow-[0_0_15px_rgba(0,255,163,0.15)]'
                : status === 'in-progress'
                ? 'bg-[rgba(168,85,247,0.1)] border-[rgba(168,85,247,0.35)] shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                : status === 'available'
                ? 'bg-[rgba(0,245,255,0.08)] border-[rgba(0,245,255,0.3)] shadow-[0_0_15px_rgba(0,245,255,0.15)]'
                : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-[var(--text-dim)]'
            }`}>
              {getStageIcon(meta.number)}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-[var(--cyan-primary)] uppercase tracking-widest font-bold block">
                  SECTOR 0{meta.number}
                </span>
                <span className="text-[10px] text-[var(--text-dim)] font-mono">{'//'}</span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider">
                  {meta.category}
                </span>
              </div>
              <h3 className="font-mono text-lg sm:text-xl font-black text-white tracking-wide mt-0.5 group-hover:text-[var(--cyan-primary)] transition-colors">
                {meta.title}
              </h3>
            </div>
          </div>

          <StageStatusBadge status={status} />
        </div>

        {/* Subtitle & Tactical Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs font-mono text-[var(--cyan-primary)] opacity-90 font-medium">
            {meta.subtitle}
          </span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${specPill.color}`}>
            {specPill.label}
          </span>
        </div>

        {/* Tactical Objective Description */}
        <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed mb-4">
          {meta.description}
        </p>

        {/* Progress Telemetry Pill */}
        {progressDetail && (
          <div className="px-3.5 py-2.5 rounded-xl bg-[rgba(5,6,8,0.7)] border border-[rgba(0,245,255,0.12)] text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-2.5 mb-4 shadow-inner">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                status === 'completed'
                  ? 'bg-[var(--status-success)] shadow-[0_0_8px_var(--status-success)]'
                  : status === 'in-progress'
                  ? 'bg-[var(--violet-primary)] shadow-[0_0_8px_var(--violet-primary)] animate-pulse'
                  : status === 'available'
                  ? 'bg-[var(--cyan-primary)] shadow-[0_0_8px_var(--cyan-primary)]'
                  : 'bg-[var(--status-warning)]'
              }`}
              aria-hidden="true"
            />
            <span className="truncate">{progressDetail}</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-[rgba(255,255,255,0.08)] mt-auto flex items-center justify-between gap-3">
        <div className="text-[11px] font-mono text-[var(--text-dim)] flex items-center gap-1.5">
          {maxScore && (
            <span className="text-[var(--text-muted)]">
              Weight: <strong className="text-white">{maxScore} Pts</strong>
            </span>
          )}
        </div>

        {isActionable ? (
          status === 'completed' ? (
            <GhostButton
              href={actionHref}
              icon={<ArrowRight size={14} />}
              className="text-xs py-2 px-4 shadow-[0_0_12px_rgba(0,255,163,0.15)]"
            >
              {actionLabel}
            </GhostButton>
          ) : (
            <PrimaryButton
              href={actionHref}
              icon={<ArrowRight size={14} />}
              className="text-xs py-2 px-5 cyber-cta-glow"
            >
              {actionLabel}
            </PrimaryButton>
          )
        ) : (
          <button
            disabled
            className="cyber-button-secondary text-xs py-2 px-4 opacity-50 cursor-not-allowed inline-flex items-center gap-1.5 border-[rgba(255,255,255,0.08)] bg-[rgba(15,19,28,0.5)] text-[var(--text-muted)]"
            aria-disabled="true"
          >
            <Lock size={12} aria-hidden="true" />
            <span>{actionLabel}</span>
          </button>
        )}
      </div>
    </article>
  );
};
