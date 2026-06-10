import type { ModeConfig, ModeId, AnalysisResult } from './types'

export const MODES: Record<ModeId, ModeConfig> = {
  roast: {
    id: 'roast',
    glyph: '🔥',
    name: 'Roast Mode',
    tagline: 'Brutal. Funny. Honest.',
    blurb: 'No mercy, no corporate fluff. We say what your friends are too polite to.',
    accent: '#FF4D4D',
    accent2: '#FF8A3D',
    cta: 'Roast me',
    sample: '"Your resume called. It\'s embarrassed."',
  },
  coach: {
    id: 'coach',
    glyph: '🎯',
    name: 'Coach Mode',
    tagline: 'Professional. Constructive.',
    blurb: 'A senior recruiter\'s read-through — sharp, specific, and on your side.',
    accent: '#4D9FFF',
    accent2: '#7C7CFF',
    cta: 'Coach me',
    sample: '"Strong base. Here\'s how to make it undeniable."',
  },
  intl: {
    id: 'intl',
    glyph: '🌍',
    name: 'International Mode',
    tagline: 'Built for remote & global.',
    blurb: 'Tuned for distributed teams, timezones, and hiring managers across borders.',
    accent: '#4DCC88',
    accent2: '#36D6C3',
    cta: 'Globalize me',
    sample: '"Great work — now make it legible to a hiring manager in Berlin."',
  },
}

export const MODE_ORDER: ModeId[] = ['roast', 'coach', 'intl']

export const LOADING_LINES: Record<ModeId, string[]> = {
  roast: [
    'Cracking knuckles…',
    'Locating the buzzwords…',
    'Counting "synergies" (oh no)…',
    'Sharpening the knives…',
    'Preparing emotional support…',
  ],
  coach: [
    'Reading like a recruiter…',
    'Scanning for impact metrics…',
    'Checking ATS keyword coverage…',
    'Benchmarking against the role…',
    'Drafting your action plan…',
  ],
  intl: [
    'Switching to global hiring lens…',
    'Checking timezone & remote signals…',
    'Flagging region-specific norms…',
    'Translating jargon to plain English…',
    'Optimizing for distributed teams…',
  ],
}

export const EMPTY_STATES = {
  noFile: 'Nothing here yet. Your future self is waiting.',
  dragHint: 'Drop the PDF. We promise to be (mostly) gentle.',
  error: 'That file refused to cooperate. PDF only, under 10MB.',
}

export const RESULTS: Record<ModeId, AnalysisResult> = {
  roast: {
    score: 61,
    grade: 'C+',
    verdict: "Your resume called. It's embarrassed.",
    summary:
      "Look, there's a real person in here somewhere — buried under 14 bullet points that all start with \"Responsible for.\" You're not applying to be a responsibility. You're applying to be hired.",
    sections: [
      { label: 'Impact & Metrics', score: 48, note: 'Six jobs, zero numbers. Did anything you do actually… do anything? Prove it.' },
      { label: 'Formatting', score: 72, note: 'Two-column layout looks slick to you and looks like alphabet soup to the robot reading it.' },
      { label: 'Keywords', score: 55, note: '"Team player." "Hard worker." "Detail-oriented." The holy trinity of saying nothing.' },
      { label: 'Brevity', score: 40, note: 'Three pages. Three. Nobody has read three pages of anything since 2009.' },
      { label: 'Buzzword Index', score: 81, note: "You \"leveraged synergies to ideate.\" Please. We're begging you." },
    ],
    wins: [
      'Consistent job tenure — no scary gaps to explain away.',
      'That open-source side project is genuinely interesting. Lead with it.',
    ],
    fixes: [
      'Replace every "Responsible for" with a verb that has a body count: Shipped, Cut, Grew, Saved.',
      'Add one number to every bullet. Made up? No. Estimated? Fine. "~30% faster" beats "faster."',
      'Cut it to one page. Your 2012 internship at the smoothie place can rest now.',
    ],
    flags: [
      "Objective statement at the top — it's 2026, not a time capsule.",
      'Email is hotshot_dev_420@… — maybe not.',
    ],
  },
  coach: {
    score: 74,
    grade: 'B',
    verdict: "Strong foundation. Let's make it undeniable.",
    summary:
      "You've got a solid track record and the bones of a great resume. The gap between \"gets interviews sometimes\" and \"gets interviews always\" is specificity — quantified outcomes and tighter keyword alignment to the roles you actually want.",
    sections: [
      { label: 'Impact & Metrics', score: 64, note: 'About a third of your bullets quantify outcomes. Aim for 80%. Numbers build trust fast.' },
      { label: 'Formatting', score: 86, note: 'Clean and scannable. A single-column version would parse more reliably in ATS.' },
      { label: 'Keywords', score: 70, note: 'Good coverage for generalist roles; thin on the specific stack in your target listings.' },
      { label: 'Brevity', score: 78, note: 'Length is reasonable. Trim the oldest role to two lines to spotlight recent work.' },
      { label: 'Narrative Arc', score: 72, note: 'Your progression reads well — make the most recent role the visual + content anchor.' },
    ],
    wins: [
      'Clear seniority progression across roles — recruiters love a trajectory.',
      'Strong, specific summary line that frames your specialty in one sentence.',
    ],
    fixes: [
      'Quantify the top two bullets of each recent role (scope, %, $, time, or scale).',
      'Mirror 5–8 exact keywords from your target job description in your skills + bullets.',
      'Move skills above the fold so a 6-second skim hits them first.',
    ],
    flags: [
      'A couple of bullets exceed two lines — tighten to a single punchy line.',
      'Date formatting is inconsistent (mix of "2023" and "Jan 2023").',
    ],
  },
  intl: {
    score: 68,
    grade: 'B-',
    verdict: 'Great work — now make it travel.',
    summary:
      'For a global, remote-first search this is close. The blockers are legibility across borders: localized jargon, missing remote signals, and a layout that assumes a reader who already knows your home market. Make it obvious to a hiring manager three timezones away.',
    sections: [
      { label: 'Remote Signals', score: 58, note: 'No mention of async work, distributed teams, or timezone overlap. Hiring managers screen for this.' },
      { label: 'Localization', score: 62, note: "Regional acronyms and a national grading scale won't mean anything abroad — translate or drop them." },
      { label: 'Keywords (Global)', score: 70, note: 'Solid, but add internationally-recognized tools and certifications over local equivalents.' },
      { label: 'Formatting', score: 80, note: 'No photo, no birthdate, no marital status — perfect for US/UK norms. Keep it that way.' },
      { label: 'Clarity of English', score: 74, note: "Readable, but a few idioms won't land for non-native reviewers. Plain English travels further." },
    ],
    wins: [
      'Already photo-free and metric-driven — ready for US, UK, and AU pipelines.',
      'Lists a clear timezone and city — small thing, big trust signal for remote roles.',
    ],
    fixes: [
      'Add a one-line "Remote since 2021 · async-first · overlaps EU + US-East" banner under your name.',
      'Convert local certifications/grades to globally legible equivalents (or add context in parens).',
      'Swap region-specific tool names for their international standard counterparts.',
    ],
    flags: [
      'Phone number has no country code — add the +.',
      'Date format DD/MM/YYYY is ambiguous to US readers; use "Mar 2024".',
    ],
  },
}

export const SAMPLE_RESUME = {
  name: 'Alex Rivera',
  title: 'Senior Product Engineer',
  contact: 'alex.rivera@email.com · Lisbon, PT · github.com/arivera',
  blocks: [
    { h: 'EXPERIENCE', lines: [0.9, 0.7, 0.82, 0.6] },
    { h: '', lines: [0.85, 0.65, 0.78] },
    { h: 'PROJECTS', lines: [0.8, 0.7] },
    { h: 'SKILLS', lines: [0.95, 0.55] },
    { h: 'EDUCATION', lines: [0.7, 0.5] },
  ],
}

export const SAMPLE_TEXT = `Alex Rivera
Senior Product Engineer
alex.rivera@email.com · Lisbon, PT · github.com/arivera

EXPERIENCE

Lead Engineer — TechCorp (2021–Present)
- Responsible for building and maintaining core product features
- Leveraged synergies to ideate new solutions with cross-functional teams
- Team player and hard worker with strong attention to detail
- Responsible for code reviews and mentoring junior developers

Software Engineer — StartupXYZ (2019–2021)
- Responsible for frontend development using React
- Built reusable UI components
- Collaborated with design team

PROJECTS
Open-source CLI tool with 500+ GitHub stars
Personal portfolio website built with Next.js

SKILLS
JavaScript, TypeScript, React, Node.js, Python, SQL, Git

EDUCATION
BSc Computer Science — University of Lisbon (2015–2019)`
