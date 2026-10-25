import path from 'path';
import fs from 'fs';

export interface FilenameValidationResult {
  valid: boolean;
  error?: string;
}

export interface PathValidationResult {
  valid: boolean;
  resolvedPath?: string;
  statusCode?: number;
  error?: string;
}

/**
 * Validates a dataset filename against path separators, traversal sequences,
 * absolute paths, null bytes, and permitted extensions.
 */
export function validateDatasetFilename(filename: unknown): FilenameValidationResult {
  if (typeof filename !== 'string' || filename.trim().length === 0) {
    return { valid: false, error: 'Dataset filename must be a non-empty string.' };
  }

  // Reject null bytes, separators, traversal sequences, and absolute-path markers
  if (
    filename.includes('\0') ||
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('..') ||
    path.isAbsolute(filename) ||
    path.basename(filename) !== filename
  ) {
    return { valid: false, error: 'Invalid filename syntax: Directory traversal and path separators are prohibited.' };
  }

  // Allow only .csv and .json extensions, case-insensitively
  const ext = path.extname(filename).toLowerCase();
  if (ext !== '.csv' && ext !== '.json') {
    return { valid: false, error: 'Disallowed file extension. Only .csv and .json datasets are permitted.' };
  }

  return { valid: true };
}

/**
 * Returns the approved canonical base directory for dataset files.
 */
export function getApprovedDatasetBaseDir(): string {
  return path.resolve(__dirname, '../../data/datasets');
}

/**
 * Resolves and validates a dataset file within the approved base directory.
 * Performs lexical containment, canonical realpath containment, and regular file validation.
 */
export function resolveSecureDatasetPath(filename: unknown): PathValidationResult {
  const filenameCheck = validateDatasetFilename(filename);
  if (!filenameCheck.valid) {
    return { valid: false, statusCode: 400, error: filenameCheck.error };
  }

  const safeFilename = filename as string;
  const baseDir = getApprovedDatasetBaseDir();

  // 1. Lexical candidate resolution
  const candidatePath = path.resolve(baseDir, safeFilename);

  // 2. Lexical containment check
  if (candidatePath !== baseDir && !candidatePath.startsWith(baseDir + path.sep)) {
    return { valid: false, statusCode: 403, error: 'Access denied: Directory traversal detected.' };
  }

  // 3. Check target existence
  if (!fs.existsSync(candidatePath)) {
    return { valid: false, statusCode: 404, error: 'Dataset file is not available on the server.' };
  }

  try {
    // 4. Reject symbolic links treated as non-regular targets
    const lstat = fs.lstatSync(candidatePath);
    if (lstat.isSymbolicLink()) {
      return { valid: false, statusCode: 403, error: 'Access denied: Symbolic link targets are prohibited.' };
    }

    // 5. Canonical realpath resolution & containment
    const realBaseDir = fs.realpathSync(baseDir);
    const realTarget = fs.realpathSync(candidatePath);

    if (realTarget !== realBaseDir && !realTarget.startsWith(realBaseDir + path.sep)) {
      return { valid: false, statusCode: 403, error: 'Access denied: Canonical directory traversal detected.' };
    }

    // 6. Verify final target is a regular file
    const stat = fs.statSync(realTarget);
    if (!stat.isFile()) {
      return { valid: false, statusCode: 400, error: 'Dataset target is not a regular file.' };
    }

    return { valid: true, resolvedPath: realTarget };
  } catch {
    return { valid: false, statusCode: 500, error: 'Failed to access dataset file securely.' };
  }
}

/**
 * Securely writes dataset content to the approved directory after strict validation.
 */
export function saveSecureDatasetFile(
  filename: string,
  content: string | Buffer
): { success: boolean; filePath?: string; filesize?: string; error?: string } {
  const filenameCheck = validateDatasetFilename(filename);
  if (!filenameCheck.valid) {
    return { success: false, error: filenameCheck.error };
  }

  const baseDir = getApprovedDatasetBaseDir();
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  const targetPath = path.resolve(baseDir, filename);
  if (targetPath !== baseDir && !targetPath.startsWith(baseDir + path.sep)) {
    return { success: false, error: 'Directory traversal detected.' };
  }

  try {
    fs.writeFileSync(targetPath, content, 'utf8');
    const stat = fs.statSync(targetPath);
    const sizeKb = Math.max(1, Math.round(stat.size / 1024));
    return {
      success: true,
      filePath: targetPath,
      filesize: `${sizeKb} KB`
    };
  } catch (err: any) {
    return { success: false, error: `Failed to save dataset: ${err.message}` };
  }
}
