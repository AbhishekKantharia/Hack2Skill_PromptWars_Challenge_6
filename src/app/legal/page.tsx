import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Legal & Privacy Disclosures — BreatheWise AI',
  description:
    'Age/COPPA, font privacy, session replay, email, subscription, and DMCA disclosures for BreatheWise AI.',
};

const sections = [
  {
    title: 'Age and COPPA',
    body: [
      'BreatheWise AI is an informational environmental dashboard intended for general audiences. It is not directed to children under 13, and we do not knowingly collect personal information from children under 13.',
      'The app does not create accounts or ask for names, birth dates, school details, or contact information. If you believe a child has submitted personal information through a community report or AI question, use the contact process below so it can be removed.',
    ],
  },
  {
    title: 'Google Fonts Privacy',
    body: [
      'Typography is delivered through Next.js next/font with Plus Jakarta Sans and JetBrains Mono. Font files are downloaded at build time and served from this application domain.',
      'Browsers do not contact Google Fonts at runtime, and no Google Fonts cookies, analytics, or tracking scripts are loaded.',
    ],
  },
  {
    title: 'Session Replay and Analytics',
    body: [
      'No session replay, heatmap, screen-recording, or behavioral analytics tools are used. No third-party advertising or tracking pixels are loaded.',
      'The only browser storage is an HttpOnly signed session cookie and a local theme preference. API request bodies are validated and never stored verbatim.',
    ],
  },
  {
    title: 'Marketing Email Footer',
    body: [
      'BreatheWise AI does not operate a mailing list and does not send marketing or promotional email.',
      'If email communications are introduced, each message must include a clear sender identity, a working unsubscribe link, and a valid physical postal address.',
    ],
  },
  {
    title: 'Subscription Renewal Terms',
    body: [
      'There are no subscriptions, free trials, auto-renewals, or recurring charges in this application. No payment card, bank, or billing information is collected.',
      'AI provider keys, when configured, are paid by the operator under separate provider terms and are never exposed to browser code.',
    ],
  },
  {
    title: 'DMCA Agent and Takedown Process',
    body: [
      'To report alleged copyright infringement in community content, send a written notice containing: (1) identification of the copyrighted work, (2) the exact location of the challenged material, (3) your name, address, telephone number, and email, (4) a good-faith belief statement, (5) a statement under penalty of perjury that the notice is accurate and you are authorized to act, and (6) your physical or electronic signature.',
      'A counter-notice may be submitted with the same identifying information, a statement of good-faith belief that the material was removed by mistake or misidentification, consent to jurisdiction, and a signature. Material may be restored after the statutory waiting period if no further notice is received.',
      'Designated DMCA agent: SET OFFICIAL AGENT NAME, POSTAL ADDRESS, PHONE, AND EMAIL BEFORE PUBLIC COMMERCIAL LAUNCH. Until that contact is published, use the repository maintainer contact channel for rights notices.',
    ],
  },
];

export default function LegalPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-6 dark:border-slate-800 dark:from-emerald-950/30 dark:via-slate-900 dark:to-sky-950/30">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Legal &amp; Privacy Disclosures
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          This page summarizes how BreatheWise AI handles age-sensitive data, fonts, analytics,
          communications, subscriptions, and copyright notices. It is a transparency disclosure,
          not legal advice.
        </p>
      </header>

      {sections.map((section) => (
        <section
          key={section.title}
          className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="text-h2 text-slate-900 dark:text-white">{section.title}</h2>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
