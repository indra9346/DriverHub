import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, Clock, IndianRupee, Briefcase, Heart, Building2, 
  CheckCircle2, ArrowRight, ShieldCheck, Users, Sparkles
} from 'lucide-react';
import { Job } from '../../types';
import { StatusBadge } from './StatusBadge';
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
    <div className="group bg-white rounded-2xl border border-slate-200/90 shadow-subtle hover:shadow-card hover:border-amber-400 transition-all duration-200 flex flex-col justify-between relative overflow-hidden">
      
      {/* 100% Realistic Contextual Background Banner representing vehicle/route data accurately */}
      <div className="relative h-28 sm:h-32 w-full overflow-hidden bg-slate-900 shrink-0">
        <img
          src={banner.url}
          alt={banner.alt}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Subtle photo-darkening & readability gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08233F] via-[#08233F]/50 to-black/30" />
        <div className="absolute inset-0 bg-[radial-gradient(#F5A800_1px,transparent_1px)] opacity-[0.08] [background-size:16px_16px] pointer-events-none" />

        {/* Top Badges over realistic banner */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md text-amber-400 font-bold text-[11px] border border-amber-400/30 shadow-md">
            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
            {t(job.category)}
          </span>

          {/* Bookmark / Favorite */}
          {onToggleSave && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSave(job.id);
              }}
              title={isSaved ? 'Remove from saved' : 'Save job'}
              className={`p-1.5 rounded-lg backdrop-blur-md transition-all cursor-pointer border ${
                isSaved
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                  : 'bg-slate-950/60 text-white hover:text-amber-400 hover:bg-slate-950 border-white/20'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-slate-950' : ''}`} />
            </button>
          )}
        </div>

        {/* Bottom Banner Strip with Route / Vehicle Indicator */}
        <div className="absolute bottom-2 right-2.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-200 bg-slate-950/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/15">
            {job.vehicleType || job.routeType || banner.tag}
          </span>
        </div>
      </div>

      {/* Main Card Content */}
      <div className="p-4 sm:p-5 pt-3 flex-1 flex flex-col justify-between">
        <div>
          {/* Company header with floating logo */}
          <div className="flex items-start gap-3 -mt-7 mb-2.5">
            <Link
              to={`/jobs?q=${encodeURIComponent(job.companyName)}`}
              title={`View all jobs from ${job.companyName}`}
              className="w-12 h-12 rounded-xl bg-white border-2 border-white shadow-md overflow-hidden flex items-center justify-center shrink-0 hover:border-amber-400 transition-colors cursor-pointer relative z-10"
            >
              {job.companyLogo ? (
                <img
                  src={job.companyLogo}
                  alt={job.companyName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Building2 className="w-6 h-6 text-slate-400" />
              )}
            </Link>

            <div className="flex-1 min-w-0 pt-3">
              <Link
                to={`/jobs?q=${encodeURIComponent(job.companyName)}`}
                className="text-xs font-semibold text-slate-600 hover:text-blue-700 flex items-center gap-1.5 transition-colors truncate"
              >
                <span className="truncate">{job.companyName}</span>
                <span title={t('Verified Employer')}>
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                </span>
              </Link>
            </div>
          </div>

          {/* Job Title */}
          <Link
            to={`/jobs/${job.id}`}
            className="text-sm sm:text-base font-bold text-[#08233F] group-hover:text-blue-700 transition-colors line-clamp-1 block mb-2"
          >
            {job.title}
          </Link>

          {/* Badges strip */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
              {t(job.employmentType)}
            </span>
            {job.vacancies > 1 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Users className="w-3 h-3 text-emerald-600" /> {t('{count} Vacancies', { count: job.vacancies })}
              </span>
            )}
            {job.nightShift && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                🌙 Night Allowance
              </span>
            )}
          </div>

          {/* Highlights: Salary, Location, Experience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 py-2.5 border-t border-slate-100">
            <div className="flex items-center gap-1.5 font-bold text-[#08233F]">
              <IndianRupee className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{formatSalaryDisplay(job.salaryMin, job.salaryMax, lang)}</span>
            </div>

            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{job.location}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{t('Exp: {exp}', { exp: job.experienceRequired })}</span>
            </div>

            <div className="flex items-center gap-1.5 truncate">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{job.workingHours}</span>
            </div>
          </div>

          {/* Short description preview */}
          <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
            {job.description}
          </p>
        </div>

        {/* Footer / CTA */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400">
            {t('Posted {date}', { date: job.postedDate })}
          </span>

          <div className="flex items-center gap-2">
            {isApplied ? (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {t('Applied')}
              </span>
            ) : (
              <Link
                to={`/jobs/${job.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#08233F] hover:bg-amber-500 hover:text-slate-950 text-white text-xs font-bold rounded-xl shadow-subtle transition-all duration-150"
              >
                {t('View Job')} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

