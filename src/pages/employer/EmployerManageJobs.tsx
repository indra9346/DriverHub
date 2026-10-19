import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Briefcase, Plus, ChevronDown, ChevronRight, MoreVertical, FileText, Filter, Info, Wallet, CheckCircle2,
  AlertCircle, Clock, Loader2, Pencil, RefreshCw, Search
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { Job, JobStatus, Application, EmployerSubscription } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useLanguage } from '../../services/i18n';
import { clearLastError, isJobExpired, isPlanOrCreditError } from '../../services/employerApi';

type JobFilter = 'all' | 'active' | 'pending' | 'expired' | 'closed' | 'draft';
type Toast = { text: string; type: 'success' | 'error'; planLink?: boolean };

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const EmployerManageJobs: React.FC = () => {
  const { t } = useLanguage();
  const { jobId: focusJobId } = useParams<{ jobId?: string }>();
  const currentUser = DataStore.getCurrentUser();
  const employerId = currentUser?.role === 'employer' ? currentUser.id : '';
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [subscription, setSubscription] = useState<EmployerSubscription>(() => DataStore.getSubscription(employerId));
  const [statusFilter, setStatusFilter] = useState<JobFilter>('all');
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const postMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadJobs = () => {
      const empJobs = DataStore.getJobs().filter(j => j.employerId === employerId);
      const jobIds = new Set(empJobs.map(j => j.id));
      setJobs(empJobs);
      setApplications(DataStore.getApplications().filter(a => jobIds.has(a.jobId)));
      setSubscription(DataStore.getSubscription(employerId));
    };
    loadJobs();
    window.addEventListener('driverhub_storage_updated', loadJobs);
    return () => window.removeEventListener('driverhub_storage_updated', loadJobs);
  }, [employerId]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (postMenuRef.current && !postMenuRef.current.contains(e.target as Node)) {
        setShowPostMenu(false);
      }
      if (openActionMenuId && !(e.target as HTMLElement).closest('.job-action-menu-container')) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openActionMenuId]);

  const showToast = (next: Toast) => {
    window.clearTimeout(toastTimer.current);
    setToast(next);
    toastTimer.current = window.setTimeout(() => setToast(null), next.type === 'error' ? 7000 : 4000);
  };

  const showFailure = (fallback: string) => {
    const reason = DataStore.getLastError(fallback);
    showToast({ text: reason, type: 'error', planLink: isPlanOrCreditError(reason) });
  };

  /** Message for the status the database actually saved (unverified companies stay pending). */
  const describePublished = (job: Job) => {
    const savedStatus = DataStore.getJobById(job.id)?.status;
    if (savedStatus === 'active') return `"${job.title}" is live. Drivers can apply now.`;
    if (savedStatus === 'pending') return `"${job.title}" was submitted. It goes live after DriverHub review.`;
    return `"${job.title}" was updated (${savedStatus || 'saved'}).`;
  };

  const handlePublish = async (job: Job) => {
    if (busyJobId) return;
    setOpenActionMenuId(null);
    setBusyJobId(job.id);
    clearLastError();
    const ok = await DataStore.updateJobStatus(job.id, 'active');
    setBusyJobId(null);
    if (!ok) {
      showFailure('This job could not be published. Please try again.');
      return;
    }
    showToast({ text: describePublished(job), type: 'success' });
  };

  const handleClose = async (job: Job) => {
    if (busyJobId) return;
    setOpenActionMenuId(null);
    setBusyJobId(job.id);
    clearLastError();
    const ok = await DataStore.updateJobStatus(job.id, 'closed');
    setBusyJobId(null);
    if (!ok) {
      showFailure('This job could not be closed. Please try again.');
      return;
    }
    showToast({ text: `"${job.title}" is closed. Drivers can no longer apply.`, type: 'success' });
  };

  /** An expired listing is renewed by closing it and publishing it again (1 credit, fresh 30 days). */
  const handleRenew = async (job: Job) => {
    if (busyJobId) return;
    setOpenActionMenuId(null);
    setBusyJobId(job.id);
    clearLastError();
    const closed = await DataStore.updateJobStatus(job.id, 'closed');
    if (!closed) {
      setBusyJobId(null);
      showFailure('This job could not be renewed. Please try again.');
      return;
    }
    clearLastError();
    const reopened = await DataStore.updateJobStatus(job.id, 'active');
    setBusyJobId(null);
    if (!reopened) {
      showFailure('The expired listing was closed but could not be renewed.');
      return;
    }
    showToast({ text: describePublished(job), type: 'success' });
  };

  const activeCount = jobs.filter(j => j.status === 'active' && !isJobExpired(j)).length;
  const pendingCount = jobs.filter(j => j.status === 'pending').length;
  const expiredCount = jobs.filter(j => isJobExpired(j)).length;
  const closedCount = jobs.filter(j => j.status === 'closed' || j.status === 'rejected').length;
  const draftCount = jobs.filter(j => j.status === 'draft').length;

  const focusedJob = focusJobId ? jobs.find(j => j.id === focusJobId) : undefined;
  const filtered = focusJobId
    ? jobs.filter(j => j.id === focusJobId)
    : jobs.filter(j => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'active') return j.status === 'active' && !isJobExpired(j);
      if (statusFilter === 'expired') return isJobExpired(j);
      if (statusFilter === 'closed') return j.status === 'closed' || j.status === 'rejected';
      return j.status === statusFilter;
    });

  const pillClass = (active: boolean, activeColors: string) =>
    `inline-flex items-center gap-1 min-h-10 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
      active ? activeColors : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
    }`;

  return (
    <div className="space-y-6">
      {toast && (
        <div
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={`fixed top-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[60] flex items-start gap-2 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold animate-in fade-in ${
            toast.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-[#08233F] text-white border-slate-700'
          }`}
        >
          {toast.type === 'error'
            ? <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-px" />
            : <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-px" />}
          <span className="min-w-0 break-words flex-1">
            {toast.text}
            {toast.planLink && (
              <Link to="/employer/plans" className="ml-1.5 underline font-extrabold whitespace-nowrap">View plans →</Link>
            )}
          </span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            className="-my-2 -mr-2 min-h-10 min-w-10 inline-flex items-center justify-center opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
          <h1 className="text-2xl font-extrabold text-[#08233F] font-display">
            {t('allJobs')} ({jobs.length})
          </h1>
          <Link
            to="/employer/billing"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-700" />
            <span>{t('availableCredits')}: <strong className="text-emerald-700">{subscription.jobCredits} {t('jobsCount')}</strong></span>
          </Link>
        </div>

        {/* Post a new job dropdown */}
        <div className="relative" ref={postMenuRef}>
          <button
            onClick={() => setShowPostMenu(!showPostMenu)}
            className="inline-flex items-center gap-2 bg-[#19745B] hover:bg-[#135A46] text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
          >
            <span>{t('postNewJob')}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showPostMenu ? 'rotate-180' : ''}`} />
          </button>

          {showPostMenu && (
            <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <button
                onClick={() => {
                  setShowPostMenu(false);
                  navigate('/employer/post-job');
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 text-left transition-colors group cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                      {t('startWithNewPost')}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t('startWithNewPostDesc')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              <div className="border-t border-slate-100 my-1" />

              <button
                onClick={() => {
                  setShowPostMenu(false);
                  navigate('/employer/post-job?template=open');
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 text-left transition-colors group cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-purple-700">
                      {t('useJobTemplate')}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t('useJobTemplateDesc')}
                    </p>
                    <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-purple-700 text-white text-[10px] font-bold rounded-full">
                      {t('saveFiftyPercentTime')}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            </div>
          )}
        </div>
      </div>

      {focusJobId ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
          <span className="min-w-0 break-words">
            {focusedJob ? <>Showing <strong>{focusedJob.title}</strong></> : 'This job was not found in your account. It may still be loading.'}
          </span>
          <Link to="/employer/jobs" className="font-bold underline shrink-0">Show all jobs</Link>
        </div>
      ) : (
        /* Filter Pills */
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`${pillClass(statusFilter === 'all', 'bg-[#08233F] text-white border-[#08233F]')} font-bold`}
          >
            <Filter className="w-3.5 h-3.5" /> {t('allFilters')} ({jobs.length})
          </button>
          <button onClick={() => setStatusFilter('active')} className={pillClass(statusFilter === 'active', 'bg-emerald-700 text-white border-emerald-700')}>
            + {t('active')} ({activeCount})
          </button>
          <button onClick={() => setStatusFilter('pending')} className={pillClass(statusFilter === 'pending', 'bg-amber-500 text-slate-950 border-amber-500')}>
            + {t('underReview')} ({pendingCount})
          </button>
          <button onClick={() => setStatusFilter('expired')} className={pillClass(statusFilter === 'expired', 'bg-rose-700 text-white border-rose-700')}>
            + {t('expired')} ({expiredCount})
          </button>
          <button onClick={() => setStatusFilter('closed')} className={pillClass(statusFilter === 'closed', 'bg-slate-800 text-white border-slate-800')}>
            + Closed ({closedCount})
          </button>
          <button onClick={() => setStatusFilter('draft')} className={pillClass(statusFilter === 'draft', 'bg-orange-600 text-white border-orange-600')}>
            + {t('draft')} ({draftCount})
          </button>
        </div>
      )}

      {/* Job Cards List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-slate-200 shadow-card space-y-3">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-[#08233F] font-display">{t('noJobsInFilter')}</h3>
          <p className="text-xs text-slate-500">{t('createJobOrSwitchFilter')}</p>
          <button
            onClick={() => navigate('/employer/post-job')}
            className="px-4 py-2 bg-[#19745B] text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            + {t('postNewJob')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((job) => {
            const jobApps = applications.filter(a => a.jobId === job.id);
            const appliedCount = jobApps.length || job.applicationsCount || 0;
            const activeLeadsCount = jobApps.filter(
              a => a.status === 'shortlisted' || a.status === 'interview' || a.status === 'selected'
            ).length;
            const expired = isJobExpired(job);
            const isBusy = busyJobId === job.id;
            const candidatesLink = `/employer/candidates?category=${encodeURIComponent(job.category)}${job.city ? `&city=${encodeURIComponent(job.city)}` : ''}`;

            let infoText: string;
            if (job.status === 'active' && !expired) infoText = t('jobActiveReceivingApps', { category: t(job.category) });
            else if (expired) infoText = `This listing expired on ${formatDate(job.expiresAt)}. Renew it to accept applications again (uses 1 credit).`;
            else if (job.status === 'pending') infoText = 'Waiting for DriverHub review. The job goes live after approval.';
            else if (job.status === 'closed') infoText = 'This listing is closed. Reopen it to accept applications again (uses 1 credit).';
            else if (job.status === 'rejected') infoText = 'DriverHub did not approve this listing. Contact support for details.';
            else infoText = t('finishJobPostingDesc');

            return (
              <div
                key={job.id}
                className={`bg-white rounded-2xl p-4 sm:p-6 border shadow-subtle hover:shadow-card transition-all space-y-4 ${
                  focusJobId === job.id ? 'border-blue-400 ring-2 ring-blue-200' : 'border-slate-200'
                }`}
              >
                {/* Top Row: Title + Badge + Actions */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Link
                        to={`/jobs/${job.id}`}
                        className="text-base font-bold text-slate-900 hover:text-blue-700 transition-colors break-words"
                      >
                        {job.title}
                      </Link>
                      {job.status === 'draft' ? (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded-md text-[11px] font-bold">
                          {t('draft')} 📝
                        </span>
                      ) : job.status === 'pending' ? (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[11px] font-bold">
                          {t('underAdminReview')} ⏳
                        </span>
                      ) : expired ? (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-[11px] font-bold">
                          Expired
                        </span>
                      ) : (
                        <StatusBadge status={job.status} size="sm" />
                      )}
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-semibold">
                        {t(job.category)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 break-words">
                      {job.location} &nbsp;|&nbsp; {t('postedOn')} : {formatDate(job.postedDate)}
                      {job.postedBy ? <> &nbsp;|&nbsp; {job.postedBy}</> : null}
                      {job.status === 'active' && !expired && job.expiresAt ? <> &nbsp;|&nbsp; Live until {formatDate(job.expiresAt)}</> : null}
                    </p>
                    <p className="text-xs text-slate-500 break-words">
                      {t('forEmployer')} : <span className="font-semibold text-slate-700">{job.companyName}</span> • {t('salary')}: ₹{job.salaryMin.toLocaleString('en-IN')} – ₹{job.salaryMax.toLocaleString('en-IN')}/{t('monthShort')}
                    </p>
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex items-center gap-2 self-start flex-wrap">
                    {job.status === 'draft' ? (
                      <>
                        <button
                          onClick={() => handlePublish(job)}
                          disabled={isBusy}
                          className="min-h-10 px-3.5 py-1.5 bg-[#19745B] hover:bg-[#135A46] disabled:opacity-60 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                          title="Publish this draft (uses 1 job credit)"
                        >
                          {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wallet className="w-3 h-3" />}
                          <span>{t('Publish')} (uses 1 credit)</span>
                        </button>
                        <Link
                          to={`/employer/jobs/${job.id}/edit`}
                          className="min-h-10 inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </Link>
                      </>
                    ) : job.status === 'pending' ? (
                      <span className="min-h-10 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-800">
                        <Clock className="w-3.5 h-3.5" /> Waiting for review
                      </span>
                    ) : expired ? (
                      <button
                        onClick={() => handleRenew(job)}
                        disabled={isBusy}
                        className="min-h-10 px-3.5 py-1.5 bg-[#19745B] hover:bg-[#135A46] disabled:opacity-60 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        <span>Renew (uses 1 credit)</span>
                      </button>
                    ) : (
                      <Link
                        to={`/employer/applications?jobId=${job.id}`}
                        className="min-h-10 inline-flex items-center px-3.5 py-1.5 bg-[#08233F] hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-2xs"
                      >
                        {t('viewApplicants')} ({appliedCount})
                      </Link>
                    )}

                    <div className="relative job-action-menu-container">
                      <button
                        onClick={() => setOpenActionMenuId(openActionMenuId === job.id ? null : job.id)}
                        className="min-h-10 min-w-10 inline-flex items-center justify-center border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                        aria-label="Job actions"
                      >
                        {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-4 h-4" />}
                      </button>

                      {openActionMenuId === job.id && (
                        <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-30 text-xs font-semibold animate-in fade-in zoom-in-95">
                          <Link
                            to={`/jobs/${job.id}`}
                            onClick={() => setOpenActionMenuId(null)}
                            className="block px-3.5 py-2.5 text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            👁️ {t('viewPublicJobPage')}
                          </Link>
                          {job.status !== 'rejected' && (
                            <Link
                              to={`/employer/jobs/${job.id}/edit`}
                              onClick={() => setOpenActionMenuId(null)}
                              className="block px-3.5 py-2.5 text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              ✏️ Edit job
                            </Link>
                          )}
                          <Link
                            to={candidatesLink}
                            onClick={() => setOpenActionMenuId(null)}
                            className="block px-3.5 py-2.5 text-emerald-700 hover:bg-emerald-50 transition-colors font-bold"
                          >
                            👥 {t('viewDatabaseMatches')}
                          </Link>
                          <Link
                            to={`/employer/applications?jobId=${job.id}`}
                            onClick={() => setOpenActionMenuId(null)}
                            className="block px-3.5 py-2.5 text-blue-700 hover:bg-blue-50 transition-colors"
                          >
                            📋 {t('viewApplications')} ({appliedCount})
                          </Link>
                          {job.status !== 'rejected' && <div className="border-t border-slate-100 my-1" />}
                          {job.status === 'active' && expired && (
                            <button
                              onClick={() => handleRenew(job)}
                              disabled={isBusy}
                              className="w-full text-left px-3.5 py-2.5 text-emerald-700 hover:bg-emerald-50 cursor-pointer font-bold transition-colors"
                            >
                              🔁 Renew (uses 1 credit)
                            </button>
                          )}
                          {(job.status === 'active' || job.status === 'pending') && (
                            <button
                              onClick={() => handleClose(job)}
                              disabled={isBusy}
                              className="w-full text-left px-3.5 py-2.5 text-red-600 hover:bg-red-50 cursor-pointer font-bold transition-colors"
                            >
                              ⏸️ {job.status === 'pending' ? 'Withdraw listing' : t('closePauseJob')}
                            </button>
                          )}
                          {(job.status === 'draft' || job.status === 'closed') && (
                            <button
                              onClick={() => handlePublish(job)}
                              disabled={isBusy}
                              className="w-full text-left px-3.5 py-2.5 text-emerald-700 hover:bg-emerald-50 cursor-pointer font-bold transition-colors"
                            >
                              🚀 {t('publishReopenJob')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3-Column Funnel Metrics Box */}
                <div className="grid grid-cols-1 sm:grid-cols-3 border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-white">
                  <Link
                    to={`/employer/applications?jobId=${job.id}`}
                    className="p-3.5 hover:bg-slate-50 transition-colors flex flex-col justify-between group"
                  >
                    <span className="text-base font-extrabold text-slate-900">{appliedCount}</span>
                    <span className="text-xs text-slate-500 group-hover:text-slate-900 inline-flex items-center gap-1 mt-0.5">
                      {t('appliedToJob')} <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>

                  <Link
                    to={`/employer/applications?jobId=${job.id}&status=shortlisted`}
                    className="p-3.5 hover:bg-slate-50 transition-colors flex flex-col justify-between group"
                  >
                    <span className="text-base font-extrabold text-slate-900">{activeLeadsCount}</span>
                    <span className="text-xs text-slate-500 group-hover:text-slate-900 inline-flex items-center gap-1 mt-0.5">
                      {t('activeLeads')} <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>

                  <Link
                    to={candidatesLink}
                    className="p-3.5 hover:bg-slate-50 transition-colors flex flex-col justify-between group"
                  >
                    <Search className="w-5 h-5 text-emerald-700" />
                    <span className="text-xs text-slate-500 group-hover:text-emerald-700 inline-flex items-center gap-1 mt-0.5">
                      {t('databaseMatches')} <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                </div>

                {/* Bottom Status Info Strip */}
                <div className="px-3.5 py-2 bg-slate-50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
                  <div className="flex items-start gap-2 min-w-0">
                    <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-px" />
                    <span className="break-words">{infoText}</span>
                  </div>
                  <Link
                    to={`/employer/candidates?category=${encodeURIComponent(job.category)}`}
                    className="text-[11px] font-bold text-emerald-700 hover:underline shrink-0 sm:ml-2"
                  >
                    {t('unlockMatchingDrivers')} →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
