import { type Room } from './theme';
import { ROUND_DURATION_SECONDS } from './round-countdown';
import { DEFAULT_LOOK, encodeAvatar } from './wardrobe';
import prompts from './party-prompts.json';

// Prompts only. Never import the prepared answer banks into the browser.
export const PREVIEW_QUESTIONS: readonly string[] = prompts;

/** Local presentation only; practice rewards must come from the server's answer checker. */
export function questionPreviewState({ index, host, answer, reward = null, avatar }: {
  index: number; host: boolean; answer: string | null; reward?: Room['myReward']; avatar: string;
}): Room {
  const accepted = Boolean(answer && reward?.matched);
  return {
    code: 'PREVIEW', phase: 'answering', round: index + 1, questionCount: PREVIEW_QUESTIONS.length,
    roundDuration: ROUND_DURATION_SECONDS, currentQuestion: PREVIEW_QUESTIONS[index], questions: [...PREVIEW_QUESTIONS],
    isHost: host, playerId: host ? 'preview-host' : 'preview-player', avatar,
    players: [
      { id: 'preview-host', displayName: 'Preview host', isHost: true, avatar: 'mango', hasAnswered: false },
      { id: 'preview-player', displayName: 'Preview player', isHost: false, avatar, hasAnswered: accepted },
    ],
    submitted: accepted, submittedCount: accepted ? 1 : 0,
    myAnswer: !host && accepted ? answer : null, myTotalPoints: !host && accepted ? reward?.points ?? 0 : 0,
    myReward: !host && accepted ? reward : null,
    answers: [], standings: [], roundStandings: [], possibleAnswers: [],
  };
}

/** Layout fixture for the explicitly labeled host preview, never a real room. */
export const CROWD_PREVIEW_GUESTS = 40;
export const CROWD_PREVIEW_START = 26;

export function crowdPreviewState(room: Room, sampleCount = CROWD_PREVIEW_START): Room {
  if (!room.isHost || room.code !== 'PREVIEW') return room;
  const guests = Array.from({ length: CROWD_PREVIEW_GUESTS }, (_, i) => ({
    id: `crowd-${i + 1}`, displayName: `Sample ${String(i + 1).padStart(2, '0')}`,
    avatar: i === 0 ? encodeAvatar({ ...DEFAULT_LOOK, accessory: 'schnauzer' })
      : i === 1 ? encodeAvatar({ color: 'matcha', hat: 'frog', outfit: 'overalls', accessory: 'turtle' })
      : i < 8 ? `b1:${i + 4}:${i % 14}:${i % 12}:${i % 12}`
      : `b1:${i % 6}:${i % 14}:${i % 12}:${i % 12}`,
    isHost: false, hasAnswered: i < sampleCount,
  }));
  return { ...room, players: [...room.players.filter(p => p.isHost), ...guests], submittedCount: guests.filter(g => g.hasAnswered).length };
}

export function hostLobbyPreviewState(guestCount: 1 | 40): Room {
  const crowd = crowdPreviewState(questionPreviewState({ index: 0, host: true, answer: null, avatar: 'mango' }), 0);
  return { ...crowd, code: 'MK', phase: 'lobby', round: 0, currentQuestion: null, players: crowd.players.slice(0, guestCount + 1) };
}
