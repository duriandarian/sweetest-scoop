import { CUSTOM_LIMITS } from '@workspace/scoop-rules';

const key = 'sweetest-scoop:custom-room-draft';
type CustomDraft = { text: string; name: string; open: boolean };
const blank: CustomDraft = { text: '', name: '', open: false };

export function readCustomRoomDraft(): CustomDraft {
  try {
    if (typeof window === 'undefined') return blank;
    const stored = JSON.parse(window.sessionStorage.getItem(key) ?? 'null');
    if (stored && typeof stored.text === 'string' && typeof stored.name === 'string' && typeof stored.open === 'boolean') return stored;
  } catch { /* Setup also works without browser storage. */ }
  return blank;
}

export function saveCustomRoomDraft(draft: CustomDraft | null) {
  try {
    if (!draft) window.sessionStorage.removeItem(key);
    else {
      // Retain the latest usable paste if someone accidentally pastes an enormous sheet.
      const text = draft.text.length <= CUSTOM_LIMITS.text ? draft.text : readCustomRoomDraft().text;
      window.sessionStorage.setItem(key, JSON.stringify({ ...draft, text }));
    }
  } catch { /* The current text stays available in the form. */ }
}
