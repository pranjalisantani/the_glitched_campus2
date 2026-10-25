'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogOut, LayoutDashboard, ShieldCheck, Map, Play } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="w-full border-b border-[var(--cyan-border)] bg-[rgba(9,11,16,0.92)] backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded bg-gradient-to-br from-[rgba(0,245,255,0.2)] to-[rgba(168,85,247,0.25)] border border-[rgba(0,245,255,0.4)] flex items-center justify-center shadow-[0_0_12px_rgba(0,245,255,0.25)] group-hover:shadow-[0_0_20px_rgba(0,245,255,0.5)] transition-all">
            <ShieldAlert size={20} className="text-[var(--cyan-primary)]" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-sm font-bold tracking-wider text-[var(--cyan-primary)] group-hover:text-[var(--cyan-hover)] transition-colors">
              THE GLITCHED CAMPUS
            </span>
            <span className="font-mono text-[10px] text-[var(--text-dim)] tracking-widest uppercase">
              Incident Response Matrix // 2026
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/"
            className="text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] transition-colors hidden md:inline-block"
          >
            Overview
          </Link>

          <Link
            href="/game"
            className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] transition-colors"
          >
            <Play size={13} className="text-[var(--cyan-primary)]" />
            <span>Game</span>
          </Link>

          <Link
            href="/stages"
            className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] transition-colors"
          >
            <Map size={14} className="text-[var(--violet-primary)]" />
            <span>Stages</span>
          </Link>

          {user && (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] transition-colors hidden sm:flex"
            >
              <LayoutDashboard size={14} />
              <span>Dashboard</span>
            </Link>
          )}

          {user?.role === 'admin' && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-xs font-mono text-[var(--violet-primary)] hover:text-[var(--violet-hover)] px-2.5 py-1 rounded bg-[rgba(168,85,247,0.12)] border border-[rgba(168,85,247,0.35)] transition-all shadow-[0_0_10px_rgba(168,85,247,0.2)]"
            >
              <ShieldCheck size={14} />
              <span>Admin</span>
            </Link>
          )}

          {/* User Status / Auth Controls */}
          {user ? (
            <div className="flex items-center gap-3 pl-3 border-l border-[rgba(0,245,255,0.15)]">
              <div className="flex flex-col items-end">
                <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                  {user.teamName}
                </span>
                <span className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded ${
                  user.role === 'admin' 
                    ? 'text-[var(--violet-primary)] bg-[rgba(168,85,247,0.15)]' 
                    : 'text-[var(--cyan-primary)] bg-[rgba(0,245,255,0.12)]'
                }`}>
                  {user.role}
                </span>
              </div>
              <button
                onClick={logout}
                title="Disconnect from Matrix"
                className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--status-critical)] hover:bg-[rgba(255,51,102,0.12)] transition-colors"
                aria-label="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs font-mono px-3 py-1.5 rounded border border-[var(--cyan-border)] text-[var(--cyan-primary)] hover:bg-[rgba(0,245,255,0.1)] transition-all"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="text-xs font-mono font-bold px-3 py-1.5 rounded bg-[var(--cyan-primary)] text-black hover:bg-[var(--cyan-hover)] transition-all shadow-[0_0_10px_rgba(0,245,255,0.3)]"
              >
                Register
              </Link>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
};
