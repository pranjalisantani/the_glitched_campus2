import React from 'react';

interface PanelProps {
  title?: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'cyan' | 'violet' | 'danger';
}

export const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  badge,
  action,
  children,
  className = '',
  variant = 'default'
}) => {
  const borderVariants = {
    default: 'border-[var(--cyan-border)]',
    cyan: 'border-[var(--cyan-primary)] shadow-[0_0_20px_rgba(0,245,255,0.15)]',
    violet: 'border-[var(--violet-primary)] shadow-[0_0_20px_rgba(168,85,247,0.15)]',
    danger: 'border-[var(--status-critical-border)] shadow-[0_0_20px_rgba(255,51,102,0.15)]'
  };

  return (
    <div
      className={`cyber-card p-6 ${borderVariants[variant]} ${className}`}
    >
      {(title || subtitle || badge || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[rgba(0,245,255,0.12)]">
          <div>
            <div className="flex items-center gap-2">
              {title && (
                <h3 className="font-mono text-base font-bold text-white tracking-wide">
                  {title}
                </h3>
              )}
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs font-mono text-[var(--text-muted)] mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
