import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, AlertCircle } from 'lucide-react';
import { DataStore, isJobOpenForApplications } from '../../services/store';
import { SupabaseSync } from '../../services/supabaseSync';
import { Job } from '../../types';
import { JobCard } from '../../components/common/JobCard';
import { useLanguage } from '../../services/i18n';

export const DriverSavedJobs: React.FC = () => {
  const { t } = useLanguage();
  const currentUser = DataStore.getCurrentUser();
  const userId = currentUser?.id || '';
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [unavailableIds, setUnavailableIds] = useState<string[]>([]);
  const [clearingUnavailable, setClearingUnavailable] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const loadSaved = useCallback(() => {
    if (!userId) return;
    const favIds = new Set(DataStore.getFavorites(userId));
    const saved = DataStore.getJobs().filter(j => favIds.has(j.id));
    // Closed, expired or past-deadline jobs can no longer be applied to.
    const open = saved.filter(job => isJobOpenForApplications(job));
    setSavedJobs(open);
    setUnavailableIds(saved.filter(job => !isJobOpenForApplications(job)).map(job => job.id));
  }, [userId]);

  useEffect(() => {
    loadSaved();
    window.addEventListener('driverhub_storage_updated', loadSaved);
    return () => window.removeEventListener('driverhub_storage_updated', loadSaved);
  }, [loadSaved]);

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 5000);
  };

  const handleRemoveUnavailable = async () => {
    if (!userId || pendingJobId || clearingUnavailable) return;
    setClearingUnavailable(true);
    SupabaseSync.lastError = '';
    let failed = 0;
    try {
      for (const jobId of unavailableIds) {
        if (!DataStore.getFavorites(userId).includes(jobId)) continue;
        const stillSaved = await DataStore.toggleFavorite(userId, jobId);
        if (stillSaved) failed += 1;
      }
    } catch {
      failed = Math.max(failed, 1);
    } finally {
      setClearingUnavailable(false);
      loadSaved();
    }
    if (failed > 0) {
      showToast(DataStore.getLastError('Some saved jobs could not be removed. Check your connection and try again.'));
    }
  };

  const handleToggleSave = async (jobId: string) => {
    if (!userId || pendingJobId || clearingUnavailable) return;
    setPendingJobId(jobId);
    SupabaseSync.lastError = '';
    try {
      const wasSaved = DataStore.getFavorites(userId).includes(jobId);
      const saved = await DataStore.toggleFavorite(userId, jobId);
      if (saved === wasSaved) {
        showToast(DataStore.getLastError('This job could not be removed from your saved list. Check your connection and try again.'));
        return;
      }
      loadSaved();
    } catch {
      showToast('This job could not be removed from your saved list. Check your connection and try again.');
    } finally {
      setPendingJobId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy font-display">{t('Saved Driving Jobs')}</h1>
          <p className="text-xs text-slate-500 mt-1">{t("Bookmarked vacancies you're interested in")}</p>
        </div>
        <Link to="/jobs" className="text-xs font-bold text-brand-blue hover:underline inline-flex items-center min-h-10">
          {t('Search more jobs →')}
        </Link>
      </div>

      {unavailableIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <p className="min-w-0 flex-1">
            {unavailableIds.length === 1
              ? t('1 saved job is no longer accepting applications and is hidden.')
              : t('{count} saved jobs are no longer accepting applications and are hidden.', { count: unavailableIds.length })}
          </p>
          <button
            type="button"
            onClick={handleRemoveUnavailable}
            disabled={clearingUnavailable || Boolean(pendingJobId)}
            className="min-h-10 px-3 rounded-lg border border-slate-300 bg-white font-bold text-brand-navy hover:bg-slate-100 disabled:opacity-60"
          >
            {clearingUnavailable ? t('Removing…') : t('Remove from saved')}
          </button>
        </div>
      )}

      {savedJobs.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-slate-200 shadow-card space-y-3">
          <Heart className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-brand-navy font-display">{t('No saved vacancies yet')}</h3>
          <p className="text-xs text-slate-500">{t('Click the bookmark heart on any job card to save it for quick review.')}</p>
          <Link to="/jobs" className="inline-block mt-2 px-4 py-2.5 bg-brand-navy hover:bg-brand-navy-light text-white rounded-xl text-xs font-bold transition-all">
            {t('Explore Open Jobs')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isSaved={true}
              onToggleSave={handleToggleSave}
            />
          ))}
        </div>
      )}

      {toast && (
        <div
          role="alert"
          className="fixed z-50 left-1/2 -translate-x-1/2 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-6 w-[calc(100%-2rem)] max-w-md flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800 shadow-elevated"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <span className="min-w-0 flex-1 break-words">{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="-my-2 -mr-2 min-h-10 min-w-10 inline-flex items-center justify-center rounded-lg text-red-700 hover:bg-red-100"
            aria-label={t('Close')}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};
