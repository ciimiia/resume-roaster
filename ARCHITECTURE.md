# Architecture

Living doc. Update it when the stack or data flow changes — don't let it drift.

## Stack

- **Framework**: Next.js 14 (App Router), TypeScript, React 18
- **Styling**: Tailwind (base/utilities only) + CSS custom properties in [app/globals.css](app/globals.css) as the design-token source, with inline `style` objects on components (no CSS modules / styled-components). Shared style helpers live in [lib/styles.ts](lib/styles.ts).
- **Hosting**: Vercel. Production: `https://resume-roaster-tan-six.vercel.app` (see `NEXT_PUBLIC_SITE_URL` below — the bare `resume-roaster.vercel.app` subdomain is **not** ours, it was never actually aliased to this project and is a different, unrelated site).
- **AI provider**: OpenRouter (`openrouter/free` routing slug), called directly via `fetch` from API routes. No SDK. `reasoning: { enabled: false }` is required on every call — some free models behind that slug otherwise spend the whole token budget on hidden chain-of-thought and return empty content.
- **Existing data store**: Upstash Redis (REST API) via a hand-rolled client, [lib/kv.ts](lib/kv.ts) — used for users, saved analyses, cover letters, blog posts, site content overrides, and visit stats. As of this writing the configured Upstash database is unreachable (dead host); `kv.ts` has a 1.5s timeout and `safeGet()` fallback so pages degrade instead of hanging/crashing.
- **New (Phase 0)**: Postgres via Neon, Drizzle ORM — see `lib/db/`. Not yet connected to any tables beyond the Phase 0 scaffold; existing features keep using KV until migrated in a later phase.
- **File storage (Phase 0)**: Vercel Blob, stubbed behind an interface — see `lib/storage.ts`. Not wired into any upload flow yet.
- **i18n**: EN/FA, no routing split — a single `LangContext` ([lib/LangContext.tsx](lib/LangContext.tsx)) holds `lang` in React state + localStorage, flips `document.dir`/`lang` and injects the Vazirmatn font for Farsi. Translation strings live in [lib/i18n.ts](lib/i18n.ts). Any new user-facing text must be added to both locales there.
- **Theming**: `data-theme` (roast/coach/intl accent) and `data-color-theme` (light/dark) attributes on `<html>`, driven by [lib/ThemeContext.tsx](lib/ThemeContext.tsx) and CSS variable overrides in `globals.css`.

## Routes

| Path | What |
|---|---|
| `/` | Landing + the roast flow (mode select → upload → analyze → results), client state machine in `components/App.tsx` |
| `/builder` | Standalone resume builder (form → print-to-PDF via browser print) |
| `/blog`, `/blog/[slug]` | Blog index + posts — 3 static posts in `lib/posts.ts`, plus AI-generated posts stored in KV |
| `/cover-letter` | Cover letter generator |
| `/r/[id]` | Public share page for a saved roast result |
| `/signin`, `/signup` | Email/password auth |
| `/dashboard` | Signed-in user's saved analyses + cover letters (protected by `middleware.ts`) |
| `/admin` | Internal only (gated by `ADMIN_EMAILS`) — blog post generation/deletion, site content overrides, visit stats, user list |
| `/api/*` | Route handlers — see below |

### API routes

- `POST /api/analyze` — resume PDF/text → AI scoring (OpenRouter), falls back to static canned data on any failure (missing key, API error, bad JSON)
- `POST /api/cover-letter` — resume + job description → AI cover letter
- `POST /api/save`, `GET` via `/r/[id]` page — save/share a roast result
- `POST /api/auth/{signup,signin,signout}`, `GET /api/auth/me` — session cookie auth
- `POST /api/track` — fire-and-forget page-view counter
- `/api/admin/*` — admin-gated: `posts` (delete), `generate-post` (proxy to cron with the real secret), `site-content` (CRUD), `stats`, `users`, `debug-kv`
- `GET /api/cron/generate-post` — Vercel Cron (`vercel.json`, daily 08:00 UTC), bearer-auth'd with `CRON_SECRET`, generates one AI blog post

## Auth

Custom, not a library. [lib/session.ts](lib/session.ts): HMAC-SHA256 signed session tokens via WebCrypto (works in both Node and Edge runtime), stored in an httpOnly cookie (`rr-session`, 7-day expiry). [lib/password.ts](lib/password.ts): passwords hashed with **argon2id** (Phase 0 — previously Node `scrypt`; argon2 needs the Node runtime, not Edge, same constraint as before). User records currently live in KV (`user:email:*`, `user:id:*`, `users:all`). `middleware.ts` protects `/dashboard` only; `/admin` does its own `ADMIN_EMAILS` check server-side.

No OAuth yet (deferred — see task list). Password reset not implemented yet (deferred).

## Env vars

See `.env.example` for the full annotated list. Validated centrally in [lib/env.ts](lib/env.ts) with zod — importing anything that needs an env var gets a clear error naming the missing var, instead of a vague runtime crash three layers down.

## Data flow (today)

```
Upload PDF ──► /api/analyze ──► OpenRouter (or static fallback) ──► client state ──► /api/save (optional) ──► KV
```

Nothing is persisted server-side unless the user explicitly shares/signs in. The core roast flow works with zero backend dependencies beyond the AI call (which itself falls back to static data if unavailable).

## Known constraints / gotchas

- Don't run `next build` while `next dev` is running against the same `.next` directory — it corrupts the dev server's incremental cache (seen firsthand; fix is `rm -rf .next` and restart dev).
- `lib/kv.ts` calls have a 1.5s timeout — don't raise it without a reason; a dead KV host previously caused every page that read from it to hang ~10s before failing.
- The `openrouter/free` model slug is non-deterministic about which underlying model it routes to; always pass `reasoning: { enabled: false }`.
- Windows dev environment: Git Bash / PowerShell, use `taskkill //F //PID <pid>` to stop a dev server bound to a port, not `kill`.
