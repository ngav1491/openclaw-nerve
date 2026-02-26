# Phase 3: Server API — Route Handlers + Middleware

## Branch
You are on branch `feat/test-coverage-phase1` in `/root/.openclaw/workspace/openclaw-nerve`.
All work goes on this branch. Commit frequently with conventional commit messages.

## Context
- Test framework: Vitest + jsdom
- For Express route testing: use `supertest` if available in deps, otherwise mock `req`/`res` objects
- Run tests: `npx vitest run`
- **DO NOT touch any files in `server/lib/updater/`** — updater is out of scope
- **DO NOT install new npm dependencies** — check package.json for what's available
- Read `server/app.ts` to understand how routes are mounted and middleware is applied

## Tasks

### 1. Test `server/routes/sessions.ts`
File: `server/routes/sessions.test.ts`
- List sessions (happy path, empty list)
- Create session
- Switch/select session
- Delete session
- Error responses (invalid session ID, gateway errors)
- Response shape validation

### 2. Test `server/routes/gateway.ts`
File: `server/routes/gateway.test.ts`
- Gateway connection config response
- Token forwarding
- Gateway unreachable error handling

### 3. Test `server/routes/auth.ts`
File: `server/routes/auth.test.ts`
- Login with valid credentials
- Login with invalid credentials
- Logout
- Session validation endpoint

### 4. Test `server/routes/events.ts`
File: `server/routes/events.test.ts`
- SSE stream establishment
- Event format (data: JSON)
- Client disconnect cleanup
- Reconnection with Last-Event-ID

### 5. Test `server/routes/tts.ts`
File: `server/routes/tts.test.ts`
- TTS request with valid text
- Provider routing (edge, openai, replicate)
- Audio response format
- Error handling (provider failure, invalid params)
- Cache integration

### 6. Test `server/routes/transcribe.ts`
File: `server/routes/transcribe.test.ts`
- Audio upload handling
- Provider routing (openai, local whisper)
- Transcription response format
- Error handling (invalid audio, provider failure)

### 7. Test `server/routes/files.ts` + `server/routes/file-browser.ts`
File: `server/routes/files.test.ts`, `server/routes/file-browser.test.ts`
- File read (happy path)
- File write
- Path traversal prevention (../../etc/passwd must be rejected)
- Directory listing
- Binary file detection
- Non-existent file → 404

### 8. Test `server/routes/memories.ts`
File: `server/routes/memories.test.ts`
- List memories
- Create memory
- Update memory
- Delete memory

### 9. Test `server/routes/skills.ts`
File: `server/routes/skills.test.ts`
- List skills
- Skill detail response shape
- Error when OpenClaw binary not found

### 10. Test `server/middleware/security-headers.ts`
File: `server/middleware/security-headers.test.ts`
- CSP header present and correct
- X-Frame-Options set
- X-Content-Type-Options set
- CORS headers if applicable

### 11. Test `server/middleware/error-handler.ts`
File: `server/middleware/error-handler.test.ts`
- Error formatting (message, status code)
- Stack trace hidden in production mode
- Different error types (400, 404, 500)

### 12. Test `server/lib/gateway-client.ts`
File: `server/lib/gateway-client.test.ts`
- HTTP calls to gateway with token auth
- Successful response parsing
- Error responses (401, 500, timeout)
- Base URL construction

## Completion Checklist
- [ ] All new test files created and passing
- [ ] `npx vitest run` shows 0 failures (including all previous phase tests)
- [ ] Committed all work with descriptive messages
- [ ] Updated progress.json: set phase `3-server-api` status to `"done"`

## Important
- If routes require complex app setup, create a test helper that builds a minimal Express app with just the route under test.
- Mock external dependencies (gateway client, file system, OpenClaw binary) — don't make real network calls.
- Focus on the contract (request → response shape) not implementation details.
- If you finish early, move on to Phase 4 (read `.test-tasks/phase-4-client-components.md`).
