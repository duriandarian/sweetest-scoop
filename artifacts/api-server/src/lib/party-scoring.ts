import source from "../data/party-questions.json";
import { findUniqueAnswer } from "./answer-matching";

export const GAME_VERSION = 2;
export const ROUND_COUNT = 7;
export const ROUND_DURATION_SECONDS = 25;
export const TIERS = ["Sago Pearl", "Mango Cube", "Pomelo Gem", "Coconut Cloud", "Golden Mango"] as const;
const sourceDepth: Record<string, number> = { Plankton: 0, "Too Clever": 0, Schooler: 1, Rare: 2, "Deep Cut": 3, Krillion: 4 };
export const normalizeAnswer = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
/** Normalize punctuation, accents and word spacing before conservative typo matching. */
export const matchKey = (value: string) => normalizeAnswer(value).normalize("NFKD")
  .replace(/\p{M}/gu, "").replace(/&/g, "and").replace(/[^\p{L}\p{N}]/gu, "");

export const questionBank = source.map((question) => {
  const keyed = new Map<string, { answer: string; tier: string; depth: number; basePoints: number }>();
  for (const entry of question.answers) {
    const depth = sourceDepth[entry.sourceTier];
    if (depth === undefined) throw new Error(`Unknown spreadsheet tier: ${entry.sourceTier}`);
    const key = matchKey(entry.answer);
    const previous = keyed.get(key);
    // A few spreadsheet entries occur in more than one column; use the lowest tier.
    if (!previous || depth < previous.depth) {
      keyed.set(key, { answer: entry.answer, tier: TIERS[depth], depth, basePoints: (depth + 1) * 20 });
    }
  }
  return { prompt: question.prompt, catalog: [...keyed.values()], keyed };
});

export function findAnswer(position: number, answer: string) {
  const question = questionBank[position];
  return question ? findUniqueAnswer(matchKey(answer), question.keyed) : undefined;
}

export function scoreAnswer(position: number, answer: string, elapsedMs: number, durationMs: number) {
  const entry = findAnswer(position, answer);
  const elapsed = Math.max(0, Math.min(durationMs, elapsedMs));
  const basePoints = entry?.basePoints ?? 0;
  const speedBonus = entry ? Math.round(20 * Math.max(0, 1 - elapsed / durationMs)) : 0;
  return {
    points: basePoints + speedBonus, basePoints, speedBonus,
    tier: entry?.tier ?? "No match", ingredient: entry?.tier ?? "No prize",
    depth: entry?.depth ?? 0, matched: Boolean(entry), elapsedMs: Math.round(elapsed),
  };
}
