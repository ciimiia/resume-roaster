/**
 * Integration test against the real Neon DB — verifies ownership checks on
 * resumes/profile actually deny cross-user access, not just "looks right
 * in the code". Creates its own two throwaway users + one resume, runs the
 * checks, then deletes everything it created (even on failure).
 *
 * Run with:
 *   set -a; source .env.local; set +a; npx tsx scripts/test-ownership.ts
 */

import { getDb, schema } from '../lib/db'
import { createUser } from '../lib/db/users'
import { createResume, getResumeForUser, deleteResumeForUser, listResumesForUser } from '../lib/db/resumes'
import { saveProfileForUser, getProfileForUser } from '../lib/db/profiles'
import { eq } from 'drizzle-orm'

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
    userA = await createUser(`ownership-test-a-${stamp}@example.com`, 'not-a-real-hash')
    userB = await createUser(`ownership-test-b-${stamp}@example.com`, 'not-a-real-hash')

    const resume = await createResume(userA.id, {
      filePathname: `resumes/${userA.id}/test-${stamp}.pdf`, // no real blob written — DB-only test
      originalFilename: 'test.pdf',
      fileSize: 123,
      contentType: 'application/pdf',
    })

    check('owner can fetch their own resume', (await getResumeForUser(resume.id, userA.id)) !== null)
    check('a different user CANNOT fetch the resume by id', (await getResumeForUser(resume.id, userB.id)) === null)

    check('a different user\'s delete attempt does nothing (returns null)', (await deleteResumeForUser(resume.id, userB.id)) === null)
    check('resume still exists after the other user\'s failed delete attempt', (await getResumeForUser(resume.id, userA.id)) !== null)

    check('userB\'s resume list is empty (does not see userA\'s resume)', (await listResumesForUser(userB.id)).length === 0)
    check('userA\'s resume list contains exactly the one resume', (await listResumesForUser(userA.id)).length === 1)

    await saveProfileForUser(userA.id, { contact: { name: 'User A', links: [] }, summary: '', experience: [], education: [], skills: [], projects: [], languages: [], certifications: [] }, { approved: false })
    check('userA has a profile', (await getProfileForUser(userA.id)) !== null)
    check('userB has no profile (profiles are per-user, not shared)', (await getProfileForUser(userB.id)) === null)

    check('owner CAN delete their own resume', (await deleteResumeForUser(resume.id, userA.id)) !== null)
    check('resume is gone after owner deletes it', (await getResumeForUser(resume.id, userA.id)) === null)
  } finally {
    // Cleanup — always runs, even if a check above threw or failed, and
    // even if only one of the two users got created before a failure.
    if (userA) {
      await db.delete(schema.profiles).where(eq(schema.profiles.userId, userA.id))
      await db.delete(schema.resumes).where(eq(schema.resumes.userId, userA.id))
      await db.delete(schema.users).where(eq(schema.users.id, userA.id))
    }
    if (userB) {
      await db.delete(schema.users).where(eq(schema.users.id, userB.id))
    }
    console.log('\n(cleaned up test users/resume/profile)')
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`)
    process.exit(1)
  }
  console.log('\nAll checks passed')
}

main()
