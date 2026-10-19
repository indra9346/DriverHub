import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Building2, MessageSquare } from 'lucide-react';
import { DataStore } from '../../services/store';
import { SupabaseSync } from '../../services/supabaseSync';
import { formatDate, formatDateTime } from '../../services/driverApi';
import { Application, ApplicationStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useLanguage } from '../../services/i18n';

/** Statuses a driver may still withdraw from (the database enforces the same rule). */
const WITHDRAWABLE: ApplicationStatus[] = ['applied', 'viewed', 'under_review', 'shortlisted', 'contacted', 'interview'];

type FilterKey = 'all' | 'in_progress' | 'shortlisted' | 'offers' | 'closed';

const FILTER_STATUSES: Record<Exclude<FilterKey, 'all'>, ApplicationStatus[]> = {
  in_progress: ['applied', 'viewed', 'under_review'],
  shortlisted: ['shortlisted', 'contacted', 'interview'],
  offers: ['selected', 'hired'],
  closed: ['rejected', 'withdrawn'],
};

/** Progress step (1-5) per status; 0 = no timeline (closed). */
const STEP_BY_STATUS: Record<ApplicationStatus, number> = {
  applied: 1,
  viewed: 2,
  under_review: 2,
  shortlisted: 3,
  contacted: 3,
  interview: 4,
  selected: 5,
  hired: 5,
  rejected: 0,
  withdrawn: 0,
};

export const DriverApplications: React.FC = () => {
  const { t } = useLanguage();
  const currentUser = DataStore.getCurrentUser();
  const userId = currentUser?.id || '';
  const [applications, setApplications] = useState<Application[]>([]);
  const [employerByJobId, setEmployerByJobId] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<FilterKey>('all');
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadApps = useCallback(() => {
    if (!userId) return;
    setApplications(DataStore.getApplications().filter(a => a.driverId === userId));
    const employers: Record<string, string> = {};
    for (const job of DataStore.getJobs()) employers[job.id] = job.employerId;
    setEmployerByJobId(employers);
  }, [userId]);

  useEffect(() => {
    loadApps();
    window.addEventListener('driverhub_storage_updated', loadApps);
    return () => window.removeEventListener('driverhub_storage_updated', loadApps);
  }, [loadApps]);

  const handleWithdraw = async (app: Application) => {
    if (withdrawingId) return;
    const confirmed = confirm(
      `Withdraw your application for "${app.jobTitle || 'this job'}"?\n\nWithdrawing is final: you cannot re-apply to this job afterwards.`
    );
    if (!confirmed) return;
    setWithdrawingId(app.id);
    setError('');
    SupabaseSync.lastError = '';
    try {
      const updated = await DataStore.updateApplicationStatus(app.id, 'withdrawn');
      if (!updated) {
        setError(DataStore.getLastError('Your application could not be withdrawn. Refresh the page and try again.'));
        return;
      }
      loadApps();
    } finally {
      setWithdrawingId(null);
    }
  };

  const countFor = (key: FilterKey) =>
    key === 'all' ? applications.length : applications.filter(app => FILTER_STATUSES[key].includes(app.status)).length;

  const filtered = filter === 'all'
    ? applications
    : applications.filter(app => FILTER_STATUSES[filter].includes(app.status));

  const filters: { key: FilterKey; label: string; activeText: string }[] = [
    { key: 'all', label: t('All'), activeText: 'text-brand-navy' },
    { key: 'in_progress', label: t('In Progress'), activeText: 'text-brand-blue' },
    { key: 'shortlisted', label: t('Shortlisted / Interviews'), activeText: 'text-brand-amber' },
    { key: 'offers', label: 'Selected / Hired', activeText: 'text-emerald-700' },
    { key: 'closed', label: t('Closed'), activeText: 'text-slate-700' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy font-display">{t('My Applications')}</h1>
          <p className="text-xs text-slate-500 mt-1">{t('Track status and review interview appointments')}</p>
        </div>

        {/* Filter Pills (wrap on narrow phones instead of overflowing) */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200" role="tablist" aria-label="Filter applications">
          {filters.map(item => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={filter === item.key}
              onClick={() => setFilter(item.key)}
              className={`min-h-10 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === item.key ? `bg-white ${item.activeText} shadow-xs` : 'text-slate-500 hover:text-brand-navy'
              }`}
            >
              {item.label} ({countFor(item.key)})
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 break-words">{error}</p>
      )}

      {/* Applications List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-slate-200 shadow-card space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-brand-navy font-display">{t('No applications in this category')}</h3>
          <p className="text-xs text-slate-500">{t('Apply to open driver vacancies across India')}</p>
          <Link to="/jobs" className="inline-block mt-2 px-4 py-2.5 bg-brand-navy hover:bg-brand-navy-light text-white rounded-xl text-xs font-bold transition-all">
            {t('Search Open Jobs')}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((app) => {
            const step = STEP_BY_STATUS[app.status] ?? 1;
            const canWithdraw = WITHDRAWABLE.includes(app.status);
            const employerId = employerByJobId[app.jobId];
            const canMessage = Boolean(employerId) && app.status !== 'withdrawn';
            return (
              <div
                key={app.id}
                className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-card space-y-5 min-w-0"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono break-all">
                      {t('Application ID')}: #{app.id.slice(0, 8).toUpperCase()}
                    </span>
                    <h3 className="text-base font-bold text-brand-navy font-display mt-0.5 break-words">
                      {app.jobTitle || 'Driver vacancy'}
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 flex items-start gap-1.5 mt-0.5 break-words">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="min-w-0">{app.companyName}{app.companyName ? ' • ' : ''}Applied on {formatDate(app.appliedDate)}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <StatusBadge status={app.status} size="md" kind="application" />
                    {canMessage && (
                      <Link
                        to={`/driver/messages?employerId=${encodeURIComponent(employerId)}&jobId=${encodeURIComponent(app.jobId)}`}
                        className="min-h-10 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-brand-blue hover:bg-slate-50 hover:underline"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Message employer
                      </Link>
                    )}
                    {canWithdraw && (
                      <button
                        type="button"
                        onClick={() => { void handleWithdraw(app); }}
                        disabled={withdrawingId !== null}
                        className="min-h-10 px-3 rounded-lg text-xs text-red-600 hover:text-red-800 hover:bg-red-50 font-semibold disabled:opacity-50"
                      >
                        {withdrawingId === app.id ? 'Withdrawing…' : t('Withdraw')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Timeline Bar */}
                {step > 0 ? (
                  <div className="p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-3">
                    <div className="grid grid-cols-5 gap-1 text-[10px] sm:text-xs font-bold text-slate-700 leading-tight">
                      <span className={`break-words ${step >= 1 ? 'text-brand-blue font-bold' : 'text-slate-400'}`}>{t('1. Applied')}</span>
                      <span className={`break-words text-center ${step >= 2 ? 'text-brand-blue font-bold' : 'text-slate-400'}`}>{t('2. Under Review')}</span>
                      <span className={`break-words text-center ${step >= 3 ? 'text-brand-amber font-bold' : 'text-slate-400'}`}>{t('3. Shortlisted')}</span>
                      <span className={`break-words text-center ${step >= 4 ? 'text-purple-700 font-bold' : 'text-slate-400'}`}>{t('4. Driving Test / Trial')}</span>
                      <span className={`break-words text-right ${step >= 5 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>{t('5. Hired')}</span>
                    </div>

                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 via-amber-400 to-emerald-500 transition-all duration-300"
                        style={{ width: `${(step / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200/70 p-3">
                    {app.status === 'withdrawn'
                      ? 'You withdrew this application.'
                      : 'The employer did not move forward with this application. Keep applying to other open jobs.'}
                  </p>
                )}

                {/* Employer Notes & Interview slot */}
                {(app.employerNotes || app.interviewDate) && (
                  <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200/80 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <MessageSquare className="w-4 h-4 text-brand-amber shrink-0" /> {t('Employer Message & Instructions')}
                    </div>
                    {app.interviewDate && (
                      <p className="text-amber-900 font-semibold break-words">
                        🗓️ Interview Slot: <span className="underline font-bold">{formatDateTime(app.interviewDate)}</span>
                        {app.interviewMode ? ` • ${app.interviewMode}` : ''}
                        {app.interviewLocation ? ` • ${app.interviewLocation}` : ''}
                      </p>
                    )}
                    {app.employerNotes && (
                      <p className="text-amber-800 leading-relaxed break-words">
                        "{app.employerNotes}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
