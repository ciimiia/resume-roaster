/**
 * Password hashing with Node.js built-in crypto.scrypt (memory-hard, no external deps).
 * Stored format: "{hex-salt}:{hex-hash}"
 * NOTE: scrypt is NOT available in Edge Runtime — only call from Node.js API routes.
 */

import { scrypt, randomBytes, timingSafeEqual } from 'crypto'
const KEY_LEN = 64
const COST = { N: 16384, r: 8, p: 1 } // OWASP recommended minimums

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const hash = await new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, KEY_LEN, COST, (err, key) => err ? reject(err) : resolve(key))
  )
  return `${salt}:${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const hashBuf = Buffer.from(hash, 'hex')
  const supplied = await new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, KEY_LEN, COST, (err, key) => err ? reject(err) : resolve(key))
  )
  return timingSafeEqual(hashBuf, supplied)
}
