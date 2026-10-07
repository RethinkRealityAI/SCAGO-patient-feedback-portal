/**
 * Decide whether a form submission looks automated, from signals the form
 * collects alongside (never inside) the answers. Matching submissions are
 * held for review rather than discarded, so a false positive is never lost.
 */

export interface SpamSignals {
  /** Value of the off-screen honeypot input; only bots fill it. */
  honeypot?: string;
  /** Milliseconds from form load to submit. */
  elapsedMs?: number;
}

/**
 * Faster than anyone can read and complete a form. Kept low on purpose:
 * someone who restores a saved draft can legitimately submit within seconds.
 */
export const MIN_HUMAN_FILL_MS = 2500;

/** Reasons to hold a submission; empty when it looks human. */
export function spamReasons(signals: SpamSignals | undefined): string[] {
  const reasons: string[] = [];
  if (signals?.honeypot && signals.honeypot.trim()) reasons.push('honeypot');
  if (typeof signals?.elapsedMs === 'number' && signals.elapsedMs >= 0 && signals.elapsedMs < MIN_HUMAN_FILL_MS) {
    reasons.push('too-fast');
  }
  return reasons;
}
