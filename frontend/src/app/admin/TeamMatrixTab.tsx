'use client';

import React from 'react';
import { RotateCcw, CheckCircle2 } from 'lucide-react';

export interface TeamOverview {
  teamId: string;
  teamName: string;
  email: string;
  members: string[];
  stage1: {
    completed: boolean;
    score: number | null;
    submittedAt: string | null;
    eventCount: number;
  };
  stage2: {
    completed: boolean;
    solvedCount: number;
    totalChallenges: number;
    hintsUsed: number;
    deduction: number;
    score: number;
  };
  stage3: {
    selected: boolean;
    datasetId: string | null;
    datasetName: string | null;
    selectedAt: string | null;
  };
  stage4: {
    selected: boolean;
    problemId: string | null;
    problemTitle: string | null;
    selectedAt: string | null;
  };
  stage5: {
    problemId: string | null;
    continuityVerified: boolean;
  };
}

interface Props {
  teamMatrix: TeamOverview[];
  onResetStage3: (teamId: string, teamName: string) => void;
  onResetStage4: (teamId: string, teamName: string) => void;
}

export const TeamMatrixTab: React.FC<Props> = ({ teamMatrix, onResetStage3, onResetStage4 }) => {
  return (
    <div className="cyber-card p-6 overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold font-mono text-white">
          Participating Teams & Stage Telemetry Matrix
        </h2>
        <span className="text-xs font-mono text-[var(--text-dim)]">
          Total Registered Teams: {teamMatrix.length}
        </span>
      </div>

      <table className="w-full text-left font-mono text-xs border-collapse">
        <thead>
          <tr className="border-b border-[rgba(0,245,255,0.2)] text-[var(--cyan-primary)]">
            <th className="pb-3 pr-4">Team</th>
            <th className="pb-3 pr-4">Members</th>
            <th className="pb-3 pr-4">Stage 1 (Quiz)</th>
            <th className="pb-3 pr-4">Stage 2 (Decode)</th>
            <th className="pb-3 pr-4">Stage 3 (Dataset)</th>
            <th className="pb-3 pr-4">Stage 4 (Prototype)</th>
            <th className="pb-3">Stage 5 (Continuity)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[rgba(255,255,255,0.06)] text-[var(--text-secondary)]">
          {teamMatrix.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-6 text-center text-[var(--text-dim)]">
                No participant teams registered yet.
              </td>
            </tr>
          ) : (
            teamMatrix.map((t) => (
              <tr key={t.teamId} className="hover:bg-[rgba(0,245,255,0.02)]">
                <td className="py-3 pr-4 font-bold text-white">
                  {t.teamName}
                  <span className="block text-[10px] text-[var(--text-dim)]">{t.email}</span>
                </td>
                <td className="py-3 pr-4 text-xs">
                  {t.members.join(', ')}
                </td>
                <td className="py-3 pr-4">
                  {t.stage1.completed ? (
                    <span className="text-[#00ffa3]">
                      Done ({t.stage1.score} pts)
                      <span className="block text-[10px] text-[var(--text-dim)]">
                        {t.stage1.eventCount} tab switch(es)
                      </span>
                    </span>
                  ) : (
                    <span className="text-[var(--text-dim)]">Pending</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <span>{t.stage2.solvedCount}/{t.stage2.totalChallenges} solved</span>
                  <span className="block text-[10px] text-[var(--text-dim)]">
                    {t.stage2.hintsUsed} hint(s) (-{t.stage2.deduction} pts) -&gt; {t.stage2.score} pts
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {t.stage3.selected ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#00ffa3] truncate max-w-[120px]">{t.stage3.datasetName}</span>
                      <button
                        onClick={() => onResetStage3(t.teamId, t.teamName)}
                        title="Authorized reset of Stage 3 dataset"
                        className="p-1 rounded text-[var(--text-dim)] hover:text-[var(--status-critical)]"
                      >
                        <RotateCcw size={12} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[var(--text-dim)]">None</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {t.stage4.selected ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#ffb703] truncate max-w-[120px]">{t.stage4.problemTitle}</span>
                      <button
                        onClick={() => onResetStage4(t.teamId, t.teamName)}
                        title="Authorized reset of Stage 4 problem selection"
                        className="p-1 rounded text-[var(--text-dim)] hover:text-[var(--status-critical)]"
                      >
                        <RotateCcw size={12} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[var(--text-dim)]">None</span>
                  )}
                </td>
                <td className="py-3">
                  {t.stage5.continuityVerified ? (
                    <span className="text-[#00ffa3] flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      <span>Verified</span>
                    </span>
                  ) : (
                    <span className="text-[var(--text-dim)]">Requires Stage 4</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
