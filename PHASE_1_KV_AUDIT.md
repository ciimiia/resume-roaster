# Phase 1 step 1a — Upstash KV audit & migration to Postgres

The Upstash KV database (`KV_REST_API_URL` → `meet-swine-101697.upstash.io`) is dead
(`ENOTFOUND`) and not being repaired. This document is the full audit of everything
it stored, and where each thing now lives in Postgres (`lib/db/schema.ts`).

## Audit table

| What | Old KV key pattern | Type | Files using it |
|---|---|---|---|
| User account | `user:email:{email}` | `StoredUser` (id, email, passwordHash, createdAt) | `app/api/auth/signup/route.ts`, `app/api/auth/signin/route.ts`, `app/api/admin/users/route.ts` |
| User account, by id | `user:id:{id}` | `StoredUser` | `app/api/auth/signup/route.ts` (write-only — nothing ever read this key; dropped, Postgres PK lookup by id covers it for free) |
| List of all user emails | `users:all` | `string[]` | `app/api/auth/signup/route.ts`, `app/api/admin/users/route.ts` |
| Shared/saved roast result | `result:{id}` (90-day TTL) | `SavedResult` (id, mode, result, savedAt, userId?) | `app/api/save/route.ts`, `app/r/[id]/page.tsx` |
| User's analysis history | `user:analyses:{userId}` | `AnalysisSummary[]` | `app/api/save/route.ts`, `app/dashboard/page.tsx` |
| Full cover letter | `coverletter:{id}` | `{id, letter, userId, savedAt}` | `app/api/cover-letter/route.ts` (write-only — nothing ever read this key back) |
| User's cover letter history | `user:coverletters:{userId}` | `CoverLetterSummary[]` | `app/api/cover-letter/route.ts`, `app/dashboard/page.tsx` |
| Ordered list of AI blog post slugs | `blog:posts:all` | `string[]` | `app/blog/page.tsx`, `app/admin/page.tsx`, `app/api/admin/posts/route.ts`, `app/api/admin/debug-kv/route.ts`, `app/api/cron/generate-post/route.ts` |
| AI-generated blog post | `blog:post:{slug}` | `Post` | same files as above, plus `app/blog/[slug]/page.tsx` |
| Site content overrides (admin-editable copy) | `site:content` | `SiteContent` (sparse, ~16 optional locale-string fields) | `app/page.tsx`, `app/builder/page.tsx`, `app/cover-letter/page.tsx`, `app/blog/page.tsx`, `app/api/admin/site-content/route.ts` |
| Daily visit total | `stats:visits:{date}` | `number` | `app/api/track/route.ts`, `app/api/admin/stats/route.ts` |
| Per-page daily visit count | `stats:page:{path}:{date}` | `number` | same two files |
| List of paths visited that day (index for the above) | `stats:pages-list:{date}` | `string[]` | same two files |
| Rate limiting | — | **did not exist** | n/a — new in this phase |

## Schema (`lib/db/schema.ts`) — table-by-table

- **`users`** — straightforward 1:1 migration of `user:email:*`. Email uniqueness is
  case-insensitive by convention (every call site normalizes `.toLowerCase()` before
  touching the table — see `lib/db/users.ts`), backed by a plain `UNIQUE` constraint.
  Dropped `user:id:*` (dead, write-only) and `users:all` (a `SELECT` replaces the
  hand-maintained list).
- **`shared_results`** — **consolidates** `result:{id}` and `user:analyses:{userId}`.
  The old "analysis summary" was just a subset of fields already in the full result
  JSON, so one table serves both the public `/r/[id]` page and the dashboard history
  (`WHERE user_id = ?`), instead of writing the same data to two KV keys that could
  drift out of sync. TTL is enforced at read time (expired rows are treated as
  not-found); there's no cleanup job yet, flagged as a known gap below.
- **`cover_letters`** — same consolidation as above, merging `coverletter:{id}` and
  `user:coverletters:{userId}`. `preview` is computed via SQL `left(letter, 120)` at
  query time instead of being stored a second time.
- **`blog_posts`** — merges `blog:posts:all` + `blog:post:{slug}`. Ordering and
  existence both come from normal SQL now, not a separately maintained slug list.
  The 3 static posts stay in `lib/posts.ts`, unchanged — KV never stored those either.
- **`site_settings`** — generalized to `key → jsonb` (today only `'site:content'` is
  used) so a future named settings blob doesn't need a migration.
- **`page_visits`** — one `(date, path)` row with an atomic counter via
  `ON CONFLICT ... DO UPDATE SET count = count + 1`, replacing all three
  `stats:*` key patterns. This incidentally fixes a race condition the old KV
  code had: `get` then `set(count+1)` is a read-modify-write that can lose
  increments under concurrent requests; Postgres's atomic increment can't.
- **`rate_limits`** — new table, fixed-window counter. See below.

## Rate limiting

Implemented, not deferred: `lib/rateLimit.ts` — a fixed-window counter in Postgres
(atomic upsert, same pattern as `page_visits`). Applied to:
- `POST /api/auth/signup` — keyed by normalized email, 5 attempts / 15 minutes
- `POST /api/auth/signin` — keyed by normalized email, 10 attempts / 15 minutes
  (higher than signup since a legitimate user mistyping their password a few times
  shouldn't get locked out; still bounds brute-force attempts against one account)

This is IP-blind (keyed by email only) — someone could still hammer many different
email addresses from one IP without being throttled. Good enough as a first pass
against credential-stuffing a known account; per-IP limiting would need Vercel's
request IP (available via `x-forwarded-for`) and is a reasonable follow-up, not done
here since "basic" was the bar asked for.

## Known gaps after this migration

- **No cleanup job for expired `shared_results`** — they stop being servable (read
  path treats past-`expiresAt` as 404) but the rows aren't deleted. Would need a
  cron route, similar to the existing blog-post-generation cron.
- **Rate limiting is email-keyed only**, not IP-keyed (see above).
- **No migration of old KV data** — there was none to migrate; the database has been
  unreachable, so nothing beyond what's described above could have been read out of
  it even if we wanted to preserve old accounts/posts/stats. Every user, saved
  result, and blog post created before this migration is unrecoverable.
