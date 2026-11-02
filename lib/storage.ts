/**
 * File storage interface, backed by Vercel Blob (private access).
 *
 * Code elsewhere in the app should depend on the `ResumeStorage` interface,
 * not directly on `@vercel/blob`, so swapping providers later (S3, R2,
 * Supabase Storage) only touches this file.
 *
 * Resumes are personal data: every blob is written with `access: 'private'`
 * (requires the store's token to read — not reachable by a bare URL) and
 * read back only via `download()`, which streams the file through this
 * server, never returning a client-facing URL. The route handler that calls
 * `download()` is where real access control lives — it must check the
 * requester owns the DB row referencing this pathname *before* calling it.
 * This module has no concept of "who's asking"; it trusts its caller
 * completely.
 */

import { put, del, head, get } from '@vercel/blob'
import { env } from '@/lib/env'

export interface StoredFile {
  /** Opaque path/key used to reference this file in future calls — store this, not a URL. */
  pathname: string
  size?: number
  uploadedAt: string
}

export interface DownloadedFile {
  stream: ReadableStream
  contentType: string | null
  size: number | null
}

export interface ResumeStorage {
  /** Upload a resume file for a user. Returns the stored file's reference. */
  upload(userId: string, filename: string, data: Buffer | Blob, contentType: string): Promise<StoredFile>
  /** Stream a previously uploaded file's content — never returns a public URL. */
  download(pathname: string): Promise<DownloadedFile | null>
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
    const result = await put(pathname, data, { access: 'private', contentType, token })
    return { pathname: result.pathname, uploadedAt: new Date().toISOString() }
  },

  async download(pathname) {
    const token = env.blobReadWriteToken
    const result = await get(pathname, { access: 'private', token })
    if (!result || !result.stream) return null
    return {
      stream: result.stream,
      contentType: result.blob.contentType,
      size: result.blob.size,
    }
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
