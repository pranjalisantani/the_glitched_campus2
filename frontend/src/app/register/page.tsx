'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Plus, Trash2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [teamName, setTeamName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [members, setMembers] = useState<string[]>(['', '']); // Default 2 members
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMemberChange = (index: number, val: string) => {
    const updated = [...members];
    updated[index] = val;
    setMembers(updated);
  };

  const addMemberField = () => {
    if (members.length < 5) {
      setMembers([...members, '']);
    }
  };

  const removeMemberField = (index: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validMembers = members.map(m => m.trim()).filter(m => m.length > 0);
    if (validMembers.length === 0) {
      setError('Please provide at least one team member name.');
      return;
    }

    setLoading(true);

    try {
      await register({
        teamName,
        email,
        password,
        members: validMembers
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg cyber-card p-8 border-[var(--cyan-border)] shadow-[0_0_35px_rgba(0,0,0,0.8)]">
        
        {/* Card Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-lg bg-[rgba(0,245,255,0.12)] border border-[rgba(0,245,255,0.35)] flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(0,245,255,0.2)]">
            <ShieldCheck size={24} className="text-[var(--cyan-primary)]" />
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--cyan-primary)]">
            TEAM REGISTRATION PORTAL
          </span>
          <h1 className="text-2xl font-bold font-mono text-white mt-1">
            Enlist In The Matrix
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Create one synchronized credential pair for your entire team.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div 
            role="alert" 
            className="mb-4 p-3 rounded bg-[rgba(255,51,102,0.12)] border border-[rgba(255,51,102,0.4)] flex items-center gap-2.5 text-xs text-[var(--status-critical)]"
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1">
              TEAM NAME *
            </label>
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. BinaryVanguard"
              className="cyber-input"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1">
              PRIMARY CONTACT EMAIL *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teamlead@campus.edu"
              className="cyber-input"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1">
              TEAM ACCESS KEY (PASSWORD, MIN 6 CHARACTERS) *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="cyber-input"
            />
          </div>

          {/* Dynamic Members List */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-mono text-[var(--text-secondary)]">
                TEAM MEMBER NAMES (1 TO 5 PARTICIPANTS) *
              </label>
              {members.length < 5 && (
                <button
                  type="button"
                  onClick={addMemberField}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--cyan-primary)] hover:underline"
                >
                  <Plus size={12} />
                  <span>Add Member</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {members.map((member, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={member}
                    onChange={(e) => handleMemberChange(idx, e.target.value)}
                    placeholder={`Member ${idx + 1} Full Name`}
                    className="cyber-input flex-1"
                  />
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMemberField(idx)}
                      className="p-2 text-[var(--text-muted)] hover:text-[var(--status-critical)] transition-colors"
                      title="Remove Member"
                      aria-label={`Remove Member ${idx + 1}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cyber-button-primary w-full mt-4 py-3"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>INITIALIZING TEAM RECORD...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>COMPLETE REGISTRATION</span>
                <ArrowRight size={16} />
              </span>
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs text-[var(--text-muted)] font-mono">
            Already registered?{' '}
            <Link href="/login" className="text-[var(--cyan-primary)] hover:underline">
              Authenticate here
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
