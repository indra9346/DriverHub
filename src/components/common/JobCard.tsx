import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, Clock, IndianRupee, Briefcase, Heart, Building2, 
  CheckCircle2, ArrowRight, ShieldCheck, Users 
} from 'lucide-react';
import { Job } from '../../types';
import { StatusBadge } from './StatusBadge';

interface JobCardProps {
  job: Job;
  isSaved?: boolean;
  onToggleSave?: (jobId: string) => void;
  isApplied?: boolean;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  isSaved = false,
  onToggleSave,
  isApplied = false,
}) => {
  const formatSalary = (min: number, max: number) => {
    return `₹${min.toLocaleString('en-IN')} - ₹${max.toLocaleString('en-IN')} / mo`;
  };

  return (
    <div className="group bg-white rounded-2xl p-5 border border-slate-200/90 shadow-subtle hover:shadow-card hover:border-slate-300 transition-all duration-200 flex flex-col justify-between relative overflow-hidden">
      {/* Top accent strip on hover */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div>
        {/* Header: Company & Action */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <Link
              to={`/jobs?q=${encodeURIComponent(job.companyName)}`}
              title={`View all jobs from ${job.companyName}`}
              className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-subtle hover:border-amber-400 transition-colors cursor-pointer"
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
                <Building2 className="w-5 h-5 text-slate-400" />
              )}
            </Link>

            <div>
              <Link
                to={`/jobs?q=${encodeURIComponent(job.companyName)}`}
                className="text-xs font-semibold text-slate-500 hover:text-blue-700 flex items-center gap-1.5 transition-colors"
              >
                {job.companyName}
                <span title="Verified Employer">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                </span>
              </Link>
              <Link
                to={`/jobs/${job.id}`}
                className="text-sm sm:text-base font-bold text-[#08233F] group-hover:text-blue-700 transition-colors line-clamp-1"
              >
                {job.title}
              </Link>
            </div>
          </div>

          {/* Bookmark / Favorite */}
          {onToggleSave && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onToggleSave(job.id);
              }}
              title={isSaved ? 'Remove from saved' : 'Save job'}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isSaved
                  ? 'bg-amber-50 border-amber-300 text-amber-600'
                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-amber-500' : ''}`} />
            </button>
          )}
        </div>

        {/* Badges strip */}
        <div className="flex flex-wrap gap-2 my-3">
          <Link
            to={`/jobs?category=${encodeURIComponent(job.category)}`}
            className="badge-category bg-blue-50 text-blue-800 border-blue-200/70 hover:bg-blue-100 transition-colors cursor-pointer"
          >
            {job.category}
          </Link>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {job.employmentType}
          </span>
          {job.vacancies > 1 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Users className="w-3 h-3 text-emerald-600" /> {job.vacancies} Vacancies
            </span>
          )}
        </div>

        {/* Highlights: Salary, Location, Experience */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 py-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 font-bold text-[#08233F]">
            <IndianRupee className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{formatSalary(job.salaryMin, job.salaryMax)}</span>
          </div>

          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{job.location}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Exp: {job.experienceRequired}</span>
          </div>

          <div className="flex items-center gap-1.5 truncate">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{job.workingHours}</span>
          </div>
        </div>

        {/* Short description preview */}
        <p className="text-xs text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">
          {job.description}
        </p>
      </div>

      {/* Footer / CTA */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400">
          Posted {job.postedDate}
        </span>

        <div className="flex items-center gap-2">
          {isApplied ? (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Applied
            </span>
          ) : (
            <Link
              to={`/jobs/${job.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#08233F] hover:bg-amber-500 hover:text-slate-950 text-white text-xs font-bold rounded-xl shadow-subtle transition-all duration-150"
            >
              View Job <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
