import { createHash, timingSafeEqual } from "crypto";

// Hashing both sides keeps the compare constant-time, hides length, and avoids
// timingSafeEqual's throw on unequal byte lengths.
const digest = (value: string) => createHash("sha256").update(value).digest();

export function safeCompare(
  provided: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!provided || !expected) return false;
  return timingSafeEqual(digest(provided), digest(expected));
}
