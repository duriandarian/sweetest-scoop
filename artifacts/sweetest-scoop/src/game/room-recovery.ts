import type { RoomState } from '@workspace/api-client-react';

const phaseOrder = { lobby: 0, answering: 1, revealed: 2, finished: 3 };

/** Polls and mutations can arrive out of order after a phone reconnects. */
export function reconcileRoom(previous: RoomState | undefined, incoming: RoomState): RoomState {
  if (!previous || previous.code !== incoming.code || previous.playerId !== incoming.playerId) return incoming;
  if (incoming.round !== previous.round) return incoming.round > previous.round ? incoming : previous;
  if (phaseOrder[incoming.phase] !== phaseOrder[previous.phase])
    return phaseOrder[incoming.phase] > phaseOrder[previous.phase] ? incoming : previous;
  if (previous.submitted && !incoming.submitted) return previous;
  if (incoming.serverNow && previous.serverNow && Date.parse(incoming.serverNow) < Date.parse(previous.serverNow)) return previous;
  return incoming;
}

export function sessionRejected(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 401;
}
