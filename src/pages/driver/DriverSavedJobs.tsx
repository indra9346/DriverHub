import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Truck, ArrowLeft } from 'lucide-react';
import { DataStore } from '../../services/store';
import { Job } from '../../types';
import { JobCard } from '../../components/common/JobCard';
import { useLanguage } from '../../services/i18n';

export const DriverSavedJobs: React.FC = () => {
  const { t } = useLanguage();
  const currentUser = DataStore.getCurrentUser();
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);

  const loadSaved = () => {
    if (!currentUser) return;
    const favIds = DataStore.getFavorites(currentUser.id);
    const all = DataStore.getJobs().filter(j => favIds.includes(j.id));
    setSavedJobs(all);
  };

  useEffect(() => {
    loadSaved();
    window.addEventListener('driverhub_storage_updated', loadSaved);
    return () => window.removeEventListener('driverhub_storage_updated', loadSaved);
  }, [currentUser]);

  const handleToggleSave = async (jobId: string) => {
    if (!currentUser) return;
    const wasSaved = DataStore.getFavorites(currentUser.id).includes(jobId);
    const saved = await DataStore.toggleFavorite(currentUser.id, jobId);
    if (saved === wasSaved) return;
    loadSaved();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy font-display">{t('Saved Driving Jobs')}</h1>
          <p className="text-xs text-slate-500 mt-1">{t("Bookmarked vacancies you're interested in")}</p>
        </div>
        <Link to="/jobs" className="text-xs font-bold text-brand-blue hover:underline">
          {t('Search more jobs →')}
        </Link>
      </div>

      {savedJobs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-card space-y-3">
          <Heart className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-brand-navy font-display">{t('No saved vacancies yet')}</h3>
          <p className="text-xs text-slate-500">{t('Click the bookmark heart on any job card to save it for quick review.')}</p>
          <Link to="/jobs" className="inline-block mt-2 px-4 py-2 bg-brand-navy hover:bg-brand-navy-light text-white rounded-xl text-xs font-bold transition-all">
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
    </div>
  );
};
