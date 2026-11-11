/**
 * Privacy Policy + Terms of Service content — drafted from what this
 * product actually does (checked against ARCHITECTURE.md and the real
 * data flows: resume upload → Vercel Blob, AI processing → OpenRouter
 * with provider.data_collection="deny", structured data → Neon/Postgres,
 * job listings ingested from Greenhouse/Ashby with source attribution).
 *
 * ⚠️ NOT LEGAL ADVICE. This is a factual draft of what the product does,
 * not a legal opinion — a lawyer must review both documents before
 * launch, especially for EU users / GDPR (lawful basis for each
 * processing purpose, a Data Processing Agreement with OpenRouter and
 * Vercel/Neon as sub-processors, and the exact retention periods below
 * are placeholders that need sign-off, not final numbers). See the
 * banner rendered at the top of both pages (app/privacy, app/terms) —
 * don't remove it without a lawyer's sign-off replacing it.
 */
import { env } from '@/lib/env'

export interface LegalSection {
  heading: string
  body: string[] // paragraphs
}

export function getPrivacySections(lang: 'en' | 'fa'): LegalSection[] {
  const email = env.contactEmail
  if (lang === 'fa') {
    return [
      { heading: 'چه داده‌ای جمع‌آوری می‌کنیم', body: [
        'وقتی ثبت‌نام می‌کنی: ایمیل و رمز عبور هش‌شده (نه متن ساده).',
        'وقتی رزومه آپلود می‌کنی: فایل رزومه (در Vercel Blob، به‌صورت خصوصی ذخیره می‌شه) و متن استخراج‌شده و ساختاریافته از اون (در Postgres روی Neon).',
        'ترجیحات شغلی‌ات (عنوان‌های هدف، مکان، حقوق، و غیره) و نسخه‌های تنظیم‌شدهٔ رزومه/کاور لتر که می‌سازی.',
        'شغل‌هایی که ذخیره یا مخفی می‌کنی، و امتیازهای تطابق محاسبه‌شده برای پروفایلت.',
        'بازدید از صفحات (بدون شناسایی شخصی — فقط برای شمارنده‌های آماری سایت).',
      ] },
      { heading: 'چطور از هوش مصنوعی استفاده می‌کنیم', body: [
        'تحلیل رزومه، استخراج ساختاریافته، تطابق شغلی، و تنظیم رزومه از طریق OpenRouter به یک مدل هوش مصنوعی پرداختی ارسال می‌شه.',
        `هر درخواستی که متن رزومه یا داده‌های شخصی رو شامل بشه با گزینهٔ "data_collection: deny" ارسال می‌شه — یعنی فقط به ارائه‌دهنده‌هایی مسیردهی می‌شه که روی داده‌هات ذخیره‌سازی یا آموزش انجام نمی‌دن.`,
        'متن رزومه و آگهی شغلی هیچ‌وقت به‌صورت کامل در لاگ‌های سرور ذخیره نمی‌شن.',
      ] },
      { heading: 'داده‌های شغلی از منابع شخص ثالث', body: [
        'لیست شغل‌ها از تخته‌های استخدام عمومی شرکت‌ها (مثل Greenhouse و Ashby) جمع‌آوری می‌شن — فقط از نقاط پایانی عمومی که قوانین استفاده‌شون اجازه می‌ده.',
        `اگه فکر می‌کنی یک آگهی شغلی باید حذف بشه یا متعلق به توئه و می‌خوای حذفش کنیم، به ${email} پیام بده.`,
      ] },
      { heading: 'ذخیره‌سازی و مدت نگهداری', body: [
        'داده‌های ساختاریافتهٔ پروفایل، ترجیحات، و نسخه‌های تنظیم‌شده تا زمانی که حسابت فعاله نگه داشته می‌شن.',
        'نتایج roast عمومی (اشتراک‌گذاری‌شده) پیش‌فرض بعد از ۹۰ روز منقضی می‌شن.',
        '[پیش‌نویس — نیاز به تأیید وکیل: مدت دقیق نگهداری فایل رزومه و لاگ‌های سرور.]',
      ] },
      { heading: 'کوکی‌ها و حافظهٔ محلی مرورگر', body: [
        'ما از کوکی‌های تبلیغاتی یا ردیابی شخص ثالث استفاده نمی‌کنیم.',
        'یک کوکی ضروری (rr-session) برای نگه‌داشتن ورودت استفاده می‌شه — httpOnly، فقط برای تشخیص هویت.',
        'ترجیح زبان و تم تو در حافظهٔ محلی مرورگرت (localStorage) ذخیره می‌شه، نه کوکی، و هیچ‌وقت به سرور ارسال نمی‌شه.',
      ] },
      { heading: 'حقوق تو', body: [
        'می‌تونی هر زمان پروفایل، نسخه‌های تنظیم‌شده، و رزومه‌هات رو حذف کنی.',
        'می‌تونی یک نسخهٔ JSON از همهٔ داده‌هایی که دربارهٔ تو ذخیره کردیم دانلود کنی ("دانلود داده‌هایم" در تنظیمات حساب).',
        'می‌تونی کل حسابت رو حذف کنی — این کار همه چیز رو برای همیشه پاک می‌کنه.',
        `برای هر درخواست دیگه‌ای دربارهٔ داده‌هات، با ${email} تماس بگیر.`,
      ] },
    ]
  }
  return [
    { heading: 'What we collect', body: [
      'When you sign up: your email and a hashed password (never stored in plain text).',
      'When you upload a resume: the file itself (stored privately in Vercel Blob) and structured text extracted from it (stored in Postgres on Neon).',
      'Your job preferences (target titles, location, salary, etc.) and any tailored resume/cover letter versions you create.',
      'Jobs you save or hide, and match scores computed against your profile.',
      'Page visits (not personally identified — used only for aggregate site statistics).',
    ] },
    { heading: 'How we use AI', body: [
      'Resume analysis, structured extraction, job matching, and resume tailoring are sent to a paid AI model via OpenRouter.',
      'Every request containing resume text or personal data is sent with provider option "data_collection: deny" — routing only to providers that do not retain or train on your data.',
      'Resume text and job description text are never logged in full on our servers.',
    ] },
    { heading: 'Job data from third parties', body: [
      'Job listings are ingested from public employer job boards (e.g. Greenhouse, Ashby) — only from public endpoints whose terms permit this use.',
      `If you believe a job listing should be removed, or it is yours and you'd like it taken down, contact ${email}.`,
    ] },
    { heading: 'Storage and retention', body: [
      'Structured profile, preference, and tailored-version data is kept for as long as your account is active.',
      'Publicly shared roast results expire after 90 days by default.',
      '[Draft — needs lawyer sign-off: exact retention period for raw resume files and server logs.]',
    ] },
    { heading: 'Cookies and browser storage', body: [
      'We do not use third-party advertising or tracking cookies.',
      'One essential cookie (rr-session) keeps you signed in — httpOnly, used only for authentication.',
      'Your language and theme preference are stored in your browser\'s local storage, not a cookie, and are never sent to our servers.',
    ] },
    { heading: 'Your rights', body: [
      'You can delete your profile, tailored versions, and resumes at any time.',
      'You can download a JSON copy of everything we store about you ("Download my data" in account settings).',
      'You can delete your entire account — this permanently removes everything.',
      `For any other request about your data, contact ${email}.`,
    ] },
  ]
}

export function getTermsSections(lang: 'en' | 'fa'): LegalSection[] {
  const email = env.contactEmail
  if (lang === 'fa') {
    return [
      { heading: 'استفاده از خدمات', body: [
        'این سرویس بازخورد رزومهٔ تولیدشده با هوش مصنوعی، تطابق شغلی، و تنظیم رزومه ارائه می‌ده. خروجی هوش مصنوعی ممکنه گاهی اشتباه باشه — همیشه قبل از استفادهٔ واقعی، محتوا رو بازبینی کن.',
        'رزومهٔ تنظیم‌شده فقط باید واقعیت‌های موجود در پروفایل تأییدشده‌ات رو بازنویسی، بازچینی، یا برجسته کنه — هیچ‌وقت نباید چیزی اختراع کنه. اگه موردی علامت‌گذاری‌شده می‌بینی، قبل از استفاده بررسیش کن.',
      ] },
      { heading: 'مسئولیت حساب تو', body: [
        'تو مسئول صحت اطلاعاتی هستی که آپلود یا وارد می‌کنی و استفادهٔ نهایی از هر محتوای تولیدشده‌ای.',
      ] },
      { heading: 'سلب مسئولیت', body: [
        'این سرویس بدون هیچ ضمانتی ارائه می‌شه. ما ضمانت نمی‌کنیم که تحلیل، تطابق شغلی، یا رزومهٔ تنظیم‌شده منجر به استخدام بشه.',
      ] },
      { heading: 'تماس', body: [`سؤال دربارهٔ این شرایط؟ با ${email} تماس بگیر.`] },
    ]
  }
  return [
    { heading: 'Using the service', body: [
      'This service provides AI-generated resume feedback, job matching, and resume tailoring. AI output can occasionally be wrong — always review content before relying on it.',
      'A tailored resume is only meant to reword, reorder, or emphasize facts already in your approved profile — never to invent anything. If you see a flagged item, review it before using it.',
    ] },
    { heading: 'Your account', body: [
      'You are responsible for the accuracy of any information you upload or enter, and for how you ultimately use any generated content.',
    ] },
    { heading: 'Disclaimer', body: [
      'This service is provided without any warranty. We do not guarantee that analysis, job matching, or a tailored resume will result in employment.',
    ] },
    { heading: 'Contact', body: [`Questions about these terms? Contact ${email}.`] },
  ]
}
