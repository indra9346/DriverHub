import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Briefcase, Building2, ShieldCheck, Clock, CheckCircle2
} from 'lucide-react';
import { DataStore, isJobOpenForApplications } from '../../services/store';
import { Job, EmployerProfile } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useLanguage } from '../../services/i18n';
import { normaliseAccountStatus } from './AdminUi';

const INCOMPLETE_COMPANY = 'Company profile incomplete';

type DashboardSnapshot = {
  key: string;
  driverCount: number;
  employers: EmployerProfile[];
  pendingJobs: Job[];
  liveJobCount: number;
  pendingDocumentCount: number;
  unverifiedCompanyCount: number;
};

/**
 * Everything the dashboard shows, plus a key built from ids and statuses.
 * Storage events fire for every cache write; the page only re-renders when
 * the key changes.
 */
function readSnapshot(): DashboardSnapshot {
  const drivers = DataStore.getDrivers();
  const employers = DataStore.getEmployers();
  const jobs = DataStore.getJobs();
  const pendingJobs = jobs.filter(job => job.status === 'pending');
  const liveJobs = jobs.filter(job => isJobOpenForApplications(job));
  const pendingDocumentIds = drivers.flatMap(driver => (driver.documents || [])
    .filter(document => document.verificationStatus === 'pending')
    .map(document => document.id));
  const unverifiedCompanies = employers.filter(employer =>
    !employer.verified && employer.companyName !== INCOMPLETE_COMPANY && normaliseAccountStatus(employer.status) !== 'blocked');
  const key = [
    drivers.length,
    pendingJobs.map(job => `${job.id}:${job.title}:${job.city}`).join(','),
    liveJobs.map(job => job.id).join(','),
    pendingDocumentIds.join(','),
    employers.map(employer => `${employer.id}:${employer.verified ? 1 : 0}:${employer.status}:${employer.companyName}`).join(',')
  ].join('|');
  return {
    key,
    driverCount: drivers.length,
    employers,
    pendingJobs,
    liveJobCount: liveJobs.length,
    pendingDocumentCount: pendingDocumentIds.length,
    unverifiedCompanyCount: unverifiedCompanies.length
  };
}

export const AdminDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(readSnapshot);

  useEffect(() => {
    const refresh = () => setSnapshot(previous => {
      const next = readSnapshot();
      return next.key === previous.key ? previous : next;
    });
    refresh();
    window.addEventListener('driverhub_storage_updated', refresh);
    // Jobs expire with time, not only with data changes.
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener('driverhub_storage_updated', refresh);
      window.clearInterval(timer);
    };
  }, []);

  const { driverCount, employers, pendingJobs, liveJobCount, pendingDocumentCount, unverifiedCompanyCount } = snapshot;
  const pendingApprovalCount = pendingJobs.length + pendingDocumentCount + unverifiedCompanyCount;
  const breakdown = [
    { label: t('jobsLabel'), count: pendingJobs.length, to: '/admin/jobs' },
    { label: t('documentsLabel'), count: pendingDocumentCount, to: '/admin/documents' },
    { label: t('companiesLabel'), count: unverifiedCompanyCount, to: '/admin/employers' }
  ];
  // "Requires action" opens the first queue that has work in it.
  const actionTarget = breakdown.find(item => item.count > 0)?.to || '/admin/jobs';

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      {/* Header */}
      <div className="bg-[#08233F] rounded-2xl p-5 sm:p-8 text-white shadow-elevated flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="relative z-10 space-y-1 min-w-0">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/10 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> {t('superadminPortal')}
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-display text-white break-words">
            {t('adminDashboardTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            {t('adminDashboardSubtitle')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 relative z-10">
          <Link
            to="/admin/jobs"
            className="inline-flex min-h-10 items-center justify-center px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-xs text-center"
          >
            {t('reviewPendingJobs')} ({pendingJobs.length})
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-card space-y-1 min-w-0">
          <div className="flex items-center justify-between gap-2 text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-600 min-w-0">{t('totalDrivers')}</span>
            <Users className="w-4 h-4 shrink-0 text-brand-blue" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-brand-navy font-display">{driverCount}</p>
          <Link to="/admin/candidates" className="inline-flex min-h-10 max-w-full items-center text-[11px] text-brand-blue hover:underline font-semibold">
            <span className="truncate">{t('manageCandidates')} →</span>
          </Link>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-card space-y-1 min-w-0">
          <div className="flex items-center justify-between gap-2 text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-600 min-w-0">{t('registeredFleets')}</span>
            <Building2 className="w-4 h-4 shrink-0 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-brand-navy font-display">{employers.length}</p>
          <Link to="/admin/employers" className="inline-flex min-h-10 max-w-full items-center text-[11px] text-brand-blue hover:underline font-semibold">
            <span className="truncate">{t('verifyCompanies')} →</span>
          </Link>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-card space-y-1 min-w-0">
          <div className="flex items-center justify-between gap-2 text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-600 min-w-0">{t('activeJobs')}</span>
            <Briefcase className="w-4 h-4 shrink-0 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 font-display">{liveJobCount}</p>
          <span className="text-[10px] sm:text-[11px] text-slate-500 block truncate">{t('liveOnPortal')}</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-card space-y-1 min-w-0">
          <div className="flex items-center justify-between gap-2 text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-600 min-w-0">{t('pendingApprovals')}</span>
            <Clock className="w-4 h-4 shrink-0 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-amber-600 font-display">{pendingApprovalCount}</p>
          <p className="text-[10px] sm:text-[11px] text-slate-500 break-words">
            {breakdown.map(item => `${item.label} ${item.count}`).join(' · ')}
          </p>
          <Link to={actionTarget} className="inline-flex min-h-10 max-w-full items-center text-[11px] text-amber-700 font-bold hover:underline">
            <span className="truncate">{t('requiresAction')} →</span>
          </Link>
        </div>
      </div>

      {/* Moderation Queue & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left 7 Cols: Pending Jobs Moderation */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-card space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm sm:text-base font-bold text-brand-navy font-display flex items-center gap-2 min-w-0">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{t('pendingJobs')} ({pendingJobs.length})</span>
            </h3>
            <Link to="/admin/jobs" className="inline-flex min-h-10 items-center text-xs font-bold text-brand-blue hover:underline shrink-0">
              {t('moderateQueue')}
            </Link>
          </div>

          {pendingJobs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
              {t('allJobsReviewed')}
            </div>
          ) : (
            <div className="space-y-3">
              {pendingJobs.slice(0, 6).map((job) => (
                <div key={job.id} className="p-3.5 sm:p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs font-bold text-brand-navy truncate">{job.title}</h4>
                    <p className="text-[11px] text-slate-500 truncate">{job.companyName} • {t(job.category)} • {job.city}</p>
                  </div>
                  <Link
                    to="/admin/jobs"
                    className="inline-flex min-h-10 items-center justify-center px-3 py-1.5 bg-[#08233F] hover:bg-[#051626] text-white text-xs font-semibold rounded-lg shrink-0 text-center transition-all"
                  >
                    {t('reviewAndApprove')}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 5 Cols: Employer Accounts */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-card space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm sm:text-base font-bold text-brand-navy font-display flex items-center gap-2 min-w-0">
              <Building2 className="w-4 h-4 text-brand-blue shrink-0" />
              <span>{t('employerAccounts')}</span>
            </h3>
            <Link to="/admin/employers" className="inline-flex min-h-10 items-center text-xs font-bold text-brand-blue hover:underline shrink-0">
              {t('viewAll')}
            </Link>
          </div>

          <div className="space-y-3">
            {employers.slice(0, 4).map((emp) => (
              <div key={emp.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-brand-navy truncate">{emp.companyName}</h4>
                  <p className="text-[11px] text-slate-500 truncate">{[emp.industry, emp.city].filter(Boolean).join(' • ')}</p>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={normaliseAccountStatus(emp.status) === 'blocked' ? 'blocked' : emp.verified ? 'verified' : 'pending'} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
