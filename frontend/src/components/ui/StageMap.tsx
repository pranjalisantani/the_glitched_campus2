import React from 'react';
import { ResolvedStage } from '../../lib/stage-adapter';
import { StageNode } from './StageNode';
import { CheckCircle2, PlayCircle, Unlock, Lock } from 'lucide-react';

interface StageMapProps {
  stages: ResolvedStage[];
  className?: string;
}

export const StageMap: React.FC<StageMapProps> = ({ stages, className = '' }) => {
  const completedCount = stages.filter((s) => s.status === 'completed').length;
  const inProgressCount = stages.filter((s) => s.status === 'in-progress').length;
  const availableCount = stages.filter((s) => s.status === 'available').length;
  const lockedCount = stages.filter((s) => s.status === 'locked').length;

  return (
    <section
      aria-label="Interactive Competition Stage Progression Map"
      className={`w-full flex flex-col ${className}`}
    >
      {/* Map Progression Summary Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-[var(--bg-surface-1)] border border-[rgba(0,245,255,0.15)] mb-8">
        <div className="flex items-center gap-2">
          <span className="hud-dot" aria-hidden="true" />
          <span className="font-mono text-xs uppercase text-[var(--cyan-primary)] tracking-wider">
            OPERATION PROGRESSION RADAR
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-[var(--status-success)]">
            <CheckCircle2 size={13} aria-hidden="true" />
            <span>Completed: {completedCount}/5</span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--violet-primary)]">
            <PlayCircle size={13} aria-hidden="true" />
            <span>In Progress: {inProgressCount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--cyan-primary)]">
            <Unlock size={13} aria-hidden="true" />
            <span>Available: {availableCount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--status-warning)]">
            <Lock size={13} aria-hidden="true" />
            <span>Locked: {lockedCount}</span>
          </div>
        </div>
      </div>

      {/* Five Stage Interactive Nodes Grid / Pathway */}
      <ol
        role="list"
        aria-label="Five competition stages listed sequentially"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 list-none p-0 m-0"
      >
        {stages.map((stage) => (
          <li key={stage.meta.id} className="flex">
            <StageNode stage={stage} className="w-full" />
          </li>
        ))}
      </ol>
    </section>
  );
};
