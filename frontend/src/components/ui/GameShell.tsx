'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
    <div className={`relative w-full flex-1 flex flex-col justify-between overflow-hidden ${className}`}>

      {/* Background: Atmospheric Mission Backdrop */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <Image
          src="/images/mission_briefing_bg.jpg"
          alt="Tactical Cyber Operations Grid"
          fill
          priority={false}
          className="object-cover object-center opacity-25 scale-105 pointer-events-none"
        />
        {/* Cinematic Vignette & Cyber Atmospheric Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050608] via-[rgba(5,6,8,0.88)] to-[rgba(5,6,8,0.6)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-transparent to-[rgba(5,6,8,0.8)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_35%,rgba(0,245,255,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_60%,rgba(168,85,247,0.08),transparent_50%)]" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 flex flex-col">
        {/* Tactical Status & Breadcrumb Header */}
        <header className="w-full flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-[rgba(0,245,255,0.15)] text-xs font-mono">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {backHref && (
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(9,11,16,0.85)] border border-[rgba(0,245,255,0.25)] text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] hover:border-[var(--cyan-primary)] transition-all shadow-[0_0_10px_rgba(0,245,255,0.1)] focus-visible:ring-2 focus-visible:ring-[var(--cyan-primary)]"
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
                    {idx > 0 && <span className="text-[rgba(255,255,255,0.2)]" aria-hidden="true">/</span>}
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="hover:text-[var(--cyan-primary)] transition-colors focus-visible:underline"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-[var(--cyan-primary)] font-semibold" aria-current="page">
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
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(0,245,255,0.06)] border border-[rgba(0,245,255,0.25)] text-[var(--cyan-primary)] shadow-[0_0_12px_rgba(0,245,255,0.1)]">
                <UserCheck size={13} aria-hidden="true" />
                <span className="font-semibold truncate max-w-[150px] sm:max-w-[200px]">
                  {user.teamName}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-[rgba(0,245,255,0.12)]">
                  {user.role}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(255,183,3,0.08)] border border-[rgba(255,183,3,0.3)] text-[var(--status-warning)]">
                <Shield size={13} aria-hidden="true" />
                <span className="font-semibold">UNAUTHENTICATED</span>
              </div>
            )}

            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[rgba(9,11,16,0.6)] border border-[rgba(255,255,255,0.06)] text-[var(--text-dim)]">
              <Radio size={12} className="text-[var(--cyan-primary)] animate-pulse" aria-hidden="true" />
              <span>SECTOR 07 ACTIVE</span>
            </div>
          </div>
        </header>

        {/* Main Page Title Header if supplied */}
        {(title || subtitle || actions) && (
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 p-5 sm:p-6 rounded-2xl bg-[rgba(9,11,16,0.85)] border border-[rgba(255,255,255,0.08)] backdrop-blur-xl shadow-2xl">
            <div className="flex flex-col items-start">
              {/* Tactical Status Pill */}
              <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-[rgba(0,245,255,0.06)] border border-[rgba(0,245,255,0.2)]">
                <span className="w-2 h-2 rounded-full bg-[var(--cyan-primary)] animate-pulse" aria-hidden="true" />
                <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-[var(--cyan-primary)] font-bold">
                  TACTICAL MISSION CONTROL // SECTOR 07
                </span>
              </div>

              {title && (
                <h1 className="glitch-title text-2xl sm:text-3xl font-mono font-black text-white tracking-tight flex items-center gap-2.5" data-text={title}>
                  <ShieldAlert size={26} className="text-[var(--cyan-primary)] shrink-0" aria-hidden="true" />
                  <span>{title}</span>
                </h1>
              )}

              {/* Glowing angled cyber hash bars */}
              <div className="flex gap-1.5 my-2">
                <span className="w-4 h-1.5 -skew-x-12 bg-[var(--cyan-primary)] opacity-95" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[var(--cyan-primary)] opacity-80" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[var(--cyan-primary)] opacity-60" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[var(--cyan-primary)] opacity-40" />
                <span className="w-4 h-1.5 -skew-x-12 bg-[var(--cyan-primary)] opacity-20" />
              </div>

              {subtitle && (
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans mt-1 max-w-2xl leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div className="shrink-0 self-start sm:self-auto">{actions}</div>}
          </div>
        )}

        {/* Main Content Area */}
        <section className="flex-1 w-full flex flex-col">
          {children}
        </section>
      </div>
    </div>
  );
};
