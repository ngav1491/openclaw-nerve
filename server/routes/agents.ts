/**
 * Agents route — exposes the list of linked OpenClaw agents.
 *
 * Reads the OpenClaw config file (`openclaw.json`) to extract `agents.list`
 * entries, returning them as selectable assignee options for Kanban tasks.
 * @module
 */

import { Hono } from 'hono';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

import { rateLimitGeneral } from '../middleware/rate-limit.js';

const app = new Hono();

// ── Types ────────────────────────────────────────────────────────────

interface OpenClawAgent {
  id: string;
  name?: string;
  identity?: { name?: string; emoji?: string };
}

export interface AgentOption {
  /** Value to use as assignee, e.g. "agent:main" */
  value: string;
  /** Human-readable label, e.g. "Lumi" */
  label: string;
  /** Optional emoji identifier */
  emoji?: string;
}

// ── Cache ─────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60 * 1000; // 1 minute
let agentCache: { data: AgentOption[]; fetchedAt: number } | null = null;

// ── Helpers ───────────────────────────────────────────────────────────

function resolveOpenclawConfigPath(): string {
  const envHome = process.env.OPENCLAW_HOME;
  const base = envHome || join(homedir(), '.openclaw');
  return join(base, 'openclaw.json');
}

async function loadAgentsFromConfig(): Promise<AgentOption[]> {
  const configPath = resolveOpenclawConfigPath();
  const raw = await readFile(configPath, 'utf-8');
  const parsed = JSON.parse(raw);

  const agentList: OpenClawAgent[] = parsed?.agents?.list ?? [];

  const options: AgentOption[] = [
    // "operator" is always a valid assignee
    { value: 'operator', label: 'Operator (You)', emoji: '👤' },
  ];

  for (const agent of agentList) {
    if (!agent.id) continue;
    const name = agent.identity?.name || agent.name || agent.id;
    const emoji = agent.identity?.emoji;
    options.push({
      value: `agent:${agent.id}`,
      label: name,
      ...(emoji ? { emoji } : {}),
    });
  }

  return options;
}

// ── Route ─────────────────────────────────────────────────────────────

app.get('/api/agents', rateLimitGeneral, async (c) => {
  // Return cached if fresh
  if (agentCache && Date.now() - agentCache.fetchedAt < CACHE_TTL_MS) {
    return c.json(agentCache.data);
  }

  try {
    const agents = await loadAgentsFromConfig();
    agentCache = { data: agents, fetchedAt: Date.now() };
    return c.json(agents);
  } catch (err) {
    // If config not found or unreadable, return just the operator option
    const fallback: AgentOption[] = [
      { value: 'operator', label: 'Operator (You)', emoji: '👤' },
    ];
    return c.json(fallback);
  }
});

export default app;
