import React from 'react';
import { ResolvedStage } from '../../lib/stage-adapter';
import { StageNode } from './StageNode';
import { CheckCircle2, PlayCircle, Unlock, Lock, Cpu } from 'lucide-react';

interface StageMapProps {
  stages: ResolvedStage[];
  className?: string;
}

export const StageMap: React.FC<StageMapProps> = ({ stages, className = '' }) => {
  const completedCount = stages.filter((s) => s.status === 'completed').length;
  const inProgressCount = stages.filter((s) => s.status === 'in-progress').length;
  const availableCount = stages.filter((s) => s.status === 'available').length;
  const lockedCount = stages.filter((s) => s.status === 'locked').length;
  const progressPercentage = Math.round((completedCount / 5) * 100);

  return (
    <section
      aria-label="Interactive Competition Stage Progression Map"
      className={`w-full flex flex-col gap-6 ${className}`}
    >
      {/* Tactical Mission Clearance & Telemetry Console */}
      <div className="w-full p-5 sm:p-6 rounded-2xl bg-[rgba(9,11,16,0.85)] border border-[rgba(0,245,255,0.22)] backdrop-blur-xl shadow-2xl flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[var(--cyan-primary)] shadow-[0_0_10px_var(--cyan-primary)] animate-pulse" />
            <div>
              <span className="font-mono text-[10px] text-[var(--cyan-primary)] uppercase tracking-widest font-bold block">
                OPERATION PROGRESSION RADAR // SECTOR 07
              </span>
              <h2 className="font-mono text-base sm:text-lg font-bold text-white tracking-wide">
                Investigation Sequence Telemetry
              </h2>
            </div>
          </div>

          {/* Tactical Status Counters */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(0,255,163,0.08)] border border-[rgba(0,255,163,0.25)] text-[var(--status-success)]">
              <CheckCircle2 size={13} aria-hidden="true" />
              <span>Completed: {completedCount}/5</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(168,85,247,0.1)] border border-[rgba(168,85,247,0.3)] text-[var(--violet-primary)]">
              <PlayCircle size={13} aria-hidden="true" />
              <span>In Progress: {inProgressCount}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(0,245,255,0.08)] border border-[rgba(0,245,255,0.25)] text-[var(--cyan-primary)]">
              <Unlock size={13} aria-hidden="true" />
              <span>Available: {availableCount}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(255,183,3,0.08)] border border-[rgba(255,183,3,0.25)] text-[var(--status-warning)]">
              <Lock size={13} aria-hidden="true" />
              <span>Locked: {lockedCount}</span>
            </div>
          </div>
        </div>

        {/* Global Progress Rail / Clearance Gauge */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Cpu size={13} className="text-[var(--cyan-primary)]" />
              <span>OVERALL MISSION CLEARANCE</span>
            </span>
            <span className="font-mono text-sm font-bold text-[var(--cyan-primary)]">
              {progressPercentage}%
            </span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-[rgba(5,6,8,0.8)] border border-[rgba(255,255,255,0.08)] overflow-hidden p-0.5 relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--cyan-primary)] via-[var(--violet-primary)] to-[#00ffa3] transition-all duration-700 ease-out shadow-[0_0_12px_rgba(0,245,255,0.6)]"
              style={{ width: `${Math.max(4, progressPercentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Sequential Mission Conduit Pathway (Linear Progression Track) */}
      <div className="w-full hidden md:flex items-center justify-between p-4 rounded-xl bg-[rgba(9,11,16,0.7)] border border-[rgba(255,255,255,0.06)] font-mono text-xs relative overflow-hidden">
        {stages.map((stage, idx) => {
          const isDone = stage.status === 'completed';
          const isInProg = stage.status === 'in-progress';
          const isAvail = stage.status === 'available';
          const isLck = stage.status === 'locked';

          return (
            <React.Fragment key={stage.meta.id}>
              {/* Node Indicator */}
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isDone
                      ? 'bg-[rgba(0,255,163,0.15)] border-2 border-[var(--status-success)] text-[var(--status-success)] shadow-[0_0_12px_rgba(0,255,163,0.3)]'
                      : isInProg
                      ? 'bg-[rgba(168,85,247,0.2)] border-2 border-[var(--violet-primary)] text-[var(--violet-primary)] shadow-[0_0_15px_rgba(168,85,247,0.4)] animate-pulse'
                      : isAvail
                      ? 'bg-[rgba(0,245,255,0.15)] border-2 border-[var(--cyan-primary)] text-[var(--cyan-primary)] shadow-[0_0_10px_rgba(0,245,255,0.25)]'
                      : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] text-[var(--text-dim)]'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 size={16} />
                  ) : isLck ? (
                    <Lock size={13} />
                  ) : (
                    `0${stage.meta.number}`
                  )}
                </div>
                <span
                  className={`text-[11px] font-mono tracking-wider uppercase font-semibold ${
                    isDone
                      ? 'text-[var(--status-success)]'
                      : isInProg
                      ? 'text-[var(--violet-primary)]'
                      : isAvail
                      ? 'text-[var(--cyan-primary)]'
                      : 'text-[var(--text-dim)]'
                  }`}
                >
                  {stage.meta.title}
                </span>
              </div>

              {/* Connector Conduits between steps */}
              {idx < stages.length - 1 && (
                <div className="flex-1 mx-2 flex flex-col items-center relative">
                  <div className="w-full h-0.5 bg-[rgba(255,255,255,0.08)] relative">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isDone
                          ? 'bg-gradient-to-r from-[var(--status-success)] to-[var(--cyan-primary)]'
                          : isInProg
                          ? 'bg-gradient-to-r from-[var(--violet-primary)] to-[rgba(255,255,255,0.1)]'
                          : 'bg-transparent'
                      }`}
                    />
                  </div>
                  {idx === 3 && (
                    <span className="text-[9px] text-[var(--cyan-dim)] uppercase tracking-tighter mt-1">
                      Continuous Link
                    </span>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Five Stage Interactive Nodes Grid / Pathway */}
      <ol
        role="list"
        aria-label="Five competition stages listed sequentially"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 list-none p-0 m-0"
      >
        {stages.map((stage, idx) => (
          <li key={stage.meta.id} className="flex">
            <StageNode
              stage={stage}
              isFirst={idx === 0}
              isLast={idx === stages.length - 1}
              className="w-full"
            />
          </li>
        ))}
      </ol>
    </section>
  );
};
