import { createClient } from '@supabase/supabase-js';
import { loadEnvironment } from '../config/env';

// Load environment variables from .env
loadEnvironment();

const REQUIRED_TABLES = [
  'teams',
  'stages',
  'quiz_questions',
  'quiz_submissions',
  'tab_focus_logs',
  'decode_challenges',
  'stage2_progress',
  'datasets',
  'dataset_selections',
  'problem_statements',
  'problem_selections',
  'system_settings',
  'audit_logs'
];

async function main() {
  console.log('===========================================================');
  console.log('THE GLITCHED CAMPUS // SUPABASE CONNECTION & HEALTH CHECK');
  console.log('===========================================================');

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY)?.trim();

  if (!supabaseUrl) {
    console.error('\n[ERROR] SUPABASE_URL is missing in your environment.');
    console.error('Please add SUPABASE_URL to your backend/.env file:');
    console.error('  SUPABASE_URL=https://your-project-id.supabase.co');
    process.exit(1);
  }

  if (!supabaseKey) {
    console.error('\n[ERROR] SUPABASE_SERVICE_ROLE_KEY is missing in your environment.');
    console.error('Please add SUPABASE_SERVICE_ROLE_KEY to your backend/.env file:');
    console.error('  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
    process.exit(1);
  }

  console.log(`\n[1/3] Validating configuration...`);
  console.log(`  Supabase URL: ${supabaseUrl}`);
  console.log(`  Service Role Key: [CONFIGURED] (${supabaseKey.substring(0, 10)}...${supabaseKey.substring(supabaseKey.length - 5)})`);

  console.log(`\n[2/3] Connecting to Supabase client & checking tables...`);
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  let missingTables: string[] = [];
  let accessibleTables: string[] = [];

  for (const table of REQUIRED_TABLES) {
    try {
      const { data, error } = await client.from(table).select('count', { count: 'exact', head: true });
      if (error) {
        missingTables.push(`${table} (${error.message})`);
      } else {
        accessibleTables.push(table);
      }
    } catch (err: any) {
      missingTables.push(`${table} (${err.message || err})`);
    }
  }

  if (missingTables.length > 0) {
    console.error('\n[DATABASE INCOMPLETE] The following tables are missing or not accessible:');
    for (const t of missingTables) {
      console.error(`  - ${t}`);
    }
    console.error('\n[ACTION REQUIRED]:');
    console.error('  1. Open your Supabase Dashboard: https://supabase.com/dashboard');
    console.error('  2. Go to SQL Editor -> New Query');
    console.error('  3. Copy the contents of supabase/schema.sql and paste it into the editor');
    console.error('  4. Click "Run" to create all tables and indexes');
    console.error('  5. Re-run this check: npm run test:supabase');
    process.exit(1);
  }

  console.log(`  All ${accessibleTables.length} tables verified accessible.`);

  console.log(`\n[3/3] Performing read/write persistence verification test...`);
  const testPingTimestamp = new Date().toISOString();
  const { error: upsertErr } = await client.from('system_settings').upsert({
    id: 'singleton',
    is_competition_frozen: false,
    freeze_reason: `Diagnostic ping verified at ${testPingTimestamp}`
  });

  if (upsertErr) {
    console.error('[ERROR] Write test failed:', upsertErr.message);
    process.exit(1);
  }

  const { data: readData, error: readErr } = await client
    .from('system_settings')
    .select('*')
    .eq('id', 'singleton')
    .single();

  if (readErr || !readData) {
    console.error('[ERROR] Read test failed:', readErr?.message || 'No record returned');
    process.exit(1);
  }

  console.log(`  Persistence verified: write and read returned successfully.`);

  console.log('\n===========================================================');
  console.log('SUCCESS: SUPABASE DATABASE IS FULLY CONNECTED & READY!');
  console.log('Backend will automatically persist all data to Supabase in production.');
  console.log('===========================================================\n');
}

main().catch(err => {
  console.error('\n[UNHANDLED ERROR]:', err);
  process.exit(1);
});
