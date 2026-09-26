import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Phone, Mail, MapPin, Award } from 'lucide-react';
import { Logo } from './Logo';
import { useLanguage } from '../../services/i18n';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-[#051626] text-slate-300 border-t border-slate-800/90 pt-16 pb-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800/80">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Logo variant="dark" size="lg" showTagline={true} />
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
              {t('Connecting verified commercial and personal drivers directly with top logistics fleets, corporate employers, and private vehicle owners. Direct hiring, verified licenses, zero agency cuts.')}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-full font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> {t('License verification available')}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full font-semibold">
                <Award className="w-3.5 h-3.5" /> {t('Direct Employer Hiring')}
              </div>
            </div>
          </div>

          {/* Category links */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 font-display">
              {t('Driver Categories')}
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/jobs?category=HMV" className="hover:text-amber-400 transition-colors">
                  {t('Heavy Truck (HMV)')}
                </Link>
              </li>
              <li>
                <Link to="/jobs?category=LMV" className="hover:text-amber-400 transition-colors">
                  {t('Personal & Sedan Chauffeur')}
                </Link>
              </li>
              <li>
                <Link to="/jobs?category=Cab+Driver" className="hover:text-amber-400 transition-colors">
                  {t('App-based Cab Driver')}
                </Link>
              </li>
              <li>
                <Link to="/jobs?category=Delivery+Driver" className="hover:text-amber-400 transition-colors">
                  {t('Hyperlocal Delivery Pilot')}
                </Link>
              </li>
              <li>
                <Link to="/jobs?category=Bus+Driver" className="hover:text-amber-400 transition-colors">
                  {t('School & Staff Bus Driver')}
                </Link>
              </li>
              <li>
                <Link to="/jobs?category=Trailer+Driver" className="hover:text-amber-400 transition-colors">
                  {t('40ft Container Trailer Driver')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 font-display">
              {t('Recruitment Portals')}
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/jobs" className="hover:text-amber-400 transition-colors">
                  {t('Search All Vacancies')}
                </Link>
              </li>
              <li>
                <Link to="/companies" className="hover:text-amber-400 transition-colors">
                  {t('Verified Companies')}
                </Link>
              </li>
              <li>
                <Link to="/employer/post-job" className="hover:text-amber-400 transition-colors">
                  {t('Post Driver Vacancy')}
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-amber-400 transition-colors">
                  {t('Join as a Candidate')}
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-amber-400 transition-colors">
                  {t('Employer Sign In')}
                </Link>
              </li>
              <li>
                <Link to="/login?role=admin" className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> {t('Staff & Admin Portal')}
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-amber-400 transition-colors">
                  {t('About Safety & Welfare')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Col */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 font-display">
              {t('Support Desk')}
            </h4>
            <div className="space-y-3 text-xs text-slate-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Electronic City Phase 1, Bengaluru, Karnataka - 560100</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <a href="tel:+918022008899" className="hover:text-white transition-colors">
                  +91 80 2200 8899
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <a href="mailto:support@driverhub.in" className="hover:text-white transition-colors">
                  support@driverhub.in
                </a>
              </div>
              <div className="pt-2">
                <span className="text-[11px] text-slate-500 block">Mon - Sat: 9:00 AM - 7:00 PM IST</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright & attribution */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Driver Hub Inc. {t('All rights reserved.')}</p>
          <div className="flex items-center gap-5 text-xs">
            <Link to="/about" className="hover:text-slate-400">{t('Privacy Policy')}</Link>
            <Link to="/about" className="hover:text-slate-400">{t('Terms of Service')}</Link>
            <Link to="/contact" className="hover:text-slate-400">{t('Driver Welfare')}</Link>
            <Link to="/login?role=admin" className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> {t('Admin Login')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
