import type { RoomState } from "@workspace/api-zod";

type Mention = NonNullable<RoomState["honorableMentions"]>[number];
type Guest = { id: string; displayName: string; avatar?: string };
type Answer = { playerId: string; basePoints: number | null; elapsedMs: number | null; createdAt: Date };

/** Use stored accepted answers, not the live answer bank or rounded speed bonuses. */
export function honorableMentions(guests: readonly Guest[], answers: readonly Answer[]): Mention[] {
  const byId = new Map(guests.map(guest => [guest.id, guest]));
  const rare = new Map<string, { count: number; points: number; first: number }>();
  let fastest: Answer | undefined;
  let latest: Answer | undefined;
  const compareOrder = (a: Answer, b: Answer) =>
    a.createdAt.getTime() - b.createdAt.getTime() || a.playerId.localeCompare(b.playerId);

  for (const answer of answers) {
    const base = answer.basePoints ?? 0;
    if (!byId.has(answer.playerId) || base <= 0) continue;
    const elapsed = answer.elapsedMs;
    if (elapsed != null && elapsed >= 0) {
      if (fastest?.elapsedMs == null || elapsed < fastest.elapsedMs ||
          (elapsed === fastest.elapsedMs && compareOrder(answer, fastest) < 0)) fastest = answer;
      if (latest?.elapsedMs == null || elapsed > latest.elapsedMs ||
          (elapsed === latest.elapsedMs && compareOrder(answer, latest) < 0)) latest = answer;
    }
    if (base >= 80) {
      const at = answer.createdAt.getTime();
      const stats = rare.get(answer.playerId) ?? { count: 0, points: 0, first: at };
      stats.count++;
      stats.points += base;
      stats.first = Math.min(stats.first, at);
      rare.set(answer.playerId, stats);
    }
  }

  const result: Mention[] = [];
  const award = (category: Mention["category"], id: string, value: number) => {
    const guest = byId.get(id);
    if (guest) result.push({ category, playerId: id, displayName: guest.displayName, avatar: guest.avatar, value });
  };
  if (fastest?.elapsedMs != null) award("fastest", fastest.playerId, fastest.elapsedMs);
  if (latest?.elapsedMs != null) award("just-in-time", latest.playerId, latest.elapsedMs);
  const collector = [...rare].sort(([a, x], [b, y]) =>
    y.count - x.count || y.points - x.points || x.first - y.first || a.localeCompare(b))[0];
  if (collector) award("rare-finds", collector[0], collector[1].count);
  return result;
}
