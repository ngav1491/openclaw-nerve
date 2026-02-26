# Phase 4: Client Components — React Components + Hooks

## Branch
You are on branch `feat/test-coverage-phase1` in `/root/.openclaw/workspace/openclaw-nerve`.
All work goes on this branch. Commit frequently with conventional commit messages.

## Context
- Test framework: Vitest + jsdom + @testing-library/react
- Existing test setup: `src/test/setup.ts`
- Run tests: `npx vitest run`
- **DO NOT touch any files in `server/lib/updater/`** — updater is out of scope
- **DO NOT install new npm dependencies**
- Use `renderHook` for hooks, `render` + `screen` for components
- Mock API calls, don't make real fetch/WS requests

## Tasks

### 1. Test `src/features/auth/useAuth.ts`
File: `src/features/auth/useAuth.test.ts`
- Login flow (sets token, updates state)
- Logout flow (clears token, resets state)
- Session persistence (token in localStorage/sessionStorage)
- Auth state (isAuthenticated, isLoading)

### 2. Test `src/features/auth/AuthGate.tsx`
File: `src/features/auth/AuthGate.test.tsx`
- Renders children when authenticated
- Renders login page when not authenticated
- Loading state while checking auth

### 3. Test `src/features/sessions/SessionList.tsx`
File: `src/features/sessions/SessionList.test.tsx`
- Renders list of sessions
- Shows active session highlighted
- Create new session button works
- Empty state when no sessions
- Session click triggers selection

### 4. Test `src/features/sessions/sessionTree.ts`
File: `src/features/sessions/sessionTree.test.ts`
- Build tree from flat session list
- Nested sessions (parent/child)
- Sorting (most recent first)
- Empty input → empty tree

### 5. Test `src/features/settings/SettingsDrawer.tsx`
File: `src/features/settings/SettingsDrawer.test.tsx`
- Drawer opens/closes
- Tab navigation (Connection, Audio, Appearance)
- Correct tab content renders

### 6. Test `src/features/markdown/MarkdownRenderer.tsx`
File: `src/features/markdown/MarkdownRenderer.test.tsx`
- Renders basic markdown (bold, italic, headers, lists)
- Code blocks with syntax highlighting
- Links render correctly
- Images render
- XSS prevention (script tags stripped)
- Large content doesn't crash
- Empty/null content

### 7. Test `src/features/charts/InlineChart.tsx`
File: `src/features/charts/InlineChart.test.tsx`
- Renders bar chart with data
- Renders pie chart with data
- Renders line chart with data
- TradingView chart renders container
- Invalid data → graceful fallback
- Missing data → no crash

### 8. Test `src/features/chat/MessageBubble.tsx`
File: `src/features/chat/MessageBubble.test.tsx`
- Renders user message (right aligned, user styling)
- Renders assistant message (left aligned, assistant styling)
- Renders system message
- Message with markdown content
- Message with code blocks
- Message with images
- Timestamp display
- Copy button functionality

### 9. Test `src/features/chat/InputBar.tsx`
File: `src/features/chat/InputBar.test.tsx`
- Text input captures keystrokes
- Submit on Enter
- Shift+Enter for newline
- Submit button click
- Empty submit prevented
- File attachment button present
- Model selector renders if applicable

### 10. Test `src/components/ErrorBoundary.tsx`
File: `src/components/ErrorBoundary.test.tsx`
- Renders children normally
- Catches error and shows fallback
- Error info displayed

### 11. Test `src/components/ContextMeter.tsx`
File: `src/components/ContextMeter.test.tsx`
- Renders with usage percentage
- Visual indicator (color/width) matches usage
- Zero usage
- Full usage
- Over-limit state

### 12. Test `src/hooks/useInputHistory.ts`
File: `src/hooks/useInputHistory.test.ts`
- Add entry to history
- Navigate up/down through history
- Empty history
- Persistence across re-renders

### 13. Test `src/hooks/useKeyboardShortcuts.ts`
File: `src/hooks/useKeyboardShortcuts.test.ts`
- Shortcut registration
- Shortcut execution on key event
- Multiple shortcuts
- Modifier keys (Ctrl, Cmd, Alt)

## Completion Checklist
- [ ] All new test files created and passing
- [ ] `npx vitest run` shows 0 failures (including all previous phase tests)
- [ ] Committed all work with descriptive messages
- [ ] Updated progress.json: set phase `4-client-components` status to `"done"`

## Important
- Wrap renders in necessary providers (SettingsContext, ChatContext, etc.) — create test wrappers as needed.
- Use `src/test/setup.ts` patterns for any global mocks.
- If a component is too tightly coupled to test in isolation, note it with a TODO comment and move on.
- After finishing, run `npx vitest run --coverage` and note the new coverage numbers in your commit message.
