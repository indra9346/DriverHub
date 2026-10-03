import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, IndianRupee, Briefcase, Heart, Building2, 
  CheckCircle2, ArrowUpRight, ShieldCheck 
} from 'lucide-react';
import { Job } from '../../types';
import { useLanguage, formatSalaryDisplay } from '../../services/i18n';
import { getJobCardBanner } from '../../services/cardBanners';

interface JobCardProps {
  job: Job;
  isSaved?: boolean;
  onToggleSave?: (jobId: string) => void | Promise<void>;
  isApplied?: boolean;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  isSaved = false,
  onToggleSave,
  isApplied = false,
}) => {
  const { t, lang } = useLanguage();
  const banner = getJobCardBanner(job);

  return (
    <div className="group relative rounded-2xl overflow-hidden border border-slate-800/80 hover:border-slate-700 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between p-5 bg-slate-950 focus-within:ring-2 focus-within:ring-emerald-500">
      {/* Realistic Vehicle/Logistics Photography Background */}
      <img
        src={banner.url}
        alt={banner.alt}
        className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
        loading="lazy"
      />
      {/* Multi-stop dark gradient overlay for crisp text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/85 to-slate-950/50 transition-colors" />

      {/* Top Row: Company logo/icon, category pill, and bookmark */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            to={`/jobs?q=${encodeURIComponent(job.companyName)}`}
            title={`View all jobs from ${job.companyName}`}
            className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-1 flex items-center justify-center shrink-0 overflow-hidden hover:border-emerald-400 transition-colors"
          >
            {job.companyLogo ? (
              <img
                src={job.companyLogo}
                alt={job.companyName}
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Building2 className="w-5 h-5 text-slate-300" />
            )}
          </Link>
          <div className="min-w-0">
            <Link
              to={`/jobs?q=${encodeURIComponent(job.companyName)}`}
              className="text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1 transition-colors truncate"
            >
              <span className="truncate">{job.companyName}</span>
              <span title={t('Verified Employer')}>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </span>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md border border-white/20 text-slate-200 shadow-sm">
            {t(job.category).toUpperCase()}
          </span>

          {onToggleSave && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSave(job.id);
              }}
              title={isSaved ? 'Remove from saved' : 'Save job'}
              aria-label={isSaved ? 'Remove from saved' : 'Save job'}
              className={`p-1.5 rounded-lg backdrop-blur-md transition-all cursor-pointer border ${
                isSaved
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                  : 'bg-white/10 text-white/80 hover:text-amber-400 hover:bg-white/20 border-white/15'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-slate-950' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Middle Section: Title, Badges, Highlights & Description */}
      <div className="relative z-10 space-y-2.5 pt-5 pb-3">
        <div>
          <Link
            to={`/jobs/${job.id}`}
            className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors font-display line-clamp-1 block"
          >
            {job.title}
          </Link>
        </div>

        {/* Translucent Badges strip */}
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/10 backdrop-blur-md border border-white/10 text-slate-300">
            {t(job.employmentType)}
          </span>
          {job.drivingLicenseRequired === false ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              ✓ No License Needed
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/10 backdrop-blur-md border border-white/10 text-slate-300">
              🪪 License Required
            </span>
          )}
          {job.nightShift && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              🌙 Night Allowance
            </span>
          )}
        </div>

        {/* Highlights: Salary, Location, Experience */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 py-2 border-t border-white/10">
          <div className="flex items-center gap-1 font-bold text-emerald-400 col-span-2">
            <IndianRupee className="w-3.5 h-3.5 shrink-0" />
            <span>{formatSalaryDisplay(job.salaryMin, job.salaryMax, lang)}</span>
          </div>

          <div className="flex items-center gap-1 truncate text-slate-300">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{job.location}</span>
          </div>

          <div className="flex items-center gap-1 text-slate-300">
            <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{t('Exp: {exp}', { exp: job.experienceRequired })}</span>
          </div>
        </div>

        {job.description && (
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {job.description}
          </p>
        )}
      </div>

      {/* Bottom Row: Vacancies Count & Action / Arrow CTA */}
      <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 leading-none tracking-tight">
            {job.vacancies || 1}
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-200 tracking-wider uppercase leading-none">
            {lang === 'kn' ? 'ಖಾಲಿ ಹುದ್ದೆಗಳು' : 'VACANCIES'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isApplied ? (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {t('Applied')}
            </span>
          ) : (
            <Link
              to={`/jobs/${job.id}`}
              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white/90 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm"
              title={t('View Job')}
              aria-label={`${t('View Job')} ${job.title}`}
            >
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
