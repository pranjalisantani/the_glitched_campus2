import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';

export const metadata: Metadata = {
  title: 'THE GLITCHED CAMPUS // Cyber Operations Platform',
  description: 'Collegiate cyber-forensics & incident containment event platform across five technical stages.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen flex flex-col bg-[var(--bg-void)] text-[var(--text-primary)] antialiased relative selection:bg-[var(--cyan-primary)] selection:text-black">
        <AuthProvider>
          <div className="scanline-beam" aria-hidden="true" />
          <Navbar />
          <main className="flex-1 flex flex-col relative z-10 w-full">
            {children}
          </main>
          <footer className="w-full border-t border-[rgba(0,245,255,0.12)] bg-[rgba(9,11,16,0.85)] py-4 text-center text-xs font-mono text-[var(--text-dim)]">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span>THE GLITCHED CAMPUS // INCIDENT ID #NEXUS-GLITCH-2026-B</span>
              <span className="text-[11px] text-[var(--cyan-primary)]">
                Provisional Data Store: In-Memory Mode Active
              </span>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
