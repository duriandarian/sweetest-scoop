/** One insertion, deletion, substitution or adjacent transposition. */
function oneEditApart(a: string[], b: string[]): boolean {
  const difference = a.length - b.length;
  if (Math.abs(difference) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === Math.min(a.length, b.length)) return difference !== 0;
  const sameSuffix = (x: number, y: number) => {
    while (x < a.length && y < b.length) if (a[x++] !== b[y++]) return false;
    return x === a.length && y === b.length;
  };
  if (difference > 0) return sameSuffix(i + 1, i);
  if (difference < 0) return sameSuffix(i, i + 1);
  return sameSuffix(i + 1, i + 1)
    || (a[i] === b[i + 1] && a[i + 1] === b[i] && sameSuffix(i + 2, i + 2));
}

const MIN_TWO_EDIT_LENGTH = 10;
const MIN_THREE_EDIT_LENGTH = 15;
const MIN_FOUR_EDIT_LENGTH = 23;
const MIN_TYPED_COMPLETION_LENGTH = 12;

/** Bounded optimal-string-alignment distance, including adjacent swaps. */
function editDistance(a: string[], b: string[], limit: number): number {
  const overLimit = limit + 1;
  let older = new Uint8Array(b.length + 1);
  let previous = new Uint8Array(b.length + 1);
  let current = new Uint8Array(b.length + 1);
  previous.fill(overLimit);
  for (let j = 0; j <= Math.min(limit, b.length); j++) previous[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const start = Math.max(1, i - limit);
    const end = Math.min(b.length, i + limit);
    current[start - 1] = start === 1 ? Math.min(i, overLimit) : overLimit;
    if (end + 1 <= b.length) current[end + 1] = overLimit;
    for (let j = start; j <= end; j++) {
      let cost = Math.min(overLimit, previous[j] + 1, current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        cost = Math.min(cost, older[j - 2] + 1);
      }
      current[j] = cost;
    }
    [older, previous, current] = [previous, current, older];
  }
  return previous[b.length];
}

/** Index phrases that still have at least two ordered words after one omission. */
export function indexOneMissingWord<T>(entries: Iterable<T>, wordsFor: (entry: T) => string[]) {
  const completions = new Map<string, T | null>();
  for (const entry of entries) {
    const words = wordsFor(entry);
    if (words.length < 3) continue;
    for (let index = 0; index < words.length; index++) {
      const key = [...words.slice(0, index), ...words.slice(index + 1)].join(" ");
      if (!completions.has(key)) completions.set(key, entry);
      else if (completions.get(key) !== entry) completions.set(key, null);
    }
  }
  return completions;
}

/** Expand a unique full-word clue, or leading initials anchored by at least one following word. */
export function buildShortFormMatcher<T>(entries: Iterable<T>, labelsFor: (entry: T) => string[][],
  descriptors: ReadonlySet<string>) {
  // Treat known descriptor pairs such as noodle/noodles alike without
  // stripping an "s" from a distinctive name or changing exact scoring.
  const foldDescriptor = (word: string) => {
    const singular = word.slice(0, -1);
    return word.endsWith("s") && descriptors.has(word) && descriptors.has(singular) ? singular : word;
  };
  const labels: { words: string[]; initials: string; entry: T }[] = [];
  for (const entry of entries) {
    for (const words of labelsFor(entry)) {
      if (words.length > 0) labels.push({
        words: words.map(foldDescriptor), initials: words.map(word => Array.from(word)[0]).join(""), entry,
      });
    }
  }
  return (wordsTyped: string[]): T | undefined => {
    const typed = wordsTyped.map(foldDescriptor);
    const first = typed[0];
    if (!first) return undefined;
    const distinctive = typed.some(word => Array.from(word).length >= 5 && !descriptors.has(word));
    // Require corroboration after initials; do not guess from a bare acronym or fragment.
    const canUseInitials = typed.length > 1 && /^[a-z]{3,5}$/.test(first);
    if (!distinctive && !canUseInitials) return undefined;

    let owner: T | undefined;
    let eligible = false;
    for (const { words, initials, entry } of labels) {
      const consume = (start: number, typedStart: number) => {
        let next = typedStart;
        let onlyDescriptorsSkipped = true;
        for (let i = start; i < words.length; i++) {
          if (words[i] === typed[next]) next++;
          else if (!descriptors.has(words[i])) onlyDescriptorsSkipped = false;
        }
        return next !== typed.length ? undefined : onlyDescriptorsSkipped;
      };
      const literal = distinctive && words.length >= typed.length ? consume(0, 0) : undefined;
      const abbreviated = canUseInitials && words.length >= first.length + typed.length - 1
        && initials.startsWith(first) ? consume(first.length, 1) : undefined;
      if (literal === undefined && abbreviated === undefined) continue;
      // Even a label with a missing distinctive word can make the clue ambiguous.
      if (owner !== undefined && owner !== entry) return undefined;
      owner = entry;
      if (literal || abbreviated) eligible = true;
    }
    return eligible ? owner : undefined;
  };
}

/** Allow one small typo in an otherwise clear, ordered missing-word completion. */
export function completePhrase<T>(words: string[], completions: ReadonlyMap<string, T | null>,
  allowTypo = false): T | undefined {
  const exact = completions.get(words.join(" "));
  if (exact !== undefined || !allowTypo || words.length < 2) return exact ?? undefined;
  const letters = words.map(word => Array.from(word));
  if (letters.reduce((sum, word) => sum + word.length, 0) < MIN_TYPED_COMPLETION_LENGTH) return undefined;
  let match: T | undefined;
  for (const [key, entry] of completions) {
    const candidate = key.split(" ");
    if (candidate.length !== words.length) continue;
    let changed = false;
    let hasAnchor = false;
    let valid = true;
    for (let i = 0; i < words.length; i++) {
      if (words[i] === candidate[i]) {
        if (letters[i].length >= 4) hasAnchor = true;
        continue;
      }
      const other = Array.from(candidate[i]);
      if (changed || Math.min(letters[i].length, other.length) < 4 || !oneEditApart(letters[i], other)) {
        valid = false;
        break;
      }
      changed = true;
    }
    if (!valid || !changed || !hasAnchor) continue;
    if (entry === null || (match !== undefined && match !== entry)) return undefined;
    match = entry;
  }
  return match;
}

/** Exact answers and the closest unambiguous typo take priority over phrase completion. */
export function findUniqueAnswer<T>(key: string, answers: ReadonlyMap<string, T>,
  isPhrase?: (entry: T) => boolean, complete?: () => T | undefined, allowLongerTypos = false): T | undefined {
  if (answers.has(key)) return answers.get(key);
  const typed = Array.from(key);
  if (typed.length < 4) return undefined;
  let match: T | undefined;
  let found = false;
  const candidates: { key: string; letters: string[]; limit: number; entry: T }[] = [];
  for (const [candidate, entry] of answers) {
    const letters = Array.from(candidate);
    if (letters.length >= 4 && oneEditApart(typed, letters)) {
      if (found) return undefined; // Ambiguous one-edit matches never reach the fallback.
      found = true;
      match = entry;
    } else if (!found && typed.length >= MIN_TWO_EDIT_LENGTH && letters.length >= MIN_TWO_EDIT_LENGTH) {
      const length = Math.min(typed.length, letters.length);
      const limit = allowLongerTypos && length >= MIN_FOUR_EDIT_LENGTH ? 4
        : (isPhrase || allowLongerTypos) && length >= MIN_THREE_EDIT_LENGTH ? 3 : 2;
      if (Math.abs(typed.length - letters.length) <= limit) candidates.push({ key: candidate, letters, limit, entry });
    }
  }
  if (found) return match;
  let bestDistance = Infinity;
  let extendedKey: string | undefined;
  let ambiguous = false;
  for (const candidate of candidates) {
    const limit = Math.min(candidate.limit, bestDistance);
    if (Math.abs(typed.length - candidate.letters.length) > limit) continue;
    const distance = editDistance(typed, candidate.letters, limit);
    if (distance > limit) continue;
    if (distance === bestDistance) {
      match = undefined;
      ambiguous = true;
      continue;
    }
    bestDistance = distance;
    ambiguous = false;
    const phrase = isPhrase?.(candidate.entry) ?? false;
    const extended = allowLongerTypos && (distance === 3 && !phrase || distance === 4 && phrase);
    extendedKey = extended ? candidate.key : undefined;
    // Fragments and over-budget candidates still count against a tie.
    match = !candidate.key.includes(key) && (distance < 3 || distance === 3 && phrase || extended)
      ? candidate.entry : undefined;
  }
  if (match !== undefined && extendedKey !== undefined) {
    // Only the new, looser matches need a wider margin from the runner-up.
    const limit = bestDistance + 1;
    for (const candidate of answers.keys()) {
      if (candidate === extendedKey) continue;
      const letters = Array.from(candidate);
      if (Math.abs(typed.length - letters.length) <= limit && editDistance(typed, letters, limit) <= limit)
        return undefined;
    }
  }
  return match ?? (ambiguous ? undefined : complete?.());
}
