-- ==============================================================================
-- THE GLITCHED CAMPUS // Production PostgreSQL Database Schema for Supabase
-- ==============================================================================
-- Paste this script into your Supabase Dashboard -> SQL Editor and click "Run".
-- This script creates all required tables, indexes, and initial competition seeds.
-- ==============================================================================

-- 1. TEAMS & PARTICIPANTS
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  team_name TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  members JSONB NOT NULL DEFAULT '[]'::jsonb,
  role TEXT NOT NULL DEFAULT 'participant',
  admin_role TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  is_primary_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teams_email ON teams (lower(email));
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams (lower(team_name));

-- 2. STAGES CONFIGURATION
CREATE TABLE IF NOT EXISTS stages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'LOCKED',
  description TEXT,
  max_score NUMERIC DEFAULT 10,
  is_scoring_provisional BOOLEAN DEFAULT true,
  scoring_rule_notes TEXT,
  evaluation_criteria JSONB DEFAULT '[]'::jsonb,
  submission_requirements JSONB DEFAULT '[]'::jsonb
);

-- 3. STAGE 1: QUIZ QUESTIONS
CREATE TABLE IF NOT EXISTS quiz_questions (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_option_id TEXT NOT NULL,
  is_active_for_live_quiz BOOLEAN NOT NULL DEFAULT true,
  explanation TEXT,
  points NUMERIC DEFAULT 1,
  is_demonstration BOOLEAN NOT NULL DEFAULT false
);

-- 4. STAGE 1: QUIZ SUBMISSIONS
CREATE TABLE IF NOT EXISTS quiz_submissions (
  team_id TEXT PRIMARY KEY,
  team_name TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  score NUMERIC NOT NULL,
  score_override NUMERIC,
  evaluation_note TEXT,
  override_note TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. ANTI-CHEAT TAB FOCUS & CLIPBOARD LOGS
CREATE TABLE IF NOT EXISTS tab_focus_logs (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  details JSONB
);

CREATE INDEX IF NOT EXISTS idx_tab_logs_team_id ON tab_focus_logs (team_id);

-- 6. STAGE 2: DECODE & ENCODE CHALLENGES
CREATE TABLE IF NOT EXISTS decode_challenges (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  encoded_payload TEXT NOT NULL,
  expected_answer TEXT NOT NULL,
  hint TEXT NOT NULL,
  max_attempts INTEGER DEFAULT 3,
  hint_deduction NUMERIC DEFAULT 2,
  points NUMERIC DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_demonstration BOOLEAN NOT NULL DEFAULT false
);

-- 7. STAGE 2: TEAM PROGRESS & LOCKOUT
CREATE TABLE IF NOT EXISTS stage2_progress (
  team_id TEXT PRIMARY KEY,
  team_name TEXT NOT NULL,
  challenge_states JSONB NOT NULL DEFAULT '{}'::jsonb,
  hints_used_count INTEGER NOT NULL DEFAULT 0,
  deduction_marks NUMERIC NOT NULL DEFAULT 0,
  provisional_score NUMERIC NOT NULL DEFAULT 10,
  score_override NUMERIC,
  override_note TEXT,
  completed_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. STAGE 3: DATASET METADATA CATALOG
CREATE TABLE IF NOT EXISTS datasets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  filename TEXT NOT NULL,
  format TEXT NOT NULL,
  filesize TEXT NOT NULL,
  record_count INTEGER NOT NULL,
  schema_summary TEXT NOT NULL,
  evaluation_criteria JSONB DEFAULT '[]'::jsonb,
  submission_requirements JSONB DEFAULT '[]'::jsonb,
  is_demonstration BOOLEAN NOT NULL DEFAULT false
);

-- 9. STAGE 3: DATASET TEAM SELECTIONS
CREATE TABLE IF NOT EXISTS dataset_selections (
  team_id TEXT PRIMARY KEY,
  team_name TEXT NOT NULL,
  dataset_id TEXT NOT NULL,
  dataset_name TEXT NOT NULL,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. STAGE 4 & 5: PROBLEM STATEMENTS
CREATE TABLE IF NOT EXISTS problem_statements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  full_description TEXT NOT NULL,
  stage4_instructions TEXT NOT NULL,
  stage4_deliverables JSONB DEFAULT '[]'::jsonb,
  stage5_instructions TEXT NOT NULL,
  stage5_deliverables JSONB DEFAULT '[]'::jsonb,
  evaluation_criteria JSONB DEFAULT '[]'::jsonb,
  max_team_allocation INTEGER DEFAULT 5,
  is_demonstration BOOLEAN NOT NULL DEFAULT false
);

-- 11. STAGE 4 & 5: TEAM PROBLEM SELECTIONS (CONTINUITY)
CREATE TABLE IF NOT EXISTS problem_selections (
  team_id TEXT PRIMARY KEY,
  team_name TEXT NOT NULL,
  problem_id TEXT NOT NULL,
  problem_title TEXT NOT NULL,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. SYSTEM SETTINGS & GLOBAL COMPETITION FREEZE
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  is_competition_frozen BOOLEAN NOT NULL DEFAULT false,
  freeze_reason TEXT,
  frozen_at TIMESTAMPTZ,
  frozen_by_email TEXT
);

-- 13. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tab_focus_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE decode_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage2_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow full access to backend service_role key
DROP POLICY IF EXISTS "Service role full access on teams" ON teams;
CREATE POLICY "Service role full access on teams" ON teams FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on stages" ON stages;
CREATE POLICY "Service role full access on stages" ON stages FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on quiz_questions" ON quiz_questions;
CREATE POLICY "Service role full access on quiz_questions" ON quiz_questions FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on quiz_submissions" ON quiz_submissions;
CREATE POLICY "Service role full access on quiz_submissions" ON quiz_submissions FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on tab_focus_logs" ON tab_focus_logs;
CREATE POLICY "Service role full access on tab_focus_logs" ON tab_focus_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on decode_challenges" ON decode_challenges;
CREATE POLICY "Service role full access on decode_challenges" ON decode_challenges FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on stage2_progress" ON stage2_progress;
CREATE POLICY "Service role full access on stage2_progress" ON stage2_progress FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on datasets" ON datasets;
CREATE POLICY "Service role full access on datasets" ON datasets FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on dataset_selections" ON dataset_selections;
CREATE POLICY "Service role full access on dataset_selections" ON dataset_selections FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on problem_statements" ON problem_statements;
CREATE POLICY "Service role full access on problem_statements" ON problem_statements FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on problem_selections" ON problem_selections;
CREATE POLICY "Service role full access on problem_selections" ON problem_selections FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on system_settings" ON system_settings;
CREATE POLICY "Service role full access on system_settings" ON system_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on audit_logs" ON audit_logs;
CREATE POLICY "Service role full access on audit_logs" ON audit_logs FOR ALL USING (true);

-- Seed Singleton System Settings
INSERT INTO system_settings (id, is_competition_frozen, freeze_reason)
VALUES ('singleton', false, NULL)
ON CONFLICT (id) DO NOTHING;
