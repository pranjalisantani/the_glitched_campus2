'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { 
  adaptStages, 
  BackendStageConfig, 
  BackendTeamProgress, 
  StageAdapterResult 
} from '../../lib/stage-adapter';
import { GameShell } from '../../components/ui/GameShell';
import { StageMap } from '../../components/ui/StageMap';
import { LoadingState, ErrorState } from '../../components/ui/StateDisplays';
import { GhostButton } from '../../components/ui/Buttons';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function StagesPage() {
  const { user, isLoading: authLoading } = useAuth();

  const [adapterResult, setAdapterResult] = useState<StageAdapterResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const fetchStageData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      // 1. Fetch public stage configurations
      const stagesData = await apiFetch<BackendStageConfig[]>('/stages');

      // 2. Fetch authenticated participant progress if token exists
      let teamProgress: BackendTeamProgress | null = null;
      if (user) {
        try {
          const meData = await apiFetch<{ progress: BackendTeamProgress }>('/auth/me');
          teamProgress = meData.progress;
        } catch {
          // Progress fetch failed or not authenticated
        }
      }

      const adapted = adaptStages(stagesData, teamProgress, Boolean(user));
      setAdapterResult(adapted);
      setErrorNotice(null);
    } catch (err: any) {
      console.warn('Failed to synchronize stage telemetry with server:', err);
      // Fallback: provide local development representation clearly marked as non-authoritative
      const fallback = adaptStages(null, null, Boolean(user));
      setAdapterResult(fallback);
      setErrorNotice(
        'Warning: Backend API unreachable. Showing offline structural map. The server remains the sole authority on stage accessibility.'
      );
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStageData();
    const interval = setInterval(() => fetchStageData(), 8000); // 8-second live sync
    return () => clearInterval(interval);
  }, [fetchStageData]);

  if (authLoading || (loading && !adapterResult)) {
    return (
      <GameShell
        title="FIVE-STAGE PROGRESSION MAP"
        subtitle="Interrogating live stage authorization with the backend API gateway..."
        backHref="/game"
        backLabel="Return to Entry"
      >
        <LoadingState message="Synchronizing stage locks and telemetry..." />
      </GameShell>
    );
  }

  return (
    <GameShell
      title="FIVE-STAGE PROGRESSION MAP"
      subtitle="Interactive stage sequence. Access to each stage is strictly verified by backend authorization gates."
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Game Entry', href: '/game' },
        { label: 'Stages' }
      ]}
      backHref="/game"
      backLabel="Return to Entry"
      actions={
        <GhostButton
          onClick={() => fetchStageData(true)}
          disabled={refreshing}
          icon={<RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />}
          className="text-xs py-1.5 px-3"
          aria-label="Refresh stage telemetry"
        >
          <span>{refreshing ? 'Syncing...' : 'Sync Telemetry'}</span>
        </GhostButton>
      }
    >
      {/* Offline / Adapter Notice if applicable */}
      {errorNotice && (
        <div
          role="alert"
          className="mb-6 p-4 rounded bg-[rgba(255,183,3,0.1)] border border-[rgba(255,183,3,0.35)] flex items-center justify-between text-xs font-mono text-[var(--status-warning)]"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorNotice}</span>
          </div>
          <button
            onClick={() => setErrorNotice(null)}
            className="text-[var(--text-muted)] hover:text-white ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Authority Banner */}
      {adapterResult && !adapterResult.isServerAuthoritative && (
        <div className="mb-6 p-3 rounded bg-[rgba(255,51,102,0.08)] border border-[rgba(255,51,102,0.25)] text-[11px] font-mono text-[var(--status-critical)]">
          OFFLINE STAGE MAP ADAPTER ACTIVE // Real-time server telemetry could not be verified. Attempting background reconnect.
        </div>
      )}

      {/* Interactive Five-Stage Map */}
      {adapterResult && <StageMap stages={adapterResult.stages} />}
    </GameShell>
  );
}
