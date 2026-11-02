/**
 * Unit tests for the in-app (non-SQL) matching filter: seniority inference
 * from a job title (lib/matching/seniority.ts) and the inclusive filtering
 * behavior around it (lib/matching/filters.ts) — an unclassifiable title
 * must pass through rather than being excluded. The SQL-side hard filters
 * (remote type, country, language, excluded companies, hidden jobs) live
 * in lib/matching/retrieve.ts and are covered by the real-DB integration
 * test scripts/test-matchingRetrieve.ts instead, since they need a live
 * query to verify.
 */
import { inferSeniorityFromTitle } from '../lib/matching/seniority'
import { filterBySeniority } from '../lib/matching/filters'

let failures = 0
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`)
  if (!condition) failures++
}

check('"Senior Backend Engineer" infers senior', inferSeniorityFromTitle('Senior Backend Engineer') === 'senior')
check('"Jr. Frontend Developer" infers junior', inferSeniorityFromTitle('Jr. Frontend Developer') === 'junior')
check('"Engineering Intern" infers intern', inferSeniorityFromTitle('Engineering Intern') === 'intern')
check('"VP of Engineering" infers executive', inferSeniorityFromTitle('VP of Engineering') === 'executive')
check('"Staff Software Engineer" (no keyword match) infers null, not a wrong guess', inferSeniorityFromTitle('Staff Software Engineer') === null)
check('"Software Engineer" (no level in title) infers null', inferSeniorityFromTitle('Software Engineer') === null)

const jobs = [
  { title: 'Senior Backend Engineer' },
  { title: 'Junior Backend Engineer' },
  { title: 'Staff Software Engineer' }, // unclassifiable — should pass through
  { title: 'VP of Engineering' },
]

const seniorOnly = filterBySeniority(jobs, 'senior')
check('seniority filter keeps the matching title', seniorOnly.some(j => j.title === 'Senior Backend Engineer'))
check('seniority filter drops a clearly different level (junior)', !seniorOnly.some(j => j.title === 'Junior Backend Engineer'))
check('seniority filter drops a clearly different level (executive)', !seniorOnly.some(j => j.title === 'VP of Engineering'))
check('seniority filter keeps an unclassifiable title rather than excluding it', seniorOnly.some(j => j.title === 'Staff Software Engineer'))

check('no seniority preference set — filter is a no-op', filterBySeniority(jobs, undefined).length === jobs.length)

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll checks passed')
