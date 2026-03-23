/**
 * Post-restart health checks.
 * Polls /health (2xx) and /api/version (version match).
 * 3 retries with 2s/4s/8s backoff, 60s total timeout.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import http from 'node:http';
import type { HealthResult } from './types.js';

const BACKOFFS = [2_000, 4_000, 8_000];
const TOTAL_TIMEOUT = 60_000;
const REQUEST_TIMEOUT = 5_000;
const DEFAULT_PORT = 3080;
const DEFAULT_HOST = '127.0.0.1';

/**
 * Check that the server is healthy and reports the expected version.
 */
export async function checkHealth(cwd: string, targetVersion: string): Promise<HealthResult> {
  const port = readPort(cwd);
  const baseUrl = resolveHealthCheckBaseUrl(cwd);
  const deadline = Date.now() + TOTAL_TIMEOUT;

  let lastHealthy = false;
  let lastReportedVersion: string | undefined;

  for (let attempt = 0; Date.now() < deadline; attempt++) {
    if (attempt > 0) {
      const backoff = BACKOFFS[Math.min(attempt - 1, BACKOFFS.length - 1)];
      await sleep(backoff);
    }

    try {
      const healthRes = await httpGet(`${baseUrl}/health`, REQUEST_TIMEOUT);
      if (healthRes.status < 200 || healthRes.status >= 300) continue;

      const versionRes = await httpGet(`${baseUrl}/api/version`, REQUEST_TIMEOUT);
      if (versionRes.status < 200 || versionRes.status >= 300) continue;

      const data = JSON.parse(versionRes.body) as { version: string };
      lastHealthy = true;
      lastReportedVersion = data.version;

      if (data.version === targetVersion) {
        return { healthy: true, versionMatch: true, reportedVersion: data.version };
      }

      // Version mismatch, stale process may still be serving, keep retrying
      continue;
    } catch {
      continue;
    }
  }

  // Deadline expired, report what we last saw
  if (lastHealthy && lastReportedVersion) {
    return {
      healthy: true,
      versionMatch: false,
      reportedVersion: lastReportedVersion,
      error: `Version mismatch: expected ${targetVersion}, got ${lastReportedVersion}`,
    };
  }

  return {
    healthy: false,
    versionMatch: false,
    error: `Health check timed out after ${TOTAL_TIMEOUT / 1_000}s (${baseUrl})`,
  };
}

export function resolveHealthCheckBaseUrl(cwd: string): string {
  const host = resolveProbeHost(readHost(cwd));
  const port = readPort(cwd);
  return `http://${formatHostForUrl(host)}:${port}`;
}

// ── Helpers ──────────────────────────────────────────────────────────

function readPort(cwd: string): number {
  const rawPort = process.env.PORT ?? readEnvValue(cwd, 'PORT');
  if (!rawPort) return DEFAULT_PORT;

  const port = Number.parseInt(rawPort, 10);
  return Number.isFinite(port) ? port : DEFAULT_PORT;
}

function readHost(cwd: string): string {
  return process.env.HOST ?? readEnvValue(cwd, 'HOST') ?? DEFAULT_HOST;
}

function readEnvValue(cwd: string, key: string): string | undefined {
  const envPath = join(cwd, '.env');
  if (!existsSync(envPath)) return undefined;

  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = new RegExp(`^${key}=(.*)$`).exec(trimmed);
    if (match) return match[1].trim();
  }

  return undefined;
}

function resolveProbeHost(host: string): string {
  const normalized = host.trim();
  if (!normalized || normalized === '0.0.0.0') return '127.0.0.1';
  if (normalized === '::' || normalized === '[::]') return '::1';
  return normalized;
}

function formatHostForUrl(host: string): string {
  if (host.includes(':') && !host.startsWith('[')) {
    return `[${host}]`;
  }
  return host;
}

function httpGet(
  url: string,
  timeoutMs: number,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('request timeout'));
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
