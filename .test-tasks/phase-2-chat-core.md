# Phase 2: Chat Core — Context, Message Ops, Sanitization

## Branch
You are on branch `feat/test-coverage-phase1` in `/root/.openclaw/workspace/openclaw-nerve`.
All work goes on this branch. Commit frequently with conventional commit messages.

## Context
- Test framework: Vitest + jsdom + @testing-library/react
- Mock gateway should exist at `src/test/mock-gateway.ts` (built in Phase 1)
- Existing test setup: `src/test/setup.ts`
- Run tests: `npx vitest run`
- **DO NOT touch any files in `server/lib/updater/`** — updater is out of scope
- **DO NOT install new npm dependencies**

## Tasks

### 1. Test `src/features/chat/operations/sendMessage.ts`
File: `src/features/chat/operations/sendMessage.test.ts`
- Message construction with text content
- Message construction with attachments/images
- Model and effort parameters included correctly
- Session ID routing
- Error handling (no connection, send failure)

### 2. Test `src/features/chat/operations/streamEventHandler.ts`
File: `src/features/chat/operations/streamEventHandler.test.ts`
- Streaming text chunk assembly (multiple chunks → complete message)
- Tool call events (start, progress, complete)
- Error events from gateway
- Completion/done events
- Malformed event handling
- Interleaved text + tool call events

### 3. Test `src/features/chat/operations/loadHistory.ts`
File: `src/features/chat/operations/loadHistory.test.ts`
- Load messages for a session
- Pagination (offset/limit)
- Message parsing (different message types)
- Empty session
- Error handling (network failure, invalid response)

### 4. Test `src/features/chat/operations/mergeRecoveredTail.ts`
File: `src/features/chat/operations/mergeRecoveredTail.test.ts`
- Merge recovered messages with existing
- Deduplication by message ID
- Correct ordering after merge
- Empty tail merge
- Overlapping messages

### 5. Test `src/lib/sanitize.ts` — improve branch coverage
File: `src/lib/sanitize.test.ts` (EXISTING — add tests)
- Currently 0% branch coverage
- XSS vectors: `<script>`, `<img onerror>`, `javascript:` URLs
- Nested/encoded payloads
- Valid HTML that should pass through
- Edge cases: empty string, very long string, unicode

### 6. Test `src/features/chat/extractImages.ts`
File: `src/features/chat/extractImages.test.ts`
- Extract image URLs from markdown
- Multiple images in one message
- No images → empty array
- Malformed markdown
- Base64 data URLs
- Relative vs absolute URLs

### 7. Test `src/features/chat/edit-blocks.ts`
File: `src/features/chat/edit-blocks.test.ts`
- Parse edit blocks from message content
- Multiple edits in one message
- Malformed edit blocks
- Empty content

### 8. Test `src/features/charts/extractCharts.ts`
File: `src/features/charts/extractCharts.test.ts`
- Parse `[chart:{...}]` markers from text
- Valid JSON extraction for all chart types (bar, line, pie, area, candle, tv)
- Invalid JSON → graceful skip
- Multiple charts in one message
- Chart markers mixed with regular text
- Nested brackets edge case

## Completion Checklist
- [ ] All new test files created and passing
- [ ] Existing `sanitize.test.ts` updated with branch coverage tests
- [ ] `npx vitest run` shows 0 failures (including all previous tests)
- [ ] Committed all work with descriptive messages
- [ ] Updated progress.json: set phase `2-chat-core` status to `"done"`

## Important
- Read the source files carefully before writing tests — understand the actual API/exports.
- If a module exports a class, test the class methods. If it exports functions, test those.
- If something is a React hook, use `renderHook` from `@testing-library/react`.
- If you finish early, move on to Phase 3 (read `.test-tasks/phase-3-server-api.md`).
