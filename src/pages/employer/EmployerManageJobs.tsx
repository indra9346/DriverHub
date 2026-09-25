import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Briefcase, Plus, Users, Clock, CheckCircle2, XCircle, 
  ChevronDown, ChevronRight, Eye, MoreVertical, FileText, 
  Sparkles, Filter, Info, Wallet
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { Job, JobStatus, Application, DriverProfile } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';

export const EmployerManageJobs: React.FC = () => {
  const currentUser = DataStore.getCurrentUser();
  const employerId = currentUser?.role === 'employer' ? currentUser.id : '';
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const postMenuRef = useRef<HTMLDivElement>(null);

  const loadJobs = () => {
    const allJobs = DataStore.getJobs();
    const empJobs = allJobs.filter(j => j.employerId === employerId);
    setJobs(empJobs);
    setApplications(DataStore.getApplications().filter(a => empJobs.some(j => j.id === a.jobId)));
    setDrivers(DataStore.getDrivers().filter(d => d.status === 'active'));
  };

  useEffect(() => {
    loadJobs();
    window.addEventListener('driverhub_storage_updated', loadJobs);
    return () => window.removeEventListener('driverhub_storage_updated', loadJobs);
  }, [employerId]);

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

  const handleStatusChange = (jobId: string, newStatus: JobStatus) => {
    const updated = DataStore.updateJobStatus(jobId, newStatus);
    if (!updated) {
      navigate('/employer/plans');
      return;
    }
    setOpenActionMenuId(null);
    loadJobs();
    setToast(`Job status updated to ${newStatus.toUpperCase()}`);
    setTimeout(() => setToast(null), 3500);
  };

  const handleActivateWithCredit = (job: Job) => {
    const activated = DataStore.updateJobStatus(job.id, 'active');
    if (!activated) {
      navigate('/employer/plans');
      return;
    }
    loadJobs();
    setToast(`Published "${job.title}" using 1 Job Credit! Now live to drivers.`);
    setTimeout(() => setToast(null), 3500);
  };

  const activeCount = jobs.filter(j => j.status === 'active').length;
  const pendingCount = jobs.filter(j => j.status === 'pending').length;
  const closedCount = jobs.filter(j => j.status === 'closed' || j.status === 'rejected').length;
  const draftCount = jobs.filter(j => j.status === 'draft').length;

  const filtered = jobs.filter(j => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'closed') return j.status === 'closed' || j.status === 'rejected';
    return j.status === statusFilter;
  });

  const subscription = DataStore.getSubscription(employerId);

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-[#08233F] text-white rounded-2xl shadow-xl border border-slate-700 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Header: All Jobs (N) + Post a new job dropdown (Matches Screenshots 4 & 5) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-extrabold text-[#08233F] font-display">
            All Jobs ({jobs.length})
          </h1>
          <Link
            to="/employer/billing"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Available credits: <strong className="text-emerald-700">{subscription.jobCredits} Jobs</strong></span>
          </Link>
        </div>

        {/* Post a new job button with ApnaHire Popover Dropdown (Screenshot 5) */}
        <div className="relative" ref={postMenuRef}>
          <button
            onClick={() => setShowPostMenu(!showPostMenu)}
            className="inline-flex items-center gap-2 bg-[#19745B] hover:bg-[#135A46] text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
          >
            <span>Post a new job</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showPostMenu ? 'rotate-180' : ''}`} />
          </button>

          {showPostMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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
                      Start with new post
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Use our step-by-step blank form to create your driver job
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
                      Use a job template
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Save time and hire the right drivers using ready templates
                    </p>
                    <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-purple-700 text-white text-[10px] font-bold rounded-full">
                      Save 50% more time
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ApnaHire Filter Pills Row (Screenshot 4) */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={() => setStatusFilter('all')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-[#08233F] text-white border-[#08233F]'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Filter className="w-3.5 h-3.5" /> All Filters ({jobs.length})
        </button>

        <button
          onClick={() => setStatusFilter('active')}
          className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            statusFilter === 'active'
              ? 'bg-emerald-700 text-white border-emerald-700'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          + Active ({activeCount})
        </button>

        <button
          onClick={() => setStatusFilter('pending')}
          className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-amber-500 text-slate-950 border-amber-500'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          + Under Review ({pendingCount})
        </button>

        <button
          onClick={() => setStatusFilter('closed')}
          className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            statusFilter === 'closed'
              ? 'bg-slate-800 text-white border-slate-800'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          + Expired ({closedCount})
        </button>

        <button
          onClick={() => setStatusFilter('draft')}
          className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            statusFilter === 'draft'
              ? 'bg-orange-600 text-white border-orange-600'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          + Select Plan ({draftCount})
        </button>
      </div>

      {/* Job Cards List (Exact 3-Column Funnel Layout from Screenshot 4) */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-card space-y-3">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-[#08233F] font-display">No vacancies in this filter</h3>
          <p className="text-xs text-slate-500">Create a new driver job post or switch filters above.</p>
          <button
            onClick={() => navigate('/employer/post-job')}
            className="px-4 py-2 bg-[#19745B] text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            + Post a new job
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
            const dbMatchesCount = drivers.filter(
              d =>
                d.driverCategory === job.category ||
                d.city.toLowerCase() === (job.city || 'Bengaluru').toLowerCase()
            ).length;

            return (
              <div
                key={job.id}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-subtle hover:shadow-card transition-all space-y-4"
              >
                {/* Top Row: Title + Badge + Actions */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Link
                        to={`/jobs/${job.id}`}
                        className="text-base font-bold text-slate-900 hover:text-blue-700 transition-colors"
                      >
                        {job.title}
                      </Link>
                      {job.status === 'draft' ? (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded-md text-[11px] font-bold">
                          Organization Draft 📝
                        </span>
                      ) : job.status === 'pending' ? (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[11px] font-bold">
                          Under Admin Review ⏳
                        </span>
                      ) : (
                        <StatusBadge status={job.status} size="sm" />
                      )}
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-semibold">
                        {job.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      {job.location} &nbsp;|&nbsp; Posted on : {job.postedDate} &nbsp;|&nbsp; {job.postedBy || 'Hiring Lead'}
                    </p>
                    <p className="text-xs text-slate-500">
                      For : <span className="font-semibold text-slate-700">{job.companyName}</span> • Salary: ₹{job.salaryMin.toLocaleString('en-IN')} – ₹{job.salaryMax.toLocaleString('en-IN')}/mo
                    </p>
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex items-center gap-2 self-start flex-wrap">
                    {job.status === 'draft' ? (
                      <button
                        onClick={() => handleActivateWithCredit(job)}
                        className="px-3.5 py-1.5 bg-[#19745B] hover:bg-[#135A46] text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                        title="Approve draft and publish live to all drivers immediately"
                      >
                        <Wallet className="w-3 h-3" />
                        <span>Approve & Make Live</span>
                      </button>
                    ) : job.status === 'pending' ? (
                      <button
                        onClick={() => handleActivateWithCredit(job)}
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 shadow-2xs cursor-pointer"
                      >
                        Instant Approve Live
                      </button>
                    ) : (
                      <Link
                        to={`/employer/applications?jobId=${job.id}`}
                        className="px-3.5 py-1.5 bg-[#08233F] hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-2xs"
                      >
                        View Applicants ({appliedCount})
                      </Link>
                    )}

                    <div className="relative job-action-menu-container">
                      <button
                        onClick={() => setOpenActionMenuId(openActionMenuId === job.id ? null : job.id)}
                        className="p-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                        aria-label="Job actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openActionMenuId === job.id && (
                        <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-30 text-xs font-semibold animate-in fade-in zoom-in-95">
                          <Link
                            to={`/jobs/${job.id}`}
                            onClick={() => setOpenActionMenuId(null)}
                            className="block px-3.5 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            👁️ View Public Job Page
                          </Link>
                          <Link
                            to={`/employer/candidates?category=${encodeURIComponent(job.category)}&city=${encodeURIComponent(job.city || '')}`}
                            onClick={() => setOpenActionMenuId(null)}
                            className="block px-3.5 py-2 text-emerald-700 hover:bg-emerald-50 transition-colors font-bold"
                          >
                            👥 View Database Matches ({dbMatchesCount})
                          </Link>
                          <Link
                            to={`/employer/applications?jobId=${job.id}`}
                            onClick={() => setOpenActionMenuId(null)}
                            className="block px-3.5 py-2 text-blue-700 hover:bg-blue-50 transition-colors"
                          >
                            📋 View Applications ({appliedCount})
                          </Link>
                          <div className="border-t border-slate-100 my-1" />
                          {job.status === 'active' ? (
                            <button
                              onClick={() => handleStatusChange(job.id, 'closed')}
                              className="w-full text-left px-3.5 py-2 text-red-600 hover:bg-red-50 cursor-pointer font-bold transition-colors"
                            >
                              ⏸️ Close / Pause Job
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateWithCredit(job)}
                              className="w-full text-left px-3.5 py-2 text-emerald-700 hover:bg-emerald-50 cursor-pointer font-bold transition-colors"
                            >
                              🚀 Publish / Reopen Job (1 Credit)
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3-Column Funnel Metrics Box (Exact Match to Screenshot 4: Applied to job | Active leads | Database matches) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-white">
                  <Link
                    to={`/employer/applications?jobId=${job.id}`}
                    className="p-3.5 hover:bg-slate-50 transition-colors flex flex-col justify-between group"
                  >
                    <span className="text-base font-extrabold text-slate-900">{appliedCount}</span>
                    <span className="text-xs text-slate-500 group-hover:text-slate-900 inline-flex items-center gap-1 mt-0.5">
                      Applied to job <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>

                  <Link
                    to={`/employer/applications?jobId=${job.id}&status=shortlisted`}
                    className="p-3.5 hover:bg-slate-50 transition-colors flex flex-col justify-between group"
                  >
                    <span className="text-base font-extrabold text-slate-900">{activeLeadsCount}</span>
                    <span className="text-xs text-slate-500 group-hover:text-slate-900 inline-flex items-center gap-1 mt-0.5">
                      Active leads <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>

                  <Link
                    to={`/employer/candidates?category=${encodeURIComponent(job.category)}&city=${encodeURIComponent(job.city || 'Bengaluru')}`}
                    className="p-3.5 hover:bg-slate-50 transition-colors flex flex-col justify-between group"
                  >
                    <span className="text-base font-extrabold text-emerald-700">{dbMatchesCount}</span>
                    <span className="text-xs text-slate-500 group-hover:text-emerald-700 inline-flex items-center gap-1 mt-0.5">
                      Database matches <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                </div>

                {/* Bottom Status Info Strip (Screenshot 4) */}
                <div className="px-3.5 py-2 bg-slate-50 rounded-lg flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>
                      {job.status === 'active'
                        ? `Job is active and receiving verified ${job.category} driver applications.`
                        : 'Finish job posting or approve with 1 Job Credit to start receiving candidates immediately.'}
                    </span>
                  </div>
                  <Link
                    to={`/employer/candidates?category=${encodeURIComponent(job.category)}`}
                    className="text-[11px] font-bold text-emerald-700 hover:underline shrink-0 ml-2"
                  >
                    Unlock matching drivers →
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
