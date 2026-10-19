import React from 'react';
import {
  ShieldCheck, Award, Truck, CheckCircle2, Sparkles, FileText, Lock, AlertTriangle
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../services/i18n';

interface PolicySection {
  heading: string;
  paragraphs?: string[];
  points?: string[];
}

interface PolicyPage {
  title: string;
  icon: React.ReactNode;
  intro: string;
  sections: PolicySection[];
}

/*
 * Generic starting text for the policy pages. It describes how this site works
 * and deliberately states no company-specific legal facts (registered name,
 * address, officers, dates); the operator must review and complete it.
 */
const POLICY_PAGES: Record<'/privacy' | '/terms' | '/safety', PolicyPage> = {
  '/privacy': {
    title: 'Privacy Policy',
    icon: <Lock className="w-5 h-5 text-amber-600" />,
    intro: 'How Driver Hub handles the information you give it when you use the job portal.',
    sections: [
      {
        heading: 'Information we collect',
        points: [
          'Account details: email address, phone number and the role you sign up with (driver or employer).',
          'Profile details you add, such as your name, location, licence category, experience, skills, expected salary and documents you upload.',
          'Job listings, applications, messages and saved jobs created through the portal.',
          'Place names, PIN codes or, if you choose "Use My Current Location", your device location used to fill in location fields.',
          'Basic technical data needed to keep you signed in, stored in your browser.'
        ]
      },
      {
        heading: 'How the information is used',
        points: [
          'To create and secure your account and show the right dashboard.',
          'To match drivers and jobs, show search results and send account notifications.',
          'To let administrators review documents, verify employers and moderate listings.',
          'To answer support requests you send us.'
        ]
      },
      {
        heading: 'Who can see it',
        points: [
          'Employers see the details in applications you send them, and employers with candidate database access may see driver profiles as described on the employer plans.',
          'Administrators can see account, listing and document information to run and protect the service.',
          'Service providers that host the data or look up locations (for example the India Post PIN directory and OpenStreetMap) receive only what is needed for that lookup.'
        ]
      },
      {
        heading: 'Your choices',
        points: [
          'You can view and update your profile at any time from your dashboard, and remove documents you uploaded.',
          'To close your account or ask about your data, contact support through the Contact page.'
        ]
      }
    ]
  },
  '/terms': {
    title: 'Terms of Service',
    icon: <FileText className="w-5 h-5 text-amber-600" />,
    intro: 'The rules for using Driver Hub as a driver, an employer or a visitor.',
    sections: [
      {
        heading: 'What Driver Hub does',
        paragraphs: [
          'Driver Hub is a job portal that lets employers list driver vacancies and lets drivers find and apply for them. Driver Hub is not the employer and is not a party to any employment agreement made between a driver and an employer. It does not guarantee that a job will be offered, filled or paid as listed.'
        ]
      },
      {
        heading: 'Your account',
        points: [
          'Give accurate information and keep your details up to date.',
          'Keep your password private. You are responsible for activity on your account.',
          'Accounts that break these terms may be suspended or removed.'
        ]
      },
      {
        heading: 'Drivers',
        points: [
          'Apply only for roles you hold the required, valid driving licence for.',
          'Upload only your own, genuine documents.'
        ]
      },
      {
        heading: 'Employers',
        points: [
          'List only genuine vacancies with honest pay, hours and requirements.',
          'Do not ask drivers to pay any fee to apply or to be hired.',
          'Use candidate details only to recruit for your listed vacancies.'
        ]
      },
      {
        heading: 'Verification badges',
        paragraphs: [
          'A verified badge means an administrator has reviewed the documents or details provided. It is not a guarantee about a person, a company or a job. Always make your own checks before you join or hire.'
        ]
      },
      {
        heading: 'Prohibited use',
        points: [
          'Fake listings or profiles, spam, harassment or discrimination.',
          'Collecting other users\' data for purposes other than recruitment through the portal.',
          'Trying to access accounts or data that are not yours.'
        ]
      }
    ]
  },
  '/safety': {
    title: 'Safety & Driver Welfare',
    icon: <ShieldCheck className="w-5 h-5 text-amber-600" />,
    intro: 'Practical steps to stay safe while looking for work or hiring through Driver Hub.',
    sections: [
      {
        heading: 'For drivers',
        points: [
          'Never pay money to apply for a job, to get selected or to "reserve" a vacancy. Genuine employers do not ask for this.',
          'Check the employer\'s name, address and the job details before you travel for an interview or a driving trial.',
          'Confirm salary, duty hours, rest days and allowances in writing before you join.',
          'Show original documents only at the final verification and keep them with you. Never share OTPs, bank PINs or passwords.'
        ]
      },
      {
        heading: 'For employers',
        points: [
          'Check the driving licence and other documents yourself before the driver starts work.',
          'Hold driving trials in a safe place with a supervisor present.',
          'Describe the vehicle, routes and working conditions accurately in your listing.'
        ]
      },
      {
        heading: 'Report a problem',
        paragraphs: [
          'If a listing asks for money, looks fake, or someone behaves unsafely, stop contact and report it to support through the Contact page with the job title and employer name.',
          'In an emergency, call India\'s national emergency number 112.'
        ]
      }
    ]
  }
};

const PAGE_LINKS = [
  { to: '/about', label: 'About' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/safety', label: 'Safety' }
];

const PolicyView: React.FC<{ page: PolicyPage; path: string }> = ({ page, path }) => (
  <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
    <nav aria-label="About Driver Hub" className="flex flex-wrap gap-2">
      {PAGE_LINKS.map(link => (
        <Link
          key={link.to}
          to={link.to}
          aria-current={link.to === path ? 'page' : undefined}
          className={`inline-flex items-center min-h-[40px] px-4 rounded-xl text-xs font-bold border transition-colors ${
            link.to === path
              ? 'bg-[#08233F] text-white border-[#08233F]'
              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>

    <header className="space-y-3">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
        {page.icon} Driver Hub
      </div>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-[#08233F] font-display tracking-tight">{page.title}</h1>
      <p className="text-sm text-slate-600 leading-relaxed">{page.intro}</p>
    </header>

    <div role="note" className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 leading-relaxed">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
      <p>
        <strong>Draft for review.</strong> This is general starting text. The operator of this site must review it, add
        its own legal details and have it checked before relying on it. It is not legal advice.
      </p>
    </div>

    <div className="space-y-5">
      {page.sections.map(section => (
        <section key={section.heading} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-subtle space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-[#08233F] font-display">{section.heading}</h2>
          {section.paragraphs?.map(paragraph => (
            <p key={paragraph} className="text-xs sm:text-sm text-slate-600 leading-relaxed break-words">{paragraph}</p>
          ))}
          {section.points && (
            <ul className="space-y-2">
              {section.points.map(point => (
                <li key={point} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="break-words min-w-0">{point}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>

    <p className="text-xs text-slate-500">
      Questions about this page? <Link to="/contact" className="font-bold text-blue-700 hover:underline">Contact support</Link>.
    </p>
  </div>
);

export const AboutPage: React.FC = () => {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const policyPath = pathname.replace(/\/+$/, '') as keyof typeof POLICY_PAGES;
  const policyPage = POLICY_PAGES[policyPath];

  if (policyPage) {
    return <PolicyView page={policyPage} path={policyPath} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[#08233F] text-xs font-bold uppercase tracking-wider shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> {t('Driver Recruitment & Fleet Hiring')}
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#08233F] font-display tracking-tight leading-tight">
          {t('Empowering Commercial Drivers & Connecting Fleet Leaders')}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          {t('Driver Hub connects drivers and employers through job listings, applications, and profile verification tools. Check each listing and account status for current details.')}
        </p>
      </div>

      {/* 3 Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-card hover:shadow-elevated transition-all duration-300 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-xl font-bold border border-amber-200/60">
            <ShieldCheck className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-[#08233F] font-display">{t('License documents reviewed')}</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {t('Upload your driving license for review. A verification badge appears after an administrator approves it.')}
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-card hover:shadow-elevated transition-all duration-300 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xl font-bold border border-emerald-200/60">
            <Award className="w-6 h-6 text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-[#08233F] font-display">{t('Zero Commission')}</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {t('Browse verified employers and review each job listing for its pay and hiring details.')}
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-card hover:shadow-elevated transition-all duration-300 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-xl font-bold border border-blue-200/60">
            <Truck className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-[#08233F] font-display">{t('Direct Hiring')}</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {t('Driver Hub connects drivers and employers through job listings, applications, and profile verification tools. Check each listing and account status for current details.')}
          </p>
        </div>
      </div>

      {/* Safety & Driver Welfare Standards Banner */}
      <div className="bg-[#08233F] rounded-2xl p-8 sm:p-12 text-white shadow-elevated space-y-8 relative overflow-hidden">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-400 text-xs font-bold uppercase tracking-wider">
            {t('About Safety & Welfare')}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display">
            {t('Why Choose DriverHub')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {t('Driver Hub connects drivers and employers through job listings, applications, and profile verification tools. Check each listing and account status for current details.')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs sm:text-sm text-slate-300">
          <div className="flex items-start gap-3.5 bg-white/5 p-4 rounded-xl border border-white/10">
            <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">{t('Direct Hiring')}</span>
              <span>{t('Zero Commission')}</span>
            </div>
          </div>
          <div className="flex items-start gap-3.5 bg-white/5 p-4 rounded-xl border border-white/10">
            <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">{t('License documents reviewed')}</span>
              <span>{t('Verified status appears after document review.')}</span>
            </div>
          </div>
        </div>

        <div className="pt-4 flex flex-wrap items-center gap-4">
          <Link
            to="/jobs"
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            {t('Explore Openings')}
          </Link>
          <Link
            to="/contact"
            className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl text-xs sm:text-sm border border-white/20 transition-all cursor-pointer"
          >
            {t('Contact')}
          </Link>
        </div>
      </div>
    </div>
  );
};
