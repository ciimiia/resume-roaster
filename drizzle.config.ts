import type { Config } from 'drizzle-kit'

// Read directly from process.env here, not lib/env.ts: drizzle-kit runs as a
// standalone CLI (via `npm run db:generate` / `db:migrate`), not inside
// Next.js, so it doesn't load .env.local the way Next does — drizzle-kit
// itself handles that via dotenv when `dbCredentials.url` is read at config
// time.
//
// `generate` (diff the schema, write migration SQL) needs no live DB and
// works today with no DATABASE_URL set. `migrate` / `studio` / `push` do
// need a real connection — if DATABASE_URL is missing, drizzle-kit itself
// will fail clearly on those with a message naming the problem.
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.warn(
    '[drizzle.config] DATABASE_URL is not set — `generate` will still work, ' +
    'but `migrate`/`studio`/`push` need it. Create the Neon database from the ' +
    'Vercel dashboard (Storage → Neon), then run `vercel env pull`.'
  )
}

export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl ?? 'postgresql://placeholder/placeholder' },
  strict: true,
  verbose: true,
} satisfies Config
