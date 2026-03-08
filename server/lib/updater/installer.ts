/**
 * Git checkout + pnpm install + build.
 */

import { execSync } from 'node:child_process';
import { EXIT_CODES, UpdateError } from './types.js';

const EXEC_TIMEOUT = 300_000; // 5 minutes

/**
 * Fetch tags and checkout the target tag (detached HEAD).
 */
export function gitFetchAndCheckout(cwd: string, tag: string): void {
  try {
    execSync('git fetch --tags origin', { cwd, stdio: 'pipe', timeout: EXEC_TIMEOUT });
  } catch (err) {
    throw new UpdateError(
      `git fetch failed: ${errorMessage(err)}`,
      'update',
      EXIT_CODES.BUILD,
    );
  }

  try {
    execSync(`git checkout --force ${tag}`, { cwd, stdio: 'pipe', timeout: EXEC_TIMEOUT });
  } catch (err) {
    throw new UpdateError(
      `git checkout ${tag} failed: ${errorMessage(err)}`,
      'update',
      EXIT_CODES.BUILD,
    );
  }
}

/**
 * Checkout a local ref without fetching from remote. Used for rollback.
 */
export function gitCheckoutLocal(cwd: string, ref: string): void {
  try {
    execSync(`git checkout --force ${ref}`, { cwd, stdio: 'pipe', timeout: EXEC_TIMEOUT });
  } catch (err) {
    throw new UpdateError(
      `git checkout ${ref} failed: ${errorMessage(err)}`,
      'rollback',
      EXIT_CODES.ROLLBACK,
    );
  }
}

/**
 * Run pnpm install, then build client and server.
 */
export function buildProject(cwd: string): void {
  const steps: [string, string][] = [
    ['pnpm install', 'pnpm install failed'],
    ['pnpm run build', 'Client build failed'],
    ['pnpm run build:server', 'Server build failed'],
  ];

  for (const [cmd, label] of steps) {
    try {
      execSync(cmd, { cwd, stdio: 'pipe', timeout: EXEC_TIMEOUT });
    } catch (err) {
      throw new UpdateError(
        `${label}: ${errorMessage(err)}`,
        'build',
        EXIT_CODES.BUILD,
      );
    }
  }
}

function errorMessage(err: unknown): string {
  // execSync errors carry stderr with the actual useful output
  if (err && typeof err === 'object' && 'stderr' in err) {
    const stderr = (err as { stderr: Buffer | string }).stderr;
    const text = Buffer.isBuffer(stderr) ? stderr.toString().trim() : String(stderr).trim();
    if (text) return text;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
