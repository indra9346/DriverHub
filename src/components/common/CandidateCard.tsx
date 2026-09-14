import React from 'react';
import { 
  MapPin, Award, CheckCircle2, ShieldCheck, Phone, Mail, 
  Briefcase, IndianRupee, FileText, ChevronRight, User 
} from 'lucide-react';
import { DriverProfile } from '../../types';

interface CandidateCardProps {
  driver: DriverProfile;
  onSelect?: (driver: DriverProfile) => void;
  showContact?: boolean;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  driver,
  onSelect,
  showContact = false,
}) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-subtle hover:shadow-card hover:border-slate-300 transition-all flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-start gap-3.5 mb-3.5">
          <div className="w-13 h-13 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden shrink-0 shadow-subtle">
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

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-bold text-[#08233F] truncate">
                {driver.fullName}
              </h3>
              <span title="License Verified">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="badge-category text-[11px] bg-blue-50 text-blue-800">
                {driver.driverCategory}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {driver.experienceYears} Years Exp
              </span>
            </div>
          </div>
        </div>

        {/* Location & License info */}
        <div className="space-y-1.5 py-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{driver.location}, {driver.state}</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{driver.licenseType}</span>
          </div>
          {driver.expectedSalary && (
            <div className="flex items-center gap-2 text-[#08233F] font-bold">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Expected: ₹{driver.expectedSalary.toLocaleString('en-IN')}/mo</span>
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
          <div className="flex flex-wrap gap-1.5 mt-3">
            {driver.skills.slice(0, 3).map((skill, index) => (
              <span
                key={index}
                className="bg-slate-100 text-slate-700 text-[11px] px-2.5 py-0.5 rounded-md font-medium"
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
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {driver.availability}
        </span>

        {onSelect && (
          <button
            onClick={() => onSelect(driver)}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-[#08233F] hover:bg-[#051626] text-white text-xs font-bold rounded-xl shadow-subtle transition-all duration-150 cursor-pointer"
          >
            View Candidate <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
