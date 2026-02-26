# Phase 1: Foundation — Mock Gateway + Core Tests

## Branch
You are on branch `feat/test-coverage-phase1` in `/root/.openclaw/workspace/openclaw-nerve`.
All work goes on this branch. Commit frequently with conventional commit messages.

## Context
- Test framework: Vitest + jsdom (see `vitest.config.ts`)
- Existing test setup: `src/test/setup.ts`
- Existing tests live alongside source files (e.g., `server/lib/env-file.test.ts`)
- Run tests: `npx vitest run`
- Run with coverage: `npx vitest run --coverage`
- **DO NOT touch any files in `server/lib/updater/`** — updater is out of scope
- **DO NOT install new npm dependencies** — use Node.js built-ins and existing deps only
- Check `package.json` for available test deps (vitest, @testing-library/react, etc.)

## Tasks

### 1. Build Mock Gateway WebSocket Server (`src/test/mock-gateway.ts`)
Create a reusable mock WS server that simulates the OpenClaw gateway:
- Accepts WebSocket connections with token auth validation
- Responds to chat messages with configurable streaming chunks
- Supports session CRUD message types
- Can simulate errors (auth rejection, disconnect, timeout, malformed messages)
- Can simulate device identity handshake
- Helper methods: `expectMessage()`, `sendChunk()`, `sendComplete()`, `sendError()`, `disconnect()`
- Auto-cleanup (close all connections) via `afterEach` helper
- Read `server/lib/ws-proxy.ts` to understand the exact WS message format Nerve uses

### 2. Test `server/middleware/auth.ts`
File: `server/middleware/auth.test.ts`
- Token validation (valid token → passes, invalid → 401)
- Missing token → 401
- Public routes bypass auth (check which routes are public by reading the middleware)
- `/api/version` is explicitly public
- Cookie-based auth if implemented
- Multiple auth header formats (Bearer, raw token)

### 3. Test `server/lib/config.ts`
File: `server/lib/config.test.ts`
- .env parsing with all expected keys
- Default values when keys are missing
- Type coercion (string → number for PORT, etc.)
- Invalid values (non-numeric PORT, empty strings)
- Missing .env file entirely
- Config reloading behavior if applicable
- Currently at 22% coverage — get it to 80%+

### 4. Test `server/lib/ws-proxy.ts`
File: `server/lib/ws-proxy.test.ts`
- Use the mock gateway from task 1
- WS connection establishment through proxy
- Message routing (client → gateway, gateway → client)
- Auth token forwarding
- Reconnection on gateway disconnect
- Error handling (gateway unreachable, connection refused)
- Multiple concurrent connections

### 5. Test `server/lib/device-identity.ts`
File: `server/lib/device-identity.test.ts`
- Ed25519 keypair generation
- Signature creation and verification
- Signing format matches expected: `v2|deviceId|clientId|clientMode|role|scopes|signedAtMs|token|nonce`
- Loading existing identity from file
- Creating new identity when file doesn't exist

## Completion Checklist
- [ ] All new test files created and passing
- [ ] `npx vitest run` shows 0 failures
- [ ] Committed all work with descriptive messages
- [ ] Updated progress.json: set phase `1-foundation` status to `"done"` with `completedAt` timestamp

## Important
- If a test is hard to write because the source code is tightly coupled, write a comment `// TODO: needs refactor for testability — [description]` and move on.
- Prefer small, focused tests over complex integration setups.
- Each test file should be independently runnable: `npx vitest run path/to/file.test.ts`
- If you finish early, move on to Phase 2 (read `.test-tasks/phase-2-chat-core.md`).
