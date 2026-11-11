# Architecture

Living doc. Update it when the stack or data flow changes — don't let it drift.

## Stack

- **Framework**: Next.js 15.5 (App Router), TypeScript, React 19.
- **Styling**: Tailwind (base/utilities only) + CSS custom properties in [app/globals.css](app/globals.css) as the design-token source, with inline `style` objects on components (no CSS modules / styled-components). Shared style helpers live in [lib/styles.ts](lib/styles.ts).
- **Hosting**: Vercel. Production domain is set via `NEXT_PUBLIC_SITE_URL` in the Vercel dashboard — current value as of this writing is `https://resume-roaster-tan-six.vercel.app` (see `.env.example`); never hardcoded in code, always read through `env.siteUrl`.
- **AI provider**: OpenRouter, called directly via `fetch` from API routes/lib modules. No SDK. Every call that touches personal or scraped-third-party text passes `provider: { data_collection: "deny" }` (routes only to providers that don't retain/train on the prompt — requires a paid model, see `OPENROUTER_MODEL`/`EMBEDDING_MODEL`/`RERANK_MODEL`/`TAILOR_MODEL`/`TAILOR_COVER_LETTER_MODEL` below) and `reasoning: { enabled: false }` (some models otherwise burn the whole token budget on hidden chain-of-thought and return empty content). Four distinct uses: chat completions (resume parsing, roast analysis, cover letters, job re-rank, resume tailoring — `lib/resumeParsing.ts`, `app/api/analyze/route.ts`, `lib/matching/rerank.ts`, `lib/tailoring/tailor.ts`/`coverLetter.ts`), and embeddings (`lib/embeddings.ts`, confirmed the embeddings endpoint accepts the same `data_collection: deny` provider-routing field as chat completions).
- **PDF generation**: headless Chromium via `puppeteer-core` + `@sparticuz/chromium` (serverless-packaged Chromium binary) — `lib/tailoring/pdf/render.ts`. Chosen over a pure-JS PDF library (pdf-lib/pdfkit) specifically for Persian: real browser text shaping is the only practical way to get correct Arabic-script joining/bidi without writing a shaping engine from scratch. Fonts are embedded as base64 (`lib/tailoring/pdf/fonts.ts`, reading from `public/fonts/` — Vazirmatn, split by Unicode subset the same way Google Fonts/Fontsource serve it) rather than loaded over the network, so rendering can't fail on an internal network hiccup. Known limitation: PDF text-layer extraction order for Persian (copy-paste, `pdf-parse`) doesn't always come out in logical reading order — a known class of issue with RTL text in PDF content streams generally, not specific to this renderer; visual shaping/joining is correct (verified directly), extraction order is not guaranteed.
- **Data store**: Postgres via Neon, Drizzle ORM — see `lib/db/schema.ts` for all tables, one module per domain under `lib/db/`. Replaced Upstash Redis/KV in Phase 1a after that database went permanently unreachable — see `PHASE_1_KV_AUDIT.md`. `pgvector` extension enabled in Phase 2b for job/profile embedding columns (`vector(1536)`, matching `openai/text-embedding-3-small`'s output size).
- **File storage**: Vercel Blob — resumes (PDF/DOCX) uploaded by signed-in users, see `lib/storage.ts` and `app/api/resumes/route.ts`.
- **Rate limiting**: `lib/rateLimit.ts` — fixed-window counter in Postgres (`rateLimits` table). Applied to signup/signin, resume upload/retry-parse, `/api/jobs`, `/api/jobs/matches`, and (separately, as a daily cap rather than a short window) the per-user LLM re-rank budget in `lib/matching/getMatches.ts`.
- **i18n**: EN/FA, no routing split — a single `LangContext` ([lib/LangContext.tsx](lib/LangContext.tsx)) holds `lang` in React state + localStorage, flips `document.dir`/`lang` and injects the Vazirmatn font for Farsi. Translation strings live in [lib/i18n.ts](lib/i18n.ts). Any new user-facing text must be added to both locales there.
- **Theming**: `data-theme` (roast/coach/intl accent) and `data-color-theme` (light/dark) attributes on `<html>`, driven by [lib/ThemeContext.tsx](lib/ThemeContext.tsx) and CSS variable overrides in `globals.css`.

## Routes

| Path | What |
|---|---|
| `/` | Landing + the roast flow (mode select → upload → analyze → results), client state machine in `components/App.tsx` |
| `/builder` | Standalone resume builder (form → print-to-PDF via browser print) |
| `/blog`, `/blog/[slug]` | Blog index + posts — 3 static posts in `lib/posts.ts`, plus AI-generated posts in Postgres (`blog_posts` table) |
| `/cover-letter` | Cover letter generator |
| `/r/[id]` | Public share page for a saved roast result |
| `/signin`, `/signup` | Email/password auth |
| `/dashboard` | Signed-in user's saved analyses + cover letters (protected by `middleware.ts`) |
| `/profile` | Resume upload (PDF/DOCX) → LLM-parsed structured profile → review/edit → approve, plus job preferences form and "delete my data" (Phase 1b) |
| `/jobs` | Matched job feed, ranked against the user's approved profile — filters, "why this matches" panel, save/hide (Phase 2b). Guides to `/profile` if no approved profile yet. |
| `/admin` | Internal only (gated by `ADMIN_EMAILS`) — blog post generation/deletion, site content overrides, visit stats, user list, job-source monitoring + blocked-companies management |
| `/api/*` | Route handlers — see below |

### API routes

- `POST /api/analyze` — resume PDF/text → AI scoring (OpenRouter), falls back to static canned data on any failure (missing key, API error, bad JSON)
- `POST /api/cover-letter` — resume + job description → AI cover letter
- `POST /api/save`, `GET` via `/r/[id]` page — save/share a roast result
- `POST /api/auth/{signup,signin,signout}`, `GET /api/auth/me` — session cookie auth
- `POST /api/track` — fire-and-forget page-view counter
- `/api/admin/*` — admin-gated: `posts` (delete), `generate-post` (proxy to cron with the real secret), `site-content` (CRUD), `stats`, `users`, `job-sources` (GET list + manual ingestion trigger + PATCH enable/disable a board), `jobs` (DELETE purge by company/source), `blocked-companies` (GET/POST/DELETE — blocking also purges that company's existing jobs)
- `GET /api/cron/generate-post` — Vercel Cron (`vercel.json`, daily 08:00 UTC), bearer-auth'd with `CRON_SECRET`, generates one AI blog post

**Phase 1b — candidate profile:**
- `POST /api/resumes`, `GET /api/resumes/[id]/file`, `DELETE /api/resumes/[id]`, `POST /api/resumes/[id]/retry-parse` — resume upload (Blob storage) + text extraction (pdf-parse/pdfjs-dist, mammoth for DOCX) + LLM structured parsing (`lib/resumeParsing.ts`)
- `GET/PUT /api/profile` — the parsed structured profile; `PUT` with `approved: true` is the single place that (a) bumps `profiles.approvedAt` — the "profile version" job matching caches/invalidates against — and (b) re-embeds the profile (Phase 2b, best-effort, doesn't fail the approval if the embedding call fails)
- `GET/PUT /api/job-preferences` — target titles/seniority/locations/remote type/countries/salary/visa/languages/excluded companies
- `DELETE /api/account/data` — deletes all of a user's resumes, profile, and preferences
- `GET /api/stats` — real server-side landing-page counter (`page_visits` table)

**Phase 2a — job ingestion** (see `lib/jobIngestion/` — adapter interface, sanitizer, runner — and the Phase 2a report for full ToS findings per provider):
- `GET /api/jobs` — authenticated, rate-limited text search (`to_tsvector`/`plainto_tsquery`, query-time, no stored index — fine at current scale) over active jobs, with `remote`/`country`/pagination filters
- `GET /api/cron/ingest-jobs` — Vercel Cron (daily 02:00 UTC), bearer-auth'd with `CRON_SECRET`. Bounded-batch (oldest-fetched-first, time-budgeted, per-source error isolation + exponential backoff for transient failures) so one run never risks the serverless timeout; a full catalog refresh happens gradually across ticks. As of Phase 2b this same invocation also runs the job-embedding pass (see below) — Vercel's Hobby plan caps a project at 2 cron jobs, and this project's 2 slots are already `generate-post` + `ingest-jobs`, so embedding was folded in rather than given its own cron.
- Adapters: Greenhouse, Lever, Ashby (seeded, public board endpoints, no documented ToS conflict for aggregation), Adzuna (optional, gated on `ADZUNA_APP_ID`/`ADZUNA_APP_KEY`, free key is evaluation-only — commercial use needs a paid Adzuna licence agreement), Remotive and Arbeitnow (built + tested, **not seeded** — their terms plausibly forbid this exact aggregator use case; see the adapter file header comments and the Phase 2a report before ever enabling either).
- `job_sources` seed candidates/verification: `scripts/seedJobSources.ts` (`npm run seed:jobSources`) — live-verifies each candidate board returns HTTP 200 before inserting, drops the rest.

**Phase 2b — job matching** (see `lib/matching/` and `lib/embeddings.ts`):
- `GET /api/jobs/matches` — authenticated, rate-limited. Hard filters (remote type, country substring, language, seniority inferred from title, excluded + blocked companies, hidden jobs) → pgvector cosine-similarity top-40 → LLM re-rank of up to 15 per request (zod-validated `{matchScore, strengths, gaps, missingKeywords, recommendation}`), cached per `(userId, jobId)` and invalidated the instant the cached row's profile version doesn't match the user's current `profiles.approvedAt`. Capped at 30 re-rank calls/user/day (`lib/matching/getMatches.ts`'s `RERANK_DAILY_CAP`) — when capped, only already-cached scores are returned, nothing is shown with a fake score.
- `POST/DELETE /api/jobs/[id]/save`, `POST/DELETE /api/jobs/[id]/hide` — per-user, ownership-scoped by construction (`saved_jobs`/`hidden_jobs` tables keyed on `(userId, jobId)`)
- Job embedding runs inside `/api/cron/ingest-jobs` (see above), only for jobs whose `content_hash` changed since last embed (`jobs.embeddingContentHash`) — bounded by its own time budget/item cap so a large backlog clears gradually across ticks rather than in one run.
- Profile embedding runs inline in `PUT /api/profile` on every approval/re-approval.
- `blocked_companies` table: admin-wide, respected by the ingestion runner (dropped before ever reaching the DB) and by match retrieval (excluded even if already ingested before being blocked — blocking purges existing rows for that company too).

**Phase 4 — tailoring** (see `lib/tailoring/`, `/jobs/tailor`):
- `POST /api/tailor` — authenticated, requires an approved profile, rate-limited (per-minute + per-day, `lib/tailoring/caps.ts`). Body is `{ jobId }` (a job already in our DB) or `{ jobText }` (pasted, sanitized via the same HTML stripper as job ingestion) — never an arbitrary URL. Tailoring may only reword/reorder/emphasize/trim facts already in the approved profile; the LLM's structured output (`lib/tailoring/types.ts`, zod-validated) is never trusted on its own — the deterministic anti-fabrication guard (`lib/tailoring/guard.ts`, no LLM involved) is the actual enforcement, checking every employer/title/skill/metric/date/degree/certification against the source profile. Fabricated skills are auto-removed; everything else is flagged and surfaced, never silently accepted. ATS keyword coverage (`lib/tailoring/ats.ts`) runs alongside, same deterministic approach.
- `GET /api/tailor`, `GET/PUT /api/tailor/[id]` — list/fetch/edit (an edit re-runs the guard against the current approved profile before saving, so an edit can't be used to slip a fabrication past it), all ownership-checked.
- `POST /api/tailor/[id]/cover-letter` — grounded in the tailored resume + job description only, same guard pattern (`lib/tailoring/guard.ts`'s `runFabricationGuardOnText`, a weaker prose-only check — see the Phase 4 report's known gaps), rate-limited separately.
- `GET /api/tailor/[id]/pdf`, `GET /api/cover-letter/[id]/pdf` — PDF export, see the PDF generation stack note above.
- `tailored_resumes` table (+ `cover_letters.tailoredResumeId`/`jobId` linkage) — included in `DELETE /api/account/data`.

**Launch-readiness** (see `lib/passwordReset.ts`, `lib/email.ts`, `lib/legalContent.ts`, `/privacy`, `/terms`):
- `DELETE /api/account` — full account deletion: every table with a `userId` FK to `users.id` cascades (confirmed by grepping every `onDelete: 'cascade'` in `lib/db/schema.ts`); Vercel Blob files and `rate_limits` rows (not FK-linked) are deleted explicitly first. Distinct from the narrower `DELETE /api/account/data` (candidate-profile data only, Phase 1b).
- `GET /api/account/export` — "download my data", a JSON export of everything stored about the signed-in user (resume file bytes aren't embedded — already downloadable individually via `GET /api/resumes/[id]/file`).
- `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `GET /api/auth/password-reset-status` — password reset. Single-use, expiring (1hr), sha256-hashed tokens (`password_reset_tokens` table). No user enumeration: `forgot-password` always returns the same `{ok: true}` shape regardless of whether the email matches an account. Behind `RESEND_API_KEY` (`lib/email.ts`'s `EmailProvider` interface, Resend chosen for its no-credit-card free tier) — when unset, the whole feature is hidden (`password-reset-status` reports `enabled: false`, the API routes 404), not shown broken.
- `DELETE /api/save/[id]` — lets the owner delete a shared roast result link. Shared result pages (`/r/[id]`) were checked and confirmed to never expose contact info (the stored `AnalysisResult` JSON has no contact/PII fields at all).
- `users.consentAcceptedAt` — set at signup when the required Privacy Policy/Terms checkbox is accepted; an auditable "when did they consent" record.
- `/privacy`, `/terms` — ⚠️ drafted from what the product actually does, **not legal advice**; a lawyer must review both before launch (banner rendered on both pages, repeated in `lib/legalContent.ts`'s top comment).
- Cookies/analytics: no third-party analytics or tracking cookies anywhere in this app (checked — confirmed clean). Only `rr-session` (httpOnly, essential) and two `localStorage` keys (`rr-lang`, `rr-theme`, never sent to the server) — no cookie-consent banner added since nothing here requires one.
- Security headers (`next.config.mjs`'s `headers()`): CSP, HSTS, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`. `style-src`/`script-src` need `'unsafe-inline'` — this app uses React inline `style={{}}` everywhere (not CSS modules) and Next ships a small inline bootstrap script; removing either would break the UI, not harden it.
- Every POST route takes an explicit body-size cap (`lib/requestSize.ts`) rather than relying only on Vercel's platform-level request limit, and every route that calls a paid AI model, sends email, or launches Chromium is rate-limited (including two pre-existing gaps closed here: the legacy `/api/cover-letter` had no rate limit or `data_collection: deny` at all, and `/api/profile`'s approval-triggered embedding call had no cap).

## Auth

Custom, not a library. Stateless — sessions are never looked up server-side, so there's no sessions table. [lib/session.ts](lib/session.ts): HMAC-SHA256 signed session tokens via WebCrypto (works in both Node and Edge runtime), stored in an httpOnly cookie (`rr-session`, 7-day expiry) — the signature alone is what's trusted, the payload (`userId`, `email`, `exp`) just travels inside it. [lib/password.ts](lib/password.ts): passwords hashed with **argon2id** via `@node-rs/argon2` (needs the Node runtime, not Edge; the `argon2` package was tried first and failed to build natively on Vercel — see git history on `lib/password.ts` / `next.config.mjs` if that comes up again). User records live in Postgres (`users` table, `lib/db/users.ts`) — email uniqueness is case-insensitive by convention (always `.toLowerCase()`'d before touching the table), not a DB-level citext constraint. Basic rate limiting on signup/signin via `lib/rateLimit.ts`. `middleware.ts` protects `/dashboard` and `/profile` only; `/admin`, `/jobs`, and the Phase 1b/2a/2b API routes do their own session/`ADMIN_EMAILS` checks server-side instead of relying on the middleware matcher.

No OAuth yet (deferred — see task list). Password reset not implemented yet (deferred).

## Env vars

See `.env.example` for the full annotated list. Validated centrally in [lib/env.ts](lib/env.ts) with zod — importing anything that needs an env var gets a clear error naming the missing var, instead of a vague runtime crash three layers down.

## Data flow (today)

```
Resume upload ──► text extraction ──► OpenRouter parse ──► review/approve ──► profiles (+ embedding)
                                                                                    │
Job ingestion (cron) ──► adapters ──► sanitize ──► jobs (+ embedding, same cron) ◄──┘
                                                         │
                                        hard filters + pgvector retrieval
                                                         │
                                              OpenRouter re-rank (cached)
                                                         │
                                                      /jobs feed
```

The original roast flow is unchanged and still works with zero backend dependencies beyond the AI call (which itself falls back to static data if unavailable):

```
Upload PDF ──► /api/analyze ──► OpenRouter (or static fallback) ──► client state ──► /api/save (optional) ──► Postgres
```

## Known constraints / gotchas

- Don't run `next build` while `next dev` is running against the same `.next` directory — it corrupts the dev server's incremental cache (seen firsthand; fix is `rm -rf .next` and restart dev).
- No cleanup job for expired `shared_results` or stale `rate_limits` rows — both tables grow unbounded for now (see `PHASE_1_KV_AUDIT.md` "Known gaps").
- Windows dev environment: Git Bash / PowerShell, use `taskkill //F //PID <pid>` to stop a dev server bound to a port, not `kill`.
- `pdf-parse`/`pdfjs-dist` and `@node-rs/argon2` must stay in `serverExternalPackages` (`next.config.mjs`) — webpack bundling either one breaks native-binary resolution or the worker-file dynamic import at runtime on Vercel specifically (doesn't reproduce in a local build).
- No stored/indexed `tsvector` column for `/api/jobs`'s full-text search, and no HNSW/IVFFlat index on the `vector` embedding columns yet — both are query-time only. Fine at the current (dozens of companies, low thousands of jobs) scale; revisit if either table grows past a few tens of thousands of rows.
- Vercel's Hobby plan caps a project at 2 cron jobs, each at most once/day — this project's 2 slots are `generate-post` and `ingest-jobs` (which also runs job embedding). Confirm your actual plan tier before adding a 3rd cron or tightening either schedule.
