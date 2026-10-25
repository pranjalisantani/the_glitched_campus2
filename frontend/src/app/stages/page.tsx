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
import { LoadingState } from '../../components/ui/StateDisplays';
import { GhostButton } from '../../components/ui/Buttons';
import { RefreshCw, AlertCircle } from 'lucide-react';

import { FreezeLockScreen } from '../../components/ui/FreezeLockScreen';

export default function StagesPage() {
  const { user, isLoading: authLoading } = useAuth();

  const [adapterResult, setAdapterResult] = useState<StageAdapterResult | null>(null);
  const [freezeState, setFreezeState] = useState<{ isCompetitionFrozen: boolean; freezeReason?: string; frozenAt?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const fetchStageData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      // 1. Fetch public stage configurations and freeze status in parallel
      const [stagesData, freezeData] = await Promise.all([
        apiFetch<BackendStageConfig[]>('/stages'),
        apiFetch<{ isCompetitionFrozen: boolean; freezeReason?: string; frozenAt?: string }>('/freeze-status').catch(() => ({ isCompetitionFrozen: false }))
      ]);
      setFreezeState(freezeData);

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
        backHref={user ? '/dashboard' : '/'}
        backLabel={user ? 'Return to Dashboard' : 'Return to Overview'}
      >
        <LoadingState message="Synchronizing stage locks and telemetry..." />
      </GameShell>
    );
  }

  // Full-page lock screen when competition is frozen for participants
  if (freezeState?.isCompetitionFrozen && user?.role !== 'admin') {
    return (
      <FreezeLockScreen
        freezeReason={freezeState.freezeReason}
        frozenAt={freezeState.frozenAt}
        onRefresh={() => fetchStageData(true)}
        isAdmin={false}
      />
    );
  }

  return (
    <GameShell
      title="FIVE-STAGE PROGRESSION MAP"
      subtitle="Interactive incident containment sequence across five technical stages. Access to each sector is strictly verified by backend authorization gates."
      breadcrumbs={[
        { label: 'Home', href: '/' },
        ...(user ? [{ label: 'Dashboard', href: '/dashboard' }] : []),
        { label: 'Stages' }
      ]}
      backHref={user ? '/dashboard' : '/'}
      backLabel={user ? 'Return to Dashboard' : 'Return to Overview'}
      actions={
        <GhostButton
          onClick={() => fetchStageData(true)}
          disabled={refreshing}
          icon={<RefreshCw size={13} className={refreshing ? 'animate-spin text-[var(--cyan-primary)]' : ''} />}
          className="text-xs py-2 px-4 shadow-[0_0_12px_rgba(0,245,255,0.15)] border-[rgba(0,245,255,0.3)] hover:border-[var(--cyan-primary)]"
          aria-label="Refresh stage telemetry"
        >
          <span>{refreshing ? 'Syncing Telemetry...' : 'Sync Telemetry'}</span>
        </GhostButton>
      }
    >
      {/* Offline / Adapter Notice if applicable */}
      {errorNotice && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-[rgba(255,183,3,0.1)] border border-[rgba(255,183,3,0.35)] backdrop-blur-md flex items-center justify-between text-xs font-mono text-[var(--status-warning)] shadow-[0_0_20px_rgba(255,183,3,0.15)]"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0 text-[var(--status-warning)]" />
            <span>{errorNotice}</span>
          </div>
          <button
            onClick={() => setErrorNotice(null)}
            className="text-[var(--text-muted)] hover:text-white ml-3 underline focus:outline-none"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Authority Banner */}
      {adapterResult && !adapterResult.isServerAuthoritative && (
        <div className="mb-6 p-3.5 rounded-xl bg-[rgba(255,51,102,0.08)] border border-[rgba(255,51,102,0.3)] backdrop-blur-md text-[11px] font-mono text-[var(--status-critical)] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--status-critical)] animate-pulse" />
          <span>OFFLINE STAGE MAP ADAPTER ACTIVE // Real-time server telemetry could not be verified. Background reconnect active.</span>
        </div>
      )}

      {/* Interactive Five-Stage Map */}
      {adapterResult && <StageMap stages={adapterResult.stages} />}
    </GameShell>
  );
}
