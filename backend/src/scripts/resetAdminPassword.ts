import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import net from 'net';
import readline from 'readline';
import bcrypt from 'bcryptjs';

/**
 * THE GLITCHED CAMPUS - Hardened Primary Administrator Password Recovery Utility
 *
 * Safety & Cryptographic Specifications:
 * 1. Requires interactive TTY terminal input for both password prompts; non-interactive execution is blocked.
 * 2. Guaranteed terminal raw mode cleanup and listener removal on success, validation error, exception, and SIGINT/SIGTERM.
 * 3. Enforces a minimum administrator password length of 14 characters.
 * 4. Silent password input (zero terminal echo, no characters or asterisks displayed).
 * 5. Conservative backend detection: probe failure or inconclusive response is NOT treated as stopped.
 * 6. Explicit PowerShell instructions for safe manual process/port verification + mandatory operator attestation.
 * 7. Verification that all account IDs in teams.json are unique and unambiguous.
 * 8. Unique timestamped safety backup created with exclusive 'wx' flag (no file overwrite).
 * 9. Cryptographic verification of backup file via SHA-256 and byte-size parity before any write.
 * 10. Pre-write bcrypt.compare validation: verifies the generated hash matches the input before writing to disk.
 * 11. Strict pre-write differential audit: verifies exactly 1 account modified, only passwordHash changed,
 *     and all other accounts/fields remain byte-for-byte identical.
 * 12. Atomic temporary-file-and-rename procedure with guaranteed failure cleanup.
 * 13. Comprehensive post-write verification: entire saved file re-parsed and validated against expected state.
 * 14. passwordForFinalValidation lifecycle: declared, held until post-write verification, cleared immediately and in finally.
 * 15. Safe failure recovery: never automatically overwrites or reverts a failed post-write state.
 * 16. Targeted process management: identifies and inspects the confirmed process bound to port 5000 before stopping.
 * 17. No plaintext passwords, password hashes, or session tokens are ever logged, printed, or persisted.
 *
 * Platform Note on Atomic Rename:
 * On Windows/NTFS, fs.renameSync provides atomic directory replacement only if the target file is not locked
 * by an active process. If the backend server is running and holding an open file handle, renameSync will fail
 * with EBUSY or EPERM. Ensuring all backend processes are completely stopped is mandatory.
 */

const MIN_PASSWORD_LENGTH = 14;
const BCRYPT_SALT_ROUNDS = 10;

let isRawModeActive = false;

// Synchronous and idempotent terminal restoration
function restoreTerminal(): void {
  if (process.stdin.isTTY) {
    try {
      if (isRawModeActive) {
        process.stdin.setRawMode(false);
        isRawModeActive = false;
      }
    } catch {}
    try {
      process.stdin.pause();
    } catch {}
  }
}

// Global process signal handlers to ensure terminal state is never left broken
process.on('SIGINT', () => {
  restoreTerminal();
  process.stdout.write('\n[ABORTED] Operation cancelled by operator (SIGINT).\n');
  process.exit(130);
});

process.on('SIGTERM', () => {
  restoreTerminal();
  process.stdout.write('\n[ABORTED] Operation terminated (SIGTERM).\n');
  process.exit(143);
});

process.on('uncaughtException', (err: any) => {
  restoreTerminal();
  const safeName = err && typeof err.name === 'string' ? err.name : 'UnknownError';
  console.error(`\n[FATAL ERROR] An unexpected exception occurred (${safeName}).`);
  process.exit(1);
});

process.on('exit', () => {
  restoreTerminal();
});

// Prompt for input silently (zero terminal echo) requiring interactive TTY
function promptHidden(query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      return reject(new Error('Interactive TTY terminal is required for secure administrator password entry.'));
    }

    process.stdout.write(query);

    try {
      process.stdin.setRawMode(true);
      isRawModeActive = true;
    } catch {
      restoreTerminal();
      return reject(new Error('Failed to activate terminal raw mode.'));
    }

    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    let password = '';

    const cleanup = () => {
      process.stdin.removeListener('data', onData);
      restoreTerminal();
    };

    const onData = (char: string) => {
      // Enter / Return / EOT
      if (char === '\n' || char === '\r' || char === '\u0004') {
        cleanup();
        process.stdout.write('\n');
        resolve(password);
        return;
      }
      // Ctrl+C (SIGINT)
      if (char === '\u0003') {
        cleanup();
        process.stdout.write('\n[ABORTED] Operation cancelled by operator.\n');
        process.exit(130);
      }
      // Backspace
      if (char === '\u0008' || char === '\x7f') {
        if (password.length > 0) {
          password = password.slice(0, -1);
        }
        return;
      }
      // Regular character (silent input: do not echo to stdout)
      password += char;
    };

    process.stdin.on('data', onData);
  });
}

// Prompt for plain text confirmation requiring interactive TTY
function promptConfirmation(query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      return reject(new Error('Interactive TTY terminal is required for operator confirmation.'));
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

// Conservative TCP port probe: connection refused (ECONNREFUSED) is the only clean inactive signal
function probeTcpPort(port: number, host = '127.0.0.1'): Promise<{ inUse: boolean; isDefinitiveClosed: boolean; details: string }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1200);

    socket.once('connect', () => {
      socket.destroy();
      resolve({ inUse: true, isDefinitiveClosed: false, details: `TCP socket established on port ${port}` });
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve({ inUse: false, isDefinitiveClosed: false, details: `TCP connection timed out on port ${port} (inconclusive)` });
    });

    socket.once('error', (err: any) => {
      socket.destroy();
      if (err && err.code === 'ECONNREFUSED') {
        resolve({ inUse: false, isDefinitiveClosed: true, details: 'Port actively refused connection (cleanly closed)' });
      } else {
        const safeCode = err && typeof err.code === 'string' ? err.code : 'UNKNOWN_SOCKET_ERROR';
        resolve({ inUse: false, isDefinitiveClosed: false, details: `Socket probe received error '${safeCode}' (inconclusive)` });
      }
    });

    socket.connect(port, host);
  });
}

// HTTP probe
function probeHttpPort(port: number, host = '127.0.0.1'): Promise<{ responded: boolean; details: string }> {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}/`, () => {
      resolve({ responded: true, details: `HTTP server responded on port ${port}` });
    });
    req.on('error', () => {
      resolve({ responded: false, details: 'HTTP connection failed' });
    });
    req.setTimeout(1000, () => {
      req.destroy();
      resolve({ responded: false, details: 'HTTP probe timed out' });
    });
  });
}

function resolveTeamsPath(): string {
  const candidates = [
    path.resolve(__dirname, '../../storage/data/teams.json'),
    path.resolve(process.cwd(), 'backend/storage/data/teams.json'),
    path.resolve(process.cwd(), 'storage/data/teams.json')
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  throw new Error(`Target file teams.json not found in candidate paths.`);
}

async function runRecovery(): Promise<void> {
  console.log('================================================================');
  console.log('⚡ THE GLITCHED CAMPUS // HARDENED PRIMARY ADMIN RECOVERY');
  console.log('================================================================\n');

  // 1. Mandatory interactive TTY check
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error('[FATAL] Non-interactive execution blocked.');
    console.error('This utility requires an interactive TTY terminal to securely ingest passwords.');
    process.exit(1);
  }

  // 2. Conservative multi-probe backend detection
  const backendPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
  console.log(`[SAFETY CHECK] Probing backend port ${backendPort}...`);

  const tcpProbe = await probeTcpPort(backendPort);
  if (tcpProbe.inUse) {
    console.error(`\n[SAFETY GUARD ERROR] Backend process is actively listening on port ${backendPort}.`);
    console.error(`Reason: ${tcpProbe.details}`);
    console.error('\nAction Required:');
    console.error('1. Stop the backend server: Press Ctrl+C in the terminal running "npm run dev" or the backend.');
    console.error('2. Safely verify in PowerShell that no process is bound to port 5000:');
    console.error(`   Get-NetTCPConnection -LocalPort ${backendPort} -State Listen -ErrorAction SilentlyContinue`);
    console.error('3. Re-run this utility once the backend is completely stopped.\n');
    process.exit(1);
  }

  const httpProbe = await probeHttpPort(backendPort);
  if (httpProbe.responded) {
    console.error(`\n[SAFETY GUARD ERROR] An HTTP server responded on port ${backendPort}.`);
    console.error(`Reason: ${httpProbe.details}`);
    console.error('Please stop all active servers on this port before proceeding.\n');
    process.exit(1);
  }

  // Conservative safety rule: If probe was not a definitive ECONNREFUSED closed signal, abort
  if (!tcpProbe.isDefinitiveClosed) {
    console.error(`\n[SAFETY GUARD ERROR] Port check was inconclusive (${tcpProbe.details}).`);
    console.error('Conservative safety rule: The script cannot automatically confirm the backend is stopped.');
    console.error('Please manually verify in PowerShell that no process is holding port 5000 before running.\n');
    process.exit(1);
  }

  console.log(`[SAFETY CHECK] Port ${backendPort} confirmed inactive (ECONNREFUSED).\n`);

  // 3. Safe Manual Process Verification Instructions & Operator Attestation
  console.log('[MANUAL PROCESS VERIFICATION & ATTESTATION]');
  console.log('Automated port checks cannot guarantee that all background Node processes or file watchers are fully stopped.');
  console.log('Before proceeding, verify manually in PowerShell:');
  console.log('  1. Inspect any process listening on the backend port:');
  console.log(`     $conn = Get-NetTCPConnection -LocalPort ${backendPort} -State Listen -ErrorAction SilentlyContinue`);
  console.log('     if ($conn) { Get-Process -Id $conn.OwningProcess | Select-Object Id, ProcessName, Path }');
  console.log('  2. Confirm it is the backend process before stopping:');
  console.log('     if ($conn) { Stop-Process -Id $conn.OwningProcess }');
  console.log('Note: This confirmation prompt is an additional safeguard, not a guarantee of safety.\n');

  const confirmStopped = await promptConfirmation('Have you manually verified that the backend process is stopped? (yes/no): ');
  if (confirmStopped.toLowerCase() !== 'yes') {
    console.error('\n[ABORTED] Confirmation not received. Please terminate the backend process and re-run.');
    process.exit(1);
  }
  console.log('');

  // 4. Resolve and validate teams.json
  const teamsPath = resolveTeamsPath();
  const dataDir = path.dirname(teamsPath);
  console.log(`[STORAGE] Target data store located at:\n  ${teamsPath}\n`);

  let originalBuffer: Buffer;
  let teams: any[];
  try {
    originalBuffer = fs.readFileSync(teamsPath);
    teams = JSON.parse(originalBuffer.toString('utf8'));
    if (!Array.isArray(teams)) {
      throw new Error('teams.json does not contain an array of records.');
    }
  } catch {
    console.error('[FATAL] Failed to read or parse teams.json. File may be malformed or unreadable.');
    process.exit(1);
  }

  // 5. Account ID Uniqueness & Target Identification
  const seenIds = new Set<string>();
  for (const record of teams) {
    if (!record.id || typeof record.id !== 'string') {
      console.error('[FATAL] Malformed account record: missing or non-string "id".');
      process.exit(1);
    }
    if (seenIds.has(record.id)) {
      console.error(`[FATAL] Integrity failure: Duplicate account ID '${record.id}' detected in teams.json.`);
      process.exit(1);
    }
    seenIds.add(record.id);
  }

  const primaryCandidates = teams.filter((t: any) =>
    t.role === 'admin' && (t.isPrimaryAdmin === true || t.adminRole === 'primary_admin')
  );

  if (primaryCandidates.length === 0) {
    console.error('[FATAL] Target missing: No primary administrator account found in teams.json.');
    process.exit(1);
  }

  if (primaryCandidates.length > 1) {
    console.error(`[FATAL] Target ambiguous: Found ${primaryCandidates.length} accounts with primary administrator flags.`);
    process.exit(1);
  }

  const targetAdmin = primaryCandidates[0];

  // Snapshot original parsed records for pre-write differential comparison
  const originalSnapshot: any[] = JSON.parse(JSON.stringify(teams));

  // Display safe target summary (no secrets or hashes exposed)
  console.log('Target Primary Administrator Verified:');
  console.log(`  - Account ID:      ${targetAdmin.id}`);
  console.log(`  - Display Name:    ${targetAdmin.teamName}`);
  console.log(`  - Email Address:   ${targetAdmin.email}`);
  console.log(`  - Role:            ${targetAdmin.role}`);
  console.log(`  - Admin Role:      ${targetAdmin.adminRole || 'primary_admin'}`);
  console.log(`  - Primary Admin:   ${Boolean(targetAdmin.isPrimaryAdmin)}`);
  console.log(`  - Permissions:     ${(targetAdmin.permissions || []).length} assigned`);
  console.log(`  - Created At:      ${targetAdmin.createdAt}\n`);

  // 6. Interactive Silent Password Ingestion & Verification
  console.log(`Secure Password Ingestion (Minimum ${MIN_PASSWORD_LENGTH} characters):`);
  console.log('Input is silent: keystrokes will not be echoed or displayed on screen.\n');

  let pass1 = '';
  let pass2 = '';
  let passwordForFinalValidation = '';

  try {
    try {
      pass1 = await promptHidden(`  Enter new primary admin password (min ${MIN_PASSWORD_LENGTH} chars): `);
      if (!pass1 || pass1.length < MIN_PASSWORD_LENGTH) {
        console.error(`\n[VALIDATION ERROR] Password must be at least ${MIN_PASSWORD_LENGTH} characters long. Operation aborted.`);
        process.exit(1);
      }

      pass2 = await promptHidden('  Confirm new primary admin password:                 ');
      if (pass1 !== pass2) {
        console.error('\n[VALIDATION ERROR] Passwords do not match. Operation aborted.');
        process.exit(1);
      }
    } catch {
      restoreTerminal();
      console.error('\n[FATAL] Password input was interrupted or failed.');
      process.exit(1);
    }

    console.log('\n[CRYPTO] Password confirmed. Computing bcrypt hash (salt rounds: 10)...');

    // 7. Generate and verify bcrypt hash
    const newPasswordHash = await bcrypt.hash(pass1, BCRYPT_SALT_ROUNDS);

    // Pre-write self-verification with bcrypt.compare
    const isHashValid = await bcrypt.compare(pass1, newPasswordHash);
    if (!isHashValid) {
      console.error('[FATAL] Cryptographic verification failed: bcrypt.compare rejected generated hash.');
      process.exit(1);
    }
    console.log('[CRYPTO] Generated password hash validated successfully with bcrypt.compare.');

    // Securely retain password reference strictly until post-write verification, then clear
    passwordForFinalValidation = pass1;
    pass1 = '';
    pass2 = '';

    // 8. Unique Timestamped Backup Creation & Cryptographic Verification
    const originalSha256 = crypto.createHash('sha256').update(originalBuffer).digest('hex');
    const originalSize = originalBuffer.length;

    let backupPath = '';
    let backupFilename = '';
    let attempt = 0;

    while (true) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const suffix = attempt > 0 ? `-${attempt}` : '';
      backupFilename = `teams.backup.${timestamp}${suffix}.json`;
      backupPath = path.join(dataDir, backupFilename);
      if (!fs.existsSync(backupPath)) {
        break;
      }
      attempt++;
    }

    try {
      // Exclusive write flag 'wx' guarantees no overwrite
      fs.writeFileSync(backupPath, originalBuffer, { flag: 'wx' });
      console.log(`\n[BACKUP] Safety copy created:\n  ${backupPath}`);
    } catch {
      console.error('[FATAL] Failed to create exclusive backup file. Aborting.');
      process.exit(1);
    }

    // Verify backup byte size and SHA-256 parity
    try {
      const backupBuffer = fs.readFileSync(backupPath);
      const backupSha256 = crypto.createHash('sha256').update(backupBuffer).digest('hex');
      const backupSize = backupBuffer.length;

      if (backupSize !== originalSize || backupSha256 !== originalSha256) {
        console.error('[FATAL] Backup verification failed: SHA-256 or byte size mismatch.');
        process.exit(1);
      }
      console.log(`[BACKUP VERIFICATION] Backup verified identical (SHA-256: ${backupSha256.substring(0, 16)}..., Size: ${backupSize} bytes).`);
    } catch {
      console.error('[FATAL] Failed to verify backup file.');
      process.exit(1);
    }

    // 9. In-Memory Target Record Update
    const updatedTeams = teams.map((team: any) => {
      if (team.id === targetAdmin.id) {
        return {
          ...team,
          passwordHash: newPasswordHash
        };
      }
      return team;
    });

    // 10. Strict Pre-Write Differential Audit
    console.log('\n[AUDIT] Performing pre-write differential audit...');

    if (updatedTeams.length !== originalSnapshot.length) {
      console.error(`[FATAL] Integrity failure: Record count changed (${originalSnapshot.length} -> ${updatedTeams.length}).`);
      process.exit(1);
    }

    let modifiedRecordCount = 0;

    for (let i = 0; i < originalSnapshot.length; i++) {
      const orig = originalSnapshot[i];
      const updated = updatedTeams[i];

      if (orig.id !== updated.id) {
        console.error(`[FATAL] Integrity failure: Record order or ID altered at position ${i}.`);
        process.exit(1);
      }

      if (orig.id === targetAdmin.id) {
        // Intended target account
        const origKeys = Object.keys(orig).sort();
        const updatedKeys = Object.keys(updated).sort();

        if (JSON.stringify(origKeys) !== JSON.stringify(updatedKeys)) {
          console.error('[FATAL] Integrity failure: Field keys altered on target administrator.');
          process.exit(1);
        }

        for (const key of origKeys) {
          if (key === 'passwordHash') {
            if (orig.passwordHash === updated.passwordHash) {
              console.error('[FATAL] Integrity failure: passwordHash was not updated.');
              process.exit(1);
            }
          } else {
            if (JSON.stringify(orig[key]) !== JSON.stringify(updated[key])) {
              console.error(`[FATAL] Integrity failure: Property '${key}' was modified on target administrator.`);
              process.exit(1);
            }
          }
        }
        modifiedRecordCount++;
      } else {
        // Non-target accounts must be byte-for-byte identical
        if (JSON.stringify(orig) !== JSON.stringify(updated)) {
          console.error(`[FATAL] Integrity failure: Non-target account '${orig.teamName}' (${orig.id}) was altered.`);
          process.exit(1);
        }
      }
    }

    if (modifiedRecordCount !== 1) {
      console.error(`[FATAL] Integrity failure: Expected exactly 1 modified record, found ${modifiedRecordCount}.`);
      process.exit(1);
    }

    console.log(`[AUDIT] Integrity verified: Exactly 1 account modified; all other ${originalSnapshot.length - 1} accounts and fields unchanged.`);

    // 11. Atomic File Replacement Procedure with Guaranteed Cleanup
    const tempPath = path.join(dataDir, `teams.tmp.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.json`);
    let tempCreated = false;

    try {
      fs.writeFileSync(tempPath, JSON.stringify(updatedTeams, null, 2), 'utf8');
      tempCreated = true;

      // Atomic rename (replaces teams.json)
      fs.renameSync(tempPath, teamsPath);
      tempCreated = false; // Successfully replaced
      console.log('[STORAGE] teams.json updated atomically via temporary-file-and-rename.');
    } catch (err: any) {
      const safeMsg = err && typeof err.code === 'string' ? err.code : 'FILE_RENAME_FAILED';
      console.error(`[FATAL] Atomic file write failed (${safeMsg}).`);
      process.exit(1);
    } finally {
      if (tempCreated && fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {}
      }
    }

    // 12. Full Post-Write Structural & Content Re-Verification
    console.log('[VERIFICATION] Re-reading saved teams.json from disk for full structural verification...');
    let savedTeams: any[];

    try {
      const savedRaw = fs.readFileSync(teamsPath, 'utf8');
      savedTeams = JSON.parse(savedRaw);
    } catch {
      passwordForFinalValidation = '';
      console.error('\n================================================================');
      console.error('[CRITICAL POST-WRITE VERIFICATION FAILURE]');
      console.error('The live data store could not be re-parsed as valid JSON after write.');
      console.error('To prevent data corruption, no automated rollback will be attempted.');
      console.error('\nSafe Manual Recovery Steps:');
      console.error('1. Safely inspect and verify the process bound to port 5000 before stopping:');
      console.error('   $conn = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue');
      console.error('   if ($conn) { Get-Process -Id $conn.OwningProcess | Select-Object Id, ProcessName, Path }');
      console.error('2. Once confirmed to be the backend process, terminate it:');
      console.error('   if ($conn) { Stop-Process -Id $conn.OwningProcess }');
      console.error('3. Inspect live file: backend/storage/data/teams.json');
      console.error(`4. Restore verified backup manually:\n   Copy-Item "${backupPath}" "${teamsPath}" -Force`);
      console.error('================================================================\n');
      process.exit(1);
    }

    // Compare savedTeams against complete expected updatedTeams
    let postWriteFailed = false;
    let failureReason = '';

    if (!Array.isArray(savedTeams) || savedTeams.length !== updatedTeams.length) {
      postWriteFailed = true;
      failureReason = `Record count mismatch (expected ${updatedTeams.length}, found ${savedTeams?.length})`;
    } else {
      for (let i = 0; i < updatedTeams.length; i++) {
        const expected = updatedTeams[i];
        const actual = savedTeams[i];

        if (expected.id !== actual.id) {
          postWriteFailed = true;
          failureReason = `Record ID mismatch at position ${i}`;
          break;
        }

        if (JSON.stringify(expected) !== JSON.stringify(actual)) {
          postWriteFailed = true;
          failureReason = `Content mismatch on account '${actual.teamName || actual.id}'`;
          break;
        }
      }
    }

    // Final bcrypt verification against the saved hash on disk
    if (!postWriteFailed) {
      const savedAdmin = savedTeams.find((t: any) => t.id === targetAdmin.id);
      if (!savedAdmin || savedAdmin.passwordHash !== newPasswordHash) {
        postWriteFailed = true;
        failureReason = 'Target administrator record on disk does not contain the expected hash';
      } else {
        const match = await bcrypt.compare(passwordForFinalValidation, savedAdmin.passwordHash);
        if (!match) {
          postWriteFailed = true;
          failureReason = 'bcrypt.compare failed to authenticate the saved disk hash';
        }
      }
    }

    // Immediately clear password reference after validation check
    passwordForFinalValidation = '';

    if (postWriteFailed) {
      console.error('\n================================================================');
      console.error('[CRITICAL POST-WRITE VERIFICATION FAILURE]');
      console.error(`Verification assertion failed: ${failureReason}.`);
      console.error('To prevent data corruption, no automated rollback will be attempted.');
      console.error('\nSafe Manual Recovery Steps:');
      console.error('1. Safely inspect and verify the process bound to port 5000 before stopping:');
      console.error('   $conn = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue');
      console.error('   if ($conn) { Get-Process -Id $conn.OwningProcess | Select-Object Id, ProcessName, Path }');
      console.error('2. Once confirmed to be the backend process, terminate it:');
      console.error('   if ($conn) { Stop-Process -Id $conn.OwningProcess }');
      console.error('3. Inspect live file: backend/storage/data/teams.json');
      console.error(`4. Restore verified backup manually:\n   Copy-Item "${backupPath}" "${teamsPath}" -Force`);
      console.error('================================================================\n');
      process.exit(1);
    }

    console.log('[VERIFICATION] Complete disk file matched expected state with 100% fidelity.\n');

  } finally {
    // Guaranteed memory purge of password reference on all exit paths
    passwordForFinalValidation = '';
  }

  console.log('================================================================');
  console.log('✅ RECOVERY COMPLETE');
  console.log('Primary administrator password has been updated securely.');
  console.log('All participant accounts, progress data, and audit logs remain intact.');
  console.log('================================================================\n');
  console.log('Next Steps:');
  console.log('1. Start the platform: "npm run dev" or "npm run dev:backend"');
  console.log('2. Sign in at http://localhost:3000/admin/login with:');
  console.log(`   - Email: ${targetAdmin.email}`);
  console.log('   - Password: <the new password you just set>');
  console.log('3. Remove this recovery script:');
  console.log('   Remove-Item backend/src/scripts/resetAdminPassword.ts\n');
}

// Execute when invoked directly
if (require.main === module) {
  runRecovery().catch(() => {
    restoreTerminal();
    console.error('\n[FATAL ERROR] An unhandled operational failure occurred.');
    process.exit(1);
  });
}
