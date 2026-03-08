/**
 * Prerequisite checker — verifies Node.js version, pnpm, ffmpeg, openssl.
 */

import { execSync } from 'node:child_process';
import { success, warn, fail } from './banner.js';

export interface PrereqResult {
  nodeOk: boolean;
  nodeVersion: string;
  pnpmOk: boolean;
  ffmpegOk: boolean;
  opensslOk: boolean;
  tailscaleOk: boolean;
  tailscaleIp: string | null;
}

/** Check all prerequisites and print results. */
export function checkPrerequisites(opts?: { quiet?: boolean }): PrereqResult {
  const quiet = opts?.quiet ?? false;

  if (!quiet) console.log('  Checking prerequisites...');

  const nodeVersion = process.version;
  const nodeMajor = parseInt(nodeVersion.slice(1), 10);
  const nodeOk = nodeMajor >= 22;

  if (!quiet) {
    if (nodeOk) success(`Node.js ${nodeVersion} (≥22 required)`);
    else fail(`Node.js ${nodeVersion} — version 22 or later is required`);
  }

  const pnpmOk = commandExists('pnpm');
  if (!quiet) {
    if (pnpmOk) success('pnpm available');
    else fail('pnpm not found — install with: npm install -g pnpm');
  }

  const ffmpegOk = commandExists('ffmpeg');
  if (!quiet) {
    if (ffmpegOk) success('ffmpeg found (optional, for Qwen TTS)');
    else warn('ffmpeg not found (optional — needed for Qwen TTS WAV→MP3)');
  }

  const opensslOk = commandExists('openssl');
  if (!quiet) {
    if (opensslOk) success('openssl found (for HTTPS cert generation)');
    else warn('openssl not found (optional — needed for self-signed HTTPS certs)');
  }

  const tailscaleOk = commandExists('tailscale');
  let tailscaleIp: string | null = null;
  if (tailscaleOk) {
    try {
      tailscaleIp = execSync('tailscale ip -4 2>/dev/null', { timeout: 3000 }).toString().trim() || null;
    } catch { /* not connected */ }
    if (!quiet) {
      if (tailscaleIp) success(`Tailscale detected (${tailscaleIp})`);
      else warn('Tailscale installed but not connected');
    }
  }

  return { nodeOk, nodeVersion, pnpmOk, ffmpegOk, opensslOk, tailscaleOk, tailscaleIp };
}

/** Check if a command exists on the system. */
function commandExists(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'pipe', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
