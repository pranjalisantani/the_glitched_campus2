'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import {
  ArrowRight,
  HelpCircle,
  KeyRound,
  Database,
  Layers,
  Sparkles,
  Radio
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

  const continueHref = user ? '/dashboard' : '/login';

  return (
    <div className="relative w-full flex-1 flex flex-col justify-between overflow-hidden">

      {/* Background: Cinematic Digital Campus Backdrop */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <Image
          src="/images/glitched_campus_hero.jpg"
          alt="The Glitched Campus digital environment"
          fill
          priority
          className="object-cover object-center opacity-40 scale-105 transition-transform duration-1000 ease-out"
        />
        {/* Cinematic Vignette & Deep Navy Atmosphere Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050608] via-[rgba(5,6,8,0.85)] to-[rgba(5,6,8,0.4)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-transparent to-[rgba(5,6,8,0.7)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(0,245,255,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_40%,rgba(168,85,247,0.12),transparent_45%)]" />
      </div>

      {/* Main Hero Content Area */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

          {/* Left Column: Glitch Typography, Description, & Single Primary CTA */}
          <div className="lg:col-span-8 flex flex-col items-start text-left">

            {/* Tactical Status Pill */}
            <div className="inline-flex items-center gap-2 mb-4 px-3.5 py-1.5 rounded-full bg-[rgba(0,245,255,0.06)] border border-[rgba(0,245,255,0.22)] backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[var(--cyan-primary)] animate-pulse" aria-hidden="true" />
              <span className="font-mono text-[11px] sm:text-xs uppercase tracking-widest text-[var(--cyan-primary)] font-bold">
                INCIDENT SIMULATION // UNKNOWN ANOMALY DETECTED
              </span>
            </div>

            {/* Bold Glitch Title */}
            <div className="mb-6">
              <div className="font-mono text-base sm:text-xl font-bold tracking-widest text-[var(--cyan-primary)] uppercase mb-1">
                THE
              </div>
              <h1 className="flex flex-wrap items-baseline gap-x-4 tracking-tight leading-none">
                <span
                  className="glitch-hero font-black font-sans uppercase text-5xl sm:text-7xl lg:text-8xl text-white tracking-wider"
                  data-text="GLITCHED"
                >
                  GLITCHED
                </span>
                <span
                  className="font-black font-sans uppercase text-5xl sm:text-7xl lg:text-8xl text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-[var(--cyan-primary)] tracking-wider"
                >
                  CAMPUS
                </span>
              </h1>
            </div>

            {/* Story / Event Subtitle */}
            <div className="space-y-1 mb-8 max-w-xl">
              <p className="text-base sm:text-xl font-medium text-white leading-relaxed">
                The campus isn&apos;t what it seems.
              </p>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] font-sans leading-relaxed">
                Five stages. One mission. Can your team uncover the truth behind the compromised network perimeter?
              </p>
            </div>

            {/* Exactly ONE Primary Call To Action */}
            <div className="mb-8">
              <Link
                href={continueHref}
                id="enter-campus-cta"
                className="group relative inline-flex items-center gap-3.5 px-8 sm:px-10 py-4 sm:py-4.5 rounded-full bg-[rgba(0,245,255,0.14)] hover:bg-[rgba(0,245,255,0.24)] border-2 border-[var(--cyan-primary)] text-white font-mono text-sm sm:text-base font-bold tracking-wider uppercase cyber-cta-glow transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0"
              >
                <span className="text-[var(--cyan-primary)] group-hover:text-white transition-colors">
                  ENTER THE CAMPUS
                </span>
                <ArrowRight
                  size={18}
                  className="text-[var(--cyan-primary)] group-hover:text-white transition-transform duration-300 group-hover:translate-x-1.5"
                  aria-hidden="true"
                />
              </Link>
            </div>

          </div>

          {/* Right Column: Floating Tactical Mission Pill HUD (Matching Reference) */}
          <div className="lg:col-span-4 flex justify-start lg:justify-end">
            <div className="p-6 rounded-2xl bg-[rgba(9,11,16,0.78)] backdrop-blur-md border border-[rgba(0,245,255,0.22)] shadow-[0_0_35px_rgba(0,0,0,0.85)] max-w-xs w-full font-mono">
              <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider mb-4 border-b border-[rgba(255,255,255,0.08)] pb-2 flex items-center justify-between">
                <span>SECTOR 07 PROTOCOL</span>
                <span className="inline-flex items-center gap-1 text-[var(--cyan-primary)]">
                  <Radio size={12} className="animate-pulse" />
                  <span>{apiOnline ? 'ONLINE' : 'ACTIVE'}</span>
                </span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-3xl font-black text-[var(--cyan-primary)] tracking-tight">5</div>
                  <div className="text-xs uppercase font-bold tracking-widest text-[var(--text-secondary)]">STAGES</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-[var(--violet-primary)] tracking-tight">1</div>
                  <div className="text-xs uppercase font-bold tracking-widest text-[var(--text-secondary)]">MISSION</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-[#00ffa3] tracking-tight">∞</div>
                  <div className="text-xs uppercase font-bold tracking-widest text-[var(--text-secondary)]">POSSIBILITIES</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Stage Capabilities Indicator Strip (Matching Reference) */}
      <div className="relative z-10 w-full border-t border-[rgba(255,255,255,0.08)] bg-[rgba(7,9,14,0.85)] backdrop-blur-md py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">

            <div className="flex items-center gap-3 p-2 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
              <div className="w-8 h-8 rounded bg-[rgba(0,245,255,0.08)] border border-[rgba(0,245,255,0.2)] flex items-center justify-center shrink-0">
                <HelpCircle size={15} className="text-[var(--cyan-primary)]" />
              </div>
              <div className="text-left font-mono">
                <div className="text-[10px] text-[var(--text-dim)] uppercase">Stage 01</div>
                <div className="text-xs font-semibold text-white">Test Knowledge</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
              <div className="w-8 h-8 rounded bg-[rgba(168,85,247,0.08)] border border-[rgba(168,85,247,0.2)] flex items-center justify-center shrink-0">
                <KeyRound size={15} className="text-[var(--violet-primary)]" />
              </div>
              <div className="text-left font-mono">
                <div className="text-[10px] text-[var(--text-dim)] uppercase">Stage 02</div>
                <div className="text-xs font-semibold text-white">Decode Hidden</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
              <div className="w-8 h-8 rounded bg-[rgba(0,255,163,0.08)] border border-[rgba(0,255,163,0.2)] flex items-center justify-center shrink-0">
                <Database size={15} className="text-[#00ffa3]" />
              </div>
              <div className="text-left font-mono">
                <div className="text-[10px] text-[var(--text-dim)] uppercase">Stage 03</div>
                <div className="text-xs font-semibold text-white">Analyze Data</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
              <div className="w-8 h-8 rounded bg-[rgba(255,183,3,0.08)] border border-[rgba(255,183,3,0.2)] flex items-center justify-center shrink-0">
                <Layers size={15} className="text-[#ffb703]" />
              </div>
              <div className="text-left font-mono">
                <div className="text-[10px] text-[var(--text-dim)] uppercase">Stage 04</div>
                <div className="text-xs font-semibold text-white">Design Prototype</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] col-span-2 sm:col-span-1">
              <div className="w-8 h-8 rounded bg-[rgba(255,51,102,0.08)] border border-[rgba(255,51,102,0.2)] flex items-center justify-center shrink-0">
                <Sparkles size={15} className="text-[#ff3366]" />
              </div>
              <div className="text-left font-mono">
                <div className="text-[10px] text-[var(--text-dim)] uppercase">Stage 05</div>
                <div className="text-xs font-semibold text-white">Build Future</div>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
