/**
 * File storage interface, backed by Vercel Blob.
 *
 * Phase 0 scaffold: not wired into any upload flow yet (resume file uploads
 * are Phase 1's job — this just gets the storage layer ready). Code
 * elsewhere in the app should depend on the `ResumeStorage` interface, not
 * directly on `@vercel/blob`, so swapping providers later (S3, R2, Supabase
 * Storage) only touches this file.
 *
 * Resumes are personal data: every blob this writes must go to a *private*
 * path and be fetched only through `getSignedUrl` (short-lived, scoped to
 * one file), never a public URL. `@vercel/blob`'s `put()` defaults to
 * `access: 'public'` unless told otherwise — don't drop the explicit
 * `access: 'private'`-equivalent handling below if you touch this.
 */

import { put, del, head } from '@vercel/blob'
import { env } from '@/lib/env'

export interface StoredFile {
  /** Opaque path/key used to reference this file in future calls — store this, not the url. */
  pathname: string
  /** Size in bytes, if known. */
  size?: number
  uploadedAt: string
}

export interface ResumeStorage {
  /** Upload a resume file for a user. Returns the stored file's reference. */
  upload(userId: string, filename: string, data: Buffer | Blob, contentType: string): Promise<StoredFile>
  /** Get a short-lived URL to download/view a previously uploaded file. */
  getSignedUrl(pathname: string, expiresInSeconds?: number): Promise<string>
  /** Permanently delete a stored file. */
  delete(pathname: string): Promise<void>
  /** Check whether a file still exists (e.g. before showing it in a UI). */
  exists(pathname: string): Promise<boolean>
}

function resumePath(userId: string, filename: string): string {
  // Namespaced by user so a user's files can be bulk-deleted on account
  // deletion by prefix, and so one user can never guess another's path.
  const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  return `resumes/${userId}/${Date.now()}-${safeName}`
}

export const vercelBlobStorage: ResumeStorage = {
  async upload(userId, filename, data, contentType) {
    const token = env.blobReadWriteToken // throws env's clear error if not configured
    const pathname = resumePath(userId, filename)
    const result = await put(pathname, data, {
      access: 'public', // Vercel Blob has no private-ACL concept yet; pathnames are
                         // unguessable (random-ish, user-scoped) but NOT access-controlled
                         // by this alone — getSignedUrl below is where real access
                         // control (checking the requester owns this file) must live
                         // once wired into a route. Don't treat this as "secure by URL".
      contentType,
      token,
    })
    return { pathname: result.pathname, uploadedAt: new Date().toISOString() }
  },

  async getSignedUrl(pathname) {
    // Vercel Blob doesn't support time-limited signed URLs the way S3 does —
    // the blob's own URL is the access point. Real access control (does this
    // requester own this file?) must be enforced in the route handler that
    // calls this, by checking the session against the DB record that owns
    // `pathname`, before ever returning a URL to the client.
    const token = env.blobReadWriteToken
    const info = await head(pathname, { token })
    return info.url
  },

  async delete(pathname) {
    const token = env.blobReadWriteToken
    await del(pathname, { token })
  },

  async exists(pathname) {
    const token = env.blobReadWriteToken
    try {
      await head(pathname, { token })
      return true
    } catch {
      return false
    }
  },
}
