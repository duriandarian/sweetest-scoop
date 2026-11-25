import assert from 'node:assert/strict';
import { test } from 'node:test';
import { roomInviteFromSearch, roomInviteUrl } from './room-invite';
import { roomEntryFailure } from './room-entry';

const room = 'abcdef12-1234-4abc-8def-012345abcdef';

test('a QR uses the current origin and app base path with no seat credentials', () => {
  assert.equal(roomInviteUrl('https://playbobi.example', '/', 'AMY', room),
    `https://playbobi.example/room/AMY?invite=${room}`);
  assert.equal(roomInviteUrl('https://preview.example:8443', '/game/', 'AMY', room),
    `https://preview.example:8443/game/room/AMY?invite=${room}`);
});

test('a broken invite is distinguished from a manual room link', () => {
  assert.equal(roomInviteFromSearch('?other=value'), undefined);
  assert.equal(roomInviteFromSearch(`?invite=${room.toUpperCase()}`), room);
  for (const search of ['?invite=', '?invite=old-room', `?invite=${room}%0A`, `?invite=${room}&invite=${room}`]) {
    assert.equal(roomInviteFromSearch(search), null);
  }
});

test('expired invite instructions tell a phone user to scan again', () => {
  const error = { status: 404, data: { error: 'Room not found.', field: 'code' } };
  assert.match(roomEntryFailure(error, true).error, /latest QR code/);
  assert.match(roomEntryFailure(error).error, /Check the code/);
});
