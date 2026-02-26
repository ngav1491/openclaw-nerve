/**
 * Post-restart health checks.
 * Polls /health (2xx) and /api/version (version match).
 * 3 retries with 2s/4s/8s backoff, 60s total timeout.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import http from 'node:http';
const BACKOFFS = [2_000, 4_000, 8_000];
const TOTAL_TIMEOUT = 60_000;
const REQUEST_TIMEOUT = 5_000;
/**
 * Check that the server is healthy and reports the expected version.
 */
export async function checkHealth(cwd, targetVersion) {
    const port = readPort(cwd);
    const baseUrl = `http://127.0.0.1:${port}`;
    const deadline = Date.now() + TOTAL_TIMEOUT;
    let lastHealthy = false;
    let lastReportedVersion;
    for (let attempt = 0; Date.now() < deadline; attempt++) {
        if (attempt > 0) {
            const backoff = BACKOFFS[Math.min(attempt - 1, BACKOFFS.length - 1)];
            await sleep(backoff);
        }
        try {
            const healthRes = await httpGet(`${baseUrl}/health`, REQUEST_TIMEOUT);
            if (healthRes.status < 200 || healthRes.status >= 300)
                continue;
            const versionRes = await httpGet(`${baseUrl}/api/version`, REQUEST_TIMEOUT);
            if (versionRes.status < 200 || versionRes.status >= 300)
                continue;
            const data = JSON.parse(versionRes.body);
            lastHealthy = true;
            lastReportedVersion = data.version;
            if (data.version === targetVersion) {
                return { healthy: true, versionMatch: true, reportedVersion: data.version };
            }
            // Version mismatch — stale process may still be serving, keep retrying
            continue;
        }
        catch {
            continue;
        }
    }
    // Deadline expired — report what we last saw
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
        error: `Health check timed out after ${TOTAL_TIMEOUT / 1_000}s (port ${port})`,
    };
}
// ── Helpers ──────────────────────────────────────────────────────────
function readPort(cwd) {
    const envPath = join(cwd, '.env');
    if (existsSync(envPath)) {
        const content = readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
            const match = /^PORT=(\d+)/.exec(line.trim());
            if (match)
                return parseInt(match[1], 10);
        }
    }
    return 3080;
}
function httpGet(url, timeoutMs) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, { timeout: timeoutMs }, (res) => {
            let body = '';
            res.on('data', (chunk) => {
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
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
