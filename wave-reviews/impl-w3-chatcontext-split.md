# ChatContext Split — Implementation Summary

## Hooks Extracted

| Hook | File | Lines | Responsibilities |
|------|------|-------|-----------------|
| `useChatTTS` | `src/hooks/useChatTTS.ts` | 89 | TTS playback, voice fallback text generation, played-sound dedup, completion ping |
| `useChatMessages` | `src/hooks/useChatMessages.ts` | 177 | Message CRUD, deduplication, normalization, history loading, infinite scroll windowing |
| `useChatStreaming` | `src/hooks/useChatStreaming.ts` | 175 | Stream HTML buffer, rAF flush scheduling, processing stage, activity log, thinking duration |
| `useChatRecovery` | `src/hooks/useChatRecovery.ts` | 161 | Recovery/retry on disconnect, gap detection, generation-based stale guards |

## Lines Before/After

- **ChatContext.tsx before:** 1,116 lines
- **ChatContext.tsx after:** 668 lines (40% reduction)
- **Total hook code:** ~602 lines
- **Net new lines:** 154 (extraction overhead: types, interfaces, hook boilerplate)

## What Was Extracted

### Pure utility functions (exported from hooks for reuse):
- `buildVoiceFallbackText()` → useChatTTS
- `normalizeComparableText()` → useChatMessages
- `isLikelyDuplicateMessage()` → useChatMessages
- `mergeFinalMessages()` → useChatMessages
- `patchThinkingDuration()` → useChatMessages
- `FALLBACK_MAX_CHARS` → useChatTTS
- `DEFAULT_VISIBLE_COUNT` → useChatMessages
- `RECOVERY_LIMITS` → useChatRecovery

### State moved to hooks:
- Messages, visibleCount, hasMore → useChatMessages
- Stream HTML, processingStage, activityLog, lastEventTimestamp → useChatStreaming
- Recovery timer, generation counter, disconnect tracking → useChatRecovery
- TTS refs (lastMessageWasVoice, playedSounds) → useChatTTS

## What Stayed in ChatContext

The subscribe event handler (~250 lines) remains in ChatContext as the orchestrator. It can't be cleanly extracted because it:
1. Touches all 4 hook domains in a single callback
2. Manages run state (runsRef, activeRunIdRef) that's shared across event types
3. Sets `isGenerating` which is shared top-level state

The handler now delegates to hook methods (`streamHook.addActivityEntry()`, `ttsHook.handleFinalTTS()`, etc.) instead of inlining the logic.

Also remained in ChatContext:
- `isGenerating` / `showResetConfirm` state (shared across hooks)
- Run state management (runsRef, activeRunIdRef, sequence tracking)
- `handleSend`, `handleAbort`, `handleReset`, `confirmReset`, `cancelReset`
- Context value composition

## Context API

**Zero changes.** The `ChatContextValue` interface is identical. All consumers of `useChatContext()` / `useChat()` continue to work without modification. No consumer files were touched.

## Test Results

```
Test Files:  49 passed (49)
Tests:       708 passed (708)
tsc -b:      clean (0 errors)
```

## Commit

`d7b568d` on `fix/w3-chatcontext-split`
