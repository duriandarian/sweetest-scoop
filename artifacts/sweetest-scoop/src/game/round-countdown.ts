export const ROUND_DURATION_SECONDS = 25;
export const PRACTICE_ROUND_MS = ROUND_DURATION_SECONDS * 1000;

export function remainingRoundMs(deadline: number, now: number): number {
  return Math.max(0, deadline - now);
}

/** Practice is ready until the first typed answer; real rooms use the server deadline. */
export function remainingPracticeMs(deadline: number | null, now: number): number {
  return deadline === null ? PRACTICE_ROUND_MS : remainingRoundMs(deadline, now);
}

export function countdownSeconds(remainingMs: number | null): number | null {
  return remainingMs == null ? null : Math.max(0, Math.ceil(remainingMs / 1000));
}
