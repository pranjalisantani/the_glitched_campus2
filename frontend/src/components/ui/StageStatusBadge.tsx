import React from 'react';
import { Lock, Unlock, PlayCircle, CheckCircle2 } from 'lucide-react';
import { StageStatus } from '../../lib/stages';

interface StageStatusBadgeProps {
  status: StageStatus;
  className?: string;
  showIcon?: boolean;
}

export const StageStatusBadge: React.FC<StageStatusBadgeProps> = ({
  status,
  className = '',
  showIcon = true
}) => {
  switch (status) {
    case 'available':
      return (
        <span
          className={`cyber-badge cyber-badge-cyan ${className}`}
          role="status"
          aria-label="Status: Available"
        >
          {showIcon && <Unlock size={12} aria-hidden="true" />}
          <span>AVAILABLE</span>
        </span>
      );
    case 'in-progress':
      return (
        <span
          className={`cyber-badge cyber-badge-violet ${className}`}
          role="status"
          aria-label="Status: In Progress"
        >
          {showIcon && <PlayCircle size={12} aria-hidden="true" />}
          <span>IN PROGRESS</span>
        </span>
      );
    case 'completed':
      return (
        <span
          className={`cyber-badge cyber-badge-success ${className}`}
          role="status"
          aria-label="Status: Completed"
        >
          {showIcon && <CheckCircle2 size={12} aria-hidden="true" />}
          <span>COMPLETED</span>
        </span>
      );
    case 'locked':
    default:
      return (
        <span
          className={`cyber-badge cyber-badge-warning ${className}`}
          role="status"
          aria-label="Status: Locked"
        >
          {showIcon && <Lock size={12} aria-hidden="true" />}
          <span>LOCKED</span>
        </span>
      );
  }
};
