import React from 'react';
import { 
  MapPin, Award, CheckCircle2, ShieldCheck, IndianRupee, ChevronRight, Sparkles 
} from 'lucide-react';
import { DriverProfile } from '../../types';
import { useLanguage } from '../../services/i18n';
import { getCandidateCardBanner } from '../../services/cardBanners';

interface CandidateCardProps {
  driver: DriverProfile;
  onSelect?: (driver: DriverProfile) => void;
  showContact?: boolean;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  driver,
  onSelect,
}) => {
  const { t } = useLanguage();
  const hasVerifiedLicense = driver.documents?.some(document =>
    document.type === 'driving_license' && document.verificationStatus === 'verified'
  ) ?? false;
  const banner = getCandidateCardBanner(driver);

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/90 shadow-subtle hover:shadow-card hover:border-amber-400 transition-all duration-200 flex flex-col justify-between overflow-hidden">
      
      {/* Realistic Contextual Background Banner representing driving specialization */}
      <div className="relative h-28 sm:h-32 w-full overflow-hidden bg-slate-900 shrink-0">
        <img
          src={banner.url}
          alt={banner.alt}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-950/80 backdrop-blur-md text-amber-400 font-bold text-[11px] border border-amber-400/30">
            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
            {t(driver.driverCategory)}
          </span>

          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-200 bg-slate-950/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/15">
            {t('{count} Yrs Exp', { count: driver.experienceYears })}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5 pt-0 flex-1 flex flex-col justify-between">
        <div>
          {/* Header with Avatar overlapping banner */}
          <div className="flex items-end gap-3.5 -mt-7 mb-2.5">
            <div className="w-14 h-14 rounded-2xl bg-white border-2 border-white overflow-hidden shrink-0 shadow-md relative z-10">
              {driver.avatarUrl ? (
                <img
                  src={driver.avatarUrl}
                  alt={driver.fullName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-700 font-bold text-lg">
                  {driver.fullName.charAt(0)}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-[#08233F] group-hover:text-blue-700 transition-colors truncate">
                  {driver.fullName}
                </h3>
                {hasVerifiedLicense && (
                  <span title={t('License verified')}>
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {driver.currentRole || driver.licenseType}
              </p>
            </div>
          </div>

          {/* Location & License info */}
          <div className="space-y-1.5 py-2.5 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{driver.location}, {driver.state}</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{driver.licenseType}</span>
            </div>
            {driver.expectedSalary && (
              <div className="flex items-center gap-2 text-[#08233F] font-bold">
                <IndianRupee className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{t('Expected: ₹{amt}/mo', { amt: driver.expectedSalary.toLocaleString('en-IN') })}</span>
              </div>
            )}
          </div>

          {/* Bio summary */}
          {driver.bio && (
            <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
              {driver.bio}
            </p>
          )}

          {/* Skills pill tags */}
          {driver.skills && driver.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {driver.skills.slice(0, 3).map((skill, index) => (
                <span
                  key={index}
                  className="bg-slate-100 text-slate-700 text-[11px] px-2 py-0.5 rounded-md font-medium"
                >
                  {skill}
                </span>
              ))}
              {driver.skills.length > 3 && (
                <span className="text-[10px] text-slate-400 px-1 py-0.5">
                  +{driver.skills.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action / Contact strip */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {t(driver.availability)}
          </span>

          {onSelect && (
            <button
              onClick={() => onSelect(driver)}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-[#08233F] hover:bg-amber-500 hover:text-slate-950 text-white text-xs font-bold rounded-xl shadow-subtle transition-all duration-150 cursor-pointer"
            >
              {t('View Candidate')} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

