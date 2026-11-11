import { getDb, schema } from './index'

export async function createUniversityInterestSignup(input: {
  email: string
  countries: string[]
  level: string | null
  field: string | null
}) {
  const db = getDb()
  const [row] = await db.insert(schema.universityInterestSignups).values({
    email: input.email.toLowerCase(),
    consentAcceptedAt: new Date(),
    countries: input.countries,
    level: input.level,
    field: input.field,
  }).returning()
  return row
}
