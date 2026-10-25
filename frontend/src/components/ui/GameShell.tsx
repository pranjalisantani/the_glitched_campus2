'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, Radio, UserCheck, Shield } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface GameShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const GameShell: React.FC<GameShellProps> = ({
  children,
  title,
  subtitle,
  breadcrumbs = [],
  backHref,
  backLabel = 'Return',
  actions,
  className = ''
}) => {
  const { user } = useAuth();

  return (
    <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col flex-1 ${className}`}>
      
      {/* Tactical Status & Breadcrumb Header */}
      <header className="w-full flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-[rgba(0,245,255,0.12)] text-xs font-mono">
        <div className="flex items-center gap-2">
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--bg-surface-1)] border border-[rgba(0,245,255,0.2)] text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] hover:border-[var(--cyan-primary)] transition-all focus-visible:ring-2 focus-visible:ring-[var(--cyan-primary)]"
              aria-label={backLabel}
            >
              <ArrowLeft size={13} aria-hidden="true" />
              <span>{backLabel}</span>
            </Link>
          )}

          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb navigation" className="flex items-center gap-1.5 text-[var(--text-dim)]">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span aria-hidden="true">/</span>}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="hover:text-[var(--cyan-primary)] transition-colors focus-visible:underline"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-[var(--cyan-primary)]" aria-current="page">
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}
        </div>

        {/* Real Session State Ribbon */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[rgba(0,245,255,0.06)] border border-[rgba(0,245,255,0.2)] text-[var(--cyan-primary)]">
              <UserCheck size={13} aria-hidden="true" />
              <span className="truncate max-w-[150px] sm:max-w-[200px]">
                {user.teamName}
              </span>
              <span className="text-[10px] uppercase opacity-75">
                ({user.role})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[rgba(255,183,3,0.08)] border border-[rgba(255,183,3,0.25)] text-[var(--status-warning)]">
              <Shield size={13} aria-hidden="true" />
              <span>UNAUTHENTICATED</span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1 text-[var(--text-dim)]">
            <Radio size={12} className="text-[var(--cyan-primary)]" aria-hidden="true" />
            <span>SECTOR 07 ACTIVE</span>
          </div>
        </div>
      </header>

      {/* Main Page Title Header if supplied */}
      {(title || subtitle || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            {title && (
              <h1 className="text-2xl sm:text-3xl font-mono font-black text-white tracking-tight flex items-center gap-2.5">
                <ShieldAlert size={26} className="text-[var(--cyan-primary)] shrink-0" aria-hidden="true" />
                <span>{title}</span>
              </h1>
            )}
            {subtitle && (
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans mt-2 max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}

      {/* Main Content Area */}
      <section className="flex-1 w-full flex flex-col">
        {children}
      </section>
    </div>
  );
};
