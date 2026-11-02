/**
 * Candidate company boards for the Phase 2a seed — prioritizing
 * remote-friendly and EU-hiring companies. This list is NOT inserted
 * blindly: scripts/seedJobSources.ts fetches every one of these live and
 * only seeds the ones that actually return HTTP 200, exactly as required
 * ("verify each endpoint actually returns 200 before seeding; drop the
 * ones that do not"). Board tokens drift over time (companies migrate ATS,
 * rename boards) — treat this as a starting candidate pool, not a
 * guaranteed-correct list.
 */

export interface SeedCandidate {
  atsType: 'greenhouse' | 'lever' | 'ashby'
  boardToken: string
  companyName: string
}

export const SEED_CANDIDATES: SeedCandidate[] = [
  // ── Greenhouse ──
  { atsType: 'greenhouse', boardToken: 'stripe', companyName: 'Stripe' },
  { atsType: 'greenhouse', boardToken: 'airbnb', companyName: 'Airbnb' },
  { atsType: 'greenhouse', boardToken: 'coinbase', companyName: 'Coinbase' },
  { atsType: 'greenhouse', boardToken: 'doordash', companyName: 'DoorDash' },
  { atsType: 'greenhouse', boardToken: 'robinhood', companyName: 'Robinhood' },
  { atsType: 'greenhouse', boardToken: 'asana', companyName: 'Asana' },
  { atsType: 'greenhouse', boardToken: 'brex', companyName: 'Brex' },
  { atsType: 'greenhouse', boardToken: 'instacart', companyName: 'Instacart' },
  { atsType: 'greenhouse', boardToken: 'lyft', companyName: 'Lyft' },
  { atsType: 'greenhouse', boardToken: 'pinterest', companyName: 'Pinterest' },
  { atsType: 'greenhouse', boardToken: 'squarespace', companyName: 'Squarespace' },
  { atsType: 'greenhouse', boardToken: 'twilio', companyName: 'Twilio' },
  { atsType: 'greenhouse', boardToken: 'okta', companyName: 'Okta' },
  { atsType: 'greenhouse', boardToken: 'datadog', companyName: 'Datadog' },
  { atsType: 'greenhouse', boardToken: 'gitlab', companyName: 'GitLab' },
  { atsType: 'greenhouse', boardToken: 'elastic', companyName: 'Elastic' },
  { atsType: 'greenhouse', boardToken: 'hashicorp', companyName: 'HashiCorp' },
  { atsType: 'greenhouse', boardToken: 'mongodb', companyName: 'MongoDB' },
  { atsType: 'greenhouse', boardToken: 'confluent', companyName: 'Confluent' },
  { atsType: 'greenhouse', boardToken: 'databricks', companyName: 'Databricks' },
  { atsType: 'greenhouse', boardToken: 'reddit', companyName: 'Reddit' },
  { atsType: 'greenhouse', boardToken: 'affirm', companyName: 'Affirm' },
  { atsType: 'greenhouse', boardToken: 'carta', companyName: 'Carta' },
  { atsType: 'greenhouse', boardToken: 'flexport', companyName: 'Flexport' },
  { atsType: 'greenhouse', boardToken: 'remotecom', companyName: 'Remote' },
  { atsType: 'greenhouse', boardToken: 'deel', companyName: 'Deel' },
  { atsType: 'greenhouse', boardToken: 'automattic', companyName: 'Automattic' },
  { atsType: 'greenhouse', boardToken: 'canonical', companyName: 'Canonical' },
  { atsType: 'greenhouse', boardToken: 'grafanalabs', companyName: 'Grafana Labs' },
  { atsType: 'greenhouse', boardToken: 'sentry', companyName: 'Sentry' },
  { atsType: 'greenhouse', boardToken: 'twitch', companyName: 'Twitch' },
  { atsType: 'greenhouse', boardToken: 'discord', companyName: 'Discord' },
  { atsType: 'greenhouse', boardToken: 'samsara', companyName: 'Samsara' },
  { atsType: 'greenhouse', boardToken: 'rippling', companyName: 'Rippling' },
  { atsType: 'greenhouse', boardToken: 'benchling', companyName: 'Benchling' },

  // ── Lever ──
  { atsType: 'lever', boardToken: 'netlify', companyName: 'Netlify' },
  { atsType: 'lever', boardToken: 'eventbrite', companyName: 'Eventbrite' },
  { atsType: 'lever', boardToken: 'box', companyName: 'Box' },
  { atsType: 'lever', boardToken: 'palantir', companyName: 'Palantir' },
  { atsType: 'lever', boardToken: 'plaid', companyName: 'Plaid' },
  { atsType: 'lever', boardToken: 'framer', companyName: 'Framer' },
  { atsType: 'lever', boardToken: 'webflow', companyName: 'Webflow' },
  { atsType: 'lever', boardToken: 'medium', companyName: 'Medium' },
  { atsType: 'lever', boardToken: 'buildkite', companyName: 'Buildkite' },
  { atsType: 'lever', boardToken: 'clio', companyName: 'Clio' },
  { atsType: 'lever', boardToken: 'bigcommerce', companyName: 'BigCommerce' },
  { atsType: 'lever', boardToken: 'lucid', companyName: 'Lucid Software' },

  // ── Ashby ──
  { atsType: 'ashby', boardToken: 'linear', companyName: 'Linear' },
  { atsType: 'ashby', boardToken: 'vercel', companyName: 'Vercel' },
  { atsType: 'ashby', boardToken: 'ramp', companyName: 'Ramp' },
  { atsType: 'ashby', boardToken: 'retool', companyName: 'Retool' },
  { atsType: 'ashby', boardToken: 'mercury', companyName: 'Mercury' },
  { atsType: 'ashby', boardToken: 'clerk', companyName: 'Clerk' },
  { atsType: 'ashby', boardToken: 'replit', companyName: 'Replit' },
  { atsType: 'ashby', boardToken: 'posthog', companyName: 'PostHog' },
  { atsType: 'ashby', boardToken: 'cal', companyName: 'Cal.com' },
  { atsType: 'ashby', boardToken: 'supabase', companyName: 'Supabase' },
  { atsType: 'ashby', boardToken: 'temporal', companyName: 'Temporal' },
  { atsType: 'ashby', boardToken: 'warp', companyName: 'Warp' },
  { atsType: 'ashby', boardToken: 'tldraw', companyName: 'tldraw' },
  { atsType: 'ashby', boardToken: 'height', companyName: 'Height' },
]
