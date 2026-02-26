/** Tests for the auth routes (login, logout, status). */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';

describe('auth routes', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function buildApp(configOverrides: Record<string, unknown> = {}) {
    const baseConfig = {
      auth: true,
      passwordHash: '',
      gatewayToken: 'test-token',
      sessionSecret: 'test-secret-key-for-tests-only-1234',
      sessionTtlMs: 86400000,
      port: 3000,
      host: '127.0.0.1',
      sslPort: 3443,
      ...configOverrides,
    };

    vi.doMock('../lib/config.js', () => ({
      config: baseConfig,
      SESSION_COOKIE_NAME: 'nerve_session_3000',
    }));
    vi.doMock('../middleware/rate-limit.js', () => ({
      rateLimitGeneral: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
    }));

    const mod = await import('./auth.js');
    const app = new Hono();
    app.route('/', mod.default);
    return app;
  }

  describe('POST /api/auth/login', () => {
    it('returns ok when auth is disabled', async () => {
      const app = await buildApp({ auth: false });
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'anything' }),
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json.ok).toBe(true);
    });

    it('returns 400 when password is missing', async () => {
      const app = await buildApp();
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when password is empty string', async () => {
      const app = await buildApp();
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: '   ' }),
      });
      expect(res.status).toBe(400);
    });

    it('accepts gateway token as password', async () => {
      const app = await buildApp({ gatewayToken: 'my-secret-token' });
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'my-secret-token' }),
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json.ok).toBe(true);
      // Should set a cookie
      expect(res.headers.get('set-cookie')).toContain('nerve_session');
    });

    it('returns 401 for invalid password', async () => {
      const app = await buildApp({ gatewayToken: 'correct-token' });
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'wrong-password' }),
      });
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid JSON body', async () => {
      const app = await buildApp();
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears the session cookie', async () => {
      const app = await buildApp();
      const res = await app.request('/api/auth/logout', { method: 'POST' });
      expect(res.status).toBe(200);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json.ok).toBe(true);
      // Should have a set-cookie header clearing the cookie
      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();
    });
  });

  describe('GET /api/auth/status', () => {
    it('returns authEnabled: false when auth is disabled', async () => {
      const app = await buildApp({ auth: false });
      const res = await app.request('/api/auth/status');
      expect(res.status).toBe(200);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json.authEnabled).toBe(false);
      expect(json.authenticated).toBe(true);
    });

    it('returns authenticated: false with no cookie when auth is enabled', async () => {
      const app = await buildApp();
      const res = await app.request('/api/auth/status');
      expect(res.status).toBe(200);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json.authEnabled).toBe(true);
      expect(json.authenticated).toBe(false);
    });
  });
});
