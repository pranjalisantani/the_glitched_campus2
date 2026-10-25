'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  UserPlus,
  Plus,
  Trash2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [teamName, setTeamName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="relative w-full flex-1 flex flex-col justify-between overflow-hidden min-h-[calc(100vh-3.5rem)]">

      {/* Background: Cinematic Digital Campus Backdrop (Reusing Login Hero Asset) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <Image
          src="/images/login_campus_hero.jpg"
          alt="The Glitched Campus atmospheric environment"
          fill
          priority
          className="object-cover object-center opacity-40 scale-105 transition-transform duration-1000 ease-out"
        />
        {/* Cinematic Vignette & Deep Navy Atmosphere Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050608] via-[rgba(5,6,8,0.82)] to-[rgba(5,6,8,0.5)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-transparent to-[rgba(5,6,8,0.7)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_40%,rgba(168,85,247,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_60%,rgba(0,245,255,0.1),transparent_50%)]" />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          {/* Left Column: Atmospheric Typography & Enlistment Briefing */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">

            <div className="font-mono text-xs sm:text-sm font-bold tracking-widest text-[var(--cyan-primary)] uppercase mb-2">
              ENLIST IN
            </div>

            {/* Glitch Title */}
            <div className="mb-4">
              <h1 className="flex flex-col tracking-tight leading-none text-left">
                <span className="font-mono text-lg sm:text-2xl font-bold tracking-widest text-[var(--cyan-primary)] uppercase mb-1">
                  THE
                </span>
                <span
                  className="glitch-hero font-black font-sans uppercase text-4xl sm:text-6xl lg:text-7xl text-white tracking-wider"
                  data-text="GLITCHED"
                >
                  GLITCHED
                </span>
                <span
                  className="font-black font-sans uppercase text-4xl sm:text-6xl lg:text-7xl text-transparent bg-clip-text bg-gradient-to-r from-[#ff3366] via-purple-300 to-[var(--cyan-primary)] tracking-wider mt-1"
                >
                  CAMPUS
                </span>
              </h1>
            </div>

            <p className="text-sm sm:text-base text-[var(--text-secondary)] font-sans leading-relaxed max-w-md mb-4">
              Create one synchronized team credential. Enlist up to 5 operatives to participate in the five-stage cyber investigation.
            </p>

            {/* Glowing angled cyber hash bars */}
            <div className="flex gap-1.5 pt-1">
              <span className="w-5 h-2 -skew-x-12 bg-[var(--cyan-primary)] opacity-95" />
              <span className="w-5 h-2 -skew-x-12 bg-[var(--cyan-primary)] opacity-80" />
              <span className="w-5 h-2 -skew-x-12 bg-[var(--cyan-primary)] opacity-65" />
              <span className="w-5 h-2 -skew-x-12 bg-[var(--cyan-primary)] opacity-50" />
              <span className="w-5 h-2 -skew-x-12 bg-[var(--cyan-primary)] opacity-30" />
            </div>

            {/* Tactical Protocol Note */}
            <div className="mt-8 hidden lg:flex items-start gap-3 p-4 rounded-xl bg-[rgba(9,11,16,0.65)] border border-[rgba(255,255,255,0.08)] backdrop-blur-md max-w-md">
              <div className="w-8 h-8 rounded-lg bg-[rgba(0,245,255,0.08)] border border-[rgba(0,245,255,0.2)] flex items-center justify-center shrink-0 mt-0.5">
                <Users size={16} className="text-[var(--cyan-primary)]" />
              </div>
              <div className="text-xs font-mono text-[var(--text-muted)] leading-relaxed">
                <strong className="text-white block mb-0.5">SYNCHRONIZED SQUAD ACCESS</strong>
                All registered members share a single squad login. Answers, decoded payloads, and chosen datasets remain synchronized in real time.
              </div>
            </div>

          </div>

          {/* Right Column: Registration Glassmorphism Card */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <div className="w-full max-w-lg p-6 sm:p-8 rounded-2xl bg-[rgba(9,11,16,0.85)] backdrop-blur-xl border border-[rgba(0,245,255,0.32)] shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_20px_rgba(0,245,255,0.15)] relative">

              {/* Top Navigation Switch: Login / Register */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] mb-6 font-mono text-xs">
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                >
                  <User size={14} />
                  <span>Login</span>
                </Link>
                <div className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[rgba(0,245,255,0.15)] border border-[var(--cyan-primary)] text-white font-bold shadow-[0_0_15px_rgba(0,245,255,0.2)]">
                  <UserPlus size={14} className="text-[var(--cyan-primary)]" />
                  <span>Register</span>
                </div>
              </div>

              {/* Panel Header */}
              <div className="text-center mb-6">
                <h2 className="text-base sm:text-lg font-bold font-mono tracking-widest text-white uppercase">
                  CREATE SQUAD RECORD
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Enlist your team credentials to access the Glitched Campus
                </p>
              </div>

              {/* Error Announcement */}
              {error && (
                <div
                  role="alert"
                  className="mb-5 p-3 rounded-xl bg-[rgba(255,51,102,0.12)] border border-[rgba(255,51,102,0.4)] flex items-center gap-2.5 text-xs text-[var(--status-critical)]"
                >
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Team Name Field */}
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 font-bold">
                    TEAM / SQUAD NAME *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
                      <Users size={16} />
                    </div>
                    <input
                      type="text"
                      required
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. BinaryVanguard"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-[rgba(5,6,8,0.7)] border border-[rgba(255,255,255,0.12)] focus:border-[var(--cyan-primary)] focus:bg-[rgba(5,6,8,0.9)] focus:outline-none focus:ring-1 focus:ring-[var(--cyan-primary)] text-sm text-white placeholder-[var(--text-dim)] font-sans transition-all"
                    />
                  </div>
                </div>

                {/* Primary Contact Email Field */}
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 font-bold">
                    PRIMARY CONTACT EMAIL *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="teamlead@campus.edu"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-[rgba(5,6,8,0.7)] border border-[rgba(255,255,255,0.12)] focus:border-[var(--cyan-primary)] focus:bg-[rgba(5,6,8,0.9)] focus:outline-none focus:ring-1 focus:ring-[var(--cyan-primary)] text-sm text-white placeholder-[var(--text-dim)] font-sans transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 font-bold">
                    TEAM ACCESS KEY (MIN 6 CHARACTERS) *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-[rgba(5,6,8,0.7)] border border-[rgba(255,255,255,0.12)] focus:border-[var(--cyan-primary)] focus:bg-[rgba(5,6,8,0.9)] focus:outline-none focus:ring-1 focus:ring-[var(--cyan-primary)] text-sm text-white placeholder-[var(--text-dim)] font-sans transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-muted)] hover:text-[var(--cyan-primary)] transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Dynamic Members List */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">
                      TEAM MEMBERS (1 TO 5 PARTICIPANTS) *
                    </label>
                    {members.length < 5 && (
                      <button
                        type="button"
                        onClick={addMemberField}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(0,245,255,0.08)] border border-[rgba(0,245,255,0.25)] text-[11px] font-mono text-[var(--cyan-primary)] hover:bg-[rgba(0,245,255,0.16)] hover:border-[var(--cyan-primary)] transition-colors cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Add Member</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {members.map((member, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-8 h-10 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center font-mono text-xs text-[var(--cyan-primary)] font-bold shrink-0">
                          0{idx + 1}
                        </div>
                        <input
                          type="text"
                          required
                          value={member}
                          onChange={(e) => handleMemberChange(idx, e.target.value)}
                          placeholder={`Operative 0${idx + 1} Full Name`}
                          className="flex-1 px-3.5 py-2.5 rounded-xl bg-[rgba(5,6,8,0.7)] border border-[rgba(255,255,255,0.12)] focus:border-[var(--cyan-primary)] focus:bg-[rgba(5,6,8,0.9)] focus:outline-none focus:ring-1 focus:ring-[var(--cyan-primary)] text-sm text-white placeholder-[var(--text-dim)] font-sans transition-all"
                        />
                        {members.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMemberField(idx)}
                            className="p-2.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--status-critical)] hover:bg-[rgba(255,51,102,0.1)] transition-colors shrink-0 cursor-pointer"
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

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  id="submit-register-btn"
                  className="w-full py-3.5 mt-4 rounded-xl bg-[rgba(0,245,255,0.18)] hover:bg-[rgba(0,245,255,0.28)] border-2 border-[var(--cyan-primary)] text-white font-mono text-sm font-bold tracking-wider uppercase cyber-cta-glow transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,245,255,0.3)]"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>INITIALIZING TEAM RECORD...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-[var(--cyan-primary)] hover:text-white">
                      <span>COMPLETE REGISTRATION</span>
                      <ArrowRight size={16} />
                    </span>
                  )}
                </button>

              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-[1px] bg-[rgba(255,255,255,0.08)]" />
                <span className="text-[10px] font-mono text-[var(--text-dim)] uppercase">OR</span>
                <div className="flex-1 h-[1px] bg-[rgba(255,255,255,0.08)]" />
              </div>

              {/* Secondary Link to Login */}
              <div className="text-center font-mono text-xs text-[var(--text-muted)]">
                <span>Already have a squad? </span>
                <Link href="/login" className="text-[var(--cyan-primary)] hover:text-[var(--cyan-hover)] hover:underline font-bold transition-colors">
                  Authenticate here →
                </Link>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Bottom Status Strip (Matching Login & Homepage) */}
      <div className="relative z-10 w-full border-t border-[rgba(255,255,255,0.08)] bg-[rgba(7,9,14,0.85)] backdrop-blur-md py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">

          {/* Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-[rgba(255,255,255,0.03)] border border-[rgba(0,245,255,0.25)]">
            <span className="w-2 h-2 rounded-full bg-[var(--status-success)] animate-pulse" />
            <span className="text-[10px] uppercase text-[var(--text-muted)]">
              ENLISTMENT GATEWAY // <strong className="text-[var(--status-success)]">Active</strong>
            </span>
          </div>

          {/* Motto */}
          <div className="text-[11px] text-[var(--text-dim)] uppercase tracking-wider hidden sm:block">
            TOGETHER • SOLVE • INNOVATE
          </div>

          {/* Slanted Accent Bars */}
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-2 -skew-x-12 bg-[var(--cyan-primary)]" />
            <span className="w-3.5 h-2 -skew-x-12 bg-[var(--cyan-primary)] opacity-75" />
            <span className="w-3.5 h-2 -skew-x-12 bg-[var(--violet-primary)]" />
            <span className="w-3.5 h-2 -skew-x-12 bg-[var(--status-critical)]" />
          </div>

        </div>
      </div>

    </div>
  );
}
