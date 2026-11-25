const minorWords = new Set([
  "a", "an", "and", "as", "at", "but", "by", "du", "for", "from", "in", "nor", "of", "on", "or", "the", "to", "via", "with",
]);
const stylizedWords = new Map([
  ["bbq", "BBQ"], ["h&m", "H&M"], ["id", "ID"], ["ikea", "IKEA"], ["kbbq", "KBBQ"], ["lego", "LEGO"], ["sgd", "SGD"], ["xlb", "XLB"],
]);

/** Title case for display only; preserve accents, punctuation and existing brand casing. */
export function formatAnswerLabel(label: string): string {
  return label.split(/([|/])/).map(part => {
    const words = /[\p{L}\p{M}\p{N}]+(?:['’&][\p{L}\p{M}\p{N}]+)*/gu;
    const wordCount = [...part.matchAll(words)].length;
    let index = 0;
    return part.replace(words, word => {
      const isInterior = index++ > 0 && index < wordCount;
      const lower = word.toLowerCase();
      const stylized = stylizedWords.get(lower);
      if (stylized) return stylized;
      if (isInterior && minorWords.has(lower)) return lower;
      return word.replace(/\p{L}/u, letter => letter.toUpperCase());
    });
  }).join("");
}
