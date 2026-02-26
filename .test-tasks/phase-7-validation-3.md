# Phase 7: Validation Round 3 — Deep Quality Pass

## Branch
You are on branch `feat/test-coverage-phase1` in `/root/.openclaw/workspace/openclaw-nerve`.

## Tasks

### 1. Run full suite 3 times
```
cd /root/.openclaw/workspace/openclaw-nerve
for i in 1 2 3; do echo "=== RUN $i ===" && npx vitest run 2>&1 | tail -10; done
```
ALL 3 must be green.

### 2. Review every new test file for quality
For each test file added in phases 1-4:
- Are assertions meaningful? (not just "doesn't throw")
- Are mocks realistic? (correct shapes, not empty objects)
- Are edge cases covered? (empty inputs, nulls, large data, error states)
- Is the test testing behavior, not implementation details?
- Are there any hardcoded values that will break on refactor?
- Are async tests properly awaited?

Fix any issues found.

### 3. Look for missing edge cases
For each tested module, check:
- What happens with undefined/null inputs?
- What happens with empty strings/arrays?
- What happens with very large inputs?
- What happens with concurrent calls?
- Are error paths tested, not just happy paths?

Add missing edge case tests.

### 4. Run coverage and compare
```
npx vitest run --coverage 2>&1
```
Compare against Phase 6 report. If coverage dropped, investigate why and fix.

### 5. Final 3× green runs after all fixes
```
for i in 1 2 3; do echo "=== FINAL RUN $i ===" && npx vitest run 2>&1 | tail -10; done
```

### 6. Commit
```
git add -A && git commit -m "test: validation round 3 — quality review + edge cases"
```

## Completion Checklist
- [ ] 3 consecutive green runs (start)
- [ ] All test files quality-reviewed
- [ ] Edge cases added where missing
- [ ] 3 consecutive green runs (after fixes)
- [ ] Committed
- [ ] Updated progress.json: set phase `7-validation-3` status to `"done"`
