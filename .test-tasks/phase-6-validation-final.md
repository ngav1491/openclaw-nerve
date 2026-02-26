# Phase 6: Validation Round 2 — Stress Test + Final Report

## Branch
You are on branch `feat/test-coverage-phase1` in `/root/.openclaw/workspace/openclaw-nerve`.

## Tasks

### 1. Run full suite 3 times consecutively
```
cd /root/.openclaw/workspace/openclaw-nerve
for i in 1 2 3; do echo "=== RUN $i ===" && npx vitest run 2>&1 | tail -5; done
```
All 3 runs must be green. If not, fix and re-run.

### 2. Check test isolation
Run each new test file individually to confirm no cross-test contamination:
```
find src server -name "*.test.*" -newer .test-tasks/progress.json | while read f; do
  echo "Testing: $f"
  npx vitest run "$f" 2>&1 | tail -3
done
```

### 3. Final coverage report
```
npx vitest run --coverage 2>&1
```
Create a comprehensive report at `.test-tasks/final-report.md` with:
- Total tests (old + new)
- Coverage by area (statements, branches, functions, lines)
- Comparison vs baseline (283 tests, 73% stmts, 55% branch)
- List of any remaining TODO/skip markers
- List of files still at 0% coverage

### 4. Review test quality
Scan through all new test files. For each, verify:
- Tests actually assert something meaningful (not just "doesn't throw")
- Mocks are realistic (not returning empty objects when the code needs specific shapes)
- Edge cases are covered, not just happy paths
- No tests that will break on minor refactors (test behavior, not implementation)

Fix any quality issues found.

### 5. Final commit
Commit with: `test: final validation pass — [X] tests, [Y]% coverage`

Push the branch:
```
git push origin feat/test-coverage-phase1
```

## Completion Checklist
- [ ] 3 consecutive green runs
- [ ] All test files pass individually
- [ ] Final report at `.test-tasks/final-report.md`
- [ ] Test quality review done
- [ ] All committed and pushed to origin
- [ ] Updated progress.json: set phase `6-validation-2` status to `"done"`
