'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { apiFetch, getAuthToken, API_BASE_URL } from '../../../lib/api';
import { 
  Database, 
  ArrowLeft, 
  Lock, 
  CheckCircle2, 
  Download, 
  FileSpreadsheet, 
  FileCode, 
  Calendar, 
  AlertTriangle,
  Info,
  Server
} from 'lucide-react';

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
      const [dsList, selRes] = await Promise.all([
        apiFetch<DatasetMetadata[]>('/stage3/datasets'),
        apiFetch<{ selection: SelectionRecord | null }>('/stage3/my-selection')
      ]);
      setDatasets(dsList);
      setCurrentSelection(selRes.selection);
    } catch (err: any) {
      if (err.code === 'STAGE_LOCKED' || err.code === 'STAGE_CLOSED') {
        setIsLocked(true);
      }
      setError(err.message || 'Failed to load Stage 3 datasets.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDataset = async (dataset: DatasetMetadata) => {
    if (currentSelection) return;
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
      alert(err.message || 'Dataset selection failed.');
    } finally {
      setSelectingId(null);
    }
  };

  const handleDownload = (datasetId: string) => {
    const token = getAuthToken();
    const url = `${API_BASE_URL}/stage3/download/${datasetId}?token=${token}`;
    // Use an authenticated fetch blob download for reliable token transmission
    fetch(`${API_BASE_URL}/stage3/download/${datasetId}`, {
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

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
      
      {/* Header Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] hover:text-[#00ffa3] transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Return to Dashboard</span>
        </Link>

        <span className="cyber-badge cyber-badge-success">
          STAGE 03 // DATASET EDA
        </span>
      </div>

      {/* Stage Banner */}
      <div className="cyber-card p-6 mb-8 border-t-4 border-t-[#00ffa3]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white mb-2">
              Stage 3: Incident Log Exploratory Data Analysis
            </h1>
            <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              Teams inspect available campus incident datasets and select exactly one dataset for offline exploratory analysis. 
              Download your selected dataset to analyze on your local workstation. 
              Irrevocable one-time selection is enforced per team unless reset by an administrator.
            </p>
          </div>

          <div className="text-right font-mono text-xs text-[var(--text-dim)] shrink-0">
            <div>Offline Workstation Analysis</div>
            <div className="text-[11px] text-[#00ffa3] mt-1">One Dataset Per Team</div>
          </div>
        </div>
      </div>

      {/* Active Selection Banner if selected */}
      {currentSelection && (
        <div className="cyber-card p-6 mb-8 border-[#00ffa3] bg-[rgba(0,255,163,0.04)] shadow-[0_0_20px_rgba(0,255,163,0.1)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 size={18} className="text-[#00ffa3]" />
                <span className="font-mono text-xs uppercase tracking-wider text-[#00ffa3] font-bold">
                  ASSIGNED TEAM DATASET
                </span>
              </div>
              <h2 className="text-xl font-bold font-mono text-white">
                {currentSelection.datasetName}
              </h2>
              <span className="text-[11px] font-mono text-[var(--text-dim)]">
                Selection timestamp: {new Date(currentSelection.selectedAt).toLocaleString()}
              </span>
            </div>

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
      {error && (
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
                className={`cyber-card p-6 flex flex-col justify-between border transition-all ${
                  isSelectedByThisTeam
                    ? 'border-[#00ffa3] shadow-[0_0_20px_rgba(0,255,163,0.15)]'
                    : hasChosenOther
                    ? 'opacity-50 border-[rgba(255,255,255,0.06)]'
                    : 'border-[rgba(0,255,163,0.25)] hover:border-[#00ffa3]'
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
                      disabled={selectingId === ds.id}
                      className="cyber-button-secondary w-full text-xs py-2.5 flex items-center justify-center gap-2 hover:border-[#00ffa3] hover:text-[#00ffa3]"
                    >
                      {selectingId === ds.id ? (
                        <div className="w-4 h-4 border-2 border-[#00ffa3] border-t-transparent rounded-full animate-spin" />
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
      <div className="mt-12 p-4 rounded bg-[var(--bg-surface-1)] border border-[rgba(0,245,255,0.15)] flex items-start gap-3 text-xs font-mono text-[var(--text-muted)]">
        <Info size={16} className="text-[var(--cyan-primary)] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[var(--text-secondary)] block">Evaluation & Tooling Protocol:</strong>
          Participants analyze datasets locally using standard tools of their choice (Python, Pandas, R, Excel, Jupyter, etc.).
          No online code execution editor is required. Scoring criteria will be announced directly by event coordinators.
        </div>
      </div>

    </div>
  );
}
