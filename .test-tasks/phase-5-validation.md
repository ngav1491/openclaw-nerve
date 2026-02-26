# Phase 5: Validation Round 1 — Fix All Failures

## Branch
You are on branch `feat/test-coverage-phase1` in `/root/.openclaw/workspace/openclaw-nerve`.

## Context
Phases 1-4 wrote tests. Some may be failing, flaky, or have import errors.
Your job: make EVERYTHING green.

## Tasks

### 1. Run full test suite
```
cd /root/.openclaw/workspace/openclaw-nerve
npx vitest run 2>&1
```

### 2. Fix ALL failures
For each failing test:
- Read the error carefully
- If it's a test bug (wrong assertion, missing mock) → fix the test
- If it's a source bug discovered by the test → fix the source, but keep the fix minimal
- If it's an import/type error → fix the import

### 3. Run coverage report
```
npx vitest run --coverage 2>&1
```
Save the coverage summary to `.test-tasks/coverage-report.md`.

### 4. Check for flaky tests
Run the suite 3 times:
```
npx vitest run 2>&1
npx vitest run 2>&1
npx vitest run 2>&1
```
If any test passes sometimes and fails sometimes → it's flaky. Fix it or mark it with `test.skip` + a TODO comment explaining why.

### 5. Commit fixes
Commit with: `fix(tests): resolve test failures from phase 1-4`

## Completion Checklist
- [ ] `npx vitest run` — 0 failures, 3 consecutive green runs
- [ ] Coverage report saved to `.test-tasks/coverage-report.md`
- [ ] All fixes committed
- [ ] Updated progress.json: set phase `5-validation-1` status to `"done"`
