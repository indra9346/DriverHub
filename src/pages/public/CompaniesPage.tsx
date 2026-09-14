import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, MapPin, ShieldCheck, Briefcase, ExternalLink, 
  Search, Users, CheckCircle2 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { EmployerProfile, Job } from '../../types';

export const CompaniesPage: React.FC = () => {
  const [employers, setEmployers] = useState<EmployerProfile[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setEmployers(DataStore.getEmployers());
    setJobs(DataStore.getJobs().filter(j => j.status === 'active'));
  }, []);

  const getCompanyJobCount = (empId: string) => {
    return jobs.filter(j => j.employerId === empId).length;
  };

  const filtered = employers.filter(e => 
    e.companyName.toLowerCase().includes(search.toLowerCase()) ||
    e.industry.toLowerCase().includes(search.toLowerCase()) ||
    e.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#08233F] to-[#173E68] rounded-2xl p-8 text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Verified Employer Directory</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display mt-1 text-white">Top Logistics & Fleet Partners</h1>
          <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-xl">
            Explore verified transport companies, corporate fleets, and schools hiring drivers directly.
          </p>
        </div>

        {/* Search */}
        <div className="w-full md:w-72">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, industry..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((company) => {
          const openJobs = getCompanyJobCount(company.id);
          return (
            <div
              key={company.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Link
                    to={`/jobs?q=${encodeURIComponent(company.companyName)}`}
                    className="w-14 h-14 rounded-xl bg-slate-50 overflow-hidden border border-slate-200 flex items-center justify-center shrink-0 shadow-subtle hover:border-amber-400 transition-colors cursor-pointer"
                  >
                    {company.logoUrl ? (
                      <img src={company.logoUrl} alt={company.companyName} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-7 h-7 text-slate-400" />
                    )}
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/jobs?q=${encodeURIComponent(company.companyName)}`}
                        className="text-base font-bold text-[#08233F] hover:text-blue-700 transition-colors truncate cursor-pointer"
                      >
                        {company.companyName}
                      </Link>
                      {company.verified && (
                        <span title="Verified Employer">
                          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{company.industry}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{company.location}, {company.state}</span>
                  </div>
                  {company.website && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a href={company.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                        {company.website.replace('https://', '')}
                      </a>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                  {company.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {openJobs} Open {openJobs === 1 ? 'Job' : 'Jobs'}
                </span>

                <Link
                  to={`/jobs?q=${encodeURIComponent(company.companyName)}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#08233F] hover:text-amber-600"
                >
                  View Vacancies →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
