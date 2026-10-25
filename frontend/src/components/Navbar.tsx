'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, ShieldCheck, Compass } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isStagesActive = pathname === '/stages' || pathname.startsWith('/stages/') || pathname.startsWith('/stage/');
  const isDashboardActive = pathname === '/dashboard';
  const isAdminActive = pathname.startsWith('/admin');

  const getNavLinkClasses = (isActive: boolean, isViolet = false) => {
    if (isActive) {
      return isViolet
        ? 'font-mono text-xs uppercase tracking-wider font-semibold px-3 py-1.5 rounded-lg text-[var(--violet-primary)] bg-[rgba(168,85,247,0.14)] border border-[rgba(168,85,247,0.4)] shadow-[0_0_12px_rgba(168,85,247,0.25)] flex items-center gap-1.5 transition-all'
        : 'font-mono text-xs uppercase tracking-wider font-semibold px-3 py-1.5 rounded-lg text-[var(--cyan-primary)] bg-[rgba(0,245,255,0.12)] border border-[rgba(0,245,255,0.35)] shadow-[0_0_12px_rgba(0,245,255,0.22)] flex items-center gap-1.5 transition-all';
    }
    return isViolet
      ? 'font-mono text-xs uppercase tracking-wider font-semibold px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--violet-primary)] hover:bg-[rgba(168,85,247,0.08)] hover:border-[rgba(168,85,247,0.25)] border border-transparent flex items-center gap-1.5 transition-all'
      : 'font-mono text-xs uppercase tracking-wider font-semibold px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] hover:bg-[rgba(0,245,255,0.06)] hover:border-[rgba(0,245,255,0.2)] border border-transparent flex items-center gap-1.5 transition-all';
  };

  return (
    <nav className="w-full border-b border-[rgba(255,255,255,0.06)] bg-[rgba(7,9,14,0.92)] backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">

        {/* Brand & ACM Identity */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Official ACM Chapter Logo (JIT ACM) */}
          <div
            className="flex items-center shrink-0"
            title="Official JIT ACM Student Chapter"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/acm-logo.png"
              alt="JIT ACM Official Logo"
              className="h-8 w-8 sm:h-9 sm:w-9 object-contain rounded transition-transform hover:scale-105"
            />
          </div>

          <span className="text-[var(--text-dim)] font-mono text-xs hidden sm:inline" aria-hidden="true">|</span>

          {/* Project Brand */}
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="The Glitched Campus Home">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[rgba(0,245,255,0.15)] to-[rgba(168,85,247,0.2)] border border-[rgba(0,245,255,0.35)] flex items-center justify-center transition-all group-hover:border-[var(--cyan-primary)] group-hover:shadow-[0_0_15px_rgba(0,245,255,0.35)] shadow-[0_0_10px_rgba(0,245,255,0.15)] shrink-0">
              <svg
                className="w-4 h-4 text-[var(--cyan-primary)] group-hover:text-white transition-colors"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-sm font-bold tracking-wider text-white group-hover:text-[var(--cyan-primary)] transition-colors leading-tight">
                THE GLITCHED CAMPUS
              </span>
              <span className="font-mono text-[9px] tracking-widest text-[var(--text-dim)] uppercase group-hover:text-[var(--cyan-primary)] transition-colors">
                INCIDENT RESPONSE MATRIX // 2026
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            /* Authenticated Nav */
            <>
              <Link
                href="/dashboard"
                className={getNavLinkClasses(isDashboardActive)}
                aria-current={isDashboardActive ? 'page' : undefined}
              >
                <LayoutDashboard size={14} />
                <span>Dashboard</span>
                {isDashboardActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--cyan-primary)] animate-pulse" />
                )}
              </Link>

              <Link
                href="/stages"
                className={getNavLinkClasses(isStagesActive)}
                aria-current={isStagesActive ? 'page' : undefined}
              >
                <Compass size={14} />
                <span>Stages</span>
                {isStagesActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--cyan-primary)] animate-pulse" />
                )}
              </Link>

              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  className={getNavLinkClasses(isAdminActive, true)}
                  aria-current={isAdminActive ? 'page' : undefined}
                >
                  <ShieldCheck size={14} />
                  <span>Admin</span>
                  {isAdminActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--violet-primary)] animate-pulse" />
                  )}
                </Link>
              )}

              <div className="flex items-center gap-3 pl-3 ml-1 border-l border-[rgba(255,255,255,0.08)]">
                <div className="flex flex-col items-end">
                  <span className="font-mono text-xs font-medium text-[var(--text-primary)]">
                    {user.teamName}
                  </span>
                  <span className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold ${
                    user.role === 'admin'
                      ? 'text-[var(--violet-primary)] bg-[rgba(168,85,247,0.12)] border border-[rgba(168,85,247,0.25)]'
                      : 'text-[var(--cyan-primary)] bg-[rgba(0,245,255,0.08)] border border-[rgba(0,245,255,0.2)]'
                  }`}>
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  title="Disconnect session"
                  className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--status-critical)] hover:bg-[rgba(255,51,102,0.1)] transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--status-critical)]"
                  aria-label="Logout"
                >
                  <LogOut size={15} />
                </button>
              </div>
            </>
          ) : (
            /* Unauthenticated Nav */
            <>
              <Link
                href="/stages"
                className={getNavLinkClasses(isStagesActive)}
                aria-current={isStagesActive ? 'page' : undefined}
              >
                <Compass size={14} />
                <span>Stages</span>
                {isStagesActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--cyan-primary)] animate-pulse" />
                )}
              </Link>

              <Link
                href="/admin/login"
                className={getNavLinkClasses(isAdminActive, true)}
                aria-current={isAdminActive ? 'page' : undefined}
              >
                <ShieldCheck size={14} />
                <span>Admin</span>
                {isAdminActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--violet-primary)] animate-pulse" />
                )}
              </Link>

              <Link
                href="/login"
                className="text-xs font-mono font-semibold uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-[rgba(0,245,255,0.08)] border border-[rgba(0,245,255,0.3)] text-[var(--cyan-primary)] hover:bg-[rgba(0,245,255,0.18)] hover:border-[var(--cyan-primary)] hover:text-white transition-all shadow-[0_0_12px_rgba(0,245,255,0.2)]"
              >
                Enter the Campus →
              </Link>
            </>
          )}
        </div>

      </div>
    </nav>
  );
};
