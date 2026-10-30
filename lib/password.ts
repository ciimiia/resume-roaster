/**
 * Password hashing with argon2id (via the `argon2` package — native binding,
 * Node.js runtime only, not Edge Runtime).
 *
 * Params follow OWASP's current minimum recommendation for argon2id:
 * memoryCost 19 MiB, timeCost 2, parallelism 1. The `argon2` package stores
 * the salt, params and algorithm version inside the returned hash string
 * (PHC format), so verification doesn't need any of that passed back in —
 * just the plaintext password and the stored hash.
 */

import argon2 from 'argon2'

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456, // 19 MiB, in KiB
    timeCost: 2,
    parallelism: 1,
  })
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Old accounts may still carry the previous scrypt format ("{salt}:{hash}",
  // both hex). argon2's PHC-format hashes always start with "$argon2"; a
  // stored value that doesn't is from the old scheme and can never verify
  // against argon2.verify — fail closed rather than throwing on malformed
  // input. (No migration path yet: a user on the old format would need to
  // reset their password. Flagging this rather than dealing with it quietly,
  // since there are no production users on this app yet to migrate.)
  if (!stored.startsWith('$argon2')) return false
  try {
    return await argon2.verify(stored, password)
  } catch {
    return false
  }
}
