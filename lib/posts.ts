export type BlockType = 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'tip' | 'quote'

export interface Block {
  type: BlockType
  text?: string
  items?: string[]
}

export interface Post {
  slug: string
  title: string
  titleFa?: string
  excerpt: string
  excerptFa?: string
  date: string
  readTime: number
  tag: string
  content: Block[]
  coverImage?: string
}

export const POSTS: Post[] = [
  {
    slug: 'how-to-write-a-resume-that-passes-ats',
    title: 'How to Write a Resume That Passes ATS',
    titleFa: 'چطور رزومه‌ای بنویسی که از ATS رد بشه',
    excerpt: 'Most resumes never reach a human eye. Here\'s exactly how ATS systems score your resume — and how to beat them without stuffing keywords.',
    excerptFa: 'اکثر رزومه‌ها هرگز به چشم انسانی نمی‌رسند. اینجا دقیقاً توضیح می‌دهیم سیستم‌های ATS چگونه رزومه‌ات را امتیاز می‌دهند — و چطور بدون پرکردن کلمات کلیدی از آن‌ها پیشی بگیری.',
    date: '2026-05-20',
    readTime: 7,
    tag: 'ATS',
    content: [
      { type: 'p', text: 'Applicant Tracking Systems (ATS) are the invisible gatekeepers of the modern job market. Before your resume reaches a recruiter, it passes through software that parses, scores, and ranks it against hundreds of other candidates. Studies estimate that over 75% of resumes are rejected by ATS before a human ever sees them.' },
      { type: 'p', text: 'The good news: ATS systems are not magic. They follow predictable rules. Once you understand them, you can optimize your resume without sacrificing authenticity.' },

      { type: 'h2', text: 'How ATS Systems Actually Work' },
      { type: 'p', text: 'An ATS parses your resume into a structured database — pulling out your name, contact info, job titles, dates, skills, and education. It then compares this structured data against the job description using keyword matching, section detection, and sometimes semantic similarity scoring.' },
      { type: 'p', text: 'The most important thing to understand: ATS systems are terrible at reading creative formatting. Tables, text boxes, headers/footers, and multi-column layouts often get mangled during parsing. The "design" that looks great in Word looks like scrambled nonsense to a parser.' },

      { type: 'h2', text: 'The 5 Rules That Actually Matter' },
      { type: 'ol', items: [
        'Use a single-column layout. Two columns are trendy and ATS-hostile. Stick to one column with clear section headers.',
        'Match section header names to standards. Use "Work Experience", "Education", "Skills" — not "My Journey", "Where I\'ve Been", or "Toolbox".',
        'Mirror the job description\'s language. If the posting says "cross-functional collaboration", don\'t write "worked with different teams". Use their exact phrasing.',
        'Avoid text inside images, headers, or footers. ATS parsers often skip these entirely.',
        'Use standard fonts and avoid tables. Arial, Calibri, or Garamond. Tables confuse most parsers.',
      ]},

      { type: 'h2', text: 'Keyword Strategy Without Stuffing' },
      { type: 'p', text: 'The wrong approach: pasting the job description at the bottom in white text. ATS systems have evolved past this, and it will get you flagged.' },
      { type: 'p', text: 'The right approach: read the job description carefully, identify the 8–12 core skills and requirements, and make sure each one appears naturally in your experience bullets or skills section.' },
      { type: 'tip', text: 'Pro tip: paste the job description into a word cloud tool. The largest words are almost always the keywords that matter most to that specific role.' },

      { type: 'h2', text: 'File Format Matters' },
      { type: 'p', text: 'Unless the application specifically requests a Word document, submit as PDF. PDFs preserve your formatting exactly, and modern ATS systems parse them reliably. .docx files can render differently depending on the system\'s Word version.' },

      { type: 'h2', text: 'The Human After the ATS' },
      { type: 'p', text: 'Remember: ATS is the first filter, not the only filter. Once you pass it, a real human spends an average of 6 seconds scanning your resume before deciding whether to read further. That means your top third needs to immediately communicate who you are and why you\'re a fit — even without reading the bullets.' },
      { type: 'quote', text: 'Optimize for the machine to get seen. Optimize for the human to get hired.' },
    ],
  },

  {
    slug: 'top-mistakes-on-developer-resumes',
    title: 'Top Mistakes on Developer Resumes',
    titleFa: 'اشتباهات رایج در رزومه برنامه‌نویس‌ها',
    excerpt: 'Engineers are great at writing code and terrible at writing resumes. These are the most common mistakes — and exactly how to fix them.',
    excerptFa: 'مهندس‌ها در نوشتن کد عالی‌اند و در نوشتن رزومه افتضاح. اینجا رایج‌ترین اشتباهات — و دقیقاً چطور آن‌ها را برطرف کنی.',
    date: '2026-06-01',
    readTime: 6,
    tag: 'Developers',
    content: [
      { type: 'p', text: 'Developer resumes are a unique breed. Unlike most professional resumes, they need to satisfy three very different audiences simultaneously: ATS software, non-technical recruiters, and senior engineers doing technical screening. Getting all three right requires a different approach than what most engineers default to.' },

      { type: 'h2', text: 'Mistake 1: Leading With a Skills Laundry List' },
      { type: 'p', text: 'The most common dev resume pattern: a massive "Technical Skills" section at the top, listing every language and framework you\'ve ever touched. JavaScript, Python, React, Vue, Angular, Node, Express, Django, Flask, PostgreSQL, MongoDB, Redis, Docker, Kubernetes, AWS, GCP, Azure…' },
      { type: 'p', text: 'This tells a recruiter nothing. Everyone lists the same stack. What matters is how you used these tools to ship things that mattered.' },
      { type: 'tip', text: 'Fix: Move skills lower on the page. Lead with impact. Save the skill list for confirming what\'s already implied by your experience.' },

      { type: 'h2', text: 'Mistake 2: Describing Responsibilities, Not Achievements' },
      { type: 'p', text: 'The classic developer bullet: "Responsible for building and maintaining the user authentication system." This tells me what your job was, not what you actually did.' },
      { type: 'p', text: 'What a senior engineer reading your resume wants to know: Did you build it from scratch? Did you scale it? Did you cut latency? Reduce error rates? Handle 10 users or 10 million?' },
      { type: 'ul', items: [
        'Before: "Worked on the payments service"',
        'After: "Redesigned the payments service, reducing failed transaction rate from 3.2% to 0.4% and cutting average checkout time by 1.8 seconds"',
        'Before: "Responsible for code reviews"',
        'After: "Led code reviews across a team of 8 engineers, catching 3 production-impacting bugs pre-deploy in Q4"',
      ]},

      { type: 'h2', text: 'Mistake 3: Burying Your Side Projects' },
      { type: 'p', text: 'For developers — especially those early in their careers — side projects are often more impressive than day job work. A personal project you built from zero demonstrates initiative, curiosity, and ownership that a corporate JIRA ticket never will.' },
      { type: 'p', text: 'If your side project has GitHub stars, active users, or was written about anywhere — put it near the top, not hidden under "Other Projects" at the bottom.' },

      { type: 'h2', text: 'Mistake 4: No Numbers, Anywhere' },
      { type: 'p', text: 'Engineering is a quantitative discipline. Your resume should reflect that. Scale, performance improvements, team size, user impact, code coverage percentages, deploy frequency — any number is better than no number.' },
      { type: 'p', text: 'If you genuinely don\'t have exact numbers, use approximations. "~40% faster" is infinitely more compelling than "faster". Recruiters know estimates exist — they\'re looking for your instinct to quantify.' },

      { type: 'h2', text: 'Mistake 5: A Three-Page Resume' },
      { type: 'p', text: 'Unless you have 15+ years of directly relevant experience, your resume should be one page. Two at an absolute maximum. Three pages signals poor prioritization — which is itself a red flag for an engineer.' },
      { type: 'p', text: 'The rule: if a bullet doesn\'t make you look better than the one above it, cut it. Your weakest bullet is making your strongest bullet look worse by association.' },

      { type: 'h2', text: 'Mistake 6: Listing Technologies Without Context' },
      { type: 'p', text: 'Listing "Kubernetes" in your skills when you only ran `kubectl get pods` once in a tutorial is a trap. Technical interviews will expose the gap immediately — and that\'s far worse than not listing it.' },
      { type: 'quote', text: 'Only list what you can confidently defend in a technical conversation for 20 minutes.' },
    ],
  },

  {
    slug: 'how-to-get-a-remote-job-in-2026',
    title: 'How to Get a Remote Job in 2026',
    titleFa: 'چطور در ۲۰۲۶ شغل دورکاری پیدا کنی',
    excerpt: 'The remote job market has matured — and gotten more competitive. Here\'s what actually works for landing a fully remote role in 2026.',
    excerptFa: 'بازار کار دورکاری بلوغ یافته — و رقابتی‌تر شده. اینجا چیزی است که واقعاً برای پیدا کردن یک نقش کاملاً دورکاری در ۲۰۲۶ کار می‌کند.',
    date: '2026-06-10',
    readTime: 8,
    tag: 'Remote',
    content: [
      { type: 'p', text: 'The pandemic-era "everyone\'s hiring remotely" window has closed. Companies that went remote-first have settled into their processes. The bar for remote candidates is higher — because remote-first companies have now learned exactly what makes a remote employee succeed or fail.' },
      { type: 'p', text: 'The good news: there are more legitimate fully-remote roles than ever. The bad news: they\'re more competitive, and companies are far more discerning about who they hire for them.' },

      { type: 'h2', text: 'Signal That You Can Actually Work Remotely' },
      { type: 'p', text: 'The #1 mistake remote job seekers make: applying to remote roles with a resume that gives zero evidence they\'ve ever worked remotely. Remote hiring managers see this as a risk.' },
      { type: 'p', text: 'If you\'ve worked remotely before — even partially — make it explicit. Add a line to your job titles or a note in your experience:' },
      { type: 'ul', items: [
        '"Senior Engineer — Acme Corp (Remote, 2022–Present)"',
        '"Product Manager — BetaCo (Hybrid → Fully Remote 2023)"',
        '"Collaborated async across 4 time zones with teams in US, EU, and APAC"',
      ]},
      { type: 'tip', text: 'Add a single line below your contact info: "Remote-first · Async-first · UTC+3:30 · Available for EU and US-East overlap"' },

      { type: 'h2', text: 'Target the Right Companies' },
      { type: 'p', text: 'Not all "remote" is equal. There\'s a massive difference between:' },
      { type: 'ul', items: [
        'Remote-allowed: In-office company that lets some people WFH occasionally',
        'Remote-friendly: Has some remote employees but the office is still the center of gravity',
        'Remote-first: Async by default, no headquarters advantage, documentation-driven',
        'Fully distributed: No offices at all, all roles remote, globally distributed teams',
      ]},
      { type: 'p', text: 'If you want a truly remote role, target remote-first and fully distributed companies. Companies like GitLab, Automattic, Basecamp, Doist, and Buffer have been distributed for years and have the infrastructure and culture to support it properly.' },

      { type: 'h2', text: 'The Resume Tweaks That Actually Help' },
      { type: 'p', text: 'Your resume needs to answer a specific set of questions that remote hiring managers have in their heads before they even get on a call with you:' },
      { type: 'ul', items: [
        'Can they communicate clearly in writing? (Do their bullets communicate clearly? Is the resume itself well-written?)',
        'Do they manage their own time? (Have they shipped projects independently?)',
        'Are they results-oriented? (Numbers, outcomes, impact — not just activities)',
        'Have they navigated timezone complexity? (Mention it explicitly if you have)',
        'Are they documentation-minded? (Mention any wikis, runbooks, or processes you\'ve written)',
      ]},

      { type: 'h2', text: 'Tools and Certifications That Signal Remote Readiness' },
      { type: 'p', text: 'Mentioning specific async tools in your experience — not just listing them in a skills section — shows you actually use them. Notion, Linear, Loom, Figma, GitHub (with PR descriptions and async code review), Confluence, Slack with async norms.' },
      { type: 'p', text: 'These aren\'t just tools — they\'re signals that you understand how modern remote teams operate.' },

      { type: 'h2', text: 'The Cover Letter for Remote Roles' },
      { type: 'p', text: 'Remote roles get more applicants than in-office roles — often 3–5x as many. A tailored cover letter that explicitly addresses why you work well remotely, what your home setup looks like, and how you\'ve handled async collaboration will stand out in a pile of generic applications.' },

      { type: 'h2', text: 'The Interview Process' },
      { type: 'p', text: 'Most remote-first companies run their hiring process the same way they run their teams: asynchronously. Expect written take-homes, async video responses (Loom), and working sessions that simulate real async collaboration.' },
      { type: 'p', text: 'Your async writing skills are on display from the first application. Every email, every Calendly note, every follow-up — treat them as part of the interview.' },
      { type: 'quote', text: 'In a remote interview process, how you communicate is the product. You\'re not just showing what you know — you\'re showing what it\'s like to work with you every day.' },
    ],
  },
]

export function getPost(slug: string): Post | undefined {
  return POSTS.find(p => p.slug === slug)
}
