import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Briefcase, Users, Award, Clock, PlusCircle, ArrowRight, 
  Building2, CheckCircle2, ShieldCheck, ChevronRight, FileText 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { Job, Application, EmployerProfile } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useLanguage } from '../../services/i18n';

export const EmployerDashboard: React.FC = () => {
  const { t } = useLanguage();
  const currentUser = DataStore.getCurrentUser();
  const [company, setCompany] = useState<EmployerProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  const loadDashboard = () => {
    if (!currentUser) return;
    const c = DataStore.getEmployerById(currentUser.id) || {
      id: currentUser.id, companyName: '', contactPerson: '',
      email: currentUser.email, phone: currentUser.phone || '', industry: '', location: '',
      city: '', state: '', verified: false, status: 'pending' as const,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    setCompany(c);

    const empJobs = DataStore.getJobs().filter(j => j.employerId === currentUser.id);
    setJobs(empJobs);

    const jobIds = empJobs.map(j => j.id);
    const empApps = DataStore.getApplications().filter(a => jobIds.includes(a.jobId));
    setApplications(empApps);
  };

  useEffect(() => {
    loadDashboard();
    window.addEventListener('driverhub_storage_updated', loadDashboard);
    return () => window.removeEventListener('driverhub_storage_updated', loadDashboard);
  }, [currentUser]);

  const activeJobs = jobs.filter(j => j.status === 'active').length;
  const pendingJobs = jobs.filter(j => j.status === 'pending').length;
  const shortlistedCount = applications.filter(a => a.status === 'shortlisted' || a.status === 'interview' || a.status === 'selected').length;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-brand-navy rounded-2xl p-6 sm:p-8 text-white shadow-elevated flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-brand-amber text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> {company?.verified ? t('Verified Fleet Employer') : t('Verification pending')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display">
            {company?.companyName || t('Employer Desk')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            {company?.industry} • {company?.city}, {company?.state}
          </p>
        </div>

        <Link
          to="/employer/post-job"
          className="inline-flex items-center justify-center gap-2 bg-brand-amber hover:bg-amber-400 text-slate-950 font-bold px-5 py-3 rounded-xl text-xs sm:text-sm shadow-md transition-all hover:scale-105 shrink-0 cursor-pointer relative z-10"
        >
          <PlusCircle className="w-4 h-4" /> {t('Post New Driver Vacancy')}
        </Link>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-600">{t('Active Live Jobs')}</span>
            <Briefcase className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-brand-navy font-display">{activeJobs}</p>
          <Link to="/employer/jobs" className="text-[11px] text-brand-blue hover:underline font-semibold">
            {t('Manage listings →')}
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-600">{t('Total Applicants')}</span>
            <Users className="w-4 h-4 text-brand-blue" />
          </div>
          <p className="text-2xl font-bold text-brand-navy font-display">{applications.length}</p>
          <Link to="/employer/applications" className="text-[11px] text-brand-blue hover:underline font-semibold">
            {t('Review pipeline →')}
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-600">{t('Shortlisted Drivers')}</span>
            <Award className="w-4 h-4 text-brand-amber" />
          </div>
          <p className="text-2xl font-bold text-brand-amber font-display">{shortlistedCount}</p>
          <span className="text-[11px] text-slate-500">{t('Scheduled for driving trials')}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-600">{t('Pending Approvals')}</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-700 font-display">{pendingJobs}</p>
          <span className="text-[11px] text-slate-500">{t('Under admin verification')}</span>
        </div>
      </div>

      {/* Main Split: Recent Applicants & Manage Jobs Shortcut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols: Recent Applicants */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-card space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-brand-navy font-display flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-blue" /> {t('Recent Candidate Applications')}
            </h3>
            <Link to="/employer/applications" className="text-xs font-bold text-brand-blue hover:underline">
              {t('View All')} ({applications.length})
            </Link>
          </div>

          {applications.length === 0 ? (
            <p className="text-xs text-slate-400 py-10 text-center">{t('No applications received yet.')}</p>
          ) : (
            <div className="space-y-3 divide-y divide-slate-100">
              {applications.slice(0, 5).map((app) => (
                <div key={app.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-brand-navy">{app.driverName || 'Driver Candidate'}</h4>
                    <p className="text-[11px] text-slate-500">
                      Applied for: <span className="font-semibold text-slate-700">{app.jobTitle}</span> • {app.appliedDate}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Category: {t(app.driverCategory || 'HMV')} • Exp: {app.driverExperienceYears || 3} Years
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={app.status} size="sm" />
                    <Link to="/employer/applications" className="text-xs font-bold text-brand-blue hover:underline">
                      Manage →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 5 Cols: Active Job Postings */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-card space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-brand-navy font-display flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-600" /> {t('Posted Vacancies')}
            </h3>
            <Link to="/employer/jobs" className="text-xs font-bold text-brand-blue hover:underline">
              {t('Manage Vacancy')}
            </Link>
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 space-y-2">
              <Briefcase className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
              <p>{t("You haven't posted any vacancies yet.")}</p>
              <Link to="/employer/post-job" className="inline-block mt-2 px-3 py-1.5 bg-brand-amber text-slate-950 rounded-xl font-bold text-xs">
                {t('Post First Job')}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.slice(0, 4).map((job) => (
                <div key={job.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-brand-navy line-clamp-1">{job.title}</h4>
                    <StatusBadge status={job.status} size="sm" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{job.vacancies} {t('Vacancies')}</span>
                    <span className="font-semibold text-emerald-700">₹{job.salaryMin.toLocaleString('en-IN')} - ₹{job.salaryMax.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
