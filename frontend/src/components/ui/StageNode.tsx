import React from 'react';
import Link from 'next/link';
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
}

export const StageNode: React.FC<StageNodeProps> = ({ stage, className = '' }) => {
  const { meta, status, progressDetail, actionLabel, actionHref, isActionable } = stage;

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

  const getStatusBorder = () => {
    switch (status) {
      case 'available':
        return 'border-[var(--cyan-border)] hover:border-[var(--cyan-primary)] hover:shadow-[0_0_25px_rgba(0,245,255,0.2)]';
      case 'in-progress':
        return 'border-[var(--violet-border)] hover:border-[var(--violet-primary)] hover:shadow-[0_0_25px_rgba(168,85,247,0.2)]';
      case 'completed':
        return 'border-[var(--status-success-border)] hover:border-[var(--status-success)] hover:shadow-[0_0_25px_rgba(0,255,163,0.18)]';
      case 'locked':
      default:
        return 'border-[rgba(255,255,255,0.08)] opacity-85 hover:border-[rgba(255,183,3,0.3)]';
    }
  };

  return (
    <article
      aria-label={`Stage ${meta.number}: ${meta.title} - Status: ${status}`}
      className={`cyber-card p-6 flex flex-col justify-between transition-all duration-200 focus-within:ring-2 focus-within:ring-[var(--cyan-primary)] ${getStatusBorder()} ${className}`}
    >
      <div>
        {/* Node Header Row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[rgba(0,245,255,0.06)] border border-[rgba(0,245,255,0.18)] shrink-0">
              {getStageIcon(meta.number)}
            </div>
            <div>
              <span className="font-mono text-[11px] text-[var(--text-dim)] uppercase tracking-widest block">
                Stage 0{meta.number} {'//'} {meta.category}
              </span>
              <h3 className="font-mono text-lg font-bold text-white tracking-wide mt-0.5">
                {meta.title}
              </h3>
            </div>
          </div>
          <StageStatusBadge status={status} />
        </div>

        {/* Subtitle & Description */}
        <p className="text-xs font-mono text-[var(--cyan-primary)] opacity-85 mb-2">
          {meta.subtitle}
        </p>
        <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed mb-4">
          {meta.description}
        </p>

        {/* Progress Telemetry */}
        {progressDetail && (
          <div className="px-3 py-2 rounded bg-[var(--bg-void)] border border-[rgba(0,245,255,0.1)] text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-2 mb-4">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                status === 'completed'
                  ? 'bg-[var(--status-success)]'
                  : status === 'in-progress'
                  ? 'bg-[var(--violet-primary)]'
                  : status === 'available'
                  ? 'bg-[var(--cyan-primary)]'
                  : 'bg-[var(--status-warning)]'
              }`}
              aria-hidden="true"
            />
            <span className="truncate">{progressDetail}</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-[rgba(0,245,255,0.1)] mt-auto flex items-center justify-between">
        <Link
          href={meta.href}
          className="text-xs font-mono text-[var(--text-dim)] hover:text-white transition-colors"
          tabIndex={-1}
          aria-hidden="true"
        >
          Portal Link: {meta.href}
        </Link>

        {isActionable ? (
          status === 'completed' ? (
            <GhostButton
              href={actionHref}
              icon={<ArrowRight size={14} />}
              className="text-xs py-1.5 px-3"
            >
              {actionLabel}
            </GhostButton>
          ) : (
            <PrimaryButton
              href={actionHref}
              icon={<ArrowRight size={14} />}
              className="text-xs py-1.5 px-4"
            >
              {actionLabel}
            </PrimaryButton>
          )
        ) : (
          <button
            disabled
            className="cyber-button-secondary text-xs py-1.5 px-3 opacity-60 cursor-not-allowed inline-flex items-center gap-1.5"
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
