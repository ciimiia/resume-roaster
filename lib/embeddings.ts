/**
 * Embedding generation via OpenRouter's embeddings endpoint
 * (POST /api/v1/embeddings) — confirmed it accepts the same
 * `provider: { data_collection: "deny" }` routing constraint already used
 * for chat completions in lib/resumeParsing.ts and app/api/analyze/route.ts.
 *
 * Privacy: never log job description text or resume/profile text anywhere
 * in this module — only lengths, counts, and error types/messages.
 *
 * Dimension: must match the `vector(1536)` columns in lib/db/schema.ts —
 * changing env.embeddingModel to a model with a different output dimension
 * requires a new migration to resize those columns.
 */

import 'server-only'
import { env } from '@/lib/env'

export const EMBEDDING_DIMENSIONS = 1536

interface OpenRouterEmbeddingResponse {
  data: { embedding: number[]; index: number }[]
}

export type EmbedResult =
  | { ok: true; embeddings: number[][] }
  | { ok: false; error: 'NO_API_KEY' | 'API_ERROR' | 'INVALID_RESPONSE' }

/**
 * Embeds a batch of texts in one call. OpenRouter's embeddings endpoint
 * accepts an array `input`, same as OpenAI's — batching keeps the
 * ingestion/matching flows from making one HTTP round trip per item.
 */
export async function embedTexts(texts: string[]): Promise<EmbedResult> {
  if (texts.length === 0) return { ok: true, embeddings: [] }

  const apiKey = env.openRouterApiKey
  if (!apiKey) return { ok: false, error: 'NO_API_KEY' }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.siteUrl,
        'X-Title': 'Resume Roaster Embeddings',
      },
      body: JSON.stringify({
        model: env.embeddingModel,
        input: texts,
        // Job/profile text is personal or scraped-third-party data — route
        // only to providers that don't retain or train on it, same
        // constraint as the chat-completions calls elsewhere.
        provider: { data_collection: 'deny' },
      }),
    })

    if (!response.ok) {
      console.error('[embeddings] OpenRouter error, status:', response.status)
      return { ok: false, error: 'API_ERROR' }
    }

    const data = (await response.json()) as OpenRouterEmbeddingResponse
    if (!Array.isArray(data.data) || data.data.length !== texts.length) {
      console.error('[embeddings] unexpected response shape, item count:', data.data?.length)
      return { ok: false, error: 'INVALID_RESPONSE' }
    }

    // Response items aren't guaranteed to preserve input order — sort by
    // the `index` field the API returns per item, same as OpenAI's contract.
    const ordered = [...data.data].sort((a, b) => a.index - b.index).map(d => d.embedding)
    if (ordered.some(e => !Array.isArray(e) || e.length !== EMBEDDING_DIMENSIONS)) {
      console.error('[embeddings] embedding had unexpected dimension count')
      return { ok: false, error: 'INVALID_RESPONSE' }
    }

    return { ok: true, embeddings: ordered }
  } catch (err) {
    console.error('[embeddings] unexpected failure:', err instanceof Error ? err.message : String(err))
    return { ok: false, error: 'API_ERROR' }
  }
}

export type EmbedOneResult =
  | { ok: true; embedding: number[] }
  | { ok: false; error: 'NO_API_KEY' | 'API_ERROR' | 'INVALID_RESPONSE' }

export async function embedText(text: string): Promise<EmbedOneResult> {
  const result = await embedTexts([text])
  if (!result.ok) return result
  return { ok: true, embedding: result.embeddings[0] }
}
