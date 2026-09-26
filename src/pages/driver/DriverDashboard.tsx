import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, Briefcase, Heart, Award, ShieldCheck, CheckCircle2, 
  Clock, ArrowRight, UploadCloud, Bell, Sparkles, AlertCircle, Plus, IndianRupee 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { DriverProfile, Job, Application, Notification } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { JobCard } from '../../components/common/JobCard';
import { useLanguage } from '../../services/i18n';

export const DriverDashboard: React.FC = () => {
  const { t } = useLanguage();
  const currentUser = DataStore.getCurrentUser();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    const p = DataStore.getDriverById(currentUser.id);
    setProfile(p);

    const apps = DataStore.getApplications().filter(a => a.driverId === currentUser.id);
    setApplications(apps);

    const notifs = DataStore.getNotifications(currentUser.id);
    setNotifications(notifs.slice(0, 3));

    // Recommend jobs matching driver's category
    const jobs = DataStore.getJobs().filter(j => j.status === 'active' && (j.category === p.driverCategory || j.city === p.city));
    setRecommendedJobs(jobs.slice(0, 4));
  }, [currentUser]);

  // Calculate profile completion %
  const calculateCompletion = () => {
    if (!profile) return 0;
    let score = profile.fullName && profile.email ? 20 : 0;
    if (profile.fullName && profile.phone) score += 20;
    if (profile.licenseNumber && profile.licenseType) score += 20;
    if (profile.skills && profile.skills.length > 0) score += 15;
    if (profile.documents && profile.documents.length > 0) score += 25;
    return Math.min(100, score);
  };

  const completionRate = calculateCompletion();
  const shortlistedCount = applications.filter(a => a.status === 'shortlisted' || a.status === 'interview' || a.status === 'selected').length;

  return (
    <div className="space-y-8">
      {/* Welcome & Profile Status Banner */}
      <div className="bg-brand-navy rounded-2xl p-6 sm:p-8 text-white shadow-elevated flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-brand-amber text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> {profile?.status === 'active' ? t('Driver account active') : t('Complete your driver profile')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display">
            {t('Welcome back')}, {profile?.fullName || t('Driver')}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            {t(profile?.driverCategory || 'Driver')}{profile?.experienceYears ? ` Specialist • ${profile.experienceYears} Years Experience` : ''}{profile?.location ? ` • ${profile.location}` : ''}
          </p>
        </div>

        {/* Profile Progress Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 min-w-[240px] space-y-2.5 relative z-10">
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
          {completionRate < 100 && (
            <Link
              to="/driver/documents"
              className="text-[11px] text-amber-300 font-semibold hover:underline flex items-center gap-1"
            >
              {t('Upload license documents to reach 100% →')}
            </Link>
          )}
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-600">{t('Total Applications')}</span>
            <FileText className="w-4 h-4 text-brand-blue" />
          </div>
          <p className="text-2xl font-bold text-brand-navy font-display">{applications.length}</p>
          <span className="text-[11px] text-slate-500">{t('Across verified fleets')}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-600">{t('Shortlisted / Interviews')}</span>
            <Award className="w-4 h-4 text-brand-amber" />
          </div>
          <p className="text-2xl font-bold text-brand-amber font-display">{shortlistedCount}</p>
          <span className="text-[11px] text-amber-700 font-medium">{t('Ready for driving trials')}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-600">{t('Saved Vacancies')}</span>
            <Heart className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-brand-navy font-display">{DataStore.getFavorites(currentUser?.id || '').length}</p>
          <Link to="/driver/saved" className="text-[11px] text-brand-blue hover:underline font-semibold">
            {t('View bookmarks →')}
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-600">{t('Uploaded Documents')}</span>
            <UploadCloud className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-brand-navy font-display">{profile?.documents?.length || 0}</p>
          <Link to="/driver/documents" className="text-[11px] text-emerald-700 hover:underline font-semibold">
            {t('Manage files →')}
          </Link>
        </div>
      </div>

      {/* Main Split: Recent Applications & Recommended Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols: Recent Applications */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-card space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-blue" />
              <h3 className="text-base font-bold text-brand-navy font-display">{t('Recent Applications')}</h3>
            </div>
            <Link to="/driver/applications" className="text-xs font-bold text-brand-blue hover:underline">
              {t('View All')} ({applications.length})
            </Link>
          </div>

          {applications.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs space-y-2">
              <Briefcase className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
              <p>{t("You haven't applied to any driver vacancies yet.")}</p>
              <Link to="/jobs" className="inline-block mt-2 px-4 py-2 bg-brand-navy hover:bg-brand-navy-light text-white rounded-xl font-bold text-xs">
                {t('Explore Open Jobs')}
              </Link>
            </div>
          ) : (
            <div className="space-y-3 divide-y divide-slate-100">
              {applications.slice(0, 4).map((app) => (
                <div key={app.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-brand-navy">{app.jobTitle}</h4>
                    <p className="text-[11px] text-slate-500">{app.companyName} • Applied {app.appliedDate}</p>
                    {app.interviewDate && (
                      <p className="text-[11px] text-purple-700 font-semibold mt-0.5">
                        🗓️ Interview Slot: {app.interviewDate}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={app.status} size="sm" />
                    <Link to="/driver/applications" className="text-slate-400 hover:text-brand-navy">
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 5 Cols: Notifications Widget */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-brand-navy font-display flex items-center gap-2">
                <Bell className="w-4 h-4 text-brand-amber" /> {t('Recent Updates')}
              </h3>
              <Link to="/driver/notifications" className="text-xs text-brand-blue font-semibold hover:underline">
                {t('View Inbox')}
              </Link>
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">{t('No unread notifications')}</p>
            ) : (
              <div className="space-y-2.5">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs space-y-1">
                    <p className="font-bold text-slate-900">{n.title}</p>
                    <p className="text-slate-600 leading-tight text-[11px]">{n.message}</p>
                    <span className="text-[10px] text-slate-400 block">{n.createdAt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recommended Jobs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-brand-navy font-display">{t('Recommended for Your License & Location')}</h3>
            <p className="text-xs text-slate-500">Based on your {t(profile?.driverCategory || 'Driver')} category profile in {profile?.city}</p>
          </div>
          <Link to="/jobs" className="text-xs font-bold text-brand-blue hover:underline">
            {t('View All Vacancies →')}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendedJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </div>
    </div>
  );
};
