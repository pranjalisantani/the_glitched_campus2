'use client';

import React, { useState } from 'react';
import { Sliders, Settings2, X, Plus } from 'lucide-react';
import { apiFetch } from '../../lib/api';

export interface StageConfig {
  id: string;
  name: string;
  order: number;
  status: 'LOCKED' | 'OPEN' | 'CLOSED';
  description: string;
  maxScore?: number;
  isScoringProvisional?: boolean;
  scoringRuleNotes?: string;
  evaluationCriteria?: string[];
  submissionRequirements?: string[];
}

interface Props {
  stages: StageConfig[];
  onUpdateStatus: (stageId: string, status: 'LOCKED' | 'OPEN' | 'CLOSED') => void;
  onRefresh?: () => void;
  onNotice?: (msg: string) => void;
}

export const StageControlsTab: React.FC<Props> = ({ stages, onUpdateStatus, onRefresh, onNotice }) => {
  const [editingStage, setEditingStage] = useState<StageConfig | null>(null);
  const [editMaxScore, setEditMaxScore] = useState<number>(10);
  const [editNotes, setEditNotes] = useState<string>('');
  const [editCriteria, setEditCriteria] = useState<string[]>([]);
  const [newCriterion, setNewCriterion] = useState<string>('');
  const [editReqs, setEditReqs] = useState<string[]>([]);
  const [newReq, setNewReq] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenEdit = (stage: StageConfig) => {
    setEditingStage(stage);
    setEditMaxScore(stage.maxScore || 10);
    setEditNotes(stage.scoringRuleNotes || '');
    setEditCriteria(stage.evaluationCriteria ? [...stage.evaluationCriteria] : []);
    setEditReqs(stage.submissionRequirements ? [...stage.submissionRequirements] : []);
  };

  const handleAddCriterion = () => {
    if (!newCriterion.trim()) return;
    setEditCriteria(prev => [...prev, newCriterion.trim()]);
    setNewCriterion('');
  };

  const handleRemoveCriterion = (idx: number) => {
    setEditCriteria(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddReq = () => {
    if (!newReq.trim()) return;
    setEditReqs(prev => [...prev, newReq.trim()]);
    setNewReq('');
  };

  const handleRemoveReq = (idx: number) => {
    setEditReqs(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveStageConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStage) return;

    setIsSubmitting(true);
    try {
      const res = await apiFetch<{ message: string; stage: StageConfig }>('/admin/stages/' + editingStage.id, {
        method: 'PATCH',
        body: {
          maxScore: Number(editMaxScore),
          scoringRuleNotes: editNotes,
          evaluationCriteria: editCriteria,
          submissionRequirements: editReqs
        }
      });
      if (onNotice) onNotice(res.message);
      setEditingStage(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update stage configuration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold font-mono text-white flex items-center gap-2">
            <Sliders size={20} className="text-[var(--cyan-primary)]" />
            Global Stage Gates & Operational Criteria
          </h2>
          <p className="text-xs font-mono text-[var(--text-dim)] mt-0.5">
            Configure stage locks, maximum scores, evaluation criteria, and submission requirements.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stages.map((stage) => (
          <div 
            key={stage.id} 
            className={`cyber-card p-6 border-t-4 flex flex-col justify-between ${
              stage.status === 'OPEN' 
                ? 'border-t-[#00ffa3]' 
                : stage.status === 'CLOSED'
                ? 'border-t-[#ff3366]' 
                : 'border-t-[#ffb703]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs text-[var(--text-dim)] uppercase">
                  Stage 0{stage.order}
                </span>
                <span className={`cyber-badge ${
                  stage.status === 'OPEN' 
                    ? 'cyber-badge-success' 
                    : stage.status === 'CLOSED'
                    ? 'cyber-badge-critical' 
                    : 'cyber-badge-warning'
                }`}>
                  {stage.status}
                </span>
              </div>

              <h3 className="text-base font-bold font-mono text-white mb-2">
                {stage.name}
              </h3>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
                {stage.description}
              </p>

              <div className="space-y-2 mb-4 p-3 rounded bg-black/40 border border-white/5 text-[11px] font-mono">
                <div className="flex justify-between text-gray-300">
                  <span className="text-[var(--text-dim)]">Max Score:</span>
                  <span className="font-bold text-[var(--cyan-primary)]">{stage.maxScore || 10} pts</span>
                </div>
                {stage.evaluationCriteria && stage.evaluationCriteria.length > 0 && (
                  <div>
                    <span className="text-[var(--text-dim)] block mb-1">Criteria ({stage.evaluationCriteria.length}):</span>
                    <div className="flex flex-wrap gap-1">
                      {stage.evaluationCriteria.slice(0, 2).map((c, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-300">
                          {c}
                        </span>
                      ))}
                      {stage.evaluationCriteria.length > 2 && (
                        <span className="text-[9px] text-[var(--text-dim)]">+{stage.evaluationCriteria.length - 2} more</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="pt-3 border-t border-[rgba(255,255,255,0.08)] flex items-center gap-2 mb-3">
                <button
                  onClick={() => onUpdateStatus(stage.id, 'LOCKED')}
                  className={`flex-1 text-[11px] font-mono py-1.5 rounded border transition-all ${
                    stage.status === 'LOCKED'
                      ? 'bg-[var(--status-warning-bg)] border-[var(--status-warning)] text-[var(--status-warning)] font-bold'
                      : 'border-[rgba(255,255,255,0.1)] text-[var(--text-dim)] hover:text-white'
                  }`}
                >
                  LOCK
                </button>

                <button
                  onClick={() => onUpdateStatus(stage.id, 'OPEN')}
                  className={`flex-1 text-[11px] font-mono py-1.5 rounded border transition-all ${
                    stage.status === 'OPEN'
                      ? 'bg-[var(--status-success-bg)] border-[var(--status-success)] text-[var(--status-success)] font-bold'
                      : 'border-[rgba(255,255,255,0.1)] text-[var(--text-dim)] hover:text-white'
                  }`}
                >
                  OPEN
                </button>

                <button
                  onClick={() => onUpdateStatus(stage.id, 'CLOSED')}
                  className={`flex-1 text-[11px] font-mono py-1.5 rounded border transition-all ${
                    stage.status === 'CLOSED'
                      ? 'bg-[var(--status-critical-bg)] border-[var(--status-critical)] text-[var(--status-critical)] font-bold'
                      : 'border-[rgba(255,255,255,0.1)] text-[var(--text-dim)] hover:text-white'
                  }`}
                >
                  CLOSE
                </button>
              </div>

              <button
                onClick={() => handleOpenEdit(stage)}
                className="w-full py-1.5 rounded text-[11px] font-mono border border-[var(--cyan-primary)]/40 text-[var(--cyan-primary)] hover:bg-[var(--cyan-primary)]/10 flex items-center justify-center gap-1.5"
              >
                <Settings2 size={12} />
                <span>Configure Rules & Criteria</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Stage Configuration Modal */}
      {editingStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg p-6 rounded-lg border border-[var(--cyan-primary)]/40 bg-[rgba(10,14,23,0.95)] max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingStage(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold font-mono text-white mb-1 flex items-center gap-2">
              <Settings2 size={16} className="text-[var(--cyan-primary)]" />
              Operational Config: {editingStage.name}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-mono mb-4">
              Configure evaluation criteria, scoring notes, and submission requirements for this competition stage.
            </p>

            <form onSubmit={handleSaveStageConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-300 mb-1">Maximum Stage Score</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  value={editMaxScore}
                  onChange={e => setEditMaxScore(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono bg-black/50 border border-white/20 rounded text-white focus:border-[var(--cyan-primary)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-300 mb-1">Scoring Rule Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 10 marks total minus 2 marks per hint used."
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-black/50 border border-white/20 rounded text-white focus:border-[var(--cyan-primary)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-300 mb-1">Evaluation Criteria</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add evaluation metric..."
                    value={newCriterion}
                    onChange={e => setNewCriterion(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs font-mono bg-black/50 border border-white/20 rounded text-white focus:border-[var(--cyan-primary)] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCriterion}
                    className="px-3 py-1.5 text-xs font-mono border border-[var(--cyan-primary)]/40 text-[var(--cyan-primary)] rounded hover:bg-[var(--cyan-primary)]/10 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    <span>Add</span>
                  </button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {editCriteria.map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-white/5 text-xs font-mono text-gray-300">
                      <span>• {c}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCriterion(idx)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-300 mb-1">Submission Deliverables / Requirements</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add deliverable requirement..."
                    value={newReq}
                    onChange={e => setNewReq(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs font-mono bg-black/50 border border-white/20 rounded text-white focus:border-[var(--cyan-primary)] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddReq}
                    className="px-3 py-1.5 text-xs font-mono border border-[var(--cyan-primary)]/40 text-[var(--cyan-primary)] rounded hover:bg-[var(--cyan-primary)]/10 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    <span>Add</span>
                  </button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {editReqs.map((r, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-white/5 text-xs font-mono text-gray-300">
                      <span>• {r}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveReq(idx)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStage(null)}
                  className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cyber-button text-xs px-4 py-2"
                >
                  {isSubmitting ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
