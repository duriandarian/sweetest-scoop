/** One insertion, deletion, substitution or adjacent transposition—never a partial match. */
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

/** Exact keys win. Only forgive a typo when exactly one full prepared key fits. */
export function findUniqueAnswer<T>(key: string, answers: ReadonlyMap<string, T>): T | undefined {
  if (answers.has(key)) return answers.get(key);
  const typed = Array.from(key);
  if (typed.length < 4) return undefined;
  let match: T | undefined;
  let found = false;
  for (const [candidate, entry] of answers) {
    const letters = Array.from(candidate);
    if (letters.length < 4 || !oneEditApart(typed, letters)) continue;
    if (found) return undefined; // Never guess between answers, including different tiers.
    found = true;
    match = entry;
  }
  return match;
}
