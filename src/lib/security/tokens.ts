import { randomBytes, createHash } from "crypto";

/** Generates a high-entropy opaque token and its SHA-256 hash for storage. */
export function generateOpaqueToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
