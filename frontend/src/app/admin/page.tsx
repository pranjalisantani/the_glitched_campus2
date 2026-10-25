'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import {
  Terminal,
  Users,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  Database,
  Layout,
  HelpCircle,
  FlaskConical,
  Upload,
  Edit,
  History,
  ShieldAlert,
  X,
  RotateCcw
} from 'lucide-react';
import { StageControlsTab, StageConfig } from './StageControlsTab';
import { TeamMatrixTab, TeamOverview } from './TeamMatrixTab';
import { AdminTestModeTab } from './AdminTestModeTab';
import { AdminManagementTab, AdminAccount } from './AdminManagementTab';
import { ParticipantManagementTab, ParticipantTeam } from './ParticipantManagementTab';
import { AuditLogsTab } from './AuditLogsTab';

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'stages' | 'matrix' | 'test-mode' | 'admins' | 'participants' | 'audit' | 'stage1' | 'stage2' | 'stage3' | 'stage4'
  >('stages');

  const [stages, setStages] = useState<StageConfig[]>([]);
  const [teamMatrix, setTeamMatrix] = useState<TeamOverview[]>([]);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [participants, setParticipants] = useState<ParticipantTeam[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizSubmissions, setQuizSubmissions] = useState<any[]>([]);
  const [tabLogs, setTabLogs] = useState<any[]>([]);
  const [stage2Progress, setStage2Progress] = useState<any[]>([]);
  const [stage2Challenges, setStage2Challenges] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Modals state
  const [showNewQModal, setShowNewQModal] = useState(false);
  const [newQPrompt, setNewQPrompt] = useState('');
  const [newQOptions, setNewQOptions] = useState(['', '', '', '']);
  const [newQCorrect, setNewQCorrect] = useState('A');
  const [newQExplanation, setNewQExplanation] = useState('');
  const [newQPoints, setNewQPoints] = useState(1);

  // Edit question state
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [editQPrompt, setEditQPrompt] = useState('');
  const [editQOptions, setEditQOptions] = useState(['', '', '', '']);
  const [editQCorrect, setEditQCorrect] = useState('A');
  const [editQExplanation, setEditQExplanation] = useState('');
  const [editQPoints, setEditQPoints] = useState(1);

  const [showNewChModal, setShowNewChModal] = useState(false);
  const [newChTitle, setNewChTitle] = useState('');
  const [newChDesc, setNewChDesc] = useState('');
  const [newChPayload, setNewChPayload] = useState('');
  const [newChAnswer, setNewChAnswer] = useState('');
  const [newChHint, setNewChHint] = useState('');
  const [newChPoints, setNewChPoints] = useState(10);

  // Edit challenge state
  const [editingChallenge, setEditingChallenge] = useState<any | null>(null);
  const [editChTitle, setEditChTitle] = useState('');
  const [editChDesc, setEditChDesc] = useState('');
  const [editChPayload, setEditChPayload] = useState('');
  const [editChAnswer, setEditChAnswer] = useState('');
  const [editChHint, setEditChHint] = useState('');
  const [editChPoints, setEditChPoints] = useState(10);

  // Score override modal
  const [overrideModal, setOverrideModal] = useState<{
    stage: 'stage1' | 'stage2';
    teamId: string;
    teamName: string;
    currentScore: number;
  } | null>(null);
  const [overrideScore, setOverrideScore] = useState<number>(0);
  const [overrideNote, setOverrideNote] = useState<string>('');

  // Dataset upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFilename, setUploadFilename] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadRecords, setUploadRecords] = useState(0);
  const [uploadSchema, setUploadSchema] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Dataset edit modal
  const [editingDataset, setEditingDataset] = useState<any | null>(null);
  const [editDsName, setEditDsName] = useState('');
  const [editDsDesc, setEditDsDesc] = useState('');
  const [editDsRecordCount, setEditDsRecordCount] = useState(0);
  const [editDsSchemaSummary, setEditDsSchemaSummary] = useState('');

  // Problem statement modals
  const [showNewProbModal, setShowNewProbModal] = useState(false);
  const [newProbTitle, setNewProbTitle] = useState('');
  const [newProbCategory, setNewProbCategory] = useState('Incident Containment');
  const [newProbSummary, setNewProbSummary] = useState('');
  const [newProbDesc, setNewProbDesc] = useState('');
  const [newProbStage4Instr, setNewProbStage4Instr] = useState('');
  const [newProbStage5Instr, setNewProbStage5Instr] = useState('');

  const [editingProblem, setEditingProblem] = useState<any | null>(null);
  const [editProbTitle, setEditProbTitle] = useState('');
  const [editProbCategory, setEditProbCategory] = useState('');
  const [editProbSummary, setEditProbSummary] = useState('');
  const [editProbDesc, setEditProbDesc] = useState('');
  const [editProbStage4Instr, setEditProbStage4Instr] = useState('');
  const [editProbStage5Instr, setEditProbStage5Instr] = useState('');

  const isPrimary = user?.isPrimaryAdmin || user?.adminRole === 'primary_admin';

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewData, qData, subData, logsData, s2PData, s2CData, dsData, probData, partsData] = await Promise.all([
        apiFetch<{ stages: StageConfig[]; progress: TeamOverview[] }>('/admin/overview'),
        apiFetch<any[]>('/admin/stage1/questions').catch(() => []),
        apiFetch<any[]>('/admin/stage1/submissions').catch(() => []),
        apiFetch<any[]>('/admin/stage1/event-logs').catch(() => []),
        apiFetch<any[]>('/admin/stage2/progress').catch(() => []),
        apiFetch<any[]>('/admin/stage2/challenges').catch(() => []),
        apiFetch<any[]>('/admin/stage3/datasets').catch(() => []),
        apiFetch<any[]>('/admin/stage4/problems').catch(() => []),
        apiFetch<ParticipantTeam[]>('/admin/teams').catch(() => [])
      ]);

      setStages(overviewData.stages || []);
      setTeamMatrix(overviewData.progress || []);
      setQuizQuestions(qData || []);
      setQuizSubmissions(subData || []);
      setTabLogs(logsData || []);
      setStage2Progress(s2PData || []);
      setStage2Challenges(s2CData || []);
      setDatasets(dsData || []);
      setProblems(probData || []);
      setParticipants(partsData || []);

      if (isPrimary) {
        const adminsData = await apiFetch<AdminAccount[]>('/admin/admins').catch(() => []);
        setAdmins(adminsData || []);
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }, [isPrimary]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/admin/login');
      } else if (user.role !== 'admin') {
        router.push('/dashboard');
      } else {
        loadAdminData();
      }
    }
  }, [user, authLoading, router, loadAdminData]);

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleUpdateStageStatus = async (stageId: string, status: 'LOCKED' | 'OPEN' | 'CLOSED') => {
    try {
      const res = await apiFetch<{ message: string; stage: StageConfig }>('/admin/stages/' + stageId, {
        method: 'PATCH',
        body: { status }
      });
      setStages(prev => prev.map(s => s.id === stageId ? res.stage : s));
      showNotification(res.message);
    } catch (err: any) {
      alert(err.message || 'Failed to update stage status.');
    }
  };

  const handleResetStage3 = async (teamId: string, teamName: string) => {
    if (!confirm(`Reset Stage 3 dataset selection for team ${teamName}?`)) return;
    try {
      const res = await apiFetch<{ message: string }>('/admin/stage3/reset-selection', {
        method: 'POST',
        body: { teamId }
      });
      showNotification(res.message);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Reset failed.');
    }
  };

  const handleResetStage4 = async (teamId: string, teamName: string) => {
    if (!confirm(`Reset Stage 4/5 problem selection for team ${teamName}?`)) return;
    try {
      const res = await apiFetch<{ message: string }>('/admin/stage4/reset-selection', {
        method: 'POST',
        body: { teamId }
      });
      showNotification(res.message);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Reset failed.');
    }
  };

  // Stage 1 Question Creation
  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/admin/stage1/questions', {
        method: 'POST',
        body: {
          prompt: newQPrompt,
          options: [
            { id: 'A', text: newQOptions[0] },
            { id: 'B', text: newQOptions[1] },
            { id: 'C', text: newQOptions[2] },
            { id: 'D', text: newQOptions[3] }
          ],
          correctOptionId: newQCorrect,
          explanation: newQExplanation,
          points: Number(newQPoints) || 1,
          isActiveForLiveQuiz: true
        }
      });
      setShowNewQModal(false);
      setNewQPrompt('');
      setNewQOptions(['', '', '', '']);
      setNewQExplanation('');
      setNewQPoints(1);
      loadAdminData();
      showNotification('New quiz question registered.');
    } catch (err: any) {
      alert(err.message || 'Failed to create question.');
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Delete this quiz question?')) return;
    try {
      await apiFetch('/admin/stage1/questions/' + id, { method: 'DELETE' });
      setQuizQuestions(prev => prev.filter(q => q.id !== id));
      showNotification('Question removed.');
    } catch (err: any) {
      alert(err.message || 'Failed to delete question.');
    }
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    try {
      await apiFetch('/admin/stage1/questions/' + editingQuestion.id, {
        method: 'PUT',
        body: {
          prompt: editQPrompt,
          options: [
            { id: 'A', text: editQOptions[0] },
            { id: 'B', text: editQOptions[1] },
            { id: 'C', text: editQOptions[2] },
            { id: 'D', text: editQOptions[3] }
          ],
          correctOptionId: editQCorrect,
          explanation: editQExplanation,
          points: Number(editQPoints) || 1,
          isActiveForLiveQuiz: true
        }
      });
      setEditingQuestion(null);
      loadAdminData();
      showNotification('Quiz question updated successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to update question.');
    }
  };

  // Stage 2 Challenge Creation
  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/admin/stage2/challenges', {
        method: 'POST',
        body: {
          title: newChTitle,
          description: newChDesc,
          encodedPayload: newChPayload,
          expectedAnswer: newChAnswer,
          hint: newChHint,
          points: Number(newChPoints) || 10,
          isActive: true
        }
      });
      setShowNewChModal(false);
      setNewChTitle('');
      setNewChDesc('');
      setNewChPayload('');
      setNewChAnswer('');
      setNewChHint('');
      loadAdminData();
      showNotification('New decode challenge registered.');
    } catch (err: any) {
      alert(err.message || 'Failed to create challenge.');
    }
  };

  const handleDeleteChallenge = async (id: string) => {
    if (!confirm('Delete this decode challenge?')) return;
    try {
      await apiFetch('/admin/stage2/challenges/' + id, { method: 'DELETE' });
      setStage2Challenges(prev => prev.filter(c => c.id !== id));
      showNotification('Challenge removed.');
    } catch (err: any) {
      alert(err.message || 'Failed to delete challenge.');
    }
  };

  const handleUpdateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChallenge) return;
    try {
      await apiFetch('/admin/stage2/challenges/' + editingChallenge.id, {
        method: 'PUT',
        body: {
          title: editChTitle,
          description: editChDesc,
          encodedPayload: editChPayload,
          expectedAnswer: editChAnswer,
          hint: editChHint,
          points: Number(editChPoints) || 10,
          isActive: true
        }
      });
      setEditingChallenge(null);
      loadAdminData();
      showNotification('Decode challenge updated successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to update challenge.');
    }
  };

  // Score Override Submission
  const handleSaveScoreOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModal) return;

    try {
      const endpoint = overrideModal.stage === 'stage1'
        ? `/admin/stage1/submissions/${overrideModal.teamId}/score`
        : `/admin/stage2/progress/${overrideModal.teamId}/score`;

      const res = await apiFetch<{ message: string }>(endpoint, {
        method: 'PATCH',
        body: {
          score: Number(overrideScore),
          note: overrideNote
        }
      });

      showNotification(res.message);
      setOverrideModal(null);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to override score.');
    }
  };

  // Reset Stage 1 Quiz Submission
  const handleResetQuizSubmission = async (teamId: string, teamName: string) => {
    if (!confirm(`Reset Stage 1 quiz submission for team "${teamName}"? They will be permitted to retake the quiz.`)) return;
    try {
      const res = await apiFetch<{ message: string }>('/admin/stage1/submissions/' + teamId + '/reset', {
        method: 'POST'
      });
      showNotification(res.message);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to reset quiz submission.');
    }
  };

  // Reset Stage 2 Progress
  const handleResetStage2Progress = async (teamId: string, teamName: string) => {
    if (!confirm(`Reset Stage 2 decode progress for team "${teamName}"? All attempts and hint deductions will be cleared.`)) return;
    try {
      const res = await apiFetch<{ message: string }>('/admin/stage2/progress/' + teamId + '/reset', {
        method: 'POST'
      });
      showNotification(res.message);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to reset stage 2 progress.');
    }
  };

  // Secure Dataset Upload
  const handleFileUploadInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFilename(file.name);
    setUploadName(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUploadContent(content || '');
      if (file.name.endsWith('.csv')) {
        const lines = content.split('\n').filter(l => l.trim().length > 0);
        setUploadRecords(Math.max(0, lines.length - 1));
      }
    };
    reader.readAsText(file);
  };

  const handleUploadDatasetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFilename || !uploadContent) {
      alert('Please provide a valid dataset filename and content.');
      return;
    }

    setIsUploading(true);
    try {
      const res = await apiFetch<{ message: string }>('/admin/stage3/upload', {
        method: 'POST',
        body: {
          filename: uploadFilename.trim(),
          name: uploadName.trim(),
          description: uploadDesc.trim(),
          content: uploadContent,
          recordCount: Number(uploadRecords) || 0,
          schemaSummary: uploadSchema.trim()
        }
      });

      showNotification(res.message);
      setShowUploadModal(false);
      setUploadFilename('');
      setUploadName('');
      setUploadDesc('');
      setUploadContent('');
      setUploadRecords(0);
      setUploadSchema('');
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to upload dataset.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDataset = async (id: string, name: string) => {
    if (!confirm(`Delete dataset metadata for "${name}"?`)) return;
    try {
      await apiFetch('/admin/stage3/datasets/' + id, { method: 'DELETE' });
      showNotification('Dataset removed.');
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete dataset.');
    }
  };

  const handleDeleteProblem = async (id: string, title: string) => {
    if (!confirm(`Delete problem statement "${title}"?`)) return;
    try {
      await apiFetch('/admin/stage4/problems/' + id, { method: 'DELETE' });
      showNotification('Problem statement removed.');
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete problem statement.');
    }
  };

  const handleUpdateDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDataset) return;
    try {
      await apiFetch('/admin/stage3/datasets/' + editingDataset.id, {
        method: 'PUT',
        body: {
          name: editDsName.trim(),
          description: editDsDesc.trim(),
          recordCount: Number(editDsRecordCount) || 0,
          schemaSummary: editDsSchemaSummary.trim()
        }
      });
      setEditingDataset(null);
      loadAdminData();
      showNotification('Dataset metadata updated successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to update dataset.');
    }
  };

  const handleCreateProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/admin/stage4/problems', {
        method: 'POST',
        body: {
          title: newProbTitle.trim(),
          category: newProbCategory.trim(),
          summary: newProbSummary.trim(),
          fullDescription: newProbDesc.trim(),
          stage4Instructions: newProbStage4Instr.trim(),
          stage5Instructions: newProbStage5Instr.trim()
        }
      });
      setShowNewProbModal(false);
      setNewProbTitle('');
      setNewProbSummary('');
      setNewProbDesc('');
      setNewProbStage4Instr('');
      setNewProbStage5Instr('');
      loadAdminData();
      showNotification('Problem statement created successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to create problem statement.');
    }
  };

  const handleUpdateProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProblem) return;
    try {
      await apiFetch('/admin/stage4/problems/' + editingProblem.id, {
        method: 'PUT',
        body: {
          title: editProbTitle.trim(),
          category: editProbCategory.trim(),
          summary: editProbSummary.trim(),
          fullDescription: editProbDesc.trim(),
          stage4Instructions: editProbStage4Instr.trim(),
          stage5Instructions: editProbStage5Instr.trim()
        }
      });
      setEditingProblem(null);
      loadAdminData();
      showNotification('Problem statement updated successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to update problem statement.');
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[rgba(0,245,255,0.2)] mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="hud-dot" />
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--violet-primary)] font-bold">
              SECURITY OPERATIONS COMMAND ({isPrimary ? 'PRIMARY ROOT ADMIN' : 'EVENT OPERATIONS ADMIN'})
            </span>
          </div>
          <h1 className="text-3xl font-bold font-mono text-white">
            Administrative Central Control
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">
            Manage global stage gates, verify submissions, evaluate rosters, upload datasets, and audit operational data.
          </p>
        </div>

        <button
          onClick={() => loadAdminData()}
          className="cyber-button-secondary text-xs px-4 py-2 flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh All Telemetry</span>
        </button>
      </div>

      {actionNotice && (
        <div
          role="status"
          className="mb-6 p-4 rounded bg-[rgba(0,255,163,0.12)] border border-[rgba(0,255,163,0.4)] flex items-center gap-2 text-xs font-mono text-[#00ffa3]"
        >
          <CheckCircle2 size={16} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-[rgba(0,245,255,0.15)] pb-3">
        <button
          onClick={() => setActiveTab('stages')}
          className={'px-4 py-2 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 ' + (activeTab === 'stages' ? 'bg-[var(--cyan-primary)] text-black' : 'text-[var(--text-secondary)] hover:text-white')}
        >
          <Sliders size={14} />
          <span>Global Stage Controls</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={'px-4 py-2 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 ' + (activeTab === 'matrix' ? 'bg-[var(--cyan-primary)] text-black' : 'text-[var(--text-secondary)] hover:text-white')}
        >
          <Users size={14} />
          <span>Team Progress Matrix ({teamMatrix.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('participants')}
          className={'px-4 py-2 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 ' + (activeTab === 'participants' ? 'bg-[var(--cyan-primary)] text-black' : 'text-[var(--text-secondary)] hover:text-white')}
        >
          <Users size={14} />
          <span>Participants & Rosters ({participants.length})</span>
        </button>

        {isPrimary && (
          <button
            onClick={() => setActiveTab('admins')}
            className={'px-4 py-2 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 ' + (activeTab === 'admins' ? 'bg-[#ffaa00] text-black shadow-[0_0_20px_rgba(255,170,0,0.4)]' : 'text-[#ffaa00] border border-[#ffaa00]/40 hover:bg-[#ffaa00]/10')}
          >
            <ShieldAlert size={14} />
            <span>Admin Accounts & RBAC ({admins.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('stage1')}
          className={'px-4 py-2 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 ' + (activeTab === 'stage1' ? 'bg-[var(--cyan-primary)] text-black' : 'text-[var(--text-secondary)] hover:text-white')}
        >
          <Terminal size={14} />
          <span>Stage 1 Quiz ({quizQuestions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('stage2')}
          className={'px-4 py-2 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 ' + (activeTab === 'stage2' ? 'bg-[var(--cyan-primary)] text-black' : 'text-[var(--text-secondary)] hover:text-white')}
        >
          <HelpCircle size={14} />
          <span>Stage 2 Decode & Hints</span>
        </button>

        <button
          onClick={() => setActiveTab('stage3')}
          className={'px-4 py-2 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 ' + (activeTab === 'stage3' ? 'bg-[var(--cyan-primary)] text-black' : 'text-[var(--text-secondary)] hover:text-white')}
        >
          <Database size={14} />
          <span>Stage 3 Datasets ({datasets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('stage4')}
          className={'px-4 py-2 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 ' + (activeTab === 'stage4' ? 'bg-[var(--cyan-primary)] text-black' : 'text-[var(--text-secondary)] hover:text-white')}
        >
          <Layout size={14} />
          <span>Stage 4/5 Problems ({problems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={'px-4 py-2 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 ' + (activeTab === 'audit' ? 'bg-[var(--cyan-primary)] text-black' : 'text-[var(--text-secondary)] hover:text-white')}
        >
          <History size={14} />
          <span>Audit Trail</span>
        </button>

        <button
          onClick={() => setActiveTab('test-mode')}
          className={'px-4 py-2 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 ' + (activeTab === 'test-mode' ? 'bg-[#ffaa00] text-black shadow-[0_0_20px_rgba(255,170,0,0.4)]' : 'text-[#ffaa00] border border-[#ffaa00]/40 hover:bg-[#ffaa00]/10')}
        >
          <FlaskConical size={14} />
          <span>⚡ ADMIN TEST MODE</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'stages' && (
        <StageControlsTab
          stages={stages}
          onUpdateStatus={handleUpdateStageStatus}
          onRefresh={loadAdminData}
          onNotice={showNotification}
          isPrimaryAdmin={Boolean(isPrimary)}
        />
      )}

      {activeTab === 'matrix' && (
        <TeamMatrixTab
          teamMatrix={teamMatrix}
          onResetStage3={handleResetStage3}
          onResetStage4={handleResetStage4}
        />
      )}

      {activeTab === 'participants' && (
        <ParticipantManagementTab
          teams={participants}
          onRefresh={loadAdminData}
          onNotice={showNotification}
        />
      )}

      {activeTab === 'admins' && isPrimary && (
        <AdminManagementTab
          admins={admins}
          currentUserId={user?.id}
          onRefresh={loadAdminData}
          onNotice={showNotification}
        />
      )}

      {activeTab === 'audit' && (
        <AuditLogsTab />
      )}

      {activeTab === 'test-mode' && (
        <AdminTestModeTab stages={stages} />
      )}

      {/* Stage 1 Management */}
      {activeTab === 'stage1' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-mono text-white">Stage 1: Questions, Scoring & Submissions</h2>
              <p className="text-xs font-mono text-[var(--text-dim)]">Manage quiz items, score overrides, and supervise tab events.</p>
            </div>
            <button onClick={() => setShowNewQModal(true)} className="cyber-button text-xs py-2 px-4 flex items-center gap-1.5">
              <Plus size={14} />
              <span>Add Question</span>
            </button>
          </div>

          {/* Submissions & Score Overrides */}
          <div className="cyber-card p-6">
            <h3 className="text-base font-bold font-mono text-white mb-3">Submissions & Evaluations ({quizSubmissions.length})</h3>
            <div className="space-y-2">
              {quizSubmissions.length === 0 ? (
                <p className="text-xs font-mono text-[var(--text-dim)]">No participant quiz submissions recorded yet.</p>
              ) : (
                quizSubmissions.map((sub, i) => (
                  <div key={i} className="p-3 rounded bg-[var(--bg-input)] border border-[rgba(0,245,255,0.15)] flex flex-col md:flex-row md:items-center justify-between font-mono text-xs gap-3">
                    <div>
                      <strong className="text-white text-sm">{sub.teamName}</strong>
                      <span className="text-[var(--text-dim)] ml-2">{new Date(sub.submittedAt).toLocaleTimeString()}</span>
                      <div className="text-[11px] text-gray-300 mt-0.5">
                        Answered: {sub.correctCount} / {sub.totalQuestions} correct
                        {sub.overrideNote && (
                          <span className="text-yellow-400 ml-2 italic">Note: {sub.overrideNote}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-[#00ffa3] bg-black/40 px-3 py-1 rounded border border-[#00ffa3]/30">
                        {sub.score} / 10 pts
                      </span>
                      <button
                        onClick={() => {
                          setOverrideModal({
                            stage: 'stage1',
                            teamId: sub.teamId,
                            teamName: sub.teamName,
                            currentScore: sub.score
                          });
                          setOverrideScore(sub.score);
                          setOverrideNote(sub.overrideNote || '');
                        }}
                        className="px-2.5 py-1 text-[11px] rounded border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 flex items-center gap-1"
                      >
                        <Edit size={12} />
                        <span>Override</span>
                      </button>
                      <button
                        onClick={() => handleResetQuizSubmission(sub.teamId, sub.teamName)}
                        className="px-2.5 py-1 text-[11px] rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 flex items-center gap-1"
                      >
                        <RotateCcw size={12} />
                        <span>Reset</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tab logs */}
          <div className="cyber-card p-6">
            <h3 className="text-base font-bold font-mono text-white mb-3">Browser Supervision Telemetry ({tabLogs.length})</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {tabLogs.map((l) => (
                <div key={l.id} className="p-2 rounded bg-[var(--bg-input)] text-xs font-mono flex justify-between">
                  <span><strong className="text-[var(--status-warning)]">[{l.eventType}]</strong> {l.teamName}: {l.details || ''}</span>
                  <span className="text-[var(--text-dim)]">{new Date(l.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Question List */}
          <div className="space-y-3">
            <h3 className="text-base font-bold font-mono text-white">Configured Assessment Questions ({quizQuestions.length})</h3>
            {quizQuestions.map((q, i) => (
              <div key={q.id} className="cyber-card p-4 border-[rgba(0,245,255,0.15)] flex justify-between items-start">
                <div className="space-y-1">
                  <div>
                    <span className="font-mono text-xs text-[var(--cyan-primary)] font-bold mr-2">Q{i + 1}</span>
                    <span className="text-xs text-[#00ffa3] font-mono mr-2">[Correct Answer: Option {q.correctOptionId}]</span>
                    <span className="text-xs text-yellow-400 font-mono">({q.points || 1} pt)</span>
                  </div>
                  <p className="text-xs font-semibold text-white">{q.prompt}</p>
                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-mono text-gray-300">
                    {q.options?.map((opt: any) => (
                      <div key={opt.id} className={`p-1.5 rounded ${opt.id === q.correctOptionId ? 'bg-[#00ffa3]/10 border border-[#00ffa3]/30 text-[#00ffa3]' : 'bg-black/30'}`}>
                        <strong>{opt.id}:</strong> {opt.text}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <div className="text-[10px] text-gray-400 font-mono pt-1">
                      <em>Explanation: {q.explanation}</em>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0 font-mono text-xs">
                  <button
                    onClick={() => {
                      setEditingQuestion(q);
                      setEditQPrompt(q.prompt);
                      setEditQOptions([
                        q.options?.find((o: any) => o.id === 'A')?.text || '',
                        q.options?.find((o: any) => o.id === 'B')?.text || '',
                        q.options?.find((o: any) => o.id === 'C')?.text || '',
                        q.options?.find((o: any) => o.id === 'D')?.text || ''
                      ]);
                      setEditQCorrect(q.correctOptionId || 'A');
                      setEditQExplanation(q.explanation || '');
                      setEditQPoints(q.points || 1);
                    }}
                    title="Edit Quiz Question"
                    className="px-2.5 py-1 rounded border border-[rgba(0,245,255,0.35)] text-[var(--cyan-primary)] hover:bg-[rgba(0,245,255,0.12)] flex items-center gap-1 transition-colors"
                  >
                    <Edit size={13} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    title="Delete Question"
                    className="px-2.5 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage 2 Management */}
      {activeTab === 'stage2' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-mono text-white">Stage 2: Decode Challenges & Attempt Management</h2>
              <p className="text-xs font-mono text-[var(--text-dim)]">Configure anomalies, track hint deductions, and override scores.</p>
            </div>
            <button onClick={() => setShowNewChModal(true)} className="cyber-button text-xs py-2 px-4 flex items-center gap-1.5">
              <Plus size={14} />
              <span>Add Challenge</span>
            </button>
          </div>

          {/* Stage 2 Progress & Score Overrides */}
          <div className="cyber-card p-6">
            <h3 className="text-base font-bold font-mono text-white mb-3">Participant Progress & Scores ({stage2Progress.length})</h3>
            <div className="space-y-2">
              {stage2Progress.map((p, i) => (
                <div key={i} className="p-3 rounded bg-[var(--bg-input)] font-mono text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <strong className="text-white text-sm">{p.teamName}</strong>
                    <div className="text-[11px] text-gray-300 mt-0.5">
                      Hints: {p.hintsUsedCount} (-{p.deductionMarks} pts) | Activity: {new Date(p.lastActivityAt).toLocaleTimeString()}
                      {p.overrideNote && (
                        <span className="text-yellow-400 ml-2 italic">Note: {p.overrideNote}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#00ffa3] bg-black/40 px-3 py-1 rounded border border-[#00ffa3]/30">
                      {p.provisionalScore} / 10 pts
                    </span>
                    <button
                      onClick={() => {
                        setOverrideModal({
                          stage: 'stage2',
                          teamId: p.teamId,
                          teamName: p.teamName,
                          currentScore: p.provisionalScore
                        });
                        setOverrideScore(p.provisionalScore);
                        setOverrideNote(p.overrideNote || '');
                      }}
                      className="px-2.5 py-1 text-[11px] rounded border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 flex items-center gap-1"
                    >
                      <Edit size={12} />
                      <span>Override</span>
                    </button>
                    <button
                      onClick={() => handleResetStage2Progress(p.teamId, p.teamName)}
                      className="px-2.5 py-1 text-[11px] rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 flex items-center gap-1"
                    >
                      <RotateCcw size={12} />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Challenges */}
          <div className="space-y-3">
            <h3 className="text-base font-bold font-mono text-white">Configured Decode Challenges ({stage2Challenges.length})</h3>
            {stage2Challenges.map((ch) => (
              <div key={ch.id} className="cyber-card p-4 border-[rgba(168,85,247,0.25)] flex justify-between items-start">
                <div>
                  <h4 className="font-mono font-bold text-sm text-white">{ch.title}</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{ch.description}</p>
                  <div className="text-xs font-mono text-[var(--cyan-primary)] mt-2">Payload: <code className="bg-black/40 px-1.5 py-0.5 rounded">{ch.encodedPayload}</code></div>
                  <div className="text-xs font-mono text-[#00ffa3] mt-1">Answer Key: <strong>{ch.expectedAnswer}</strong> | Hint: <em>{ch.hint}</em></div>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0 font-mono text-xs">
                  <button
                    onClick={() => {
                      setEditingChallenge(ch);
                      setEditChTitle(ch.title);
                      setEditChDesc(ch.description);
                      setEditChPayload(ch.encodedPayload);
                      setEditChAnswer(ch.expectedAnswer);
                      setEditChHint(ch.hint);
                      setEditChPoints(ch.points || 10);
                    }}
                    title="Edit Challenge"
                    className="px-2.5 py-1 rounded border border-[rgba(168,85,247,0.35)] text-[var(--violet-primary)] hover:bg-[rgba(168,85,247,0.12)] flex items-center gap-1 transition-colors"
                  >
                    <Edit size={13} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteChallenge(ch.id)}
                    title="Delete Challenge"
                    className="px-2.5 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage 3 Datasets */}
      {activeTab === 'stage3' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-mono text-white">Stage 3: Datasets & Secure Storage</h2>
              <p className="text-xs font-mono text-[var(--text-dim)]">Upload new CSV/JSON datasets with directory containment validation.</p>
            </div>
            <button onClick={() => setShowUploadModal(true)} className="cyber-button text-xs py-2 px-4 flex items-center gap-1.5">
              <Upload size={14} />
              <span>Upload Dataset File</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {datasets.map((ds) => (
              <div key={ds.id} className="cyber-card p-5 border-[#00ffa3] flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="cyber-badge cyber-badge-success">{ds.format}</span>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <button
                        onClick={() => {
                          setEditingDataset(ds);
                          setEditDsName(ds.name);
                          setEditDsDesc(ds.description || '');
                          setEditDsRecordCount(ds.recordCount || 0);
                          setEditDsSchemaSummary(ds.schemaSummary || '');
                        }}
                        title="Edit Dataset Metadata"
                        className="px-2.5 py-1 rounded border border-[#00ffa3]/30 text-[#00ffa3] hover:bg-[#00ffa3]/10 flex items-center gap-1 transition-colors"
                      >
                        <Edit size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteDataset(ds.id, ds.name)}
                        title="Delete Dataset"
                        className="px-2.5 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                  <h3 className="text-base font-bold font-mono text-white">{ds.name}</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{ds.description}</p>
                </div>
                <div className="text-[11px] font-mono text-[var(--text-dim)] mt-4 pt-3 border-t border-white/10 flex justify-between">
                  <span>File: {ds.filename}</span>
                  <span>{ds.filesize} ({ds.recordCount || 0} rows)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage 4/5 Problems */}
      {activeTab === 'stage4' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-mono text-white">Stage 4 & 5: Problem Statements & Criteria ({problems.length})</h2>
              <p className="text-xs font-mono text-[var(--text-dim)]">Manage challenges that carry through from Stage 4 Prototype to Stage 5 Dynamic Defense.</p>
            </div>
            <button
              onClick={() => {
                setNewProbTitle('');
                setNewProbCategory('Incident Forensics');
                setNewProbSummary('');
                setNewProbDesc('');
                setNewProbStage4Instr('');
                setNewProbStage5Instr('');
                setShowNewProbModal(true);
              }}
              className="cyber-button text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Add Problem Statement</span>
            </button>
          </div>

          <div className="space-y-4">
            {problems.map((p) => (
              <div key={p.id} className="cyber-card p-5 border-[#ffb703] flex justify-between items-start">
                <div>
                  <span className="cyber-badge cyber-badge-warning mb-2">{p.category}</span>
                  <h3 className="text-base font-bold font-mono text-white">{p.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{p.fullDescription}</p>
                  <div className="text-xs font-mono text-[var(--text-dim)] mt-3">
                    Stage 4 Prototype instructions & Stage 5 Dynamic specs linked directly.
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0 font-mono text-xs">
                  <button
                    onClick={() => {
                      setEditingProblem(p);
                      setEditProbTitle(p.title);
                      setEditProbCategory(p.category);
                      setEditProbSummary(p.summary || '');
                      setEditProbDesc(p.fullDescription);
                      setEditProbStage4Instr(p.stage4Instructions || '');
                      setEditProbStage5Instr(p.stage5Instructions || '');
                    }}
                    title="Edit Problem Statement"
                    className="px-2.5 py-1 rounded border border-yellow-500/35 text-yellow-400 hover:bg-yellow-500/12 flex items-center gap-1 transition-colors"
                  >
                    <Edit size={13} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteProblem(p.id, p.title)}
                    title="Delete Problem Statement"
                    className="px-2.5 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Quiz Question Modal */}
      {showNewQModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg cyber-card p-6 border-[var(--cyan-primary)] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold font-mono text-white mb-4">Add Quiz Question</h3>
            <form onSubmit={handleCreateQuestion} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">PROMPT</label>
                <input required value={newQPrompt} onChange={e => setNewQPrompt(e.target.value)} className="cyber-input w-full" />
              </div>
              {['A', 'B', 'C', 'D'].map((opt, i) => (
                <div key={opt}>
                  <label className="block text-[var(--text-secondary)] mb-1">OPTION {opt}</label>
                  <input required value={newQOptions[i]} onChange={e => { const up = [...newQOptions]; up[i] = e.target.value; setNewQOptions(up); }} className="cyber-input w-full" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1">CORRECT OPTION</label>
                  <select value={newQCorrect} onChange={e => setNewQCorrect(e.target.value)} className="cyber-input w-full">
                    <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1">POINTS</label>
                  <input type="number" min={1} max={10} value={newQPoints} onChange={e => setNewQPoints(Number(e.target.value))} className="cyber-input w-full" />
                </div>
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">EXPLANATION</label>
                <textarea rows={2} value={newQExplanation} onChange={e => setNewQExplanation(e.target.value)} className="cyber-input w-full" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowNewQModal(false)} className="cyber-button-secondary text-xs px-4 py-2">Cancel</button>
                <button type="submit" className="cyber-button text-xs px-4 py-2">Save Question</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Decode Challenge Modal */}
      {showNewChModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg cyber-card p-6 border-[var(--violet-primary)] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold font-mono text-white mb-4">Add Decode Challenge</h3>
            <form onSubmit={handleCreateChallenge} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">TITLE</label>
                <input required value={newChTitle} onChange={e => setNewChTitle(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">DESCRIPTION</label>
                <input required value={newChDesc} onChange={e => setNewChDesc(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">ENCODED PAYLOAD</label>
                <input required value={newChPayload} onChange={e => setNewChPayload(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">EXPECTED ANSWER</label>
                <input required value={newChAnswer} onChange={e => setNewChAnswer(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">HINT</label>
                <input required value={newChHint} onChange={e => setNewChHint(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">BASE POINTS</label>
                <input type="number" min={1} max={50} value={newChPoints} onChange={e => setNewChPoints(Number(e.target.value))} className="cyber-input w-full" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowNewChModal(false)} className="cyber-button-secondary text-xs px-4 py-2">Cancel</button>
                <button type="submit" className="cyber-button text-xs px-4 py-2">Save Challenge</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Score Override Modal */}
      {overrideModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-md cyber-card p-6 border-yellow-400">
            <h3 className="text-base font-bold font-mono text-white mb-2">
              Score Override: {overrideModal.teamName}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-mono mb-4">
              Manually modify provisional marks for {overrideModal.stage.toUpperCase()}. An immutable audit entry will record this change.
            </p>
            <form onSubmit={handleSaveScoreOverride} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-gray-300 mb-1">New Score (Max 10)</label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={10}
                  required
                  value={overrideScore}
                  onChange={e => setOverrideScore(Number(e.target.value))}
                  className="cyber-input w-full"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Evaluation & Audit Note</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Adjusted after forensic telemetry review."
                  value={overrideNote}
                  onChange={e => setOverrideNote(e.target.value)}
                  className="cyber-input w-full"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOverrideModal(null)}
                  className="cyber-button-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-mono bg-yellow-400 text-black font-bold rounded hover:bg-yellow-300"
                >
                  Confirm Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dataset File Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg cyber-card p-6 border-[#00ffa3] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-bold font-mono text-white flex items-center gap-2">
                <Upload size={16} className="text-[#00ffa3]" />
                Upload Dataset File (.csv or .json)
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-[var(--text-secondary)] font-mono mb-4">
              Files are sanitized and stored inside the protected datasets directory. Directory traversal syntax is strictly rejected.
            </p>

            <form onSubmit={handleUploadDatasetSubmit} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-gray-300 mb-1">Select Local File</label>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUploadInput}
                  className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded text-xs text-gray-300"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Target Filename</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. security_sensor_telemetry.csv"
                  value={uploadFilename}
                  onChange={e => setUploadFilename(e.target.value)}
                  className="cyber-input w-full"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Display Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Campus Wi-Fi Security Feed"
                  value={uploadName}
                  onChange={e => setUploadName(e.target.value)}
                  className="cyber-input w-full"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Dataset context for participant EDA analysis..."
                  value={uploadDesc}
                  onChange={e => setUploadDesc(e.target.value)}
                  className="cyber-input w-full"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">File Content (Direct Input / Preview)</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Paste raw CSV or JSON data..."
                  value={uploadContent}
                  onChange={e => setUploadContent(e.target.value)}
                  className="cyber-input w-full font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="cyber-button-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="cyber-button text-xs px-4 py-2"
                >
                  {isUploading ? 'Uploading...' : 'Save & Register Dataset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Quiz Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg cyber-card p-6 border-[var(--cyan-primary)] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold font-mono text-white mb-4">Edit Quiz Question</h3>
            <form onSubmit={handleUpdateQuestion} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">PROMPT</label>
                <input required value={editQPrompt} onChange={e => setEditQPrompt(e.target.value)} className="cyber-input w-full" />
              </div>
              {['A', 'B', 'C', 'D'].map((opt, i) => (
                <div key={opt}>
                  <label className="block text-[var(--text-secondary)] mb-1">OPTION {opt}</label>
                  <input required value={editQOptions[i]} onChange={e => { const up = [...editQOptions]; up[i] = e.target.value; setEditQOptions(up); }} className="cyber-input w-full" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1">CORRECT OPTION</label>
                  <select value={editQCorrect} onChange={e => setEditQCorrect(e.target.value)} className="cyber-input w-full">
                    <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1">POINTS</label>
                  <input type="number" min={1} max={10} value={editQPoints} onChange={e => setEditQPoints(Number(e.target.value))} className="cyber-input w-full" />
                </div>
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">EXPLANATION</label>
                <textarea rows={2} value={editQExplanation} onChange={e => setEditQExplanation(e.target.value)} className="cyber-input w-full" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setEditingQuestion(null)} className="cyber-button-secondary text-xs px-4 py-2">Cancel</button>
                <button type="submit" className="cyber-button text-xs px-4 py-2">Update Question</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Decode Challenge Modal */}
      {editingChallenge && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg cyber-card p-6 border-[var(--violet-primary)] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold font-mono text-white mb-4">Edit Decode Challenge</h3>
            <form onSubmit={handleUpdateChallenge} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">TITLE</label>
                <input required value={editChTitle} onChange={e => setEditChTitle(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">DESCRIPTION</label>
                <input required value={editChDesc} onChange={e => setEditChDesc(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">ENCODED PAYLOAD</label>
                <input required value={editChPayload} onChange={e => setEditChPayload(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">EXPECTED ANSWER</label>
                <input required value={editChAnswer} onChange={e => setEditChAnswer(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">HINT</label>
                <input required value={editChHint} onChange={e => setEditChHint(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">BASE POINTS</label>
                <input type="number" min={1} max={50} value={editChPoints} onChange={e => setEditChPoints(Number(e.target.value))} className="cyber-input w-full" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setEditingChallenge(null)} className="cyber-button-secondary text-xs px-4 py-2">Cancel</button>
                <button type="submit" className="cyber-button text-xs px-4 py-2">Update Challenge</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Dataset Metadata Modal */}
      {editingDataset && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg cyber-card p-6 border-[#00ffa3] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold font-mono text-white mb-4">Edit Dataset Metadata: {editingDataset.filename}</h3>
            <form onSubmit={handleUpdateDataset} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">DATASET NAME</label>
                <input required value={editDsName} onChange={e => setEditDsName(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">DESCRIPTION</label>
                <textarea rows={2} value={editDsDesc} onChange={e => setEditDsDesc(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">RECORD COUNT</label>
                <input type="number" min={0} value={editDsRecordCount} onChange={e => setEditDsRecordCount(Number(e.target.value))} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">SCHEMA SUMMARY</label>
                <input value={editDsSchemaSummary} onChange={e => setEditDsSchemaSummary(e.target.value)} className="cyber-input w-full" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setEditingDataset(null)} className="cyber-button-secondary text-xs px-4 py-2">Cancel</button>
                <button type="submit" className="cyber-button text-xs px-4 py-2">Update Metadata</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Problem Statement Modal */}
      {showNewProbModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg cyber-card p-6 border-[#ffb703] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold font-mono text-white mb-4">Add Problem Statement</h3>
            <form onSubmit={handleCreateProblem} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">TITLE</label>
                <input required value={newProbTitle} onChange={e => setNewProbTitle(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">CATEGORY</label>
                <input required value={newProbCategory} onChange={e => setNewProbCategory(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">SUMMARY</label>
                <input value={newProbSummary} onChange={e => setNewProbSummary(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">FULL DESCRIPTION</label>
                <textarea required rows={3} value={newProbDesc} onChange={e => setNewProbDesc(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">STAGE 4 PROTOTYPE INSTRUCTIONS</label>
                <textarea rows={2} value={newProbStage4Instr} onChange={e => setNewProbStage4Instr(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">STAGE 5 DYNAMIC DEFENSE INSTRUCTIONS</label>
                <textarea rows={2} value={newProbStage5Instr} onChange={e => setNewProbStage5Instr(e.target.value)} className="cyber-input w-full" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowNewProbModal(false)} className="cyber-button-secondary text-xs px-4 py-2">Cancel</button>
                <button type="submit" className="cyber-button text-xs px-4 py-2">Save Problem</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Problem Statement Modal */}
      {editingProblem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg cyber-card p-6 border-[#ffb703] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold font-mono text-white mb-4">Edit Problem Statement</h3>
            <form onSubmit={handleUpdateProblem} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">TITLE</label>
                <input required value={editProbTitle} onChange={e => setEditProbTitle(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">CATEGORY</label>
                <input required value={editProbCategory} onChange={e => setEditProbCategory(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">SUMMARY</label>
                <input value={editProbSummary} onChange={e => setEditProbSummary(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">FULL DESCRIPTION</label>
                <textarea required rows={3} value={editProbDesc} onChange={e => setEditProbDesc(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">STAGE 4 PROTOTYPE INSTRUCTIONS</label>
                <textarea rows={2} value={editProbStage4Instr} onChange={e => setEditProbStage4Instr(e.target.value)} className="cyber-input w-full" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">STAGE 5 DYNAMIC DEFENSE INSTRUCTIONS</label>
                <textarea rows={2} value={editProbStage5Instr} onChange={e => setEditProbStage5Instr(e.target.value)} className="cyber-input w-full" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setEditingProblem(null)} className="cyber-button-secondary text-xs px-4 py-2">Cancel</button>
                <button type="submit" className="cyber-button text-xs px-4 py-2">Update Problem</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
