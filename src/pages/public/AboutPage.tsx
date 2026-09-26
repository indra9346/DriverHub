import React from 'react';
import { 
  ShieldCheck, Award, Truck, CheckCircle2, Sparkles 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../services/i18n';

export const AboutPage: React.FC = () => {
  const { t } = useLanguage();

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
