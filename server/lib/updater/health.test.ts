import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type MockResponse = { status: number; body: string };

const { httpGetMock } = vi.hoisted(() => ({
  httpGetMock: vi.fn(),
}));

vi.mock('node:http', () => ({
  default: {
    get: httpGetMock,
  },
  get: httpGetMock,
}));

function createMockRequest() {
  return {
    on: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };
}

function createMockResponse({ status, body }: MockResponse) {
  const response = new EventEmitter() as EventEmitter & { statusCode?: number };
  response.statusCode = status;

  queueMicrotask(() => {
    if (body.length > 0) {
      response.emit('data', Buffer.from(body));
    }
    response.emit('end');
  });

  return response;
}

describe('updater health checks', () => {
  const originalEnv = { ...process.env };
  const tempDirs: string[] = [];

  beforeEach(() => {
    vi.resetModules();
    httpGetMock.mockReset();
    process.env = { ...originalEnv };
    delete process.env.HOST;
    delete process.env.PORT;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  function createProjectEnv(lines: string[]) {
    const dir = mkdtempSync(join(tmpdir(), 'updater-health-'));
    tempDirs.push(dir);
    writeFileSync(join(dir, '.env'), `${lines.join('\n')}\n`, 'utf-8');
    return dir;
  }

  function mockHealthyVersion(version: string) {
    const responses: MockResponse[] = [
      { status: 200, body: 'ok' },
      { status: 200, body: JSON.stringify({ version }) },
    ];

    httpGetMock.mockImplementation((url: string, _options: unknown, callback: (res: EventEmitter) => void) => {
      const next = responses.shift();
      if (!next) throw new Error(`Unexpected request: ${url}`);
      queueMicrotask(() => callback(createMockResponse(next)));
      return createMockRequest();
    });
  }

  it('uses the configured loopback host for health probes', async () => {
    const cwd = createProjectEnv(['HOST=127.0.0.1', 'PORT=4310']);
    mockHealthyVersion('1.2.3');

    const { checkHealth } = await import('./health.js');
    const result = await checkHealth(cwd, '1.2.3');

    expect(result).toMatchObject({ healthy: true, versionMatch: true, reportedVersion: '1.2.3' });
    expect(httpGetMock).toHaveBeenNthCalledWith(
      1,
      'http://127.0.0.1:4310/health',
      expect.objectContaining({ timeout: 5000 }),
      expect.any(Function),
    );
  });

  it('falls back to loopback when the server binds to 0.0.0.0', async () => {
    const cwd = createProjectEnv(['HOST=0.0.0.0', 'PORT=4311']);
    mockHealthyVersion('1.2.3');

    const { checkHealth } = await import('./health.js');
    const result = await checkHealth(cwd, '1.2.3');

    expect(result).toMatchObject({ healthy: true, versionMatch: true, reportedVersion: '1.2.3' });
    expect(httpGetMock).toHaveBeenNthCalledWith(
      1,
      'http://127.0.0.1:4311/health',
      expect.objectContaining({ timeout: 5000 }),
      expect.any(Function),
    );
  });

  it('uses a specific configured LAN or tailnet host for health probes', async () => {
    const cwd = createProjectEnv(['HOST=100.92.14.6', 'PORT=4312']);
    mockHealthyVersion('1.2.3');

    const { checkHealth } = await import('./health.js');
    const result = await checkHealth(cwd, '1.2.3');

    expect(result).toMatchObject({ healthy: true, versionMatch: true, reportedVersion: '1.2.3' });
    expect(httpGetMock).toHaveBeenNthCalledWith(
      1,
      'http://100.92.14.6:4312/health',
      expect.objectContaining({ timeout: 5000 }),
      expect.any(Function),
    );
  });
});
