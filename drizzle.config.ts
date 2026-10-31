import type { Config } from 'drizzle-kit'
import { config as loadEnv } from 'dotenv'

// drizzle-kit runs as a standalone CLI (via `npm run db:generate` /
// `db:migrate`), not inside Next.js, so it does NOT load .env.local the way
// Next does on its own — load it explicitly here, or DATABASE_URL silently
// reads as undefined even when .env.local has it (learned this the hard
// way: `migrate` hung forever trying to connect to a placeholder URL
// instead of failing loudly, because the warning below printed but nothing
// stopped the command).
loadEnv({ path: '.env.local' })

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
