'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { ShieldCheck, Lock, Eye, EyeOff, AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import { PrimaryButton, GhostButton } from '../../../components/ui/Buttons';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, logout } = useAuth();

  const [emailOrTeamName, setEmailOrTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(emailOrTeamName, password);
      if (user.role !== 'admin') {
        logout();
        setError('Access Denied: Provided credentials do not possess administrator clearance.');
        return;
      }
      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md cyber-card p-8 border-[var(--violet-border)] shadow-[0_0_35px_rgba(168,85,247,0.2)]">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-lg bg-[rgba(168,85,247,0.12)] border border-[rgba(168,85,247,0.35)] flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <ShieldCheck size={26} className="text-[var(--violet-primary)]" aria-hidden="true" />
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--violet-primary)]">
            ELEVATED CLEARANCE GATEWAY
          </span>
          <h1 className="text-2xl font-bold font-mono text-white mt-1">
            Administrator Terminal
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
            Authorized personnel only. All access attempts are recorded.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded bg-[rgba(255,51,102,0.12)] border border-[rgba(255,51,102,0.4)] flex items-center gap-2.5 text-xs text-[var(--status-critical)] font-mono"
          >
            <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1">
              ADMINISTRATOR EMAIL / USERNAME
            </label>
            <input
              type="text"
              required
              value={emailOrTeamName}
              onChange={(e) => setEmailOrTeamName(e.target.value)}
              placeholder="admin@glitched.campus"
              className="cyber-input focus:border-[var(--violet-primary)] focus:shadow-[0_0_12px_rgba(168,85,247,0.35)]"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1">
              COMMAND ACCESS KEY
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="cyber-input pr-10 focus:border-[var(--violet-primary)] focus:shadow-[0_0_12px_rgba(168,85,247,0.35)]"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--violet-primary)] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cyber-button-primary w-full mt-2 py-3 bg-gradient-to-r from-[var(--violet-dim)] to-[var(--violet-primary)] text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                <span>VERIFYING CLEARANCE...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>AUTHENTICATE COMMAND SESSION</span>
                <ArrowRight size={16} aria-hidden="true" />
              </span>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-6 pt-4 border-t border-[rgba(168,85,247,0.15)] flex items-center justify-between text-xs font-mono text-[var(--text-dim)]">
          <Link
            href="/login"
            className="hover:text-[var(--cyan-primary)] transition-colors focus-visible:underline"
          >
            Participant Login
          </Link>
          <Link
            href="/"
            className="hover:text-white transition-colors focus-visible:underline"
          >
            Return to Briefing
          </Link>
        </div>

      </div>
    </div>
  );
}
