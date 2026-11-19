import { PRIZES, type Room } from './theme';
import { ROUND_DURATION_SECONDS } from './round-countdown';

// Prompts only. Never import the prepared answer banks into the browser.
export const PREVIEW_QUESTIONS = [
  'Name an artist in Amy has recently listened to in Spotify',
  'Name a restaurant that Daniel & Amy have been to (just us two)',
  'Name a city from Illinois',
  'Name a date activity that Daniel & Amy have done',
  'Name a city of residence that an RBF member family resides in',
  "Name something we've cooked together",
  'Name something I love about Amy (one word description)',
] as const;

/** Explicitly illustrative local state, never a real room or an answer-judging service. */
export function questionPreviewState({ index, host, answer, tier, avatar }: {
  index: number; host: boolean; answer: string | null; tier: number; avatar: string;
}): Room {
  const prize = PRIZES[tier];
  return {
    code: 'PREVIEW', phase: 'answering', round: index + 1, questionCount: PREVIEW_QUESTIONS.length,
    roundDuration: ROUND_DURATION_SECONDS, currentQuestion: PREVIEW_QUESTIONS[index], questions: [...PREVIEW_QUESTIONS],
    isHost: host, playerId: host ? 'preview-host' : 'preview-player', avatar,
    players: [
      { id: 'preview-host', displayName: 'Preview host', isHost: true, avatar: 'mango', hasAnswered: false },
      { id: 'preview-player', displayName: 'Preview player', isHost: false, avatar, hasAnswered: Boolean(answer) },
    ],
    submitted: Boolean(answer), submittedCount: answer ? 1 : 0,
    myAnswer: host ? null : answer, myTotalPoints: !host && answer ? prize.base : 0,
    myReward: !host && answer ? {
      matched: true, tier: prize.name, ingredient: prize.name, depth: prize.depth,
      basePoints: prize.base, speedBonus: 0, points: prize.base, elapsedMs: 0,
    } : null,
    answers: [], standings: [], roundStandings: [], possibleAnswers: [],
  };
}
