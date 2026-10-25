import React from 'react';

interface TerminalTextProps {
  children: React.ReactNode;
  prompt?: string;
  className?: string;
  variant?: 'cyan' | 'violet' | 'amber' | 'muted';
}

export const TerminalText: React.FC<TerminalTextProps> = ({
  children,
  prompt = '>_',
  className = '',
  variant = 'cyan'
}) => {
  const colorMap = {
    cyan: 'text-[var(--cyan-primary)] border-[rgba(0,245,255,0.25)]',
    violet: 'text-[var(--violet-primary)] border-[rgba(168,85,247,0.25)]',
    amber: 'text-[var(--status-warning)] border-[rgba(255,183,3,0.25)]',
    muted: 'text-[var(--text-secondary)] border-[rgba(255,255,255,0.1)]'
  };

  return (
    <div
      className={`cyber-terminal flex items-start gap-2 text-xs font-mono select-text ${colorMap[variant]} ${className}`}
    >
      <span className="opacity-60 select-none shrink-0" aria-hidden="true">
        {prompt}
      </span>
      <div className="flex-1 break-all whitespace-pre-wrap">{children}</div>
    </div>
  );
};
