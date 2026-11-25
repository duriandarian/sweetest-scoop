import { createHash, randomBytes } from "node:crypto";

export const hashSessionToken = (token: string) => createHash("sha256").update(token).digest("hex");
export function createSessionToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashSessionToken(token) };
}
