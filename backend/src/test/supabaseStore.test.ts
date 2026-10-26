import test from 'node:test';
import assert from 'node:assert/strict';
import { SupabaseStore } from '../store/supabaseStore';
import { DuplicateQuizSubmissionError } from '../store/memoryStore';

test('SupabaseStore Unit & Data Integrity Test Suite', async (t) => {
  // In-memory mock database for Supabase tables
  const mockDb: Record<string, any[]> = {
    stages: [],
    quiz_questions: [],
    decode_challenges: [],
    datasets: [],
    problem_statements: [],
    system_settings: [{ id: 'singleton', is_competition_frozen: false }],
    teams: [],
    quiz_submissions: [],
    stage2_progress: [],
    dataset_selections: [],
    problem_selections: [],
    audit_logs: [],
    tab_focus_logs: []
  };

  const createMockQuery = (table: string) => {
    return {
      select: () => ({
        eq: (col: string, val: any) => ({
          maybeSingle: async () => {
            const row = mockDb[table]?.find(r => r[col] === val);
            return { data: row || null, error: null };
          }
        }),
        order: () => ({
          limit: async (num: number) => ({
            data: (mockDb[table] || []).slice(0, num),
            error: null
          })
        }),
        then: (resolve: any) => resolve({ data: mockDb[table] || [], error: null })
      }),
      upsert: async (payload: any) => {
        if (!mockDb[table]) mockDb[table] = [];
        const existingIdx = mockDb[table].findIndex(r => (payload.id && r.id === payload.id) || (payload.team_id && r.team_id === payload.team_id));
        if (existingIdx >= 0) {
          mockDb[table][existingIdx] = { ...mockDb[table][existingIdx], ...payload };
        } else {
          mockDb[table].push(payload);
        }
        return { data: payload, error: null };
      },
      delete: () => ({
        eq: async (col: string, val: any) => {
          if (mockDb[table]) {
            mockDb[table] = mockDb[table].filter(r => r[col] !== val);
          }
          return { data: null, error: null };
        }
      })
    };
  };

  const mockClient: any = {
    from: (table: string) => createMockQuery(table)
  };

  // Instantiate SupabaseStore and inject mock client
  const store = new SupabaseStore('https://mock.supabase.co', 'mock-service-role-key');
  (store as any).client = mockClient;
  await (store as any).initStore();

  assert.equal(store.storeType, 'SUPABASE_POSTGRES');

  await t.test('1. Stage configuration & seed loading', async () => {
    const stages = await store.getAllStages();
    assert.equal(stages.length, 5);
    const s1 = await store.getStage('stage1');
    assert.ok(s1);
    assert.equal(s1?.id, 'stage1');
    assert.equal(s1?.name, 'Stage 1: Quiz');
  });

  let createdTeamId = '';
  await t.test('2. Team creation and DB persistence', async () => {
    const team = await store.createTeam({
      teamName: 'Alpha Squad',
      email: 'alpha@nexus.edu',
      passwordHash: 'hashed_pw_123',
      members: ['Alice', 'Bob'],
      role: 'participant'
    });

    createdTeamId = team.id;
    assert.ok(team.id.startsWith('team-'));
    assert.equal(team.teamName, 'Alpha Squad');

    // Verify lookup
    const byEmail = await store.findTeamByEmail('alpha@nexus.edu');
    assert.ok(byEmail);
    assert.equal(byEmail?.id, team.id);

    // Verify DB sync
    const dbTeam = mockDb.teams.find(r => r.id === team.id);
    assert.ok(dbTeam);
    assert.equal(dbTeam.team_name, 'Alpha Squad');
  });

  await t.test('3. Stage 1 Quiz submission & Duplicate Shielding', async () => {
    const questions = await store.getQuizQuestions(true);
    assert.ok(questions.length > 0);

    const answers: Record<string, string> = {};
    for (const q of questions as any[]) {
      answers[q.id] = q.correctOptionId;
    }

    const sub = await store.submitQuiz(createdTeamId, 'Alpha Squad', answers);
    assert.equal(sub.teamId, createdTeamId);
    assert.equal(sub.score, 10);
    assert.equal(sub.correctCount, sub.totalQuestions);

    // Verify DB sync
    const dbSub = mockDb.quiz_submissions.find(r => r.team_id === createdTeamId);
    assert.ok(dbSub);
    assert.equal(dbSub.score, 10);

    // Duplicate submission must throw
    await assert.rejects(
      async () => {
        await store.submitQuiz(createdTeamId, 'Alpha Squad', answers);
      },
      (err: any) => err instanceof DuplicateQuizSubmissionError
    );
  });

  await t.test('4. Stage 2 Decode challenge attempt and hint deduction', async () => {
    const challenges = await store.getDecodeChallenges(true);
    assert.ok(challenges.length > 0);
    const target = challenges[0] as any;

    // Unlock hint
    const hintRes = await store.unlockHint(createdTeamId, 'Alpha Squad', target.id);
    assert.equal(hintRes.hintsUsedCount, 1);
    assert.equal(hintRes.deductionMarks, 2);

    // Attempt challenge with incorrect answer
    const badAttempt = await store.submitChallengeAttempt(createdTeamId, 'Alpha Squad', target.id, 'WRONG_FLAG');
    assert.equal(badAttempt.isCorrect, false);
    assert.equal(badAttempt.attemptsRemaining, 2);

    // Attempt challenge with correct answer
    const goodAttempt = await store.submitChallengeAttempt(createdTeamId, 'Alpha Squad', target.id, target.expectedAnswer);
    assert.equal(goodAttempt.isCorrect, true);

    // Verify DB sync
    const dbProg = mockDb.stage2_progress.find(r => r.team_id === createdTeamId);
    assert.ok(dbProg);
    assert.equal(dbProg.hints_used_count, 1);
  });

  await t.test('5. Stage 3 Dataset selection & one-time locking', async () => {
    const datasets = await store.getDatasets();
    assert.ok(datasets.length > 0);
    const targetDs = datasets[0];

    const sel = await store.selectDataset(createdTeamId, 'Alpha Squad', targetDs.id);
    assert.equal(sel.datasetId, targetDs.id);

    // Verify DB sync
    const dbSel = mockDb.dataset_selections.find(r => r.team_id === createdTeamId);
    assert.ok(dbSel);
    assert.equal(dbSel.dataset_id, targetDs.id);

    // Duplicate selection must fail
    await assert.rejects(
      async () => {
        await store.selectDataset(createdTeamId, 'Alpha Squad', datasets[1].id);
      },
      /already selected dataset/i
    );
  });

  await t.test('6. Stage 4 Problem selection & Stage 5 continuity link', async () => {
    const problems = await store.getProblemStatements();
    assert.ok(problems.length > 0);
    const targetProb = problems[0];

    const sel = await store.selectProblemStatement(createdTeamId, 'Alpha Squad', targetProb.id);
    assert.equal(sel.problemId, targetProb.id);

    // Verify DB sync
    const dbProb = mockDb.problem_selections.find(r => r.team_id === createdTeamId);
    assert.ok(dbProb);
    assert.equal(dbProb.problem_id, targetProb.id);

    // Duplicate selection must fail
    await assert.rejects(
      async () => {
        await store.selectProblemStatement(createdTeamId, 'Alpha Squad', problems[1].id);
      },
      /already selected problem statement/i
    );

    // Verify team progress summary reflects continuity
    const summaries = await store.getTeamProgressSummaries();
    const teamSummary = summaries.find(s => s.teamId === createdTeamId);
    assert.ok(teamSummary);
    assert.equal(teamSummary?.stage5.continuityVerified, true);
    assert.equal(teamSummary?.stage5.problemId, targetProb.id);
  });

  await t.test('7. System Settings & Global Competition Freeze', async () => {
    let settings = await store.getSystemSettings();
    assert.equal(settings.isCompetitionFrozen, false);

    settings = await store.setCompetitionFreeze(true, 'Emergency maintenance', 'admin@glitched.campus');
    assert.equal(settings.isCompetitionFrozen, true);
    assert.equal(settings.freezeReason, 'Emergency maintenance');
    assert.equal(settings.frozenByEmail, 'admin@glitched.campus');

    // Verify DB sync
    const dbSettings = mockDb.system_settings.find(r => r.id === 'singleton');
    assert.ok(dbSettings);
    assert.equal(dbSettings.is_competition_frozen, true);

    // Unfreeze
    settings = await store.setCompetitionFreeze(false);
    assert.equal(settings.isCompetitionFrozen, false);
  });
});
