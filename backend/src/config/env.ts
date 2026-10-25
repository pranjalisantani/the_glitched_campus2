import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

let envLoaded = false;

export function loadEnvironment(): void {
  if (envLoaded) return;
  envLoaded = true;

  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(process.cwd(), 'backend/.env')
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        if (typeof (process as any).loadEnvFile === 'function') {
          (process as any).loadEnvFile(p);
          break;
        }
      } catch {
        // Continue if parsing fails
      }
    }
  }
}

const KNOWN_INSECURE_SECRETS = new Set([
  'nexus_super_secret_jwt_key_2026_change_in_production',
  'nexus_development_secret_key_change_in_production_2026',
  'secret',
  'changeme',
  'password',
  '12345678901234567890123456789012',
  'replace_with_a_cryptographically_secure_random_string_2026',
  'your_jwt_secret_here_must_be_long_and_random'
]);

let ephemeralDevSecret: string | null = null;

export function getJwtSecret(): string {
  loadEnvironment();
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (!secret) {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production.');
    }
    if (secret.length < 32) {
      throw new Error('FATAL: JWT_SECRET must be at least 32 characters in production.');
    }
    if (KNOWN_INSECURE_SECRETS.has(secret.toLowerCase())) {
      throw new Error('FATAL: JWT_SECRET matches a known insecure default example.');
    }
    return secret;
  }

  // Development & Test mode
  if (secret) {
    return secret;
  }

  if (!ephemeralDevSecret) {
    ephemeralDevSecret = crypto.randomBytes(32).toString('hex');
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[SECURITY WARNING] JWT_SECRET is not set in environment. Generated an ephemeral in-memory secret for local development. Tokens will become invalid upon server restart.');
    }
  }

  return ephemeralDevSecret;
}
