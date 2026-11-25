export const ROUND_DURATION_SECONDS = 25;
export const PRACTICE_ROUND_MS = ROUND_DURATION_SECONDS * 1000;
export const PRACTICE_PROMPT_DELAY_MS = 1000;

export function remainingRoundMs(deadline: number, now: number): number {
  return Math.max(0, deadline - now);
}

/** Allow a brief prompt-reading delay without displaying more than 25 seconds. */
export function remainingPracticeMs(deadline: number | null, now: number): number {
  return deadline === null ? PRACTICE_ROUND_MS : Math.min(PRACTICE_ROUND_MS, remainingRoundMs(deadline, now));
}

export function countdownSeconds(remainingMs: number | null): number | null {
  return remainingMs == null ? null : Math.max(0, Math.ceil(remainingMs / 1000));
}
