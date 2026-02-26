/** Tests for the gateway client HTTP helper. */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('invokeGatewayTool', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.resetModules();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  async function importClient() {
    const mod = await import('./gateway-client.js');
    return mod.invokeGatewayTool;
  }

  it('sends POST with tool and args to gateway', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { foo: 'bar' } }),
    });

    const invoke = await importClient();
    const result = await invoke('test_tool', { key: 'value' });

    expect(result).toEqual({ foo: 'bar' });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/tools/invoke'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"tool":"test_tool"'),
      }),
    );
  });

  it('includes Authorization header when token is configured', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: null }),
    });

    const invoke = await importClient();
    await invoke('test_tool', {});

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const opts = callArgs[1] as RequestInit;
    const headers = opts.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('throws on HTTP error response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const invoke = await importClient();
    await expect(invoke('fail_tool', {})).rejects.toThrow(/500/);
  });

  it('throws on tool invocation failure (ok: false)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false, error: { message: 'Tool not found' } }),
    });

    const invoke = await importClient();
    await expect(invoke('missing_tool', {})).rejects.toThrow('Tool not found');
  });

  it('throws on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const invoke = await importClient();
    await expect(invoke('test_tool', {})).rejects.toThrow('ECONNREFUSED');
  });

  it('sends sessionKey in the body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: {} }),
    });

    const invoke = await importClient();
    await invoke('test', { myArg: 1 });

    const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.sessionKey).toBe('main');
    expect(body.args).toEqual({ myArg: 1 });
  });
});
