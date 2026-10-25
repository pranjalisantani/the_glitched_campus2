'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { PrimaryButton, GhostButton } from '../components/ui/Buttons';
import { 
  ShieldAlert, 
  Terminal, 
  Zap, 
  ArrowRight, 
  Cpu, 
  Radio, 
  ShieldCheck 
} from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    apiFetch('/stages')
      .then(() => {
        if (isMounted) setApiOnline(true);
      })
      .catch(() => {
        if (isMounted) setApiOnline(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex-1 w-full flex flex-col items-center px-4 sm:px-6 lg:px-8 py-10 max-w-7xl mx-auto">
      
      {/* Hero Section */}
      <section 
        aria-label="Competition Introduction"
        className="w-full text-center py-10 sm:py-16 flex flex-col items-center"
      >
        
        {/* Tactical HUD Chip */}
        <div className="flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-[rgba(0,245,255,0.06)] border border-[rgba(0,245,255,0.22)] shadow-[0_0_12px_rgba(0,245,255,0.15)]">
          <span className="hud-dot" aria-hidden="true" />
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--cyan-primary)]">
            CYBER INCIDENT INVESTIGATION // SECTOR 07
          </span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-mono tracking-tight text-white mb-4 drop-shadow-[0_0_30px_rgba(0,245,255,0.45)]">
          THE GLITCHED CAMPUS
        </h1>

        {/* Subtitle / Intro */}
        <p className="max-w-2xl text-base sm:text-lg text-[var(--text-secondary)] font-sans leading-relaxed mb-8">
          A multi-stage cyber-investigation competition. Enter the incident matrix, decode security telemetry, isolate encrypted payloads, analyze incident logs, design defensive architecture, and deploy responsive applications.
        </p>

        {/* Telemetry Status Strip */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-surface-1)] border border-[var(--cyan-border)] rounded-lg p-3 mb-8 max-w-xl w-full">
          <div className="flex items-center gap-1.5">
            <Cpu size={14} className="text-[var(--cyan-primary)]" aria-hidden="true" />
            <span>GATEWAY: {apiOnline === null ? 'CONNECTING...' : apiOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Radio size={14} className="text-[var(--violet-primary)]" aria-hidden="true" />
            <span>STAGES: 5 SEQUENTIAL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#00ffa3]" aria-hidden="true" />
            <span>CLEARANCE: {user ? user.teamName : 'AUTHENTICATION REQUIRED'}</span>
          </div>
        </div>

        {/* Prominent Call to Action */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <PrimaryButton
            href="/game"
            icon={<ArrowRight size={18} />}
            className="text-base px-8 py-3.5 shadow-[0_0_25px_rgba(0,245,255,0.4)] hover:shadow-[0_0_35px_rgba(0,245,255,0.7)]"
            aria-label="Enter the Game"
          >
            ENTER THE GAME
          </PrimaryButton>

          <GhostButton
            href="/stages"
            className="text-base px-6 py-3.5"
            aria-label="View Five-Stage Progression Map"
          >
            EXPLORE STAGE MAP
          </GhostButton>
        </div>

      </section>

      {/* Security & Competition Integrity Section */}
      <section 
        aria-label="Competition Safeguards and Principles"
        className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
      >
        <div className="p-6 rounded-lg bg-[var(--bg-surface-1)] border border-[rgba(0,245,255,0.15)]">
          <h3 className="font-mono text-sm font-bold text-[var(--cyan-primary)] mb-2 flex items-center gap-2">
            <ShieldAlert size={16} aria-hidden="true" />
            <span>Server-Enforced Authorization</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            All stage state, scoring rules, answer verification, and selection locks are strictly guarded on the backend. Locked stages cannot be bypassed via client-side manipulation.
          </p>
        </div>

        <div className="p-6 rounded-lg bg-[var(--bg-surface-1)] border border-[rgba(0,245,255,0.15)]">
          <h3 className="font-mono text-sm font-bold text-[var(--violet-primary)] mb-2 flex items-center gap-2">
            <Zap size={16} aria-hidden="true" />
            <span>Strict Stage Continuity</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            The problem statement locked in during Stage 4 directly dictates the architectural directives enforced in Stage 5, ensuring cohesive end-to-end technical execution.
          </p>
        </div>

        <div className="p-6 rounded-lg bg-[var(--bg-surface-1)] border border-[rgba(0,245,255,0.15)]">
          <h3 className="font-mono text-sm font-bold text-[#00ffa3] mb-2 flex items-center gap-2">
            <Terminal size={16} aria-hidden="true" />
            <span>Single Team Identity</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Each team maintains an authenticated session across all five stages. Progress, submissions, hints, and selections are preserved server-side throughout the event.
          </p>
        </div>
      </section>

    </div>
  );
}
