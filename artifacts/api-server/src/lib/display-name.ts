const normalizeSpaces = (value: string) => value.trim().replace(/\s+/gu, " ");
const invisible = /\p{Default_Ignorable_Code_Point}/gu;

/** Compare saved and incoming names identically, without stripping accents. */
export function displayNameKey(name: string): string {
  return normalizeSpaces(name.normalize("NFKC").replace(invisible, "")).toLowerCase().normalize("NFC");
}

/** Reserved looks are assigned on the server, never accepted from an outfit picker. */
export function partyBobiForName(name: string): "party-daniel" | "party-amy" | undefined {
  const key = displayNameKey(name);
  return key === "daniel" ? "party-daniel" : key === "amy" ? "party-amy" : undefined;
}

export function validateDisplayName(value: unknown): { name: string } | { error: string } {
  if (typeof value !== "string" || !value.trim()) return { error: "Enter your display name." };
  if (value.length > 32) return { error: "Keep your display name to 32 characters or fewer." };
  // Reject control and bidi-override characters, not non-Latin scripts or emoji joiners.
  if (/[\p{Cc}\p{Cs}<>\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(value))
    return { error: "Remove control characters or angle brackets from your display name." };
  const name = normalizeSpaces(value.normalize("NFC"));
  if (!/[\p{L}\p{N}\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(name))
    return { error: "Use at least one letter, number, or emoji in your display name." };
  return { name };
}
