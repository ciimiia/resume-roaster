/**
 * Unit tests for the anti-fabrication guard (lib/tailoring/guard.ts) —
 * the deterministic, non-LLM check that enforces "tailoring may only
 * reword/reorder/emphasize/trim facts already in the approved profile,
 * never invent anything." Adversarial cases: each one plants exactly one
 * kind of fabrication in an otherwise-valid tailored output and checks
 * the guard catches it, plus a clean baseline that should produce zero
 * flags, and the skill-sanitization behavior.
 *
 * Run with: tsx scripts/test-tailoringGuard.ts
 */
import { runFabricationGuard, runFabricationGuardOnText, sanitizeTailoredProfile } from '../lib/tailoring/guard'
import type { ParsedProfile } from '../lib/resumeProfile'
import type { TailoredProfile } from '../lib/tailoring/types'

let failures = 0
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`)
  if (!condition) failures++
}

const SOURCE_PROFILE: ParsedProfile = {
  contact: { name: 'Jordan Rivera', email: 'jordan@example.com', links: [] },
  summary: 'Senior backend engineer with 7 years building distributed systems in 2021.',
  experience: [
    {
      company: 'Acme Corp', title: 'Senior Backend Engineer', location: 'Remote',
      startDate: '2021', endDate: 'present', current: true,
      bullets: [
        'Built a Postgres-backed event pipeline processing 50M events/day',
        'Led migration from a monolith to microservices on Kubernetes',
      ],
    },
  ],
  education: [{ school: 'State University', degree: 'B.Sc.', field: 'Computer Science', startDate: '2012', endDate: '2016' }],
  skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Kubernetes'],
  projects: [],
  languages: [],
  certifications: [{ name: 'AWS Certified Solutions Architect', issuer: 'AWS', date: '2022' }],
}

function baseTailored(overrides: Partial<TailoredProfile> = {}): TailoredProfile {
  return {
    summary: 'Senior backend engineer focused on distributed systems and event pipelines.',
    experience: [
      {
        company: 'Acme Corp', title: 'Senior Backend Engineer',
        bullets: [
          'Architected a Postgres-backed event pipeline handling 50M events/day',
          'Drove the migration from a monolith to Kubernetes-based microservices',
        ],
      },
    ],
    skills: ['Node.js', 'Kubernetes', 'PostgreSQL', 'TypeScript'],
    keywordsToEmphasize: ['distributed systems', 'Kubernetes'],
    ...overrides,
  }
}

// --- clean case: reworded, reordered, nothing new — zero flags ---
check('a clean reword/reorder produces zero flags', runFabricationGuard(SOURCE_PROFILE, baseTailored()).length === 0)

// --- adversarial: fabricated employer ---
{
  const tailored = baseTailored({ experience: [{ ...baseTailored().experience[0], company: 'Globex Corporation' }] })
  const flags = runFabricationGuard(SOURCE_PROFILE, tailored)
  check('fabricated employer is flagged', flags.some(f => f.category === 'employer'))
}

// --- adversarial: fabricated title ---
{
  const tailored = baseTailored({ experience: [{ ...baseTailored().experience[0], title: 'VP of Engineering' }] })
  const flags = runFabricationGuard(SOURCE_PROFILE, tailored)
  check('fabricated title is flagged', flags.some(f => f.category === 'title'))
}

// --- adversarial: fabricated metric not present anywhere in source ---
{
  const tailored = baseTailored()
  tailored.experience[0].bullets[0] = 'Architected a pipeline handling 200M events/day' // source says 50M, not 200M
  const flags = runFabricationGuard(SOURCE_PROFILE, tailored)
  check('a fabricated number not present anywhere in the source is flagged as a metric', flags.some(f => f.category === 'metric' && f.value.includes('200')))
}

// --- adversarial: a number that DOES appear in source (just moved) is NOT flagged ---
{
  const tailored = baseTailored()
  tailored.summary = 'Senior engineer who processed 50M events/day at scale.' // 50M is real, just moved into summary
  const flags = runFabricationGuard(SOURCE_PROFILE, tailored)
  check('a real number merely relocated to a different section is NOT flagged', !flags.some(f => f.category === 'metric'))
}

// --- adversarial: fabricated date/year not in source ---
{
  const tailored = baseTailored()
  tailored.summary = 'Engineer with experience since 2015 in distributed systems.' // source only has 2021/2012/2016/2022
  const flags = runFabricationGuard(SOURCE_PROFILE, tailored)
  check('a fabricated year not present anywhere in the source is flagged as a date', flags.some(f => f.category === 'date' && f.value === '2015'))
}

// --- adversarial: fabricated degree claim ---
{
  const tailored = baseTailored()
  tailored.summary = 'Engineer holding an MBA and deep distributed-systems expertise.' // source has B.Sc. CS only
  const flags = runFabricationGuard(SOURCE_PROFILE, tailored)
  check('a fabricated degree reference not backed by source education is flagged', flags.some(f => f.category === 'degree'))
}

// --- adversarial: fabricated certification claim ---
{
  const tailored = baseTailored()
  tailored.summary = 'PMP certified engineer with a track record of delivery.' // source cert is AWS, not PMP
  const flags = runFabricationGuard(SOURCE_PROFILE, tailored)
  check('a fabricated certification reference not backed by source certifications is flagged', flags.some(f => f.category === 'certification'))
}

// --- adversarial: fabricated skill ---
{
  const tailored = baseTailored({ skills: [...baseTailored().skills, 'Rust'] })
  const flags = runFabricationGuard(SOURCE_PROFILE, tailored)
  check('a skill not in the source profile is flagged', flags.some(f => f.category === 'skill' && f.value === 'Rust'))
}

// --- sanitizeTailoredProfile: fabricated skills are auto-removed, nothing else is altered ---
{
  const tailored = baseTailored({ skills: [...baseTailored().skills, 'Rust'] })
  const flags = runFabricationGuard(SOURCE_PROFILE, tailored)
  const sanitized = sanitizeTailoredProfile(tailored, flags)
  check('sanitizeTailoredProfile removes the fabricated skill', !sanitized.skills.includes('Rust'))
  check('sanitizeTailoredProfile keeps all real skills', ['Node.js', 'Kubernetes', 'PostgreSQL', 'TypeScript'].every(s => sanitized.skills.includes(s)))
  check('sanitizeTailoredProfile does not touch experience/summary', sanitized.summary === tailored.summary && sanitized.experience[0].bullets[0] === tailored.experience[0].bullets[0])
}

// --- prompt-injection in the job text has no bearing on the guard at all —
// the guard only ever looks at the (already-produced) tailored output vs.
// the source profile, so an injection attempt embedded in job text earlier
// in the pipeline can't suppress or bypass these checks. ---
{
  const tailored = baseTailored({ skills: [...baseTailored().skills, 'Fabricated-Skill-From-Injection'] })
  const flags = runFabricationGuard(SOURCE_PROFILE, tailored)
  check('a fabricated skill is flagged regardless of where/why it was introduced', flags.some(f => f.value === 'Fabricated-Skill-From-Injection'))
}

// --- cover letter prose guard (runFabricationGuardOnText) ---
check('a clean cover letter sentence (using a real number) produces zero flags',
  runFabricationGuardOnText(SOURCE_PROFILE, 'I processed 50M events/day at Acme Corp.').length === 0)
check('a cover letter inventing a number not in the source is flagged',
  runFabricationGuardOnText(SOURCE_PROFILE, 'I processed 500M events/day.').some(f => f.category === 'metric'))
check('a cover letter inventing a certification not in the source is flagged',
  runFabricationGuardOnText(SOURCE_PROFILE, 'As a Six Sigma certified professional, I deliver results.').some(f => f.category === 'certification'))

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll checks passed')
