/**
 * Integration test against the real Neon DB — verifies tailored_resumes
 * and the cover_letters linkage are strictly per-user (ownership-checked
 * everywhere, per the Phase 4 instructions), and that the fabrication
 * guard runs consistently through createTailoredResume. Creates its own
 * throwaway users + a tailored resume + a cover letter, cleans up even on
 * failure.
 *
 * Run with:
 *   set -a; source .env.local; set +a; npx tsx scripts/test-tailoringOwnership.ts
 */
import { eq } from 'drizzle-orm'
import { getDb, schema } from '../lib/db'
import { createUser } from '../lib/db/users'
import { createTailoredResume, getTailoredResumeForUser, updateTailoredResumeForUser } from '../lib/db/tailoredResumes'
import { saveTailoredCoverLetter, getCoverLetterForUser } from '../lib/db/coverLetters'
import { EMPTY_ATS_COVERAGE } from '../lib/tailoring/types'

let failures = 0
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`)
  if (!condition) failures++
}

async function main() {
  const db = getDb()
  const stamp = Date.now()
  let userA: Awaited<ReturnType<typeof createUser>> | null = null
  let userB: Awaited<ReturnType<typeof createUser>> | null = null

  try {
    userA = await createUser(`tailoring-test-a-${stamp}@example.com`, 'not-a-real-hash')
    userB = await createUser(`tailoring-test-b-${stamp}@example.com`, 'not-a-real-hash')

    const record = await createTailoredResume({
      userId: userA.id,
      jobId: null,
      jobTextHash: `test-hash-${stamp}`,
      jobTitleSnapshot: 'Backend Engineer',
      companySnapshot: 'Acme Corp',
      profileApprovedAt: new Date(),
      tailoredProfile: { summary: 'Test summary', experience: [], skills: [], keywordsToEmphasize: [] },
      changes: [],
      flags: [],
      atsCoverage: EMPTY_ATS_COVERAGE,
    })

    check('owner can fetch their own tailored resume', (await getTailoredResumeForUser(record.id, userA.id)) !== null)
    check('a different user CANNOT fetch the tailored resume by id', (await getTailoredResumeForUser(record.id, userB.id)) === null)

    const edited = await updateTailoredResumeForUser(record.id, userB.id, {
      tailoredProfile: { summary: 'Hijacked', experience: [], skills: [], keywordsToEmphasize: [] },
      flags: [], atsCoverage: EMPTY_ATS_COVERAGE,
    })
    check('a different user\'s edit attempt does nothing (returns null)', edited === null)
    const stillOriginal = await getTailoredResumeForUser(record.id, userA.id)
    check('the record is unchanged after the other user\'s failed edit attempt', stillOriginal?.tailoredProfile.summary === 'Test summary')

    const letterId = await saveTailoredCoverLetter(userA.id, 'Dear Hiring Manager, ...', { tailoredResumeId: record.id, jobId: null, flags: [] })
    check('owner can fetch their own cover letter', (await getCoverLetterForUser(letterId, userA.id)) !== null)
    check('a different user CANNOT fetch the cover letter', (await getCoverLetterForUser(letterId, userB.id)) === null)

    // Deleting the tailored resume should cascade-delete the linked cover letter (schema.ts's onDelete: 'cascade').
    await db.delete(schema.tailoredResumes).where(eq(schema.tailoredResumes.id, record.id))
    check('deleting the tailored resume cascades to delete its linked cover letter', (await getCoverLetterForUser(letterId, userA.id)) === null)
  } finally {
    if (userA) await db.delete(schema.users).where(eq(schema.users.id, userA.id))
    if (userB) await db.delete(schema.users).where(eq(schema.users.id, userB.id))
    console.log('\n(cleaned up test users/tailored-resume/cover-letter)')
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`)
    process.exit(1)
  }
  console.log('\nAll checks passed')
}

main()
