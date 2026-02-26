/** Tests for the gateway routes (models, session-info, session-patch). */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Hono } from 'hono';

// ── Hoisted mocks for native + shared modules ──────────────────────

let execFileImpl: (...args: unknown[]) => void;
let invokeGatewayImpl: (tool: string, args: Record<string, unknown>) => unknown;

vi.mock(import('node:child_process'), async (importOriginal) => {
  const actual = await importOriginal();
  const mock = { ...actual, execFile: (...args: unknown[]) => execFileImpl(...args) };
  return { ...mock, default: mock };
});

vi.mock('../lib/config.js', () => ({
  config: {
    auth: false, port: 3000, host: '127.0.0.1', sslPort: 3443,
    gatewayUrl: 'http://localhost:3100', gatewayToken: 'test-token',
  },
  SESSION_COOKIE_NAME: 'nerve_session_3000',
}));

vi.mock('../middleware/rate-limit.js', () => ({
  rateLimitGeneral: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
}));

vi.mock('../lib/openclaw-bin.js', () => ({
  resolveOpenclawBin: () => '/usr/bin/openclaw',
}));

vi.mock('../lib/gateway-client.js', () => ({
  invokeGatewayTool: vi.fn(async (tool: string, args: Record<string, unknown>) => invokeGatewayImpl(tool, args)),
}));

const GOOD_MODELS = JSON.stringify({
  models: [
    { key: 'anthropic/claude-opus-4', name: 'Claude Opus 4', available: true },
    { key: 'openai/gpt-4o', name: 'GPT-4o', available: true },
  ],
});

import gatewayRoutes from './gateway.js';

function buildApp() {
  const app = new Hono();
  app.route('/', gatewayRoutes);
  return app;
}

describe('gateway routes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Default impls
  function setDefaults() {
    execFileImpl = (_bin: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
      (cb as (err: null, stdout: string) => void)(null, GOOD_MODELS);
    };
    invokeGatewayImpl = () => ({});
  }

  describe('GET /api/gateway/models', () => {
    it('returns parsed model list', async () => {
      setDefaults();
      const app = buildApp();
      const res = await app.request('/api/gateway/models');
      expect(res.status).toBe(200);
      const json = (await res.json()) as { models: Array<{ id: string; label: string; provider: string }> };
      expect(json.models.length).toBeGreaterThanOrEqual(1);
      // Models are sorted by id
      for (const m of json.models) {
        expect(m).toHaveProperty('id');
        expect(m).toHaveProperty('label');
        expect(m).toHaveProperty('provider');
      }
    });

    it('returns empty array when openclaw binary fails', async () => {
      execFileImpl = (_bin: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        (cb as (err: Error, stdout: string) => void)(new Error('not found'), '');
      };
      invokeGatewayImpl = () => ({});

      // Need fresh import to reset the model cache
      vi.resetModules();
      // Re-mock with same fns
      vi.doMock('node:child_process', () => ({
        execFile: (...args: unknown[]) => execFileImpl(...args),
      }));
      vi.doMock('../lib/config.js', () => ({
        config: {
          auth: false, port: 3000, host: '127.0.0.1', sslPort: 3443,
          gatewayUrl: 'http://localhost:3100', gatewayToken: 'test-token',
        },
        SESSION_COOKIE_NAME: 'nerve_session_3000',
      }));
      vi.doMock('../middleware/rate-limit.js', () => ({
        rateLimitGeneral: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
      }));
      vi.doMock('../lib/openclaw-bin.js', () => ({
        resolveOpenclawBin: () => '/usr/bin/openclaw',
      }));
      vi.doMock('../lib/gateway-client.js', () => ({
        invokeGatewayTool: vi.fn(async (tool: string, args: Record<string, unknown>) => invokeGatewayImpl(tool, args)),
      }));

      const mod = await import('./gateway.js');
      const app = new Hono();
      app.route('/', mod.default);

      const res = await app.request('/api/gateway/models');
      expect(res.status).toBe(200);
      const json = (await res.json()) as { models: unknown[] };
      expect(json.models).toEqual([]);
    });
  });

  describe('GET /api/gateway/session-info', () => {
    it('returns model and thinking from sessions_list', async () => {
      setDefaults();
      invokeGatewayImpl = (tool: string) => {
        if (tool === 'sessions_list') {
          return {
            sessions: [{
              sessionKey: 'agent:main:main',
              model: 'anthropic/claude-opus-4',
              thinking: 'high',
            }],
          };
        }
        return {};
      };
      const app = buildApp();
      const res = await app.request('/api/gateway/session-info');
      expect(res.status).toBe(200);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json.model).toBe('anthropic/claude-opus-4');
      expect(json.thinking).toBe('high');
    });

    it('returns empty object when gateway is unreachable', async () => {
      setDefaults();
      invokeGatewayImpl = () => { throw new Error('ECONNREFUSED'); };
      const app = buildApp();
      const res = await app.request('/api/gateway/session-info');
      expect(res.status).toBe(200);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json).toBeDefined();
    });

    it('accepts custom sessionKey query param', async () => {
      setDefaults();
      invokeGatewayImpl = (tool: string) => {
        if (tool === 'sessions_list') {
          return {
            sessions: [{
              sessionKey: 'agent:cron:test',
              model: 'openai/gpt-4o',
              thinking: 'low',
            }],
          };
        }
        return {};
      };
      const app = buildApp();
      const res = await app.request('/api/gateway/session-info?sessionKey=agent:cron:test');
      expect(res.status).toBe(200);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json.model).toBe('openai/gpt-4o');
    });
  });

  describe('POST /api/gateway/session-patch', () => {
    it('returns 400 for invalid JSON', async () => {
      setDefaults();
      const app = buildApp();
      const res = await app.request('/api/gateway/session-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      });
      expect(res.status).toBe(400);
    });

    it('changes model via session_status tool', async () => {
      setDefaults();
      invokeGatewayImpl = () => ({});
      const app = buildApp();
      const res = await app.request('/api/gateway/session-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'anthropic/claude-opus-4' }),
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json.ok).toBe(true);
      expect(json.model).toBe('anthropic/claude-opus-4');
    });

    it('returns 501 for thinking-only changes', async () => {
      setDefaults();
      const app = buildApp();
      const res = await app.request('/api/gateway/session-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thinkingLevel: 'high' }),
      });
      expect(res.status).toBe(501);
    });

    it('returns 502 when gateway tool fails', async () => {
      setDefaults();
      invokeGatewayImpl = () => { throw new Error('gateway down'); };
      const app = buildApp();
      const res = await app.request('/api/gateway/session-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'openai/gpt-4o' }),
      });
      expect(res.status).toBe(502);
    });

    it('validates body schema', async () => {
      setDefaults();
      const app = buildApp();
      const res = await app.request('/api/gateway/session-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'x'.repeat(300) }),
      });
      expect(res.status).toBe(400);
    });
  });
});
