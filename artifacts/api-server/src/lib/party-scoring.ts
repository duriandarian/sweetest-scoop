import source from "../data/party-questions.json";
import previousSource from "../data/party-questions-v2.json";
import { buildShortFormMatcher, completePhrase, findUniqueAnswer, indexOneMissingWord } from "./answer-matching";
import { activityShortForms, amyWordForms, carriedItemAliases, carriedItemPlurals, exactAnswerAliases, optionalNameDescriptors, restaurantShortForms } from "./answer-word-forms";
import { formatAnswerLabel } from "./answer-label";
import { DESSERT_TIERS as TIERS, matchKey, normalizeAnswer, type CustomTierAnswer } from "@workspace/scoop-rules";

export { TIERS, matchKey, normalizeAnswer };
export const GAME_VERSION = 3;
export const CUSTOM_BANK_VERSION = 0;
export const ROUND_COUNT = source.length;
export const ROUND_DURATION_SECONDS = 25;
const sourceDepth: Record<string, number> = { Plankton: 0, "Too Clever": 0, Schooler: 1, Rare: 2, "Deep Cut": 3, Krillion: 4 };
const matchWords = (value: string) => normalizeAnswer(value).split(" ").map(matchKey).filter(Boolean);

// Only split slash labels that the host has confirmed mean “either answer.”
// Use normalized keys so capitalization cannot alter which alternatives are accepted.
const acceptedSlashKeys = new Set(["minigolfgolfland", "walkscharlie"]);
const answerLabels = (answer: string) => answer.split(acceptedSlashKeys.has(matchKey(answer)) ? /[|/]/ : "|");

type Entry = { answer: string; tier: string; depth: number; basePoints: number };
const tierEntry = (answer: string, depth: number): Entry => ({ answer, depth, tier: TIERS[depth], basePoints: (depth + 1) * 20 });
function buildBank(questions: typeof source, splitAlternatives: boolean, wordFormsPrompt: string) {
  return questions.map((question) => {
    const carriedItemQuestion = question.prompt === "Name an item Amy carries on her";
    const keyed = new Map<string, Entry>();
    for (const entry of question.answers) {
      const depth = sourceDepth[entry.sourceTier];
      if (depth === undefined) throw new Error(`Unknown spreadsheet tier: ${entry.sourceTier}`);
      const key = matchKey(entry.answer);
      const previous = keyed.get(key);
      // A few spreadsheet entries occur in more than one column; use the lowest tier.
      if (!previous || depth < previous.depth) {
        keyed.set(key, tierEntry(formatAnswerLabel(entry.answer), depth));
      }
    }
    const catalog = [...keyed.values()];
    const alternatives = new Map<string, Entry | null>();
    if (splitAlternatives) for (const [canonicalKey, entry] of keyed) {
      const labels = answerLabels(entry.answer);
      const aliases = (carriedItemQuestion ? carriedItemAliases.get(canonicalKey) : undefined)
        ?? exactAnswerAliases.get(canonicalKey) ?? [];
      const alternateLabels = labels.length > 1 ? [...labels, ...aliases] : aliases;
      for (const text of alternateLabels) {
        const key = matchKey(text);
        if (!key || keyed.has(key)) continue; // An individually listed answer keeps its own tier.
        const previous = alternatives.get(key);
        if (previous === undefined) alternatives.set(key, entry);
        else if (previous !== entry) alternatives.set(key, null);
      }
    }
    const completions = indexOneMissingWord(catalog, entry => {
      // The shorter SGD label must not turn bare “Tofu House” into a match.
      // Its approved shortcuts are handled by restaurantShortForms.
      if (matchKey(entry.answer) === "sgdtofuhouse" || answerLabels(entry.answer).length !== 1) return [];
      return matchWords(entry.answer);
    });
    const shortForm = buildShortFormMatcher(catalog,
      entry => answerLabels(entry.answer).map(matchWords), optionalNameDescriptors);
    const suggestions = question.prompt === wordFormsPrompt ? amyWordForms
      : question.prompt === "Name a restaurant that Daniel & Amy have been to (just us two)" ? restaurantShortForms
      : question.prompt === "Name a date activity that Daniel & Amy have done" ? activityShortForms
      : carriedItemQuestion ? carriedItemPlurals
      : undefined;
    return { prompt: question.prompt, catalog, keyed, alternatives, completions, shortForm, suggestions };
  });
}

export const questionBank = buildBank(source, true, "Name something Daniel loves about Amy (one word description)");
const previousBank = buildBank(previousSource, false, "Name something I love about Amy (one word description)");
export function bankForVersion(version: number): typeof questionBank | undefined {
  return version === GAME_VERSION ? questionBank : version === 2 ? previousBank : undefined;
}

/** Hosts own their answer labels. The prepared party's special aliases don't apply. */
export function customRoundBank(prompt: string, answers: readonly CustomTierAnswer[]): BankQuestion {
  const catalog = answers.map(({ answer, depth }) => tierEntry(answer, depth));
  return {
    prompt, catalog, keyed: new Map(catalog.map(entry => [matchKey(entry.answer), entry])),
    alternatives: new Map(), completions: indexOneMissingWord(catalog, entry => matchWords(entry.answer)),
    shortForm: buildShortFormMatcher(catalog, entry => [matchWords(entry.answer)], optionalNameDescriptors),
    suggestions: undefined,
  };
}

type BankQuestion = (typeof questionBank)[number];

export function roundBank(version: number, position: number, question: { prompt: string; customAnswers: CustomTierAnswer[] | null }) {
  if (version === CUSTOM_BANK_VERSION) return question.customAnswers?.length
    ? customRoundBank(question.prompt, question.customAnswers) : undefined;
  return bankForVersion(version)?.[position];
}

export function matchPreparedAnswer(question: BankQuestion, answer: string, allowMoreSuggestions = false) {
  const key = matchKey(answer);
  if (question.alternatives.has(key)) return question.alternatives.get(key) ?? undefined;
  return findUniqueAnswer(key, question.keyed,
    entry => normalizeAnswer(entry.answer).includes(" "),
    () => completePhrase(matchWords(answer), question.completions, allowMoreSuggestions), allowMoreSuggestions);
}

export function findAnswer(position: number, answer: string, bank = questionBank) {
  const question = bank[position];
  return question ? matchPreparedAnswer(question, answer) : undefined;
}

/** Word forms, typos, and missing words all require confirmation. */
export function answerCorrection(position: number, answer: string, bank = questionBank) {
  const question = bank[position];
  return question ? correctionForRound(question, answer) : undefined;
}

export function correctionForRound(question: BankQuestion, answer: string) {
  const key = matchKey(answer);
  if (question.keyed.has(key) || question.alternatives.has(key)) return undefined;
  const suggestedKey = question.suggestions?.get(key);
  const words = matchWords(answer);
  const entry = (suggestedKey && question.keyed.get(suggestedKey))
    || question.shortForm(words)
    || matchPreparedAnswer(question, answer, true);
  return entry
    ? { originalAnswer: answer.trim(), correctedAnswer: entry.answer }
    : undefined;
}

export function scoreAnswer(position: number, answer: string, elapsedMs: number, durationMs: number, bank = questionBank) {
  return scoreRound(bank[position], answer, elapsedMs, durationMs);
}

export function scoreRound(question: BankQuestion | undefined, answer: string, elapsedMs: number, durationMs: number) {
  const entry = question && matchPreparedAnswer(question, answer);
  const elapsed = Math.max(0, Math.min(durationMs, elapsedMs));
  const basePoints = entry?.basePoints ?? 0;
  const speedBonus = entry ? Math.round(20 * Math.max(0, 1 - elapsed / durationMs)) : 0;
  return {
    points: basePoints + speedBonus, basePoints, speedBonus,
    tier: entry?.tier ?? "No match", ingredient: entry?.tier ?? "No prize",
    depth: entry?.depth ?? 0, matched: Boolean(entry), elapsedMs: Math.round(elapsed),
    ...(entry ? { canonicalAnswer: entry.answer } : {}),
  };
}
