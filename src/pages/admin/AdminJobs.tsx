import React, { useState, useEffect, useMemo } from 'react';
import {
  Check, X, Eye, CheckCircle2, LoaderCircle
} from 'lucide-react';
import { DataStore, isJobOpenForApplications } from '../../services/store';
import { SupabaseSync } from '../../services/supabaseSync';
import { Job, JobStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useLanguage } from '../../services/i18n';
import { PanIndiaLocationSelector } from '../../components/common/PanIndiaLocationSelector';
import { matchesPanIndiaLocationFilter, StructuredPanIndiaLocation } from '../../services/indiaLocationService';
import { formatAdminDate, logAdminAction } from '../../services/adminApi';
import { AdminModal, ConfirmDialog } from './AdminUi';

type JobBucket = 'pending' | 'active' | 'expired' | 'draft' | 'closed' | 'rejected';
type JobFilter = JobBucket | 'all';

const FILTERS: JobFilter[] = ['pending', 'active', 'expired', 'draft', 'closed', 'rejected', 'all'];

/** "Expired" is a live job whose expiry or application deadline has passed. */
const bucketOf = (job: Job): JobBucket =>
  job.status === 'active' ? (isJobOpenForApplications(job) ? 'active' : 'expired') : job.status;

const formatRupees = (value: number) => `₹${(Number(value) || 0).toLocaleString('en-IN')}`;

export const AdminJobs: React.FC = () => {
  const { t, lang } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<JobFilter>('pending');
  const [locationFilter, setLocationFilter] = useState<StructuredPanIndiaLocation>({
    state: '',
    district: '',
    city: '',
    pincode: '',
    formattedLocation: ''
  });
  const [selectedJobId, setSelectedJobId] = useState('');
  const [rejectTarget, setRejectTarget] = useState<Job | null>(null);
  const [rejectError, setRejectError] = useState('');
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadJobs = () => {
    setJobs(DataStore.getJobs());
  };

  useEffect(() => {
    loadJobs();
    const refresh = () => loadJobs();
    window.addEventListener('driverhub_storage_updated', refresh);
    return () => window.removeEventListener('driverhub_storage_updated', refresh);
  }, []);

  const selectedJob = selectedJobId ? jobs.find(job => job.id === selectedJobId) || null : null;

  /** Returns the error message, or '' when the change was saved. */
  const updateStatus = async (job: Job, status: JobStatus, reason?: string): Promise<string> => {
    setWorkingId(job.id);
    setError('');
    setNotice('');
    // Don't let an older, unrelated failure message be shown for this change.
    SupabaseSync.lastError = '';
    try {
      const updated = await DataStore.updateJobStatus(job.id, status);
      if (!updated) return DataStore.getLastError(t('jobUpdateFailed'));
      // The moderation is saved either way. A rejection reason is only stored in
      // the moderation log, so say so when that entry could not be written.
      const logged = await logAdminAction({
        targetType: 'job',
        targetId: job.id,
        action: status === 'active' ? 'approve' : status === 'rejected' ? 'reject' : 'close',
        reason
      });
      loadJobs();
      if (reason?.trim() && !logged) {
        setNotice(t('jobRejectedReasonNotSaved'));
        return '';
      }
      setNotice(status === 'active' ? t('jobApprovedNotice') : status === 'rejected' ? t('jobRejectedNotice') : t('jobClosedNotice'));
      return '';
    } catch (cause) {
      return cause instanceof Error ? cause.message : t('jobUpdateFailed');
    } finally {
      setWorkingId('');
    }
  };

  const handleUpdateStatus = async (job: Job, status: JobStatus) => {
    const failure = await updateStatus(job, status);
    if (failure) setError(failure);
  };

  const openReject = (job: Job) => {
    setRejectError('');
    setRejectTarget(job);
  };

  const confirmReject = async (reason: string) => {
    if (!rejectTarget) return;
    setRejectError('');
    const failure = await updateStatus(rejectTarget, 'rejected', reason);
    if (failure) {
      setRejectError(failure);
      return;
    }
    setRejectTarget(null);
    setSelectedJobId('');
  };

  const counts = useMemo(() => {
    const result: Record<JobFilter, number> = { pending: 0, active: 0, expired: 0, draft: 0, closed: 0, rejected: 0, all: jobs.length };
    for (const job of jobs) {
      const bucket = bucketOf(job);
      if (bucket in result) result[bucket] += 1;
    }
    return result;
  }, [jobs]);

  const filtered = jobs.filter((j) => {
    if (filter !== 'all' && bucketOf(j) !== filter) return false;
    return matchesPanIndiaLocationFilter(
      {
        state: j.state,
        district: j.district,
        city: j.city,
        pincode: j.pincode,
        location: j.location
      },
      locationFilter
    );
  });

  const renderActions = (job: Job, inModal: boolean) => {
    const busy = workingId === job.id;
    const bucket = bucketOf(job);
    return (
      <>
        {job.status === 'pending' && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => { void handleUpdateStatus(job, 'active'); }}
              className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
            >
              {busy ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {inModal ? t('approveJobNow') : t('approveAndPublish')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => openReject(job)}
              className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg bg-red-100 px-3.5 py-2 text-xs font-bold text-red-700 transition-all hover:bg-red-200 disabled:opacity-60 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> {t('reject')}
            </button>
          </>
        )}

        {(bucket === 'active' || bucket === 'expired') && (
          <button
            type="button"
            disabled={busy}
            onClick={() => { void handleUpdateStatus(job, 'closed'); }}
            className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg bg-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-800 transition-all hover:bg-slate-300 disabled:opacity-60 cursor-pointer"
          >
            {busy && <LoaderCircle className="w-3.5 h-3.5 animate-spin" />} {t('suspendClose')}
          </button>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-brand-navy font-display">{t('jobVacanciesModeration')}</h1>
          <p className="text-xs text-slate-500 mt-1">{t('jobModerationSubtitle')}</p>
        </div>

        {/* Filter Pills */}
        <div className="flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1.5" role="group" aria-label={t('status')}>
          {FILTERS.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilter(st)}
              aria-pressed={filter === st}
              className={`min-h-10 shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                filter === st
                  ? 'bg-white text-brand-navy shadow-xs'
                  : 'text-slate-500 hover:text-brand-navy'
              }`}
            >
              {t(st)} ({counts[st]})
            </button>
          ))}
        </div>
      </div>

      {/* Pan-India Dependent Location Filter */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-card">
        <PanIndiaLocationSelector
          value={locationFilter}
          onChange={setLocationFilter}
          mode="filter"
          layout="grid-4"
          idPrefix="admin-jobs-loc"
        />
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 break-words">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-slate-200 shadow-card space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-brand-navy font-display">{t('noJobsInCategory')}</h3>
          <p className="text-xs text-slate-500">{t('allSubmissionsModerated')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => {
            const bucket = bucketOf(job);
            return (
              <div
                key={job.id}
                className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge-category text-[11px] bg-brand-surface text-brand-blue border border-slate-200">
                      {t(job.category)}
                    </span>
                    <StatusBadge status={bucket === 'expired' ? 'expired' : job.status} size="sm" />
                    {job.postedDate && (
                      <span className="text-[11px] text-slate-400">{t('posted')} {formatAdminDate(job.postedDate, lang)}</span>
                    )}
                    <span className="hidden sm:inline text-[11px] text-slate-400 break-all">{t('jobId')}: {job.id}</span>
                  </div>

                  <h3 className="text-base font-bold text-brand-navy font-display break-words">{job.title}</h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 min-w-0">
                    <span className="font-semibold text-slate-900 break-words min-w-0">🏢 {job.companyName}</span>
                    <span className="break-words min-w-0">📍 {job.location}</span>
                    <span className="font-bold text-emerald-700">💰 {formatRupees(job.salaryMin)} - {formatRupees(job.salaryMax)}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-extrabold text-emerald-600 text-sm">{job.vacancies}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('vacancies')}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedJobId(job.id)}
                    className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-200 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> {t('inspect')}
                  </button>
                  {renderActions(job, false)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspect Modal */}
      <AdminModal
        open={Boolean(selectedJob)}
        onClose={() => setSelectedJobId('')}
        eyebrow={t('moderationInspection')}
        title={selectedJob?.title}
        subtitle={selectedJob?.companyName}
        footer={selectedJob && (
          <>
            <button
              type="button"
              onClick={() => setSelectedJobId('')}
              className="min-h-10 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              {t('close')}
            </button>
            {renderActions(selectedJob, true)}
          </>
        )}
      >
        {selectedJob && (
          <div className="space-y-3 text-xs text-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={bucketOf(selectedJob) === 'expired' ? 'expired' : selectedJob.status} size="sm" />
              <span className="text-[11px] text-slate-400 break-all">{t('jobId')}: {selectedJob.id}</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl space-y-1 break-words">
              <p><span className="font-semibold text-slate-900">{t('category')}:</span> {t(selectedJob.category)}</p>
              <p><span className="font-semibold text-slate-900">{t('location')}:</span> {selectedJob.location}</p>
              <p><span className="font-semibold text-slate-900">{t('salary')}:</span> {formatRupees(selectedJob.salaryMin)} - {formatRupees(selectedJob.salaryMax)}</p>
              <p><span className="font-semibold text-slate-900">{t('vacancies')}:</span> {selectedJob.vacancies}</p>
              {selectedJob.workingHours && <p><span className="font-semibold text-slate-900">{t('shifts')}:</span> {selectedJob.workingHours}</p>}
              {selectedJob.postedDate && <p><span className="font-semibold text-slate-900">{t('posted')}:</span> {formatAdminDate(selectedJob.postedDate, lang)}</p>}
              {selectedJob.expiresAt && <p><span className="font-semibold text-slate-900">{t('expires')}:</span> {formatAdminDate(selectedJob.expiresAt, lang)}</p>}
            </div>

            <div>
              <span className="font-semibold text-slate-900 block mb-1">{t('jobDescription')}:</span>
              <p className="p-3 bg-slate-50 rounded-xl whitespace-pre-line break-words text-slate-600 max-h-60 overflow-y-auto">
                {selectedJob.description}
              </p>
            </div>
          </div>
        )}
      </AdminModal>

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        title={t('rejectJobListing')}
        body={rejectTarget && (
          <>
            <span className="font-semibold text-slate-900">{rejectTarget.title}</span>
            {' · '}{rejectTarget.companyName}
          </>
        )}
        confirmLabel={t('confirmReject')}
        busy={Boolean(rejectTarget) && workingId === rejectTarget?.id}
        error={rejectError}
        reason={{
          label: t('rejectReasonLabel'),
          placeholder: t('rejectReasonPlaceholder'),
          help: t('rejectReasonHelp'),
          required: true,
          requiredMessage: t('rejectReasonRequired')
        }}
        onConfirm={(reason) => { void confirmReject(reason); }}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  );
};
