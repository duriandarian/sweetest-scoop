const instancePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function roomInviteUrl(origin: string, base: string, code: string, roomInstanceId: string) {
  const url = new URL(`${base.replace(/\/$/, '')}/room/${encodeURIComponent(code)}`, origin);
  url.searchParams.set('invite', roomInstanceId);
  return url.href;
}

/** undefined is the manual route; null is a damaged invite and must not fall back to manual. */
export function roomInviteFromSearch(search: string): string | null | undefined {
  const values = new URLSearchParams(search).getAll('invite');
  if (values.length === 0) return undefined;
  return values.length === 1 && values[0].length === 36 && instancePattern.test(values[0]) ? values[0].toLowerCase() : null;
}
