/**
 * Hook to fetch the list of linked OpenClaw agents for assignee selection.
 */

import { useState, useEffect } from 'react';

export interface AgentOption {
  /** Value to use as assignee, e.g. "agent:main" */
  value: string;
  /** Human-readable label, e.g. "Lumi" */
  label: string;
  /** Optional emoji identifier */
  emoji?: string;
}

/* ── Module-level cache ── */
let cachedAgents: AgentOption[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

async function fetchAgents(): Promise<AgentOption[]> {
  if (cachedAgents && Date.now() - cacheTime < CACHE_TTL) return cachedAgents;

  const res = await fetch('/api/agents');
  if (!res.ok) throw new Error(`Failed to fetch agents: ${res.status}`);
  const data: AgentOption[] = await res.json();
  cachedAgents = data;
  cacheTime = Date.now();
  return data;
}

export function useAgents() {
  const [agents, setAgents] = useState<AgentOption[]>(cachedAgents ?? []);
  const [loading, setLoading] = useState(!cachedAgents);

  useEffect(() => {
    let cancelled = false;
    fetchAgents()
      .then((data) => {
        if (!cancelled) {
          setAgents(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { data: agents, loading };
}
