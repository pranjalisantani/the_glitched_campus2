'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Terminal, Lock, Eye, EyeOff, AlertTriangle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

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
      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md cyber-card p-8 border-[var(--cyan-border)] shadow-[0_0_35px_rgba(0,0,0,0.8)]">
        
        {/* Card Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-lg bg-[rgba(0,245,255,0.12)] border border-[rgba(0,245,255,0.35)] flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(0,245,255,0.2)]">
            <Lock size={24} className="text-[var(--cyan-primary)]" />
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--cyan-primary)]">
            SECURE TERMINAL ACCESS
          </span>
          <h1 className="text-2xl font-bold font-mono text-white mt-1">
            Authenticate Identity
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Enter team credentials to access your designated workspace.
          </p>
        </div>

        {/* Error Announcement */}
        {error && (
          <div 
            role="alert" 
            className="mb-4 p-3 rounded bg-[rgba(255,51,102,0.12)] border border-[rgba(255,51,102,0.4)] flex items-center gap-2.5 text-xs text-[var(--status-critical)]"
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1">
              TEAM EMAIL OR NAME
            </label>
            <input
              type="text"
              required
              value={emailOrTeamName}
              onChange={(e) => setEmailOrTeamName(e.target.value)}
              placeholder="e.g. sentinels@nexus.edu or CyberSentinels"
              className="cyber-input"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1">
              ACCESS KEY (PASSWORD)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="cyber-input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--cyan-primary)] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cyber-button-primary w-full mt-2 py-3"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>VERIFYING CLEARANCE...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>CONNECT TERMINAL</span>
                <ArrowRight size={16} />
              </span>
            )}
          </button>
        </form>


        {/* Switch to Register */}
        <div className="mt-4 text-center">
          <p className="text-xs text-[var(--text-muted)] font-mono">
            New team registration required?{' '}
            <Link href="/register" className="text-[var(--cyan-primary)] hover:underline">
              Register here
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
