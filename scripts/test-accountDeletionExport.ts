/**
 * Integration test against the real Neon DB — verifies full account
 * deletion (lib/db/users.ts's deleteUserAccount, used by
 * app/api/account/route.ts) actually cascades everywhere it should, and
 * that per-user data used by the "download my data" export
 * (app/api/account/export/route.ts) is ownership-scoped — one user's
 * export can never include another user's rows.
 *
 * Creates its own throwaway users + profile + tailored resume (which
 * cascades to a cover letter) + job preferences + a shared roast result,
 * cleans up even on failure (though the whole point of the first half of
 * this test is that deleteUserAccount itself IS the cleanup for userA).
 *
 * Run with:
 *   set -a; source .env.local; set +a; npx tsx scripts/test-accountDeletionExport.ts
 */
import { eq } from 'drizzle-orm'
import { getDb, schema } from '../lib/db'
import { createUser, deleteUserAccount, findUserById } from '../lib/db/users'
import { saveProfileForUser, getProfileForUser } from '../lib/db/profiles'
import { saveJobPreferencesForUser, getJobPreferencesForUser } from '../lib/db/jobPreferences'
import { createTailoredResume, getTailoredResumeForUser } from '../lib/db/tailoredResumes'
import { saveTailoredCoverLetter, getCoverLetterForUser } from '../lib/db/coverLetters'
import { saveResult, listResultsForUser } from '../lib/db/results'
import { EMPTY_ATS_COVERAGE } from '../lib/tailoring/types'
import { EMPTY_JOB_PREFERENCES } from '../lib/resumeProfile'

let failures = 0
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`)
  if (!condition) failures++
}

const EMPTY_PROFILE_INPUT = {
  contact: { name: 'Test User', links: [] }, summary: '', experience: [], education: [],
  skills: [], projects: [], languages: [], certifications: [],
}

async function main() {
  const db = getDb()
  const stamp = Date.now()
  let userA: Awaited<ReturnType<typeof createUser>> | null = null
  let userB: Awaited<ReturnType<typeof createUser>> | null = null
  let tailoredId: string | null = null
  let letterId: string | null = null
  let resultId: string | null = null

  try {
    userA = await createUser(`delete-test-a-${stamp}@example.com`, 'not-a-real-hash', { consentAcceptedAt: new Date() })
    userB = await createUser(`delete-test-b-${stamp}@example.com`, 'not-a-real-hash', { consentAcceptedAt: new Date() })

    await saveProfileForUser(userA.id, EMPTY_PROFILE_INPUT, { approved: true })
    await saveJobPreferencesForUser(userA.id, EMPTY_JOB_PREFERENCES)
    const tailored = await createTailoredResume({
      userId: userA.id, jobId: null, jobTextHash: `delete-test-${stamp}`,
      jobTitleSnapshot: 'Test Role', companySnapshot: null, profileApprovedAt: new Date(),
      tailoredProfile: { summary: 'x', experience: [], skills: [], keywordsToEmphasize: [] },
      changes: [], flags: [], atsCoverage: EMPTY_ATS_COVERAGE,
    })
    tailoredId = tailored.id
    letterId = await saveTailoredCoverLetter(userA.id, 'Dear Hiring Manager, ...', { tailoredResumeId: tailoredId, jobId: null, flags: [] })
    resultId = await saveResult('roast', { score: 80, grade: 'B+', verdict: 'ok', summary: 'ok', sections: [], wins: [], fixes: [], flags: [] }, userA.id)

    // --- export is ownership-scoped: userB's own queries never see userA's rows ---
    check('userB sees no profile (none created for them)', (await getProfileForUser(userB.id)) === null)
    check('userB sees no job preferences', (await getJobPreferencesForUser(userB.id)) === null)
    check('userB cannot fetch userA\'s tailored resume by id', (await getTailoredResumeForUser(tailoredId, userB.id)) === null)
    check('userB cannot fetch userA\'s cover letter by id', (await getCoverLetterForUser(letterId, userB.id)) === null)
    check('userB\'s own result list is empty (does not include userA\'s)', (await listResultsForUser(userB.id)).length === 0)

    // --- userA's own data is all actually present before deletion (sanity check the test built a real fixture) ---
    check('userA has a profile before deletion', (await getProfileForUser(userA.id)) !== null)
    check('userA has the tailored resume before deletion', (await getTailoredResumeForUser(tailoredId, userA.id)) !== null)
    check('userA has the cover letter before deletion', (await getCoverLetterForUser(letterId, userA.id)) !== null)

    // --- full account deletion cascades everywhere ---
    await deleteUserAccount(userA.id)

    check('user row itself is gone', (await findUserById(userA.id)) === null)
    check('profile cascaded away', (await getProfileForUser(userA.id)) === null)
    check('job preferences cascaded away', (await getJobPreferencesForUser(userA.id)) === null)
    check('tailored resume cascaded away', (await getTailoredResumeForUser(tailoredId, userA.id)) === null)
    check('linked cover letter cascaded away (tailored_resume_id FK)', (await getCoverLetterForUser(letterId, userA.id)) === null)
    check('shared roast result cascaded away', (await listResultsForUser(userA.id)).length === 0)

    // --- userB entirely unaffected by userA's deletion ---
    check('userB account still exists after userA\'s deletion', (await findUserById(userB.id)) !== null)
  } finally {
    // userA's rows are already gone via deleteUserAccount (the thing
    // under test) — only userB (and anything that survived a failed
    // assertion for userA) needs explicit cleanup.
    if (userA) {
      if (tailoredId) await db.delete(schema.tailoredResumes).where(eq(schema.tailoredResumes.id, tailoredId))
      await db.delete(schema.users).where(eq(schema.users.id, userA.id)).catch(() => {})
    }
    if (userB) await db.delete(schema.users).where(eq(schema.users.id, userB.id))
    console.log('\n(cleaned up test users/profile/tailored-resume/cover-letter/result)')
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`)
    process.exit(1)
  }
  console.log('\nAll checks passed')
}

main()
