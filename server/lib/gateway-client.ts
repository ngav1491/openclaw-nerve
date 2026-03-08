/**
 * Shared gateway tool invocation client.
 *
 * Provides a single {@link invokeGatewayTool} function used by route handlers
 * (crons, memories, gateway, etc.) to call OpenClaw gateway tools via its
 * `POST /tools/invoke` HTTP API. Eliminates duplication across route files.
 * @module
 */

import { config } from './config.js';

const { gatewayUrl: GATEWAY_URL, gatewayToken: GATEWAY_TOKEN } = config;

const DEFAULT_TIMEOUT_MS = 15_000;

interface ToolsInvokeResponse {
  ok: boolean;
  result?: unknown;
  error?: { message: string };
}

/**
 * Invoke a gateway tool via the HTTP API.
 *
 * @param tool - Tool name (e.g. 'cron', 'memory_store', 'sessions_list')
 * @param args - Tool arguments
 * @param timeoutMs - Request timeout in milliseconds (default: 15s)
 */
export async function invokeGatewayTool(
  tool: string,
  args: Record<string, unknown>,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  sessionKey = 'main',
): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (GATEWAY_TOKEN) headers['Authorization'] = `Bearer ${GATEWAY_TOKEN}`;

  const response = await fetch(`${GATEWAY_URL}/tools/invoke`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tool, args, sessionKey }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gateway tool invoke failed: ${response.status} ${text}`);
  }

  const result = (await response.json()) as ToolsInvokeResponse;
  if (!result.ok) throw new Error(result.error?.message || 'Tool invocation failed');
  return result.result;
}
