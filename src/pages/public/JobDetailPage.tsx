import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin, IndianRupee, Clock, Briefcase, Building2, ShieldCheck,
  FileText, CheckCircle2, ArrowLeft, ArrowRight, Heart, Lock,
  Sparkles, RefreshCw, AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DataStore, isJobOpenForApplications } from '../../services/store';
import { SupabaseSync } from '../../services/supabaseSync';
import { Job, Application, DriverProfile } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useLanguage, formatSalaryDisplay } from '../../services/i18n';
import { getJobCardBanner } from '../../services/cardBanners';
import { fetchPublicJobById } from '../../services/publicApi';
import { getLoginPathForRole } from '../../services/authRouting';
import { newId } from '../../lib/ids';

type LoadState = 'loading' | 'ready' | 'missing' | 'error';

export const JobDetailPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(() => (id ? DataStore.getJobById(id) || null : null));
  const [loadState, setLoadState] = useState<LoadState>(() => (id && DataStore.getJobById(id) ? 'ready' : 'loading'));
  const [remoteEmployerVerified, setRemoteEmployerVerified] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState(DataStore.getCurrentUser());
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [existingApplication, setExistingApplication] = useState<Application | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [similarJobs, setSimilarJobs] = useState<Job[]>([]);

  // Apply Modal state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [coverMessage, setCoverMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState('');

  // Whether this job has been seen in the local cache: if it later disappears
  // from it (closed, removed, cache reset) the page must not keep showing it.
  const seenInCacheRef = useRef(false);
  const fetchVersionRef = useRef(0);

  const fetchFromServer = useCallback(async (jobId: string) => {
    const version = ++fetchVersionRef.current;
    setLoadState('loading');
    try {
      const result = await fetchPublicJobById(jobId);
      if (version !== fetchVersionRef.current) return;
      // The cache may have filled in the meantime; it wins.
      const cached = DataStore.getJobById(jobId);
      if (cached) {
        seenInCacheRef.current = true;
        setJob(cached);
        setLoadState('ready');
        return;
      }
      if (result) {
        setJob(result.job);
        setRemoteEmployerVerified(result.employerVerified);
        setLoadState('ready');
      } else {
        setJob(null);
        setLoadState('missing');
      }
    } catch {
      if (version !== fetchVersionRef.current) return;
      setLoadState('error');
    }
  }, []);

  const loadJob = useCallback(() => {
    if (!id) return;
    const user = DataStore.getCurrentUser();
    setCurrentUser(user);
    const found = DataStore.getJobById(id);

    if (found) {
      seenInCacheRef.current = true;
      fetchVersionRef.current++;
      setJob(found);
      setLoadState('ready');
    } else if (seenInCacheRef.current) {
      // It was cached and is gone now: clear it, then check the server once.
      seenInCacheRef.current = false;
      setJob(null);
      void fetchFromServer(id);
    }

    if (user && user.role === 'driver') {
      // Any earlier application counts, including a withdrawn one: a job can
      // only be applied to once.
      const existing = DataStore.getApplications().find(a => a.jobId === id && a.driverId === user.id) || null;
      setExistingApplication(existing);
      setIsSaved(DataStore.getFavorites(user.id).includes(id));
      setDriverProfile(DataStore.getDriverById(user.id) || null);
    } else {
      setExistingApplication(null);
      setIsSaved(false);
      setDriverProfile(null);
    }

    const reference = found || null;
    if (reference) {
      const similar = DataStore.getJobs().filter(j =>
        j.id !== id &&
        isJobOpenForApplications(j) &&
        (j.category === reference.category || (Boolean(reference.city) && j.city === reference.city))
      );
      setSimilarJobs(similar.slice(0, 3));
    }
  }, [id, fetchFromServer]);

  useEffect(() => {
    seenInCacheRef.current = false;
    setRemoteEmployerVerified(null);
    setApplySuccess(false);
    setApplyError('');
    setIsApplyModalOpen(false);
    const cached = id ? DataStore.getJobById(id) : undefined;
    setJob(cached || null);
    setSimilarJobs([]);
    loadJob();
    if (id && !cached) void fetchFromServer(id);
    window.addEventListener('driverhub_storage_updated', loadJob);
    return () => {
      fetchVersionRef.current++;
      window.removeEventListener('driverhub_storage_updated', loadJob);
    };
  }, [id, loadJob, fetchFromServer]);

  // Apply modal: Escape closes it and the page behind does not scroll.
  useEffect(() => {
    if (!isApplyModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) setIsApplyModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isApplyModalOpen, submitting]);

  if (!job) {
    if (loadState === 'loading') {
      return (
        <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-3" role="status" aria-live="polite">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-amber-500" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-600">Loading job details…</p>
        </div>
      );
    }
    if (loadState === 'error') {
      return (
        <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4" role="alert">
          <h2 className="text-xl font-bold text-slate-800">We could not load this job</h2>
          <p className="text-xs text-slate-500">Check your internet connection and try again.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => id && void fetchFromServer(id)}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Try again
            </button>
            <Link to="/jobs" className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 bg-[#0A2540] text-white text-xs font-semibold rounded-xl">
              <ArrowLeft className="w-4 h-4" /> {t('Back to Job Search')}
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">{t('Job vacancy not found')}</h2>
        <p className="text-xs text-slate-500">{t('This job may have been closed or removed by the employer.')}</p>
        <Link to="/jobs" className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 bg-[#0A2540] text-white text-xs font-semibold rounded-xl">
          <ArrowLeft className="w-4 h-4" /> {t('Back to Job Search')}
        </Link>
      </div>
    );
  }

  const isOpenForApplications = isJobOpenForApplications(job);
  const hasWithdrawn = existingApplication?.status === 'withdrawn';
  const cachedEmployer = DataStore.getEmployerById(job.employerId);
  const isEmployerVerified = cachedEmployer ? Boolean(cachedEmployer.verified) : Boolean(remoteEmployerVerified);
  const employerJobsLink = `/jobs?employer=${encodeURIComponent(job.employerId)}`;
  const jobPath = `/jobs/${job.id}`;
  const hasDriverProfile = Boolean(driverProfile && (driverProfile.fullName || driverProfile.driverCategory || driverProfile.licenseType));
  const deadlinePassed = (() => {
    if (!job.applicationDeadline) return false;
    const deadline = new Date(job.applicationDeadline);
    if (Number.isNaN(deadline.getTime())) return false;
    deadline.setHours(23, 59, 59, 999);
    return deadline.getTime() < Date.now();
  })();
  const closedLabel = job.status !== 'active'
    ? 'Applications closed'
    : deadlinePassed
    ? 'Applications closed (deadline passed)'
    : 'Applications closed (listing expired)';

  const handleToggleSave = async () => {
    if (!currentUser || currentUser.role !== 'driver') {
      navigate(getLoginPathForRole('driver', jobPath));
      return;
    }
    const saved = await DataStore.toggleFavorite(currentUser.id, job.id);
    if (saved === isSaved) {
      window.alert(t('Could not update saved jobs. Check your connection and try again.'));
      return;
    }
    setIsSaved(saved);
  };

  const openApplyModal = () => {
    setApplyError('');
    setApplySuccess(false);
    setIsApplyModalOpen(true);
  };

  const closeApplyModal = () => {
    if (submitting) return;
    setIsApplyModalOpen(false);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!currentUser || currentUser.role !== 'driver') {
      navigate(getLoginPathForRole('driver', jobPath));
      return;
    }
    if (!isOpenForApplications) {
      setApplyError(lang === 'kn' ? 'ಈ ಉದ್ಯೋಗಕ್ಕೆ ಅರ್ಜಿ ಸ್ವೀಕರಿಸಲಾಗುತ್ತಿಲ್ಲ.' : 'This driver job is no longer accepting applications.');
      return;
    }
    if (existingApplication) {
      setApplyError(hasWithdrawn
        ? 'You withdrew your application for this job, so you cannot apply again.'
        : (lang === 'kn' ? 'ನೀವು ಈಗಾಗಲೇ ಈ ಕೆಲಸಕ್ಕೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಿದ್ದೀರಿ.' : 'You have already applied for this job.'));
      return;
    }

    setSubmitting(true);
    setApplyError('');
    try {
      // A job opened from a shared link may not be in the local cache yet.
      if (!DataStore.getJobById(job.id)) {
        await SupabaseSync.fetchAndMergeRemoteData(DataStore);
      }

      const today = new Date().toISOString().slice(0, 10);
      const newApp: Application = {
        id: newId(),
        jobId: job.id,
        jobTitle: job.title,
        companyName: job.companyName,
        driverId: currentUser.id,
        driverName: driverProfile?.fullName || currentUser.email,
        driverPhone: driverProfile?.phone || currentUser.phone || '',
        driverEmail: currentUser.email,
        driverCategory: driverProfile?.driverCategory || undefined,
        driverExperienceYears: hasDriverProfile ? driverProfile?.experienceYears : undefined,
        driverLocation: driverProfile?.location || undefined,
        resumeUrl: driverProfile?.resumeUrl,
        coverMessage: coverMessage.trim(),
        status: 'applied',
        appliedDate: today,
        updatedDate: today,
      };

      const created = await DataStore.addApplication(newApp);
      if (!created) {
        setApplyError(DataStore.getLastError(
          lang === 'kn'
            ? 'ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಪುನಃ ಪ್ರಯತ್ನಿಸಿ.'
            : 'We could not submit this application. Please try again.'
        ));
        return;
      }
      setExistingApplication(newApp);
      setApplySuccess(true);
      setCoverMessage('');
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } catch (error) {
      setApplyError(error instanceof Error && error.message ? error.message : 'We could not submit this application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <Link
        to="/jobs"
        className="inline-flex items-center gap-1.5 min-h-[40px] text-xs font-bold text-slate-600 hover:text-[#08233F] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> {t('Back to Search Results')}
      </Link>

      {/* Main Job Hero Header */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-subtle overflow-hidden">
        {/* Realistic Vehicle / Route Banner */}
        <div className="relative h-36 sm:h-48 w-full overflow-hidden bg-slate-900">
          <img
            src={getJobCardBanner(job).url}
            alt={getJobCardBanner(job).alt}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md text-amber-400 font-bold text-xs border border-amber-400/30 shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
              {t(job.category)}
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-8 pt-0 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 -mt-8 sm:-mt-10">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-2 border-white overflow-hidden flex items-center justify-center shrink-0 shadow-lg relative z-10">
                {job.companyLogo ? (
                  <img src={job.companyLogo} alt={job.companyName} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-8 h-8 text-slate-400" />
                )}
              </div>

              <div className="space-y-1.5 pt-7 sm:pt-9 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/jobs?category=${encodeURIComponent(job.category)}`}
                    className="badge-category text-xs bg-blue-50 text-blue-800 font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    {t(job.category)}
                  </Link>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {t(job.employmentType)}
                </span>
                <StatusBadge status={job.status} size="sm" />
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#08233F] font-display break-words">
                {job.title}
              </h1>

              <Link
                to={employerJobsLink}
                className="text-sm font-semibold text-slate-600 hover:text-blue-700 flex items-center gap-1.5 transition-colors min-w-0"
              >
                <span className="break-words">{job.companyName}</span>
                {isEmployerVerified && (
                  <span title={t('Verified Employer')}>
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" aria-label={t('Verified Employer')} />
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {currentUser?.role === 'driver' && (
              <button
                onClick={handleToggleSave}
                aria-label={isSaved ? 'Remove from saved jobs' : 'Save job'}
                className={`inline-flex items-center justify-center w-11 h-11 rounded-xl border transition-all cursor-pointer ${
                  isSaved
                    ? 'bg-amber-50 border-amber-300 text-amber-600'
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700'
                }`}
                title={isSaved ? t('Saved Jobs') : t('Save')}
              >
                <Heart className={`w-5 h-5 ${isSaved ? 'fill-amber-500' : ''}`} />
              </button>
            )}

            {currentUser?.role === 'employer' ? (
              currentUser.id === job.employerId ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to="/employer/jobs"
                    className="min-h-[44px] px-5 py-3 bg-[#08233F] hover:bg-[#051626] text-white font-bold rounded-xl text-xs sm:text-sm shadow-subtle transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Briefcase className="w-4 h-4 text-amber-400" /> {t('Manage Vacancy')}
                  </Link>
                  <Link
                    to="/employer/applications"
                    className="min-h-[44px] px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
                  >
                    {t('View Pipeline')}
                  </Link>
                </div>
              ) : (
                <div className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <span>{lang === 'kn' ? 'ಉದ್ಯೋಗದಾತರ ಖಾತೆ (ಅಭ್ಯರ್ಥಿಗಳಿಗೆ ಮಾತ್ರ)' : 'Employer Account (Candidates Only)'}</span>
                </div>
              )
            ) : currentUser?.role === 'admin' ? (
              <Link
                to="/admin/jobs"
                className="min-h-[44px] px-5 py-3 bg-[#08233F] hover:bg-[#051626] text-white font-bold rounded-xl text-xs sm:text-sm shadow-subtle transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" /> {t('Job Moderation Queue')}
              </Link>
            ) : existingApplication ? (
              hasWithdrawn ? (
                <div className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 text-xs sm:text-sm">
                  <AlertCircle className="w-4 h-4 text-slate-500" />
                  <span>You withdrew your application</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50 text-emerald-900 font-bold rounded-xl border border-emerald-200 text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{t('Application Submitted')}</span>
                </div>
              )
            ) : !isOpenForApplications ? (
              <div className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 text-xs sm:text-sm" role="status">
                <Lock className="w-4 h-4 text-slate-500" />
                <span>{closedLabel}</span>
              </div>
            ) : !currentUser ? (
              <button
                onClick={() => navigate(getLoginPathForRole('driver', jobPath))}
                className="min-h-[44px] px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-subtle transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-1.5"
              >
                <span>{t('Sign In')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={openApplyModal}
                className="min-h-[44px] px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-subtle transition-all hover:scale-[1.02] cursor-pointer"
              >
                {t('Apply Now')}
              </button>
            )}
          </div>
        </div>

        {existingApplication && hasWithdrawn && (
          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            Each job accepts one application per driver, so a withdrawn application cannot be sent again.
          </p>
        )}

        {/* Highlight Metadata Bar */}
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100 text-xs">
          <div className="space-y-0.5 min-w-0">
            <span className="text-slate-400 font-semibold block">{lang === 'kn' ? 'ಮಾಸಿಕ ವೇತನ' : 'Monthly Compensation'}</span>
            <span className="text-sm font-bold text-[#08233F] flex items-center gap-1">
              <IndianRupee className="w-4 h-4 text-emerald-600 shrink-0" />
              {formatSalaryDisplay(job.salaryMin, job.salaryMax, lang)}
            </span>
          </div>

          <div className="space-y-0.5 min-w-0">
            <span className="text-slate-400 font-semibold block">{lang === 'kn' ? 'ಕೆಲಸದ ಸ್ಥಳ' : 'Job Location'}</span>
            <span className="text-sm font-bold text-[#08233F] flex items-start gap-1 min-w-0">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span className="break-words min-w-0">{job.location || [job.city, job.state].filter(Boolean).join(', ') || 'Not specified'}</span>
            </span>
          </div>

          <div className="space-y-0.5 min-w-0">
            <span className="text-slate-400 font-semibold block">{lang === 'kn' ? 'ಅಗತ್ಯವಿರುವ ಅನುಭವ' : 'Experience Required'}</span>
            <span className="text-sm font-bold text-[#08233F] flex items-start gap-1 min-w-0">
              <Briefcase className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span className="break-words min-w-0">{job.experienceRequired || 'Not specified'}</span>
            </span>
          </div>

          <div className="space-y-0.5 min-w-0">
            <span className="text-slate-400 font-semibold block">{lang === 'kn' ? 'ಕೆಲಸದ ಪಾಳಿ' : 'Working Shifts'}</span>
            <span className="text-sm font-bold text-[#08233F] flex items-start gap-1 min-w-0">
              <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span className="break-words min-w-0">{job.workingHours || 'Not specified'}</span>
            </span>
          </div>
        </div>
      </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Job Details */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* Detailed Description */}
          <div className="bg-white rounded-2xl p-5 sm:p-8 border border-slate-200/90 shadow-subtle space-y-4">
            <h2 className="text-lg font-bold text-[#08233F] font-display">
              {lang === 'kn' ? 'ಉದ್ಯೋಗದ ವಿವರಣೆ ಮತ್ತು ಜವಾಬ್ದಾರಿಗಳು' : 'Job Description & Duties'}
            </h2>
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere] space-y-2">
              {job.description || 'The employer has not added a description yet.'}
            </div>
          </div>

          {/* Required Driver Skills */}
          {job.requiredSkills && job.requiredSkills.length > 0 && (
            <div className="bg-white rounded-2xl p-5 sm:p-8 border border-slate-200/90 shadow-subtle space-y-4">
              <h2 className="text-lg font-bold text-[#08233F] font-display">
                {lang === 'kn' ? 'ಅಗತ್ಯ ಕೌಶಲ್ಯಗಳು ಮತ್ತು ಅರ್ಹತೆಗಳು' : 'Required Skills & Qualifications'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {job.requiredSkills.map((skill, index) => (
                  <div key={index} className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="break-words min-w-0">{skill}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Required Documents */}
          {job.requiredDocs && job.requiredDocs.length > 0 && (
            <div className="bg-white rounded-2xl p-5 sm:p-8 border border-slate-200/90 shadow-subtle space-y-4">
              <h2 className="text-lg font-bold text-[#08233F] font-display">
                {lang === 'kn' ? 'ಕಡ್ಡಾಯ ಪರಿಶೀಲನಾ ದಾಖಲೆಗಳು' : 'Mandatory Verification Documents'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'kn' ? 'ಅಭ್ಯರ್ಥಿಗಳು ಸಂದರ್ಶನ / ಟ್ರಯಲ್ ಸಮಯದಲ್ಲಿ ಮೂಲ ಪ್ರತಿಗಳನ್ನು ಹೊಂದಿರಬೇಕು:' : 'Candidates must carry original copies during the final interview / driving test:'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {job.requiredDocs.map((doc, index) => (
                  <div key={index} className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs font-semibold text-amber-900 min-w-0">
                    <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="break-words min-w-0">{doc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Company & Safety Box */}
        <div className="space-y-6 min-w-0">
          {/* Company Snapshot */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-subtle space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'kn' ? 'ಉದ್ಯೋಗದಾತರ ವಿವರ' : 'About the Employer'}
            </h3>
            <Link
              to={employerJobsLink}
              className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer min-w-0"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-50 overflow-hidden border border-slate-200 flex items-center justify-center shrink-0 group-hover:border-amber-400 transition-colors">
                {job.companyLogo ? (
                  <img src={job.companyLogo} alt={job.companyName} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-[#08233F] group-hover:text-blue-700 transition-colors break-words">{job.companyName}</h4>
                <p className="text-xs text-slate-500 break-words">{[job.city, job.state].filter(Boolean).join(', ')}</p>
              </div>
            </Link>

            <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
              {isEmployerVerified ? (
                <div className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{t('Verified Employer')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 font-medium text-slate-500">
                  <AlertCircle className="w-4 h-4 text-slate-400" />
                  <span>Employer verification pending</span>
                </div>
              )}
              <div className="flex items-baseline gap-2 pt-1 border-t border-slate-100">
                <span className="text-2xl font-extrabold text-emerald-600 leading-none">{job.vacancies || 1}</span>
                <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase leading-none">{lang === 'kn' ? 'ಖಾಲಿ ಹುದ್ದೆಗಳು' : 'VACANCIES'}</span>
              </div>
              {job.applicationDeadline && (
                <p className="text-[11px] text-slate-500">
                  Apply by {new Date(job.applicationDeadline).toLocaleDateString(lang === 'kn' ? 'kn-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          {/* Safety Notice */}
          <div className="bg-blue-50/70 rounded-2xl p-6 border border-blue-200/80 space-y-3 shadow-subtle">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
              <Sparkles className="w-4 h-4 text-amber-500" /> {lang === 'kn' ? 'ಚಾಲಕರ ಸುರಕ್ಷತೆ & ಕಲ್ಯಾಣ ಮಾನದಂಡ' : 'Driver Safety & Welfare Standard'}
            </div>
            <p className="text-xs text-blue-900/80 leading-relaxed">
              Never pay a fee to apply for or to get a job. Confirm the salary, duty hours and documents with the employer
              before you join, and report any listing that asks for money or looks suspicious through the Contact page.
            </p>
          </div>

          {/* Similar Jobs */}
          {similarJobs.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#08233F]">{lang === 'kn' ? 'ಇದೇ ರೀತಿಯ ಉದ್ಯೋಗಾವಕಾಶಗಳು' : 'Similar Driver Openings'}</h3>
              <div className="space-y-3">
                {similarJobs.map((simJob) => (
                  <Link
                    key={simJob.id}
                    to={`/jobs/${simJob.id}`}
                    className="block p-4 bg-white rounded-2xl border border-slate-200/90 shadow-subtle hover:border-amber-400 hover:shadow-card transition-all space-y-1.5 cursor-pointer"
                  >
                    <h4 className="text-xs font-bold text-[#08233F] line-clamp-2 break-words">{simJob.title}</h4>
                    <p className="text-[11px] text-slate-500 break-words">{simJob.companyName}{simJob.city ? ` • ${simJob.city}` : ''}</p>
                    <p className="text-xs font-bold text-emerald-700">{formatSalaryDisplay(simJob.salaryMin, simJob.salaryMax, lang)}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Application Modal */}
      {isApplyModalOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) closeApplyModal(); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="apply-modal-title"
            className="bg-white rounded-2xl max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-5 sm:p-8 shadow-modal border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-5"
          >
            {!applySuccess ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">{lang === 'kn' ? 'ಉದ್ಯೋಗ ಅರ್ಜಿ' : 'Candidate Application'}</span>
                    <h3 id="apply-modal-title" className="text-lg font-bold text-[#08233F] mt-0.5 break-words">{job.title}</h3>
                    <p className="text-xs text-slate-500 break-words">{job.companyName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeApplyModal}
                    disabled={submitting}
                    aria-label="Close application form"
                    className="inline-flex items-center justify-center w-10 h-10 -mr-2 -mt-1 shrink-0 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>

                {!currentUser || currentUser.role !== 'driver' ? (
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-3">
                    <p className="font-semibold">Sign in with a driver account to apply for this job.</p>
                    <Link
                      to={getLoginPathForRole('driver', jobPath)}
                      className="inline-flex items-center min-h-[44px] px-4 py-2 bg-[#08233F] text-white rounded-xl font-bold cursor-pointer"
                    >
                      {t('Sign In')}
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleApplySubmit} className="space-y-4">
                    {applyError && <p role="alert" className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs break-words">{applyError}</p>}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 text-xs space-y-1 min-w-0">
                      <p className="font-bold text-[#08233F] break-words [overflow-wrap:anywhere]">
                        {lang === 'kn' ? 'ಅರ್ಜಿದಾರ:' : 'Applying as:'} {driverProfile?.fullName || currentUser.email}
                      </p>
                      <p className="text-slate-600">
                        {lang === 'kn' ? 'ಲೈಸೆನ್ಸ್:' : 'License:'} {driverProfile?.licenseType || 'Not added'}
                      </p>
                      <p className="text-slate-600">
                        {lang === 'kn' ? 'ಅನುಭವ:' : 'Experience:'}{' '}
                        {hasDriverProfile && typeof driverProfile?.experienceYears === 'number'
                          ? t('{count} Years Exp', { count: driverProfile.experienceYears })
                          : 'Not added'}
                      </p>
                      {!hasDriverProfile && (
                        <p className="text-slate-500 pt-1">
                          Employers see your profile details.{' '}
                          <Link to="/driver/profile" className="font-semibold text-blue-700 hover:underline">Complete your profile</Link>
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="apply-cover-message" className="block text-xs font-semibold text-slate-700 mb-1">
                        {lang === 'kn' ? 'ಉದ್ಯೋಗದಾತರಿಗೆ ಸಂದೇಶ (ಐಚ್ಛಿಕ ಕವರ್ ನೋಟ್)' : 'Optional Message to Employer (Cover Note)'}
                      </label>
                      <textarea
                        id="apply-cover-message"
                        rows={3}
                        value={coverMessage}
                        onChange={(e) => setCoverMessage(e.target.value)}
                        placeholder={lang === 'kn' ? 'ನೀವು ಚಾಲನೆ ಮಾಡಿದ ನಿರ್ದಿಷ್ಟ ವಾಹನ ಮಾದರಿಗಳು, ಹೆದ್ದಾರಿ ಮಾರ್ಗಗಳ ಪರಿಚಯ...' : 'Mention specific vehicle models you have driven, highway route familiarity, or availability...'}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none focus:bg-white"
                      />
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={closeApplyModal}
                        disabled={submitting}
                        className="min-h-[44px] px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                      >
                        {lang === 'kn' ? 'ರದ್ದುಮಾಡಿ' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="min-h-[44px] px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-subtle flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-wait"
                      >
                        {submitting ? (lang === 'kn' ? 'ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ...' : 'Submitting Application...') : (lang === 'kn' ? 'ಖಚಿತಪಡಿಸಿ ಮತ್ತು ಅರ್ಜಿ ಸಲ್ಲಿಸಿ' : 'Confirm & Apply')}
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                  🎉
                </div>
                <h3 id="apply-modal-title" className="text-xl font-bold text-[#08233F]">{t('Application Submitted')}</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto break-words">
                  {lang === 'kn'
                    ? `${job.companyName} ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಸ್ವೀಕರಿಸಿದೆ. ನಿಮ್ಮ ಅರ್ಜಿಗಳ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ನಲ್ಲಿ ನೀವು ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಬಹುದು.`
                    : `${job.companyName} has received your profile. You can track your status in your Applications dashboard.`}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Link
                    to="/driver/applications"
                    onClick={() => setIsApplyModalOpen(false)}
                    className="inline-flex items-center min-h-[44px] px-5 py-2.5 bg-[#08233F] text-white font-bold rounded-xl text-xs shadow-subtle"
                  >
                    {t('My Applications')}
                  </Link>
                  <button
                    onClick={() => setIsApplyModalOpen(false)}
                    className="min-h-[44px] px-5 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
                  >
                    {lang === 'kn' ? 'ಮುಚ್ಚಿ' : 'Close'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
