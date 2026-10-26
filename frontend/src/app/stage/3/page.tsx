'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../../context/AuthContext';
import { apiFetch, getAuthToken, getApiBaseUrl, getFreezeStatus } from '../../../lib/api';
import {
  ArrowLeft,
  Lock,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileCode,
  Info,
  Compass,
  PauseCircle
} from 'lucide-react';
import { LockedState } from '../../../components/ui/StateDisplays';
import { FreezeLockScreen } from '../../../components/ui/FreezeLockScreen';

interface DatasetMetadata {
  id: string;
  name: string;
  description: string;
  filename: string;
  format: 'CSV' | 'JSON';
  filesize: string;
  recordCount: number;
  schemaSummary: string;
  isDemonstration: boolean;
}

interface SelectionRecord {
  datasetId: string;
  datasetName: string;
  selectedAt: string;
}

export default function Stage3Page() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [currentSelection, setCurrentSelection] = useState<SelectionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [freezeReason, setFreezeReason] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadStage3Data();
    }
  }, [user, authLoading, router]);

  const loadStage3Data = async () => {
    setLoading(true);
    setError(null);
    try {
      const freeze = await getFreezeStatus().catch((): { isCompetitionFrozen: boolean; freezeReason?: string } => ({ isCompetitionFrozen: false }));
      if (freeze.isCompetitionFrozen) {
        setIsFrozen(true);
        setFreezeReason(freeze.freezeReason || null);
      }

      const [dsList, selRes] = await Promise.all([
        apiFetch<DatasetMetadata[]>('/stage3/datasets'),
        apiFetch<{ selection: SelectionRecord | null }>('/stage3/my-selection')
      ]);
      setDatasets(dsList);
      setCurrentSelection(selRes.selection);
    } catch (err: any) {
      if (err.code === 'COMPETITION_FROZEN') {
        setIsFrozen(true);
        setFreezeReason(err.message || 'Competition frozen.');
      } else if (err.code === 'STAGE_LOCKED' || err.code === 'STAGE_CLOSED') {
        setIsLocked(true);
      }
      setError(err.message || 'Failed to load Stage 3 datasets.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDataset = async (dataset: DatasetMetadata) => {
    if (currentSelection || isFrozen) return;
    if (!confirm(`Are you sure you want to select "${dataset.name}"? Each team is permitted to select exactly one dataset. This selection is locked in permanently on the server.`)) {
      return;
    }

    setSelectingId(dataset.id);
    try {
      const res = await apiFetch<{ selection: SelectionRecord }>('/stage3/select', {
        method: 'POST',
        body: { datasetId: dataset.id }
      });
      setCurrentSelection(res.selection);
    } catch (err: any) {
      if (err.code === 'COMPETITION_FROZEN') {
        setIsFrozen(true);
        alert('Action blocked: Competition is globally frozen by administrator. Dataset selection paused.');
        return;
      }

      // Low-network recovery: check if selection was saved before timeout
      if (err.code === 'NETWORK_TIMEOUT' || err.code === 'NETWORK_ERROR') {
        try {
          const checkSel = await apiFetch<{ selection: SelectionRecord | null }>('/stage3/my-selection');
          if (checkSel.selection) {
            setCurrentSelection(checkSel.selection);
            return;
          }
        } catch {
          // ignore
        }
      }
      alert(err.message || 'Dataset selection failed.');
    } finally {
      setSelectingId(null);
    }
  };

  const handleDownload = (datasetId: string) => {
    const token = getAuthToken();
    fetch(`${getApiBaseUrl()}/stage3/download/${datasetId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const ds = datasets.find(d => d.id === datasetId);
        a.download = ds ? ds.filename : 'dataset_export';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      })
      .catch(err => {
        alert(err.message || 'Failed to download file.');
      });
  };

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center font-mono text-sm text-[#00ffa3]">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#00ffa3] border-t-transparent rounded-full animate-spin" />
          <span>Mounting Stage 3 Forensic Dataset Repositories...</span>
        </div>
      </div>
    );
  }

  // Full-page lock screen when competition is frozen for participants
  if (isFrozen && user?.role !== 'admin') {
    return (
      <FreezeLockScreen
        freezeReason={freezeReason}
        onRefresh={loadStage3Data}
        isAdmin={false}
      />
    );
  }

  // Full-page locked screen when stage is locked
  if (isLocked && !isFrozen) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <LockedState
          stageName="Stage 3: Forensic Dataset Exploratory Data Analysis"
          reason="Access to Stage 3 is currently locked by competition administrators. Datasets and selection gateways will unlock once authorized."
          actionHref="/stages"
          actionLabel="Return to Stage Map"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full flex-1 flex flex-col justify-between overflow-hidden">

      {/* Background: Atmospheric Mission Backdrop */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <Image
          src="/images/mission_briefing_bg.jpg"
          alt="Tactical Cyber Operations Grid"
          fill
          priority={false}
          className="object-cover object-center opacity-25 scale-105 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050608] via-[rgba(5,6,8,0.88)] to-[rgba(5,6,8,0.6)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-transparent to-[rgba(5,6,8,0.8)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(0,255,163,0.08),transparent_50%)]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 flex flex-col">
        {/* Header Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[rgba(0,255,163,0.2)] font-mono text-xs">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(9,11,16,0.85)] border border-[rgba(0,255,163,0.3)] text-[var(--text-secondary)] hover:text-[#00ffa3] hover:border-[#00ffa3] transition-all shadow-[0_0_10px_rgba(0,255,163,0.15)]"
            >
              <ArrowLeft size={14} />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/stages"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(9,11,16,0.7)] border border-[rgba(255,255,255,0.08)] text-[var(--text-muted)] hover:text-white hover:border-[rgba(0,255,163,0.25)] transition-all"
            >
              <Compass size={14} />
              <span>Stage Map</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00ffa3] animate-pulse" />
            <span className="cyber-badge cyber-badge-success">
              STAGE 03 // DATASET EDA
            </span>
          </div>
        </div>

        {/* Stage Hero Banner */}
        <div className="p-6 mb-8 rounded-2xl bg-[rgba(9,11,16,0.85)] border border-[rgba(0,255,163,0.25)] backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-[rgba(0,255,163,0.08)] border border-[rgba(0,255,163,0.25)]">
                <span className="w-2 h-2 rounded-full bg-[#00ffa3] animate-pulse" aria-hidden="true" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#00ffa3] font-bold">
                  SECTOR 03 PROTOCOL // INCIDENT LOG EXPLORATORY DATA ANALYSIS
                </span>
              </div>

              <h1 className="glitch-title text-2xl sm:text-3xl font-bold font-mono text-white mb-2" data-text="Stage 3: Incident Log Exploratory Data Analysis">
                Stage 3: Incident Log Exploratory Data Analysis
              </h1>

              {/* Glowing angled cyber hash bars */}
              <div className="flex gap-1.5 my-2">
                <span className="w-4 h-1.5 -skew-x-12 bg-[#00ffa3] opacity-95" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[#00ffa3] opacity-80" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[#00ffa3] opacity-60" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[#00ffa3] opacity-40" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[#00ffa3] opacity-20" />
              </div>

              <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed mt-2">
                Teams inspect available campus incident datasets and select exactly one dataset for offline exploratory analysis.
                Download your selected dataset to analyze on your local workstation.
                Irrevocable one-time selection is enforced per team unless reset by an administrator.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[rgba(5,6,8,0.7)] border border-[rgba(0,255,163,0.2)] text-right font-mono text-xs text-[var(--text-dim)] shrink-0">
              <div className="text-[var(--text-secondary)]">Workstation Analysis</div>
              <div className="text-[11px] text-[#00ffa3] mt-1 font-semibold">One Dataset Per Team</div>
            </div>
          </div>
        </div>

      {/* Global Competition Freeze Banner */}
      {isFrozen && (
        <div
          role="alert"
          className="mb-6 p-4 rounded bg-[rgba(255,183,3,0.15)] border-2 border-[var(--status-warning)] flex items-start gap-3 text-xs font-mono text-white shadow-[0_0_20px_rgba(255,183,3,0.2)]"
        >
          <PauseCircle size={22} className="text-[var(--status-warning)] shrink-0 mt-0.5 animate-pulse" />
          <div>
            <strong className="block text-sm text-[var(--status-warning)] font-bold mb-1">
              GLOBAL COMPETITION FREEZE ACTIVE
            </strong>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Dataset selections are temporarily paused by the primary administrator.
              {freezeReason && ` Reason: "${freezeReason}".`}
              Previously selected datasets may still be downloaded for offline exploratory analysis.
            </p>
          </div>
        </div>
      )}

      {/* Current Team Selection Banner */}
      {currentSelection && (
        <div className="cyber-card p-6 mb-8 border border-[rgba(0,255,163,0.35)] bg-[rgba(0,255,163,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[rgba(0,255,163,0.12)] border border-[rgba(0,255,163,0.3)] flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} className="text-[#00ffa3]" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#00ffa3] block font-bold">
                COMMITTED DATASET SELECTION:
              </span>
              <h2 className="text-lg font-bold font-mono text-white">
                {currentSelection.datasetName}
              </h2>
              <span className="text-[11px] font-mono text-[var(--text-dim)]">
                Selected on: {new Date(currentSelection.selectedAt).toLocaleString()}
              </span>
            </div>
          </div>

          <div>
            <button
              onClick={() => handleDownload(currentSelection.datasetId)}
              className="cyber-button-primary text-xs py-2.5 px-6 flex items-center gap-2"
            >
              <Download size={14} />
              <span>DOWNLOAD DATASET</span>
            </button>
          </div>
        </div>
      )}

      {/* Locked Alert */}
      {error && !isFrozen && (
        <div className="mb-6 p-4 rounded bg-[rgba(255,51,102,0.12)] border border-[rgba(255,51,102,0.4)] flex items-center gap-3 text-xs font-mono text-[var(--status-critical)]">
          <Lock size={18} className="shrink-0" />
          <div>
            <strong className="block text-sm">Access Restrained</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {isLocked ? (
        <div className="cyber-card p-8 text-center flex flex-col items-center">
          <Lock size={36} className="text-[var(--status-warning)] mb-3" />
          <h2 className="text-xl font-bold font-mono text-white mb-2">Stage 3 Locked</h2>
          <p className="text-xs text-[var(--text-muted)] max-w-md font-mono mb-6">
            Stage 3 is locked by the event administrators. Await signal confirmation.
          </p>
          <Link href="/dashboard" className="cyber-button-secondary text-xs">
            Return to Dashboard
          </Link>
        </div>
      ) : (
        /* Dataset Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {datasets.map((ds) => {
            const isSelectedByThisTeam = currentSelection?.datasetId === ds.id;
            const hasChosenOther = currentSelection && !isSelectedByThisTeam;

            return (
              <div
                key={ds.id}
                className={`cyber-card p-6 flex flex-col justify-between transition-all ${
                  isSelectedByThisTeam
                    ? 'border border-[rgba(0,255,163,0.4)] bg-[rgba(0,255,163,0.02)]'
                    : hasChosenOther
                    ? 'opacity-40 border border-[rgba(255,255,255,0.04)]'
                    : 'border border-[rgba(255,255,255,0.06)] hover:border-[rgba(0,255,163,0.3)]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="cyber-badge cyber-badge-success flex items-center gap-1">
                      {ds.format === 'CSV' ? <FileSpreadsheet size={12} /> : <FileCode size={12} />}
                      <span>{ds.format} FORMAT</span>
                    </span>

                    <span className="text-[11px] font-mono text-[var(--text-dim)]">
                      {ds.filesize} • {ds.recordCount} Records
                    </span>
                  </div>

                  <h3 className="text-base font-bold font-mono text-white mb-2">
                    {ds.name}
                  </h3>

                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
                    {ds.description}
                  </p>

                  {/* Schema Summary */}
                  <div className="p-3 rounded bg-[var(--bg-input)] border border-[rgba(255,255,255,0.08)] mb-4">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-dim)] block mb-1">
                      Schema Attributes:
                    </span>
                    <p className="text-[11px] font-mono text-[var(--cyan-primary)] truncate">
                      {ds.schemaSummary}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between">
                  {isSelectedByThisTeam ? (
                    <button
                      onClick={() => handleDownload(ds.id)}
                      className="cyber-button-primary w-full text-xs py-2.5 flex items-center justify-center gap-2"
                    >
                      <Download size={14} />
                      <span>DOWNLOAD DATASET ({ds.format})</span>
                    </button>
                  ) : hasChosenOther ? (
                    <span className="text-xs font-mono text-[var(--text-dim)] text-center w-full">
                      Another dataset selected
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSelectDataset(ds)}
                      disabled={selectingId === ds.id || isFrozen}
                      className={`cyber-button-secondary w-full text-xs py-2.5 flex items-center justify-center gap-2 hover:border-[#00ffa3] hover:text-[#00ffa3] ${
                        isFrozen ? 'opacity-50 cursor-not-allowed hover:border-[rgba(255,255,255,0.1)] hover:text-white' : ''
                      }`}
                    >
                      {selectingId === ds.id ? (
                        <div className="w-4 h-4 border-2 border-[#00ffa3] border-t-transparent rounded-full animate-spin" />
                      ) : isFrozen ? (
                        <span>SELECTION FROZEN</span>
                      ) : (
                        <span>SELECT THIS DATASET (ONE-TIME)</span>
                      )}
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Advisory Notice */}
      <div className="mt-12 p-4 rounded bg-[var(--bg-surface-1)] border border-[rgba(255,255,255,0.06)] flex items-start gap-3 text-xs font-mono text-[var(--text-muted)]">
        <Info size={16} className="text-[var(--cyan-primary)] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[var(--text-secondary)] block">Evaluation & Tooling Protocol:</strong>
          Participants analyze datasets locally using standard tools of their choice (Python, Pandas, R, Excel, Jupyter, etc.).
          No online code execution editor is required. Scoring criteria will be announced directly by event coordinators.
        </div>
      </div>

      </div>
    </div>
  );
}
