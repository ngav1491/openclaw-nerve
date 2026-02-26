/** Tests for the file browser routes (tree, read, write, raw). */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('file-browser routes', () => {
  let tmpDir: string;

  beforeEach(async () => {
    vi.resetModules();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fbrowser-test-'));
    // Create a MEMORY.md in the tmpDir so getWorkspaceRoot returns tmpDir
    await fs.writeFile(path.join(tmpDir, 'MEMORY.md'), '# Memories\n');
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function buildApp() {
    vi.doMock('../lib/config.js', () => ({
      config: {
        auth: false, port: 3000, host: '127.0.0.1', sslPort: 3443,
        memoryPath: path.join(tmpDir, 'MEMORY.md'),
      },
      SESSION_COOKIE_NAME: 'nerve_session_3000',
    }));

    const mod = await import('./file-browser.js');
    const app = new Hono();
    app.route('/', mod.default);
    return app;
  }

  describe('GET /api/files/tree', () => {
    it('lists directory entries at root', async () => {
      await fs.writeFile(path.join(tmpDir, 'test.md'), '# Test');
      await fs.mkdir(path.join(tmpDir, 'subdir'));

      const app = await buildApp();
      const res = await app.request('/api/files/tree');
      expect(res.status).toBe(200);
      const json = (await res.json()) as { ok: boolean; entries: Array<{ name: string; type: string }> };
      expect(json.ok).toBe(true);
      expect(json.entries.length).toBeGreaterThanOrEqual(1);

      const names = json.entries.map(e => e.name);
      expect(names).toContain('test.md');
      expect(names).toContain('subdir');
    });

    it('returns 400 for non-existent subdirectory', async () => {
      // resolveWorkspacePath returns null for non-existent paths, so route returns 400
      const app = await buildApp();
      const res = await app.request('/api/files/tree?path=nonexistent');
      expect(res.status).toBe(400);
    });

    it('rejects path traversal attempts', async () => {
      const app = await buildApp();
      const res = await app.request('/api/files/tree?path=../../etc');
      expect(res.status).toBe(400);
    });

    it('excludes node_modules and .git', async () => {
      await fs.mkdir(path.join(tmpDir, 'node_modules'));
      await fs.mkdir(path.join(tmpDir, '.git'));
      await fs.writeFile(path.join(tmpDir, 'visible.md'), 'hi');

      const app = await buildApp();
      const res = await app.request('/api/files/tree');
      const json = (await res.json()) as { ok: boolean; entries: Array<{ name: string }> };
      const names = json.entries.map(e => e.name);
      expect(names).not.toContain('node_modules');
      expect(names).not.toContain('.git');
    });
  });

  describe('GET /api/files/read', () => {
    it('returns 400 when path is missing', async () => {
      const app = await buildApp();
      const res = await app.request('/api/files/read');
      expect(res.status).toBe(400);
    });

    it('reads a text file', async () => {
      await fs.writeFile(path.join(tmpDir, 'readme.md'), '# Hello World');
      const app = await buildApp();
      const res = await app.request('/api/files/read?path=readme.md');
      expect(res.status).toBe(200);
      const json = (await res.json()) as { ok: boolean; content: string };
      expect(json.ok).toBe(true);
      expect(json.content).toBe('# Hello World');
    });

    it('returns 403 for non-existent file (resolveWorkspacePath fails)', async () => {
      // resolveWorkspacePath returns null for non-existent files (unless allowNonExistent)
      // so the route returns 403 "Invalid or excluded path", not 404
      const app = await buildApp();
      const res = await app.request('/api/files/read?path=nope.md');
      expect(res.status).toBe(403);
    });

    it('returns 415 for binary files', async () => {
      await fs.writeFile(path.join(tmpDir, 'image.png'), Buffer.from([0x89, 0x50]));
      const app = await buildApp();
      const res = await app.request('/api/files/read?path=image.png');
      expect(res.status).toBe(415);
    });

    it('rejects path traversal', async () => {
      const app = await buildApp();
      const res = await app.request('/api/files/read?path=../../../etc/passwd');
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/files/write', () => {
    it('writes a new file', async () => {
      const app = await buildApp();
      const res = await app.request('/api/files/write', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'new-file.md', content: '# New File' }),
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as { ok: boolean; mtime: number };
      expect(json.ok).toBe(true);
      expect(json.mtime).toBeGreaterThan(0);

      // Verify file was written
      const content = await fs.readFile(path.join(tmpDir, 'new-file.md'), 'utf-8');
      expect(content).toBe('# New File');
    });

    it('returns 400 when path is missing', async () => {
      const app = await buildApp();
      const res = await app.request('/api/files/write', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'hello' }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when content is missing', async () => {
      const app = await buildApp();
      const res = await app.request('/api/files/write', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'test.md' }),
      });
      expect(res.status).toBe(400);
    });

    it('rejects path traversal on write', async () => {
      const app = await buildApp();
      const res = await app.request('/api/files/write', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '../../etc/passwd', content: 'hacked' }),
      });
      expect(res.status).toBe(403);
    });

    it('rejects binary file writes', async () => {
      const app = await buildApp();
      const res = await app.request('/api/files/write', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'image.png', content: 'not really an image' }),
      });
      expect(res.status).toBe(415);
    });

    it('detects conflict via expectedMtime', async () => {
      const filePath = path.join(tmpDir, 'conflict.md');
      await fs.writeFile(filePath, 'original');

      const app = await buildApp();
      // Write with a stale mtime
      const res = await app.request('/api/files/write', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'conflict.md', content: 'updated', expectedMtime: 1 }),
      });
      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/files/raw', () => {
    it('returns 400 when path is missing', async () => {
      const app = await buildApp();
      const res = await app.request('/api/files/raw');
      expect(res.status).toBe(400);
    });

    it('returns 415 for unsupported file types', async () => {
      await fs.writeFile(path.join(tmpDir, 'file.txt'), 'hello');
      const app = await buildApp();
      const res = await app.request('/api/files/raw?path=file.txt');
      expect(res.status).toBe(415);
    });

    it('serves image files with correct MIME type', async () => {
      await fs.writeFile(path.join(tmpDir, 'photo.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      const app = await buildApp();
      const res = await app.request('/api/files/raw?path=photo.png');
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('image/png');
    });
  });
});
