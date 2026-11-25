import type { RoomEntryProblem } from '@workspace/api-client-react';

export const roomCodeProblem = (code: string): RoomEntryProblem | null =>
  /^(?:[A-Z]{2,3}|[0-9]{4}|[A-Z0-9]{6})$(?![\s\S])/.test(code) ? null
    : { field: 'code', error: 'Enter the room code shown on the host screen.' };

export const roomNameProblem = (name: string): RoomEntryProblem | null => {
  if (!name.trim()) return { field: 'name', error: 'Enter your display name.' };
  return name.length > 32 ? { field: 'name', error: 'Keep your display name to 32 characters or fewer.' } : null;
};

/** Show the game's recovery instructions, not a raw HTTP error. */
export function roomEntryFailure(error: unknown, invited = false): RoomEntryProblem {
  if (error && typeof error === 'object') {
    const data = 'data' in error ? error.data : undefined;
    const field = data && typeof data === 'object' && 'field' in data && (data.field === 'name' || data.field === 'code')
      ? data.field : undefined;
    const detail = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error
      : typeof data === 'string' ? data : '';
    const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
    const transport = /^(?:\s*HTTP\s*:?\s*(\d{3})(?:[^:\n]*:\s*)?)/i;
    const status = 'status' in error ? error.status : Number(transport.exec(message)?.[1] ?? transport.exec(detail)?.[1]);
    // Older responses may describe the conflict without the field hint.
    const duplicate = /\b(?:duplicate (?:display )?name|name.{0,35}(?:already|taken|in use))\b/i;
    if ((status === 409 && field === 'name') || duplicate.test(detail) || (status === 409 && duplicate.test(message))) {
      return { field: 'name', error: 'That name is already taken. Try adding an initial or using a nickname.' };
    }
    if (status === 404 && (field === 'code' || /\broom (?:was )?not found\b/i.test(detail || message))) {
      return { field: 'code', error: invited ? 'This invite has expired. Scan the latest QR code on the host screen.'
        : 'Room not found. Check the code on the host screen.' };
    }
    if (status === 409 && !/\b(?:game|room)\b.*\b(?:started|closed)\b/i.test(detail))
      return { error: 'Could not join this room. Check with the host and try again.' };
    if (detail && data && typeof data === 'object') {
      const clean = detail.replace(transport, '').trim();
      if (clean) {
        const issues = 'issues' in data && Array.isArray(data.issues) ? data.issues.filter(
          issue => issue && typeof issue.message === 'string' && (issue.row === undefined || Number.isInteger(issue.row))) : undefined;
        return { error: clean, field, ...(issues?.length ? { issues } : {}) };
      }
    }
  }
  return { error: 'Could not connect. Try again in a moment.' };
}
