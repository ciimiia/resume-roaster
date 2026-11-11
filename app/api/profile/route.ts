import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { getProfileForUser, saveProfileForUser, setProfileEmbedding } from '@/lib/db/profiles'
import { getResumeForUser } from '@/lib/db/resumes'
import { ParsedProfileSchema } from '@/lib/resumeProfile'
import { buildProfileText } from '@/lib/matching/profileText'
import { embedText } from '@/lib/embeddings'
import { readJsonWithLimit } from '@/lib/requestSize'
import { checkRateLimit } from '@/lib/rateLimit'

const MAX_BODY_BYTES = 256 * 1024 // a full parsed profile (many experience entries/bullets) is still well under this in practice

// Only the approval path below calls a paid API (embedding, see
// lib/embeddings.ts) — launch-readiness security pass: this route had no
// rate limit at all before, meaning repeated approve/re-approve calls
// were unbounded paid-API calls. Generous enough for legitimate profile
// iteration (edit → re-approve a few times while reviewing).
const APPROVE_LIMIT = { max: 15, windowSeconds: 60 * 60 }

async function requireSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return token ? await verifySession(token) : null
}

export async function GET() {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await getProfileForUser(session.userId)
    return NextResponse.json({ profile })
  } catch (err) {
    console.error('[profile] GET failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const parsed = await readJsonWithLimit<{ profile: unknown; sourceResumeId?: string; approved?: boolean }>(req, MAX_BODY_BYTES)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.error === 'TOO_LARGE' ? 413 : 400 })
    }
    const body = parsed.data

    const validated = ParsedProfileSchema.safeParse(body.profile)
    if (!validated.success) {
      return NextResponse.json({ error: 'INVALID_PROFILE', issues: validated.error.issues.map(i => i.path.join('.')) }, { status: 400 })
    }

    // If a sourceResumeId is given, verify the requester actually owns that
    // resume before linking the profile to it — otherwise a user could
    // point their profile's sourceResumeId at another user's resume id.
    if (body.sourceResumeId) {
      const owned = await getResumeForUser(body.sourceResumeId, session.userId)
      if (!owned) return NextResponse.json({ error: 'RESUME_NOT_FOUND' }, { status: 404 })
    }

    const profile = await saveProfileForUser(session.userId, validated.data, {
      sourceResumeId: body.sourceResumeId ?? null,
      approved: body.approved ?? false,
    })

    // Re-embed on every approval (including re-approving unchanged
    // content) — approvedAt just bumped to a new version in
    // saveProfileForUser above, so the match cache for this user is
    // already stale; this keeps the embedding in step with it. Best-effort:
    // an embedding failure here shouldn't fail the approval itself, the
    // user still gets their approved profile — matching just won't have
    // fresh results until the next successful approval or the admin retries.
    if (body.approved) {
      const rate = await checkRateLimit(`profile-approve:${session.userId}`, APPROVE_LIMIT.max, APPROVE_LIMIT.windowSeconds)
      if (!rate.allowed) {
        // The profile was already saved above (approved=true in the DB) —
        // only the embedding call is skipped, so matching serves a stale
        // embedding until the next successful approval rather than this
        // request failing outright.
        console.warn('[profile] approval rate-limited, skipping re-embed for user:', session.userId)
        return NextResponse.json({ profile })
      }
      const embedded = await embedText(buildProfileText(profile))
      if (embedded.ok) {
        await setProfileEmbedding(session.userId, embedded.embedding)
      } else {
        console.error('[profile] approval embedding failed:', embedded.error)
      }
    }

    return NextResponse.json({ profile })
  } catch (err) {
    console.error('[profile] PUT failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
