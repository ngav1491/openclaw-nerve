/** Tests for the global error handler middleware. */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { errorHandler } from './error-handler.js';

describe('errorHandler middleware', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  function createApp(routePath: string, error: Error) {
    const app = new Hono();
    app.onError(errorHandler);
    app.get(routePath, () => { throw error; });
    return app;
  }

  it('returns JSON 500 for /api/* routes', async () => {
    const app = createApp('/api/foo', new Error('boom'));
    const res = await app.request('/api/foo');
    expect(res.status).toBe(500);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.error).toBe('Internal server error');
  });

  it('returns plain text 500 for non-API routes', async () => {
    const app = createApp('/some-page', new Error('boom'));
    const res = await app.request('/some-page');
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toBe('Internal server error');
  });

  it('does not leak stack traces in the response', async () => {
    const app = createApp('/api/crash', new Error('secret details'));
    const res = await app.request('/api/crash');
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.error).toBe('Internal server error');
    expect(JSON.stringify(json)).not.toContain('secret details');
  });

  it('logs the error message', async () => {
    const app = createApp('/api/test', new Error('test error'));
    await app.request('/api/test');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[server]'),
      expect.stringContaining('test error'),
    );
  });

  it('handles /api path without trailing slash as API', async () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.get('/api', () => { throw new Error('root api'); });
    const res = await app.request('/api');
    expect(res.status).toBe(500);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.error).toBe('Internal server error');
  });
});
