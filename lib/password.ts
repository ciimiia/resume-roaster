/**
 * Password hashing with argon2id, via `@node-rs/argon2` (napi-rs native
 * binding, Node.js runtime only, not Edge Runtime).
 *
 * Switched from the `argon2` package after it failed on Vercel: that
 * package's native build runs via an `install: node-gyp rebuild` lifecycle
 * script, which Vercel's build image blocks unless explicitly allow-listed
 * (npm's install-scripts gate) — so no Linux binary ever got built, and
 * every route importing this module 500'd in production. `@node-rs/argon2`
 * ships prebuilt binaries per-platform instead of compiling on install, so
 * it works out of the box on Vercel's runtime with no build config needed.
 *
 * Params follow OWASP's current minimum recommendation for argon2id:
 * memoryCost 19 MiB, timeCost 2, parallelism 1. Like the previous
 * implementation, the salt/params/version are embedded in the returned PHC
 * string, so verification only needs the plaintext password and that string.
 */

import { hash, verify } from '@node-rs/argon2'

// `Algorithm.Argon2id` isn't usable here: the package declares `Algorithm`
// as a `const enum`, which Next.js's per-file (isolatedModules) TypeScript
// transpilation can't inline — using it is a hard compile error. Its value
// (2) is stable (part of the package's public, documented enum ordering:
// Argon2d=0, Argon2i=1, Argon2id=2), so we use the literal instead.
const ARGON2ID = 2

const OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19456, // 19 MiB, in KiB
  timeCost: 2,
  parallelism: 1,
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS)
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Old accounts may still carry the previous scrypt format ("{salt}:{hash}",
  // both hex). argon2 PHC-format hashes always start with "$argon2"; a
  // stored value that doesn't is from the old scheme and can never verify
  // against argon2's verify — fail closed rather than throwing on malformed
  // input. (No migration path yet: a user on the old format would need to
  // reset their password. Flagging this rather than dealing with it quietly,
  // since there are no production users on this app yet to migrate.)
  if (!stored.startsWith('$argon2')) return false
  try {
    return await verify(stored, password, OPTIONS)
  } catch {
    return false
  }
}
