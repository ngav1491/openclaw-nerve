/**
 * Tests for mergeRecoveredTail — merging recovered history with existing transcript.
 */
import { describe, it, expect } from 'vitest';
import { mergeRecoveredTail } from './mergeRecoveredTail';
import type { ChatMsg } from '@/features/chat/types';

function makeMsg(role: string, text: string, ts?: number): ChatMsg {
  return {
    role: role as ChatMsg['role'],
    html: `<p>${text}</p>`,
    rawText: text,
    timestamp: new Date(ts ?? Date.now()),
  };
}

describe('mergeRecoveredTail', () => {
  it('returns recovered when existing is empty', () => {
    const recovered = [makeMsg('user', 'Hello')];
    expect(mergeRecoveredTail([], recovered)).toEqual(recovered);
  });

  it('returns existing when recovered is empty', () => {
    const existing = [makeMsg('user', 'Hello')];
    expect(mergeRecoveredTail(existing, [])).toEqual(existing);
  });

  it('appends new messages when recovered starts where existing ends', () => {
    const ts = 1700000000000;
    const existing = [
      makeMsg('user', 'Hello', ts),
      makeMsg('assistant', 'Hi', ts + 1000),
    ];
    const recovered = [
      makeMsg('user', 'Hello', ts),
      makeMsg('assistant', 'Hi', ts + 1000),
      makeMsg('user', 'New question', ts + 2000),
    ];
    const result = mergeRecoveredTail(existing, recovered);
    expect(result).toHaveLength(3);
    expect(result[2].rawText).toBe('New question');
  });

  it('does not duplicate overlapping messages', () => {
    const ts = 1700000000000;
    const msg1 = makeMsg('user', 'Hello', ts);
    const msg2 = makeMsg('assistant', 'Hi', ts + 1000);
    const msg3 = makeMsg('user', 'Follow up', ts + 2000);

    const existing = [msg1, msg2];
    const recovered = [msg1, msg2, msg3];
    const result = mergeRecoveredTail(existing, recovered);
    // Should have 3 messages, not 4 or 5
    expect(result).toHaveLength(3);
  });

  it('uses anchor path when no suffix-prefix overlap', () => {
    const ts = 1700000000000;
    const existing = [
      makeMsg('user', 'Message A', ts),
      makeMsg('assistant', 'Reply A', ts + 1000),
      makeMsg('user', 'Message B unique content here', ts + 2000),
      makeMsg('assistant', 'Old reply B', ts + 3000),
    ];
    const recovered = [
      makeMsg('user', 'Message B unique content here', ts + 2000),
      makeMsg('assistant', 'New reply B (corrected)', ts + 3000),
      makeMsg('user', 'Message C', ts + 4000),
    ];
    const result = mergeRecoveredTail(existing, recovered);
    // Should preserve A messages, replace from B onwards
    expect(result.some(m => m.rawText === 'Message A')).toBe(true);
    expect(result.some(m => m.rawText === 'Reply A')).toBe(true);
    expect(result.some(m => m.rawText === 'New reply B (corrected)')).toBe(true);
    expect(result.some(m => m.rawText === 'Message C')).toBe(true);
  });

  it('falls back to recovered when no overlap or anchor found', () => {
    const existing = [
      makeMsg('user', 'Old message 1', 1000000),
      makeMsg('assistant', 'Old reply 1', 1000001),
    ];
    const recovered = [
      makeMsg('user', 'Completely different', 2000000),
      makeMsg('assistant', 'New reply', 2000001),
    ];
    const result = mergeRecoveredTail(existing, recovered);
    expect(result).toEqual(recovered);
  });

  it('handles single message overlap', () => {
    const ts = 1700000000000;
    const existing = [makeMsg('user', 'Only msg', ts)];
    const recovered = [makeMsg('user', 'Only msg', ts), makeMsg('assistant', 'Reply', ts + 1000)];
    const result = mergeRecoveredTail(existing, recovered);
    expect(result).toHaveLength(2);
  });
});
