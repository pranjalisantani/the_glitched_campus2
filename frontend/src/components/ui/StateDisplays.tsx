import React from 'react';
import { Lock, AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { GhostButton, PrimaryButton } from './Buttons';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Interrogating secure matrix records...',
  className = ''
}) => (
  <div
    role="status"
    aria-live="polite"
    className={`w-full py-16 flex flex-col items-center justify-center text-center font-mono ${className}`}
  >
    <div
      className="w-8 h-8 border-2 border-[var(--cyan-primary)] border-t-transparent rounded-full animate-spin mb-4"
      aria-hidden="true"
    />
    <p className="text-xs text-[var(--cyan-primary)] tracking-wider uppercase">
      {message}
    </p>
  </div>
);

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Telemetry Link Disrupted',
  message,
  onRetry,
  className = ''
}) => (
  <div
    role="alert"
    aria-live="assertive"
    className={`cyber-card p-6 border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] text-center flex flex-col items-center ${className}`}
  >
    <div className="w-12 h-12 rounded-full bg-[rgba(255,51,102,0.15)] flex items-center justify-center mb-3">
      <AlertTriangle size={24} className="text-[var(--status-critical)]" />
    </div>
    <h3 className="font-mono text-sm font-bold text-white mb-1">{title}</h3>
    <p className="text-xs text-[var(--text-secondary)] font-mono max-w-md mb-4">
      {message}
    </p>
    {onRetry && (
      <GhostButton
        onClick={onRetry}
        icon={<RefreshCw size={14} />}
        className="text-xs py-1.5 px-3"
      >
        Retry Synchronization
      </GhostButton>
    )}
  </div>
);

interface EmptyStateProps {
  title?: string;
  message: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Records Found',
  message,
  action,
  className = ''
}) => (
  <div
    className={`cyber-card p-8 border-[rgba(0,245,255,0.15)] text-center flex flex-col items-center ${className}`}
  >
    <div className="w-12 h-12 rounded-full bg-[rgba(0,245,255,0.06)] flex items-center justify-center mb-3 text-[var(--text-dim)]">
      <Inbox size={24} />
    </div>
    <h3 className="font-mono text-sm font-bold text-white mb-1">{title}</h3>
    <p className="text-xs text-[var(--text-muted)] font-mono max-w-md mb-4">
      {message}
    </p>
    {action && action.href && (
      <PrimaryButton href={action.href} className="text-xs py-2 px-4">
        {action.label}
      </PrimaryButton>
    )}
    {action && action.onClick && (
      <PrimaryButton onClick={action.onClick} className="text-xs py-2 px-4">
        {action.label}
      </PrimaryButton>
    )}
  </div>
);

interface LockedStateProps {
  stageName: string;
  reason?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}

export const LockedState: React.FC<LockedStateProps> = ({
  stageName,
  reason = 'This stage is locked by competition administrators or requires completing prerequisite stages.',
  actionHref = '/stages',
  actionLabel = 'Return to Stage Map',
  className = ''
}) => (
  <div
    role="region"
    aria-label={`${stageName} is locked`}
    className={`cyber-card p-8 border-[rgba(255,183,3,0.35)] bg-[rgba(255,183,3,0.04)] text-center flex flex-col items-center max-w-lg mx-auto ${className}`}
  >
    <div className="w-12 h-12 rounded-lg bg-[rgba(255,183,3,0.12)] border border-[rgba(255,183,3,0.3)] flex items-center justify-center mb-3">
      <Lock size={22} className="text-[var(--status-warning)]" />
    </div>
    <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--status-warning)] mb-1">
      CLEARANCE RESTRICTED
    </span>
    <h3 className="font-mono text-lg font-bold text-white mb-2">{stageName}</h3>
    <p className="text-xs text-[var(--text-secondary)] font-mono leading-relaxed mb-6">
      {reason}
    </p>
    <GhostButton href={actionHref} className="text-xs py-2 px-4">
      {actionLabel}
    </GhostButton>
  </div>
);
