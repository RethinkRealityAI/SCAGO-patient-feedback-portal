import { describe, it, expect } from 'vitest';
import { MIN_HUMAN_FILL_MS, spamReasons } from './spam-signals';

describe('spamReasons', () => {
  it('passes a normal submission', () => {
    expect(spamReasons({ honeypot: '', elapsedMs: 60_000 })).toEqual([]);
  });

  it('passes when no signals were sent (older clients)', () => {
    expect(spamReasons(undefined)).toEqual([]);
    expect(spamReasons({})).toEqual([]);
  });

  it('holds a filled honeypot', () => {
    expect(spamReasons({ honeypot: 'http://spam.example', elapsedMs: 60_000 })).toEqual(['honeypot']);
  });

  it('ignores a whitespace-only honeypot', () => {
    expect(spamReasons({ honeypot: '   ', elapsedMs: 60_000 })).toEqual([]);
  });

  it('holds an impossibly fast submission', () => {
    expect(spamReasons({ elapsedMs: 400 })).toEqual(['too-fast']);
  });

  it('allows a submission right at the human threshold', () => {
    expect(spamReasons({ elapsedMs: MIN_HUMAN_FILL_MS })).toEqual([]);
  });

  it('reports every reason that applies', () => {
    expect(spamReasons({ honeypot: 'x', elapsedMs: 10 })).toEqual(['honeypot', 'too-fast']);
  });
});
