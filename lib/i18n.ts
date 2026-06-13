import type { ModeId } from './types'

export type Lang = 'en' | 'fa'

const en = {
  // ── Nav / Header ──────────────────────────────────────
  navHowItWorks: 'How it works',
  navModes: 'Modes',
  navTheApp: 'The App',
  navUploadBtn: 'Upload your resume',

  // ── Hero ──────────────────────────────────────────────
  heroPill: 'AI resume feedback · in 12 seconds',
  heroH1a: 'Your resume',
  heroH1b: "called. It's",
  heroH1c: 'embarrassed.',
  heroBody:
    "Upload your PDF, pick your poison, and get instant feedback that's actually useful — whether you want it brutal, professional, or built for the global remote market.",
  heroCta1: 'Upload your resume',
  heroCta2: 'See a sample',

  // ── Stat ticker ───────────────────────────────────────
  statLabel: 'resumes roasted',
  statRating: '4.9 · loved & feared',

  // ── Hero card ─────────────────────────────────────────
  livePreview: 'Live preview ·',
  pickMode: 'Pick a mode — watch the room change',
  sectionsAnalyzed: 'sections analyzed',
  fixes: 'fixes',

  // ── How it works ─────────────────────────────────────
  howH2: 'Three steps. Twelve seconds. Zero excuses.',
  howEyebrow: 'How it works',
  steps: [
    { n: '01', t: 'Choose your mode',    d: 'Roast, Coach, or International. Each one reads your resume with a different agenda.' },
    { n: '02', t: 'Drop your PDF',        d: 'Drag it into the zone. We scan structure, keywords, metrics, and ATS-readiness.' },
    { n: '03', t: 'Get your report card', d: 'A scored breakdown, the wins, the fixes, the red flags — and a card worth sharing.' },
  ],

  // ── CTA band ──────────────────────────────────────────
  ctaH2: 'Be honest. You already know it needs work.',
  ctaBody: 'Find out exactly what — before a recruiter does.',
  ctaBtn: 'Upload your resume',

  // ── Footer ────────────────────────────────────────────
  footer: '© 2026 Resume Roaster · No resumes were truly harmed.',

  // ── Workspace ─────────────────────────────────────────
  stepChooseMode: 'Choose mode',
  stepUploadResume: 'Upload resume',
  stepAnalyzing: 'Analyzing',
  chooseYourMode: 'Choose your mode',
  chooseYourModeDesc: 'Each mode reads your resume with a different agenda.',
  continueWith: 'Continue with',
  back: 'Back',
  home: 'Home',
  uploadYourResume: 'Upload your resume',
  uploadDesc: 'PDF only · max 10 MB.',
  dropYourPdf: 'Drop your PDF here',
  orClickToBrowse: 'or click to browse · PDF only · max 10 MB',
  clickToReplace: 'Click to replace',
  or: 'or',
  useSampleResume: 'Use sample resume',
  analyzingH2: 'Analyzing your resume…',
  parseStructure: 'Parsing structure',
  scanKeywords: 'Scanning keywords',
  scoreSections: 'Scoring sections',
  generateVerdict: 'Generating verdict',
  apiError: 'API unavailable — showing sample analysis.',

  // ── Results ───────────────────────────────────────────
  newAnalysis: 'New analysis',
  shareYourRoast: 'Share your roast',
  theBreakdown: 'The breakdown',
  sectionsSuffix: 'sections',
  whatsWorking: "What's working",
  redFlags: 'Red flags',
  fixTheseFirst: 'Fix these first',
  overallAtsScore: 'Overall ATS score',
  scoreHigh: 'Recruiter-ready. Tighten the edges and send it.',
  scoreMid: 'Above the fold, below your potential. The fixes below close the gap.',
  scoreLow: "It's not personal. It's fixable. Start with the three fixes below.",
  sameLens: 'Same resume, different lens',
  reRunInstantly: 'Re-run instantly in another mode.',
  viewing: 'Viewing',
  rendering: 'Rendering…',
  downloadPng: 'Download PNG',
  share: 'Share',
  shareModalTitle: 'Share your roast',
  shareFooter: "1080×1080 · perfect for the group chat you'll regret posting in",
  scoreLabel: 'Score',

  // ── Score ring ────────────────────────────────────────
  atsScore: 'ATS SCORE',
  hireReady: 'Hire-ready',
  gettingThere: 'Getting there',
  needsWork: 'Needs work',

  // ── Modes (display text only — colors stay in data.ts) ─
  modes: {
    roast: {
      name: 'Roast Mode',
      tagline: 'Ruthless. Funny. Honest.',
      blurb: "No mercy, no clichés. The feedback your friends are too polite to give.",
      cta: 'Roast me',
      sample: '"Your resume called. It\'s embarrassed."',
    },
    coach: {
      name: 'Coach Mode',
      tagline: 'Professional. Constructive.',
      blurb: "A senior recruiter's feedback — precise, specific, and on your side.",
      cta: 'Coach me',
      sample: '"Solid foundation. Let\'s make it undeniable."',
    },
    intl: {
      name: 'International',
      tagline: 'For remote & global markets.',
      blurb: 'Tuned for distributed teams, time zones, and hiring managers worldwide.',
      cta: 'Go global',
      sample: '"Good work — now let\'s make it legible for the hiring manager in Berlin."',
    },
  } as Record<ModeId, { name: string; tagline: string; blurb: string; cta: string; sample: string }>,

  // ── Loading lines ─────────────────────────────────────
  loadingLines: {
    roast: [
      'Lacing up our boots…',
      'Looking for buzzwords…',
      'Counting the "synergies" (oh no)…',
      'Sharpening the knives…',
      'Preparing emotional support…',
    ],
    coach: [
      'Reading like a recruiter…',
      'Looking for impact metrics…',
      'Checking ATS keyword coverage…',
      'Benchmarking against target role…',
      'Drafting your action plan…',
    ],
    intl: [
      'Shifting to global hiring lens…',
      'Checking time zone & remote signals…',
      'Spotting region-specific norms…',
      'Translating jargon to plain language…',
      'Optimizing for distributed teams…',
    ],
  } as Record<ModeId, string[]>,

  // ── Empty states ──────────────────────────────────────
  emptyStates: {
    noFile: 'Nothing here yet. Your future is waiting.',
    dragHint: "Drop it like it's hot. We'll be (mostly) gentle.",
    error: "That file didn't cooperate. PDF only, under 10 MB.",
  },
}

const fa: typeof en = {
  navHowItWorks: 'چطور کار می‌کنه',
  navModes: 'حالت‌ها',
  navTheApp: 'اپلیکیشن',
  navUploadBtn: 'رزومه‌ات رو آپلود کن',

  heroPill: 'بازخورد هوش مصنوعی · در ۱۲ ثانیه',
  heroH1a: 'رزومه‌ات',
  heroH1b: 'زنگ زد.',
  heroH1c: 'خجالت می‌کشد.',
  heroBody:
    'PDF رو آپلود کن، حالتت رو انتخاب کن و بازخورد فوری بگیر — بی‌رحمانه، حرفه‌ای، یا برای بازار جهانی.',
  heroCta1: 'رزومه‌ات رو آپلود کن',
  heroCta2: 'نمونه ببین',

  statLabel: 'رزومه داغ شده',
  statRating: '۴.۹ · محبوب و ترسناک',

  livePreview: 'پیش‌نمایش ·',
  pickMode: 'یه حالت انتخاب کن — ببین اتمسفر عوض می‌شه',
  sectionsAnalyzed: 'بخش تحلیل‌شده',
  fixes: 'اصلاح',

  howH2: 'سه مرحله. دوازده ثانیه. بدون بهانه.',
  howEyebrow: 'چطور کار می‌کنه',
  steps: [
    { n: '۰۱', t: 'حالتت رو انتخاب کن',   d: 'داغ، مربی، یا بین‌الملل. هر کدوم با یه دیدگاه متفاوت رزومه‌ات رو می‌خونن.' },
    { n: '۰۲', t: 'PDF رو بنداز',           d: 'بکشش توی زون. ساختار، کلمات کلیدی، معیارها و آمادگی ATS رو اسکن می‌کنیم.' },
    { n: '۰۳', t: 'کارنامه‌ات رو بگیر',    d: 'تحلیل نمره‌دار، نقاط قوت، اصلاحات، پرچم‌های قرمز — و یه کارت ارزش اشتراک‌گذاری.' },
  ],

  ctaH2: 'صادق باش. می‌دونی که نیاز به کار داره.',
  ctaBody: 'دقیقاً چی — قبل از اینکه استخدام‌کننده بفهمه.',
  ctaBtn: 'رزومه‌ات رو آپلود کن',

  footer: '© ۱۴۰۵ رزومه روستر · هیچ رزومه‌ای واقعاً آسیب ندید.',

  stepChooseMode: 'انتخاب حالت',
  stepUploadResume: 'آپلود رزومه',
  stepAnalyzing: 'در حال تحلیل',
  chooseYourMode: 'حالتت رو انتخاب کن',
  chooseYourModeDesc: 'هر حالت با یه دیدگاه متفاوت رزومه‌ات رو می‌خونه.',
  continueWith: 'ادامه با',
  back: 'برگشت',
  home: 'خانه',
  uploadYourResume: 'رزومه‌ات رو آپلود کن',
  uploadDesc: 'فقط PDF · حداکثر ۱۰ مگابایت.',
  dropYourPdf: 'PDF رو بنداز اینجا',
  orClickToBrowse: 'یا کلیک کن · فقط PDF · حداکثر ۱۰ مگابایت',
  clickToReplace: 'کلیک کن تا جایگزین کنی',
  or: 'یا',
  useSampleResume: 'از رزومه نمونه استفاده کن',
  analyzingH2: 'داریم رزومه‌ات رو تحلیل می‌کنیم…',
  parseStructure: 'تجزیه ساختار',
  scanKeywords: 'اسکن کلمات کلیدی',
  scoreSections: 'نمره‌دهی بخش‌ها',
  generateVerdict: 'تولید حکم نهایی',
  apiError: 'API در دسترس نیست — نمایش تحلیل نمونه.',

  newAnalysis: 'تحلیل جدید',
  shareYourRoast: 'داغ‌شدنت رو به اشتراک بذار',
  theBreakdown: 'تحلیل کامل',
  sectionsSuffix: 'بخش',
  whatsWorking: 'چی خوبه',
  redFlags: 'پرچم‌های قرمز',
  fixTheseFirst: 'اول اینا رو درست کن',
  overallAtsScore: 'امتیاز کلی ATS',
  scoreHigh: 'آماده برای استخدام. لبه‌ها رو تنظیم کن و بفرست.',
  scoreMid: 'بالای خط، پایین‌تر از پتانسیلت. اصلاحات زیر فاصله رو پر می‌کنن.',
  scoreLow: 'شخصی نیست. قابل اصلاحه. با سه اصلاح زیر شروع کن.',
  sameLens: 'همون رزومه، دیدگاه متفاوت',
  reRunInstantly: 'فوری در حالت دیگه‌ای اجرا کن.',
  viewing: 'در حال مشاهده',
  rendering: 'در حال رندر…',
  downloadPng: 'دانلود PNG',
  share: 'اشتراک‌گذاری',
  shareModalTitle: 'داغ‌شدنت رو به اشتراک بذار',
  shareFooter: '۱۰۸۰×۱۰۸۰ · عالی برای گروهی که بعداً پشیمون می‌شی',
  scoreLabel: 'امتیاز',

  atsScore: 'امتیاز ATS',
  hireReady: 'آماده استخدام',
  gettingThere: 'داری می‌رسی',
  needsWork: 'نیاز به کار داره',

  modes: {
    roast: {
      name: 'حالت داغ‌کن',
      tagline: 'بی‌رحمانه. خنده‌دار. صادقانه.',
      blurb: 'بدون ترحم، بدون کلیشه. همان چیزی که دوستانت خجالت می‌کشند بگویند.',
      cta: 'داغم کن',
      sample: '"رزومه‌ات زنگ زد. خجالت می‌کشد."',
    },
    coach: {
      name: 'حالت مربی',
      tagline: 'حرفه‌ای. سازنده.',
      blurb: 'بازخورد یک استخدام‌کننده ارشد — دقیق، مشخص و در کنار تو.',
      cta: 'راهنماییم کن',
      sample: '"پایه محکمی داری. بیا غیرقابل‌انکارش کنیم."',
    },
    intl: {
      name: 'حالت بین‌الملل',
      tagline: 'برای دورکاری و بازار جهانی.',
      blurb: 'تنظیم‌شده برای تیم‌های توزیع‌شده، منطقه‌های زمانی و مدیران استخدام در سراسر جهان.',
      cta: 'جهانیم کن',
      sample: '"کار خوبیه — حالا بذار برای مدیر استخدام در برلین هم قابل‌فهم بشه."',
    },
  },

  loadingLines: {
    roast: [
      'داریم بند کفش‌هامونو می‌بندیم…',
      'دنبال کلیشه‌ها می‌گردیم…',
      'داریم «هم‌افزایی‌ها» رو می‌شماریم (ای وای)…',
      'چاقو داریم تیز می‌کنیم…',
      'داریم حمایت عاطفی آماده می‌کنیم…',
    ],
    coach: [
      'مثل یک استخدام‌کننده می‌خونیم…',
      'دنبال معیارهای تأثیر می‌گردیم…',
      'پوشش کلمات کلیدی ATS رو بررسی می‌کنیم…',
      'با نقش هدف قیاس می‌کنیم…',
      'برنامه اقدامت رو تهیه می‌کنیم…',
    ],
    intl: [
      'در حال تغییر به دیدگاه استخدام جهانی…',
      'بررسی منطقه زمانی و سیگنال‌های دورکاری…',
      'شناسایی هنجارهای منطقه‌ای خاص…',
      'ترجمه اصطلاحات به زبان ساده…',
      'بهینه‌سازی برای تیم‌های توزیع‌شده…',
    ],
  },

  emptyStates: {
    noFile: 'هنوز چیزی اینجا نیست. آینده‌ات منتظرته.',
    dragHint: 'PDF رو بنداز اینجا. قول می‌دیم (تقریباً) ملایم باشیم.',
    error: 'این فایل همکاری نکرد. فقط PDF، زیر ۱۰ مگابایت.',
  },
}

export const i18n: Record<Lang, typeof en> = { en, fa }
export type Translations = typeof en
