/** Tests for the skills API route (GET /api/skills). */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';

// Use vi.mock (hoisted) for native modules — vi.doMock doesn't reliably work for them
let execFileImpl: (...args: unknown[]) => void;

vi.mock(import('node:child_process'), async (importOriginal) => {
  const actual = await importOriginal();
  const mock = { ...actual, execFile: (...args: unknown[]) => execFileImpl(...args) };
  return { ...mock, default: mock };
});

vi.mock('../lib/config.js', () => ({
  config: { auth: false, port: 3000, host: '127.0.0.1', sslPort: 3443 },
  SESSION_COOKIE_NAME: 'nerve_session_3000',
}));

vi.mock('../middleware/rate-limit.js', () => ({
  rateLimitGeneral: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
}));

vi.mock('../lib/openclaw-bin.js', () => ({
  resolveOpenclawBin: () => '/usr/bin/openclaw',
}));

const GOOD_SKILLS_JSON = JSON.stringify({
  skills: [
    { name: 'weather', description: 'Get weather', emoji: '🌤️', eligible: true, disabled: false, blockedByAllowlist: false, source: 'bundled', bundled: true },
    { name: 'github', description: 'GitHub ops', emoji: '🐙', eligible: true, disabled: false, blockedByAllowlist: false, source: 'bundled', bundled: true },
  ],
});

import skillsRoutes from './skills.js';

function buildApp() {
  const app = new Hono();
  app.route('/', skillsRoutes);
  return app;
}

describe('GET /api/skills', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns skill list on success', async () => {
    execFileImpl = (_bin: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
      (cb as (err: null, stdout: string) => void)(null, GOOD_SKILLS_JSON);
    };
    const app = buildApp();
    const res = await app.request('/api/skills');
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; skills: Array<{ name: string }> };
    expect(json.ok).toBe(true);
    expect(json.skills).toHaveLength(2);
    expect(json.skills[0].name).toBe('weather');
  });

  it('returns empty array when openclaw binary fails', async () => {
    execFileImpl = (_bin: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
      (cb as (err: Error, stdout: string) => void)(new Error('command not found'), '');
    };
    const app = buildApp();
    const res = await app.request('/api/skills');
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; skills: unknown[] };
    expect(json.ok).toBe(true);
    expect(json.skills).toEqual([]);
  });

  it('returns empty array on invalid JSON output', async () => {
    execFileImpl = (_bin: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
      (cb as (err: null, stdout: string) => void)(null, 'not json');
    };
    const app = buildApp();
    const res = await app.request('/api/skills');
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; skills: unknown[] };
    expect(json.skills).toEqual([]);
  });

  it('includes skill detail fields in response', async () => {
    execFileImpl = (_bin: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
      (cb as (err: null, stdout: string) => void)(null, GOOD_SKILLS_JSON);
    };
    const app = buildApp();
    const res = await app.request('/api/skills');
    const json = (await res.json()) as { skills: Array<Record<string, unknown>> };
    const skill = json.skills[0];
    expect(skill).toHaveProperty('name');
    expect(skill).toHaveProperty('description');
    expect(skill).toHaveProperty('eligible');
    expect(skill).toHaveProperty('bundled');
  });
});
