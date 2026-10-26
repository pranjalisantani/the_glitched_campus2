import { IStore, MemoryStore } from './memoryStore';
import { PersistentFileStore } from './persistentStore';
import { SupabaseStore } from './supabaseStore';
import { loadEnvironment } from '../config/env';

// Ensure environment variables from .env files are loaded into process.env
loadEnvironment();

function isConfiguredSupabase(url?: string, key?: string): boolean {
  if (!url || !key) return false;
  const u = url.trim().toLowerCase();
  const k = key.trim().toLowerCase();
  if (!u.startsWith('https://')) return false;
  if (u.includes('your-project') || u.includes('example.supabase')) return false;
  if (k.includes('your_supabase') || k.includes('dummy') || k.includes('placeholder')) return false;
  return true;
}

function createStore(): IStore {
  // Never pollute production Supabase database during automated unit test runs
  const isTest = process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('test'));
  if (isTest) {
    return new PersistentFileStore();
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY)?.trim();

  if (isConfiguredSupabase(supabaseUrl, supabaseKey)) {
    console.log('[DATA STORE] Initializing Supabase PostgreSQL storage engine...');
    return new SupabaseStore(supabaseUrl!, supabaseKey!);
  }

  // Fallback to local persistent JSON file store
  return new PersistentFileStore();
}

// Storage engine for tournament event data and administrative records
export const store: IStore = createStore();

export * from './memoryStore';
export * from './persistentStore';
export * from './supabaseStore';
