import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Briefcase, Heart, Award, ShieldCheck,
  ArrowRight, UploadCloud, Bell
} from 'lucide-react';
import { DataStore, isJobOpenForApplications } from '../../services/store';
import { formatDate, formatDateTime } from '../../services/driverApi';
import { DriverProfile, Job, Application, Notification } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { JobCard } from '../../components/common/JobCard';
import { useLanguage } from '../../services/i18n';

interface CompletionItem {
  key: string;
  weight: number;
  done: boolean;
  to: string;
  cta: string;
  /** Existing translated wording, used instead of cta when present. */
  ctaKey?: string;
}

/** Weighted checklist; every item is counted once and the weights add up to 100. */
const buildCompletionChecklist = (profile: DriverProfile): CompletionItem[] => {
  const documents = profile.documents || [];
  const licenceDocuments = documents.filter(doc => doc.type === 'driving_license');
  const hasVerifiedLicence = licenceDocuments.some(doc => doc.verificationStatus === 'verified');
  const hasPendingLicence = licenceDocuments.some(doc => doc.verificationStatus === 'pending');
  return [
    { key: 'name', weight: 10, done: Boolean(profile.fullName?.trim()), to: '/driver/profile', cta: 'Add your full name' },
    { key: 'phone', weight: 10, done: Boolean(profile.phone?.trim()), to: '/driver/profile', cta: 'Add your phone number' },
    {
      key: 'location', weight: 10, done: Boolean(profile.city?.trim() || profile.location?.trim()),
      to: '/driver/profile', cta: 'Add your location'
    },
    { key: 'category', weight: 10, done: Boolean(profile.driverCategory), to: '/driver/profile', cta: 'Choose your driver category' },
    {
      key: 'experience', weight: 10,
      done: (profile.experienceYears || 0) > 0 || (profile.experienceMonths || 0) > 0 || (profile.experiences?.length || 0) > 0,
      to: '/driver/profile', cta: 'Add your driving experience'
    },
    {
      key: 'licence', weight: 20, done: Boolean(profile.licenseNumber?.trim() && profile.licenseExpiry?.trim()),
      to: '/driver/profile', cta: 'Add your licence number and expiry date'
    },
    { key: 'skills', weight: 10, done: (profile.skills || []).some(skill => skill.trim()), to: '/driver/profile', cta: 'Add your skills' },
    {
      key: 'verified_licence', weight: 20, done: hasVerifiedLicence, to: '/driver/documents',
      cta: hasPendingLicence ? 'Your driving licence is waiting for verification' : 'Upload your driving licence',
      ctaKey: hasPendingLicence ? undefined : 'Upload license documents to reach 100% →'
    }
  ];
};

export const DriverDashboard: React.FC = () => {
  const { t } = useLanguage();
  const currentUser = DataStore.getCurrentUser();
  const userId = currentUser?.id || '';
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [savedOpenCount, setSavedOpenCount] = useState(0);

  const loadDashboard = useCallback(() => {
    if (!userId) return;
    const p = DataStore.getDriverById(userId);
    setProfile(p);

    const apps = DataStore.getApplications().filter(a => a.driverId === userId);
    setApplications(apps);

    setNotifications(DataStore.getNotifications(userId).slice(0, 3));

    const jobs = DataStore.getJobs();
    const favoriteIds = new Set(DataStore.getFavorites(userId));
    setSavedOpenCount(jobs.filter(job => favoriteIds.has(job.id) && isJobOpenForApplications(job)).length);

    // Recommend open jobs in the driver's category or city. Empty values never
    // match (a job without a city must not "match" a driver without one).
    const category = p.driverCategory || '';
    const city = (p.city || '').trim().toLowerCase();
    const appliedJobIds = new Set(apps.map(app => app.jobId));
    const matches = category || city
      ? jobs.filter(job =>
          isJobOpenForApplications(job) &&
          !appliedJobIds.has(job.id) &&
          ((category !== '' && job.category === category) ||
           (city !== '' && (job.city || '').trim().toLowerCase() === city)))
      : [];
    setRecommendedJobs(matches.slice(0, 4));
  }, [userId]);

  useEffect(() => {
    loadDashboard();
    window.addEventListener('driverhub_storage_updated', loadDashboard);
    return () => window.removeEventListener('driverhub_storage_updated', loadDashboard);
  }, [loadDashboard]);

  const checklist = profile ? buildCompletionChecklist(profile) : [];
  const completionRate = Math.min(100, checklist.reduce((score, item) => score + (item.done ? item.weight : 0), 0));
  const nextStep = checklist.find(item => !item.done);
  const shortlistedCount = applications.filter(a =>
    a.status === 'shortlisted' || a.status === 'contacted' || a.status === 'interview' || a.status === 'selected' || a.status === 'hired'
  ).length;
  const profileCity = profile?.city?.trim() || '';
  const profileCategory = profile?.driverCategory || '';

  return (
    <div className="space-y-8">
      {/* Welcome & Profile Status Banner */}
      <div className="bg-brand-navy rounded-2xl p-5 sm:p-8 text-white shadow-elevated flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10 min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-brand-amber text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> {profile?.status === 'active' ? t('Driver account active') : t('Complete your driver profile')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display break-words">
            {t('Welcome back')}, {profile?.fullName || t('Driver')}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 break-words">
            {t(profile?.driverCategory || 'Driver')}{profile?.experienceYears ? ` Specialist • ${profile.experienceYears} Years Experience` : ''}{profile?.location ? ` • ${profile.location}` : ''}
          </p>
        </div>

        {/* Profile Progress Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 w-full md:w-auto md:min-w-[260px] md:max-w-xs space-y-2.5 relative z-10">
          <div className="flex items-center justify-between text-xs font-bold">
            <span>{t('Profile Completion')}</span>
            <span className="text-brand-amber">{completionRate}%</span>
          </div>
          <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-amber rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          {nextStep && (
            <Link
              to={nextStep.to}
              className="text-[11px] text-amber-300 font-semibold hover:underline flex items-center gap-1 min-h-8 break-words"
            >
              {nextStep.ctaKey ? t(nextStep.ctaKey) : `${nextStep.cta} →`}
            </Link>
          )}
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-card space-y-1 min-w-0">
          <div className="flex items-start justify-between gap-2 text-slate-400">
            <span className="text-xs font-semibold text-slate-600 break-words">{t('Total Applications')}</span>
            <FileText className="w-4 h-4 text-brand-blue shrink-0" />
          </div>
          <p className="text-2xl font-bold text-brand-navy font-display">{applications.length}</p>
          <span className="text-[11px] text-slate-500 block">{t('Across verified fleets')}</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-card space-y-1 min-w-0">
          <div className="flex items-start justify-between gap-2 text-slate-400">
            <span className="text-xs font-semibold text-slate-600 break-words">{t('Shortlisted / Interviews')}</span>
            <Award className="w-4 h-4 text-brand-amber shrink-0" />
          </div>
          <p className="text-2xl font-bold text-brand-amber font-display">{shortlistedCount}</p>
          <span className="text-[11px] text-amber-700 font-medium block">{t('Ready for driving trials')}</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-card space-y-1 min-w-0">
          <div className="flex items-start justify-between gap-2 text-slate-400">
            <span className="text-xs font-semibold text-slate-600 break-words">{t('Saved Vacancies')}</span>
            <Heart className="w-4 h-4 text-red-500 shrink-0" />
          </div>
          <p className="text-2xl font-bold text-brand-navy font-display">{savedOpenCount}</p>
          <Link to="/driver/saved" className="text-[11px] text-brand-blue hover:underline font-semibold inline-flex items-center min-h-8">
            {t('View bookmarks →')}
          </Link>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-card space-y-1 min-w-0">
          <div className="flex items-start justify-between gap-2 text-slate-400">
            <span className="text-xs font-semibold text-slate-600 break-words">{t('Uploaded Documents')}</span>
            <UploadCloud className="w-4 h-4 text-emerald-500 shrink-0" />
          </div>
          <p className="text-2xl font-bold text-brand-navy font-display">{profile?.documents?.length || 0}</p>
          <Link to="/driver/documents" className="text-[11px] text-emerald-700 hover:underline font-semibold inline-flex items-center min-h-8">
            {t('Manage files →')}
          </Link>
        </div>
      </div>

      {/* Main Split: Recent Applications & Recommended Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left 7 Cols: Recent Applications */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-card space-y-5 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-blue" />
              <h3 className="text-base font-bold text-brand-navy font-display">{t('Recent Applications')}</h3>
            </div>
            <Link to="/driver/applications" className="text-xs font-bold text-brand-blue hover:underline inline-flex items-center min-h-10">
              {t('View All')} ({applications.length})
            </Link>
          </div>

          {applications.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs space-y-2">
              <Briefcase className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
              <p>{t("You haven't applied to any driver vacancies yet.")}</p>
              <Link to="/jobs" className="inline-block mt-2 px-4 py-2.5 bg-brand-navy hover:bg-brand-navy-light text-white rounded-xl font-bold text-xs">
                {t('Explore Open Jobs')}
              </Link>
            </div>
          ) : (
            <div className="space-y-3 divide-y divide-slate-100">
              {applications.slice(0, 4).map((app) => (
                <div key={app.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-brand-navy break-words">{app.jobTitle || 'Driver vacancy'}</h4>
                    <p className="text-[11px] text-slate-500 break-words">
                      {app.companyName}{app.companyName ? ' • ' : ''}Applied {formatDate(app.appliedDate)}
                    </p>
                    {app.interviewDate && (
                      <p className="text-[11px] text-purple-700 font-semibold mt-0.5 break-words">
                        🗓️ Interview Slot: {formatDateTime(app.interviewDate)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={app.status} size="sm" kind="application" />
                    <Link
                      to="/driver/applications"
                      aria-label="Open my applications"
                      className="text-slate-400 hover:text-brand-navy min-h-10 min-w-10 inline-flex items-center justify-center rounded-lg hover:bg-slate-50"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 5 Cols: Notifications Widget */}
        <div className="lg:col-span-5 space-y-6 min-w-0">
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-brand-navy font-display flex items-center gap-2">
                <Bell className="w-4 h-4 text-brand-amber" /> {t('Recent Updates')}
              </h3>
              <Link to="/driver/notifications" className="text-xs text-brand-blue font-semibold hover:underline inline-flex items-center min-h-10">
                {t('View Inbox')}
              </Link>
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">{t('No notifications right now')}</p>
            ) : (
              <div className="space-y-2.5">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${n.read ? 'bg-slate-50 border-slate-200/70' : 'bg-amber-50/60 border-amber-200/70'}`}
                  >
                    <p className="font-bold text-slate-900 break-words flex items-start gap-1.5">
                      {!n.read && <span className="mt-1 w-2 h-2 rounded-full bg-brand-amber shrink-0" aria-label="Unread" />}
                      <span className="min-w-0">{n.title}</span>
                    </p>
                    <p className="text-slate-600 leading-tight text-[11px] break-words">{n.message}</p>
                    <span className="text-[10px] text-slate-400 block">{formatDateTime(n.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recommended Jobs */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-brand-navy font-display">{t('Recommended for Your License & Location')}</h3>
            <p className="text-xs text-slate-500 break-words">
              {profileCategory && profileCity
                ? `Based on your ${t(profileCategory)} category profile in ${profileCity}`
                : profileCategory
                ? `Based on your ${t(profileCategory)} category profile`
                : profileCity
                ? `Based on your location in ${profileCity}`
                : 'Add your driver category and city to your profile to see matching jobs.'}
            </p>
          </div>
          <Link to="/jobs" className="text-xs font-bold text-brand-blue hover:underline inline-flex items-center min-h-10">
            {t('View All Vacancies →')}
          </Link>
        </div>

        {recommendedJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-card text-center text-xs text-slate-500 space-y-2">
            <p>
              {profileCategory || profileCity
                ? 'No open jobs match your category or city right now.'
                : 'Complete your profile to get job recommendations.'}
            </p>
            <Link
              to={profileCategory || profileCity ? '/jobs' : '/driver/profile'}
              className="inline-flex items-center min-h-10 font-bold text-brand-blue hover:underline"
            >
              {profileCategory || profileCity ? t('Explore Open Jobs') : t('My Profile')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
