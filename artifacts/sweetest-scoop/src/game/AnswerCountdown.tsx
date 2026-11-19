import { Timer } from 'lucide-react';
import { countdownSeconds } from './round-countdown';

export function AnswerCountdown({ remainingMs }: { remainingMs: number | null }) {
  const seconds = countdownSeconds(remainingMs);
  if (seconds == null) return null;
  return <span className={`answer-countdown ${seconds <= 10 ? 'is-low' : ''}`} role="timer" aria-live="off" aria-label={`${seconds} seconds left to answer`} data-testid="text-answer-timer">
    <Timer size={14} aria-hidden="true"/><b>{seconds}<small>s</small></b>
  </span>;
}
