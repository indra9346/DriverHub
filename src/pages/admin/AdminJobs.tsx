import React, { useState, useEffect } from 'react';
import { 
  Check, X, Eye, CheckCircle2 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { Job, JobStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useLanguage } from '../../services/i18n';

export const AdminJobs: React.FC = () => {
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<string>('pending');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');

  const loadJobs = () => {
    setJobs(DataStore.getJobs());
  };

  useEffect(() => {
    loadJobs();
    const refresh = () => loadJobs();
    window.addEventListener('driverhub_storage_updated', refresh);
    return () => window.removeEventListener('driverhub_storage_updated', refresh);
  }, []);

  const handleUpdateStatus = async (jobId: string, status: JobStatus) => {
    setWorkingId(jobId);
    setError('');
    try {
      const updated = await DataStore.updateJobStatus(jobId, status);
      if (!updated) {
        setError('The job status was not saved. Confirm your administrator access and database connection, then retry.');
        return;
      }
      loadJobs();
      if (selectedJob?.id === jobId) setSelectedJob({ ...selectedJob, status });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the job status.');
    } finally {
      setWorkingId('');
    }
  };

  const filtered = jobs.filter((j) => {
    if (filter === 'all') return true;
    return j.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy font-display">{t('jobVacanciesModeration')}</h1>
          <p className="text-xs text-slate-500 mt-1">{t('jobModerationSubtitle')}</p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto">
          {['pending', 'active', 'closed', 'rejected', 'all'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                filter === st
                  ? 'bg-white text-brand-navy shadow-xs'
                  : 'text-slate-500 hover:text-brand-navy'
              }`}
            >
              {st === 'pending' ? t('pending') : st === 'active' ? t('active') : st === 'closed' ? t('expired') : st === 'rejected' ? t('rejected') : t('all')} ({jobs.filter(j => st === 'all' ? true : j.status === st).length})
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-card space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-brand-navy font-display">{t('noJobsInCategory')}</h3>
          <p className="text-xs text-slate-500">{t('allSubmissionsModerated')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="badge-category text-[11px] bg-brand-surface text-brand-blue border border-slate-200">
                    {t(job.category)}
                  </span>
                  <StatusBadge status={job.status} size="sm" />
                  <span className="text-[11px] text-slate-400">ID: {job.id} • {t('posted')} {job.postedDate}</span>
                </div>

                <h3 className="text-base font-bold text-brand-navy font-display">{job.title}</h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <span className="font-semibold text-slate-900">🏢 {job.companyName}</span>
                  <span>📍 {job.location}</span>
                  <span className="font-bold text-emerald-700">💰 ₹{job.salaryMin.toLocaleString('en-IN')} - ₹{job.salaryMax.toLocaleString('en-IN')}</span>
                  <span>👥 {job.vacancies} {t('openings')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                <button
                  onClick={() => setSelectedJob(job)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Eye className="w-3.5 h-3.5" /> {t('inspect')}
                </button>

                {job.status === 'pending' && (
                  <>
                    <button
                      disabled={workingId === job.id}
                      onClick={() => { void handleUpdateStatus(job.id, 'active'); }}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs cursor-pointer transition-all"
                    >
                      <Check className="w-3.5 h-3.5" /> {t('approveAndPublish')}
                    </button>
                    <button
                      disabled={workingId === job.id}
                      onClick={() => { void handleUpdateStatus(job.id, 'rejected'); }}
                      className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <X className="w-3.5 h-3.5" /> {t('reject')}
                    </button>
                  </>
                )}

                {job.status === 'active' && (
                  <button
                    disabled={workingId === job.id}
                    onClick={() => { void handleUpdateStatus(job.id, 'closed'); }}
                    className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer transition-all"
                  >
                    {t('suspendClose')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inspect Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">{t('moderationInspection')}</span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">{selectedJob.title}</h3>
                <p className="text-xs text-slate-500">{selectedJob.companyName}</p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-slate-400 hover:text-slate-900">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                <p><span className="font-semibold text-slate-900">{t('category')}:</span> {t(selectedJob.category)}</p>
                <p><span className="font-semibold text-slate-900">{t('location')}:</span> {selectedJob.location}</p>
                <p><span className="font-semibold text-slate-900">{t('salary')}:</span> ₹{selectedJob.salaryMin} - ₹{selectedJob.salaryMax}</p>
                <p><span className="font-semibold text-slate-900">{t('shifts')}:</span> {selectedJob.workingHours}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-900 block mb-1">{t('jobDescription')}:</span>
                <p className="p-3 bg-slate-50 rounded-xl whitespace-pre-line text-slate-600 max-h-40 overflow-y-auto">
                  {selectedJob.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600"
              >
                {t('close')}
              </button>
              {selectedJob.status === 'pending' && (
                <button
                  disabled={workingId === selectedJob.id}
                  onClick={() => { void handleUpdateStatus(selectedJob.id, 'active'); }}
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs"
                >
                  {t('approveJobNow')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
