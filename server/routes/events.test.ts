/** Tests for the SSE events route + broadcaster. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Hono } from 'hono';

describe('SSE events', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function importEvents() {
    const mod = await import('./events.js');
    const app = new Hono();
    app.route('/', mod.default);
    return { app, broadcaster: mod.broadcaster, broadcast: mod.broadcast };
  }

  describe('broadcaster', () => {
    it('emits message events with correct shape', async () => {
      const { broadcaster } = await importEvents();
      const listener = vi.fn();
      broadcaster.on('message', listener);

      broadcaster.broadcast('test.event', { key: 'val' });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'test.event',
          data: { key: 'val' },
          ts: expect.any(Number),
        }),
      );
      broadcaster.off('message', listener);
    });

    it('broadcast convenience function works', async () => {
      const { broadcaster, broadcast } = await importEvents();
      const listener = vi.fn();
      broadcaster.on('message', listener);

      broadcast('memory.changed', { source: 'test' });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'memory.changed' }),
      );
      broadcaster.off('message', listener);
    });

    it('broadcasts with empty data by default', async () => {
      const { broadcaster, broadcast } = await importEvents();
      const listener = vi.fn();
      broadcaster.on('message', listener);

      broadcast('ping');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'ping', data: {} }),
      );
      broadcaster.off('message', listener);
    });
  });

  describe('GET /api/events', () => {
    it('sets correct SSE headers', async () => {
      const { app } = await importEvents();
      const res = await app.request('/api/events');
      expect(res.headers.get('Content-Type')).toContain('text/event-stream');
      expect(res.headers.get('Cache-Control')).toBe('no-cache');
      expect(res.headers.get('X-Accel-Buffering')).toBe('no');
    });

    it('sends initial connected event', async () => {
      const { app } = await importEvents();
      const res = await app.request('/api/events');
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      // Read the first chunk which should contain the connected event
      const { value } = await reader.read();
      const text = decoder.decode(value);
      expect(text).toContain('event: connected');

      reader.cancel();
    });
  });
});
