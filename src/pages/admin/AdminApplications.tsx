import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LoaderCircle, RotateCw, Search, X } from 'lucide-react';
import { DataStore } from '../../services/store';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { ApplicationStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useLanguage } from '../../services/i18n';
import { AdminApplicationRow, fetchAdminApplications, formatAdminDate, subscribeToTables } from '../../services/adminApi';

type StatusGroup = 'applied' | 'under_review' | 'shortlisted' | 'interview' | 'selected' | 'rejected' | 'withdrawn';
type StatusFilter = 'all' | StatusGroup;

const FILTERS: StatusFilter[] = ['all', 'applied', 'under_review', 'shortlisted', 'interview', 'selected', 'rejected', 'withdrawn'];

/** Related statuses share a filter: viewed -> under review, contacted -> shortlisted, hired -> selected. */
const groupOf = (status: ApplicationStatus): StatusGroup => {
  if (status === 'viewed' || status === 'under_review') return 'under_review';
  if (status === 'contacted' || status === 'shortlisted') return 'shortlisted';
  if (status === 'hired' || status === 'selected') return 'selected';
  return status;
};

// Deployments without Supabase read the local cache instead.
const LIVE_DATA = isSupabaseConfigured;

export const AdminApplications: React.FC = () => {
  const { t, lang } = useLanguage();
  const [rows, setRows] = useState<AdminApplicationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  // Bumped on storage updates so job titles and driver names re-resolve.
  const [directoryVersion, setDirectoryVersion] = useState(0);
  const requestSeq = useRef(0);
  const live = LIVE_DATA;
  const tRef = useRef(t);
  tRef.current = t;

  const load = useCallback(async (silent = false) => {
    const seq = ++requestSeq.current;
    if (silent) setRefreshing(true);
    try {
      if (!live) {
        const cached = DataStore.getApplications();
        setRows(cached.map(app => ({
          id: app.id, jobId: app.jobId, driverId: app.driverId, status: app.status,
          appliedDate: app.appliedDate, interviewDate: app.interviewDate
        })));
        setTotal(cached.length);
        setPhase('ready');
        setError('');
        return;
      }
      const result = await fetchAdminApplications();
      if (seq !== requestSeq.current) return;
      setRows(result.rows);
      setTotal(result.total);
      setPhase('ready');
      setError('');
    } catch (cause) {
      if (seq !== requestSeq.current) return;
      const message = tRef.current('applicationsLoadFailed');
      setError(cause instanceof Error && cause.message ? `${message} ${cause.message}` : message);
      // Keep a list that loaded earlier visible; only the first load shows the error state.
      setPhase(current => (current === 'ready' ? 'ready' : 'error'));
    } finally {
      if (seq === requestSeq.current) setRefreshing(false);
    }
  }, [live]);

  useEffect(() => {
    void load();
    const onStorage = () => {
      setDirectoryVersion(version => version + 1);
      if (!live) void load(true);
    };
    window.addEventListener('driverhub_storage_updated', onStorage);
    const unsubscribe = live ? subscribeToTables(['applications'], () => { void load(true); }) : () => undefined;
    return () => {
      window.removeEventListener('driverhub_storage_updated', onStorage);
      unsubscribe();
    };
  }, [load, live]);

  // Names come from the admin directory cache (all jobs and drivers).
  const directory = useMemo(() => {
    const jobs = new Map(DataStore.getJobs().map(job => [job.id, job]));
    const drivers = new Map(DataStore.getDrivers().map(driver => [driver.id, driver]));
    const cachedApps = new Map(DataStore.getApplications().map(app => [app.id, app]));
    return { jobs, drivers, cachedApps };
  }, [directoryVersion]);

  const enriched = useMemo(() => rows.map(row => {
    const job = directory.jobs.get(row.jobId);
    const cached = directory.cachedApps.get(row.id);
    return {
      ...row,
      jobTitle: job?.title || cached?.jobTitle || '',
      companyName: job?.companyName || cached?.companyName || '',
      driverName: directory.drivers.get(row.driverId)?.fullName || cached?.driverName || ''
    };
  }), [rows, directory]);

  const counts = useMemo(() => {
    const result = Object.fromEntries(FILTERS.map(filter => [filter, 0])) as Record<StatusFilter, number>;
    for (const app of enriched) {
      result.all += 1;
      const group = groupOf(app.status);
      if (group in result) result[group] += 1;
    }
    return result;
  }, [enriched]);

  const query = search.trim().toLowerCase();
  const filtered = enriched.filter(a =>
    (statusFilter === 'all' || groupOf(a.status) === statusFilter) && (
      !query ||
      a.jobTitle.toLowerCase().includes(query) ||
      a.companyName.toLowerCase().includes(query) ||
      a.driverName.toLowerCase().includes(query)
    )
  );

  const filterLabel = (filter: StatusFilter) => ({
    all: t('all'), applied: t('applied'), under_review: t('underReview'), shortlisted: t('shortlisted'),
    interview: t('interview'), selected: t('selected'), rejected: t('rejected'), withdrawn: t('withdrawn')
  }[filter]);

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-brand-navy font-display">{t('globalApplicationsAuditLog')}</h1>
          <p className="text-xs text-slate-500 mt-1">{t('globalApplicationsSubtitle')}</p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchApplicationsPlaceholder')}
              aria-label={t('searchApplicationsPlaceholder')}
              className="w-full min-h-10 pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-amber"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label={t('clearSearch')}
                className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => { void load(true); }}
            disabled={refreshing || phase === 'loading'}
            aria-label={t('refresh')}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
          >
            <RotateCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1.5" role="group" aria-label={t('filterApplicationsByStatus')}>
        {FILTERS.map(filter => (
          <button
            key={filter}
            type="button"
            onClick={() => setStatusFilter(filter)}
            aria-pressed={statusFilter === filter}
            className={`min-h-10 shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              statusFilter === filter ? 'bg-white text-brand-navy shadow-xs' : 'text-slate-500 hover:text-brand-navy'
            }`}
          >
            {filterLabel(filter)} ({counts[filter]})
          </button>
        ))}
      </div>

      {error && phase !== 'error' && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 break-words">{error}</p>
      )}

      {phase === 'ready' && total > rows.length && (
        <p className="text-xs text-slate-500">{t('showingNewest', { shown: rows.length, total })}</p>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card divide-y divide-slate-100 overflow-hidden">
        {phase === 'loading' ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin" /> {t('loading')}
          </div>
        ) : phase === 'error' ? (
          <div role="alert" className="space-y-3 p-8 text-center">
            <p className="text-sm font-semibold text-red-700 break-words">{error || t('applicationsLoadFailed')}</p>
            <button
              type="button"
              onClick={() => { setPhase('loading'); void load(); }}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <RotateCw className="h-4 w-4" /> {t('retry')}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {query ? t('noMatchingResults') : statusFilter !== 'all' ? t('noApplicationsInFilter') : t('noCandidateApps')}
          </div>
        ) : filtered.map((app) => (
          <div key={app.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-xs font-bold text-brand-navy break-words">{app.driverName || t('driverCandidate')}</span>
                <span className="text-slate-400 text-xs">{t('appliedFor')}</span>
                <span className="text-xs font-bold text-brand-blue break-words">{app.jobTitle || '—'}</span>
                <StatusBadge status={app.status} size="sm" />
              </div>
              <p className="text-xs text-slate-500 break-words">
                {t('forEmployer')}: <span className="font-semibold text-slate-800">{app.companyName || '—'}</span>
                {app.appliedDate && <> • {t('appliedOn')} {formatAdminDate(app.appliedDate, lang)}</>}
              </p>
              {app.interviewDate && (
                <p className="text-xs text-purple-700 font-semibold">
                  🗓️ {t('scheduledInterview')}: {formatAdminDate(app.interviewDate, lang, true)}
                </p>
              )}
            </div>

            <span className="hidden sm:block text-[11px] text-slate-400 font-mono break-all md:max-w-[14rem] md:text-right">
              {t('applicationId')}: {app.id}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
