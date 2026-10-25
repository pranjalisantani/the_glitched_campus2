export type StageStatus = 'locked' | 'available' | 'in-progress' | 'completed';

export interface StageMeta {
  id: 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'stage5';
  number: 1 | 2 | 3 | 4 | 5;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  category: string;
}

export const STAGES_METADATA: readonly StageMeta[] = [
  {
    id: 'stage1',
    number: 1,
    title: 'BIT BLITZ',
    subtitle: 'Objective Security Assessment',
    description: 'Multiple-choice technical questions evaluating security fundamentals under active browser supervision.',
    href: '/stages/1',
    category: 'Knowledge Verification'
  },
  {
    id: 'stage2',
    number: 2,
    title: 'DECODE & ENCODE',
    subtitle: 'Cryptographic Forensics',
    description: 'Solve technical challenges using submitted answers and optional hints. Enforces a strict 3-attempt limit with deduction mechanics.',
    href: '/stages/2',
    category: 'Payload Cryptanalysis'
  },
  {
    id: 'stage3',
    number: 3,
    title: 'DATASET EDA',
    subtitle: 'Incident Log Analysis',
    description: 'Select and work with the competition dataset. One-time server-locked dataset selection with authorized file download.',
    href: '/stages/3',
    category: 'Forensic Investigation'
  },
  {
    id: 'stage4',
    number: 4,
    title: 'STATIC PROTOTYPE',
    subtitle: 'Defensive UI Prototyping',
    description: 'Select a problem statement for the static prototype stage. Locks in the core problem statement for downstream architecture.',
    href: '/stages/4',
    category: 'Architecture & Design'
  },
  {
    id: 'stage5',
    number: 5,
    title: 'DYNAMIC WEBSITE',
    subtitle: 'Full-Stack Implementation',
    description: 'Continue with the problem statement selected during Stage 4. Enforces strict backend continuity across stages.',
    href: '/stages/5',
    category: 'Dynamic Deployment'
  }
];
