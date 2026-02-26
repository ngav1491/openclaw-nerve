# Test Phase Runner — Instructions for Cron-Spawned Agent

You are a coding agent spawned by a cron job to write tests for the Nerve UI project.

## Step 1: Determine which phase to work on

Read `/root/.openclaw/workspace/openclaw-nerve/.test-tasks/progress.json`.
Find the first phase where `status` is `"pending"`. That's your task.

If the previous phase is `"in-progress"`, check if its tests actually exist and pass:
```
cd /root/.openclaw/workspace/openclaw-nerve && npx vitest run 2>&1 | tail -10
```
If all tests pass, mark the previous phase as `"done"` and start the next one.
If tests are failing, your job is to fix them first (treat it as a validation task).

## Step 2: Read the phase task file

The task files are at:
- `.test-tasks/phase-1-foundation.md`
- `.test-tasks/phase-2-chat-core.md`
- `.test-tasks/phase-3-server-api.md`
- `.test-tasks/phase-4-client-components.md`
- `.test-tasks/phase-5-validation.md`
- `.test-tasks/phase-6-validation-final.md`

## Step 3: Do the work

Follow the task file instructions exactly. Write tests, run them, fix them, commit.

## Step 4: Update progress

After completing your phase, update `progress.json`:
- Set your phase `status` to `"done"` and `completedAt` to current ISO timestamp
- If you didn't finish, set `status` to `"in-progress"`

## Step 5: If you finish early

If you complete your phase with time to spare, start the next pending phase.

## Rules
- Branch: `feat/test-coverage-phase1` (should already be checked out)
- Working dir: `/root/.openclaw/workspace/openclaw-nerve`
- NO updater module tests
- NO new npm dependencies
- Commit after each completed task within the phase
- Run full `npx vitest run` before marking phase as done — ALL tests must pass
