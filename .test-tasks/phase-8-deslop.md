# Phase 8: Deslop — Remove AI Noise from Test Code

## Branch
You are on branch `feat/test-coverage-phase1` in `/root/.openclaw/workspace/openclaw-nerve`.

## Context
All test code was written by AI agents in phases 1-4. AI-generated test code often has:
- Verbose, redundant comments that state the obvious
- Over-verbose describe/it labels
- Unnecessary abstractions or helper functions that obscure the test
- Repetitive setup that should be in beforeEach
- Mock objects with unnecessary fields
- Tests that test the mock, not the code
- Inconsistent naming conventions vs existing tests
- Imports that aren't used
- Console.log statements left behind

## Your Job
Apply the **technical-deslop** methodology to ALL new test files on this branch.

### Step 1: Identify all new test files
```
cd /root/.openclaw/workspace/openclaw-nerve
git diff --name-only master...feat/test-coverage-phase1 -- '*.test.*'
```

### Step 2: Read the existing test style
Look at these existing test files for the project's established style:
- `src/lib/formatting.test.ts`
- `src/hooks/useServerEvents.test.ts`
- `server/lib/env-file.test.ts`
- `server/routes/health.test.ts`

Note: describe naming, test naming, assertion style, mock patterns, comment density.

### Step 3: For each new test file, deslop it
- Remove comments that just restate the code
- Shorten overly verbose test names (e.g., "should correctly return the expected value when given valid input" → "returns expected value for valid input")
- Remove dead imports
- Remove console.logs
- Consolidate duplicate setup into beforeEach/beforeAll
- Remove unnecessary type annotations (TypeScript infers them)
- Match naming conventions to existing tests
- Remove any "AI-isms" — phrases no human developer would write
- Keep the tests functionally identical — don't change what they test

### Step 4: Run full suite
```
npx vitest run 2>&1
```
Must be green. If deslopping broke something, fix it.

### Step 5: Run 3 times to confirm stability
```
for i in 1 2 3; do echo "=== RUN $i ===" && npx vitest run 2>&1 | tail -10; done
```

### Step 6: Final coverage check
```
npx vitest run --coverage 2>&1
```
Coverage must not drop. Save final numbers to `.test-tasks/final-report.md`.

### Step 7: Commit and push
```
git add -A && git commit -m "style(tests): deslop AI-generated test code to match project conventions"
git push origin feat/test-coverage-phase1
```

## Completion Checklist
- [ ] All new test files deslopped
- [ ] Style matches existing test conventions
- [ ] No dead imports or console.logs
- [ ] Comments are useful, not obvious
- [ ] Test names are concise
- [ ] 3 consecutive green runs
- [ ] Coverage unchanged or improved
- [ ] Final report updated
- [ ] Committed and pushed
- [ ] Updated progress.json: set phase `8-deslop` status to `"done"`
