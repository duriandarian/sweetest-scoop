export const DESSERT_TIERS = ["Sago Pearl", "Mango Cube", "Pomelo Gem", "Coconut Cloud", "Golden Mango"] as const;
export const normalizeAnswer = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

/** Ignore case, punctuation, accents and word spacing for exact answer comparisons. */
export const matchKey = (value: string) => normalizeAnswer(value).normalize("NFKD")
  .replace(/\p{M}/gu, "").replace(/&/g, "and").replace(/[^\p{L}\p{N}]/gu, "");
