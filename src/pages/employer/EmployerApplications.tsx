import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Users, FileText, CheckCircle2, ShieldCheck, Phone, MessageSquare, Download, AlertCircle, Loader2, X, CalendarClock
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { SupabaseSync } from '../../services/supabaseSync';
import { Application, ApplicationStatus, DriverDocument, Job } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useLanguage } from '../../services/i18n';
import { clearLastError, formatDateTimeIN, toDateTimeLocalValue } from '../../services/employerApi';

/** Status changes an employer may make (same rules as DataStore.updateApplicationStatus / the database). */
const EMPLOYER_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  applied: ['viewed', 'under_review', 'shortlisted', 'rejected'],
  viewed: ['under_review', 'shortlisted', 'contacted', 'interview', 'rejected'],
  under_review: ['shortlisted', 'contacted', 'interview', 'rejected'],
  shortlisted: ['contacted', 'interview', 'selected', 'hired', 'rejected'],
  contacted: ['interview', 'selected', 'hired', 'rejected'],
  interview: ['selected', 'hired', 'rejected'],
  selected: ['hired', 'rejected'],
  hired: [],
  rejected: [],
  withdrawn: []
};

type InterviewMode = NonNullable<Application['interviewMode']>;
const INTERVIEW_MODES: InterviewMode[] = ['In-Person Driving Trial', 'Phone Interview', 'Video Verification'];

const STATUS_LABEL = (status: string) => status.replace(/_/g, ' ').toUpperCase();
const NOT_PROVIDED = 'Not provided';

type Toast = { text: string; type: 'success' | 'error' };

const docStatusChip = (status: DriverDocument['verificationStatus']) => {
  if (status === 'verified') return { label: '✓ Verified', className: 'bg-emerald-100 text-emerald-800' };
  if (status === 'rejected') return { label: 'Rejected', className: 'bg-rose-100 text-rose-700' };
  return { label: 'Pending review', className: 'bg-amber-100 text-amber-800' };
};

export const EmployerApplications: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { jobId: paramJobId } = useParams<{ jobId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = DataStore.getCurrentUser();
  const userId = currentUser?.id || '';
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  // Filters live in the URL so links (/employer/applications?jobId=…&status=…) and back/forward work.
  const selectedJobId = paramJobId || searchParams.get('jobId') || 'all';
  const selectedStatus = searchParams.get('status') || 'all';
  const setFilters = (next: { jobId?: string; status?: string }) => {
    const jobId = next.jobId ?? selectedJobId;
    const status = next.status ?? selectedStatus;
    const params = new URLSearchParams();
    if (jobId !== 'all') params.set('jobId', jobId);
    if (status !== 'all') params.set('status', status);
    if (paramJobId) {
      const query = params.toString();
      navigate({ pathname: '/employer/applications', search: query ? `?${query}` : '' }, { replace: true });
    } else {
      setSearchParams(params, { replace: true });
    }
  };

  // Candidate detail / status modal
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [interviewDateInput, setInterviewDateInput] = useState('');
  const [interviewModeInput, setInterviewModeInput] = useState<InterviewMode>('In-Person Driving Trial');
  const [interviewLocationInput, setInterviewLocationInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [savingAction, setSavingAction] = useState<string | null>(null);

  // Applicant documents (60-second signed links, fetched per candidate)
  const [docs, setDocs] = useState<DriverDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState('');
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);
  const [docFallback, setDocFallback] = useState<{ id: string; url: string } | null>(null);
  const docsRequestRef = useRef(0);

  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!userId) return;
    const loadData = () => {
      const empJobs = DataStore.getJobs().filter(j => j.employerId === userId);
      setJobs(empJobs);
      const jobIds = new Set(empJobs.map(j => j.id));
      setApplications(DataStore.getApplications().filter(a => jobIds.has(a.jobId)));
    };
    loadData();
    window.addEventListener('driverhub_storage_updated', loadData);
    return () => window.removeEventListener('driverhub_storage_updated', loadData);
  }, [userId]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const selectedApp = selectedAppId ? applications.find(a => a.id === selectedAppId) || null : null;

  const showToast = (text: string, type: Toast['type'] = 'success') => {
    window.clearTimeout(toastTimer.current);
    setToast({ text, type });
    toastTimer.current = window.setTimeout(() => setToast(null), type === 'error' ? 6000 : 3500);
  };

  const loadDocuments = async (app: Application) => {
    const requestId = ++docsRequestRef.current;
    setDocs([]);
    setDocsError('');
    setDocFallback(null);
    setDocsLoading(true);
    try {
      const result = await SupabaseSync.getEmployerApplicantDocuments(app.driverId, app.jobId);
      if (requestId === docsRequestRef.current) setDocs(result);
    } catch (e) {
      if (requestId === docsRequestRef.current) {
        setDocsError(e instanceof Error ? e.message : 'Documents could not be loaded.');
      }
    } finally {
      if (requestId === docsRequestRef.current) setDocsLoading(false);
    }
  };

  const handleOpenCandidate = (app: Application) => {
    setSelectedAppId(app.id);
    setNotesInput(app.employerNotes || '');
    setInterviewDateInput(toDateTimeLocalValue(app.interviewDate));
    setInterviewModeInput(app.interviewMode || 'In-Person Driving Trial');
    setInterviewLocationInput(app.interviewLocation || '');
    void loadDocuments(app);
  };

  const closeModal = () => {
    docsRequestRef.current += 1;
    setSelectedAppId(null);
    setDocs([]);
    setDocsError('');
    setDocFallback(null);
  };

  const handleStatusUpdate = async (app: Application, status: ApplicationStatus, fromModal: boolean) => {
    if (savingAction) return;
    const options: { employerNotes?: string; interviewDate?: string; interviewMode?: InterviewMode; interviewLocation?: string } = {};
    if (fromModal) options.employerNotes = notesInput.trim();
    if (status === 'interview') {
      if (!interviewDateInput) {
        showToast('Choose the interview date and time before scheduling the interview.', 'error');
        return;
      }
      const when = new Date(interviewDateInput);
      if (Number.isNaN(when.getTime())) {
        showToast('Enter a valid interview date and time.', 'error');
        return;
      }
      options.interviewDate = when.toISOString();
      options.interviewMode = interviewModeInput;
      options.interviewLocation = interviewLocationInput.trim() || undefined;
    }
    setSavingAction(status);
    clearLastError();
    let saved = false;
    try {
      saved = await DataStore.updateApplicationStatus(app.id, status, options);
    } catch (err) {
      console.warn('Application update error:', err);
    } finally {
      setSavingAction(null);
    }
    if (!saved) {
      showToast(DataStore.getLastError('This application could not be updated. Refresh and try again.'), 'error');
      return;
    }
    showToast(status === app.status ? 'Interview details saved.' : `Status updated to "${STATUS_LABEL(status)}"`);
  };

  /** Save the employer's remarks without changing the status. */
  const handleSaveNotes = async (app: Application) => {
    if (savingAction) return;
    setSavingAction('notes');
    clearLastError();
    let saved = false;
    try {
      saved = await DataStore.updateApplicationStatus(app.id, app.status, { employerNotes: notesInput.trim() });
    } catch (err) {
      console.warn('Notes save error:', err);
    } finally {
      setSavingAction(null);
    }
    if (!saved) {
      showToast(DataStore.getLastError('Your notes could not be saved. Please try again.'), 'error');
      return;
    }
    showToast('Notes saved.');
  };

  /**
   * Signed links expire after 60 seconds, so request a fresh one on every
   * click. The tab is opened synchronously first: iOS Safari blocks
   * window.open() that runs after an await.
   */
  const openDocument = async (doc: DriverDocument, download: boolean) => {
    if (!selectedApp || openingDocId) return;
    const win = window.open('', '_blank');
    setOpeningDocId(doc.id);
    setDocFallback(null);
    try {
      const requestId = docsRequestRef.current;
      const fresh = await SupabaseSync.getEmployerApplicantDocuments(selectedApp.driverId, selectedApp.jobId);
      // The employer may have switched to another candidate meanwhile.
      if (requestId === docsRequestRef.current) setDocs(fresh);
      const match = fresh.find(d => d.id === doc.id);
      if (!match) throw new Error('This document is no longer available.');
      let url = match.fileUrl;
      if (!/^https?:\/\//i.test(url) && !url.startsWith('blob:')) throw new Error('This document cannot be opened.');
      if (download && url.includes('/storage/v1/object/sign/')) {
        url += `${url.includes('?') ? '&' : '?'}download=${encodeURIComponent(doc.name)}`;
      }
      if (win) {
        win.opener = null;
        win.location.href = url;
      } else {
        // Pop-up blocked: offer a direct link the user can tap.
        setDocFallback({ id: doc.id, url });
      }
    } catch (e) {
      win?.close();
      showToast(e instanceof Error ? e.message : 'This document could not be opened.', 'error');
    } finally {
      setOpeningDocId(null);
    }
  };

  const jobFilteredApps = applications.filter(a => selectedJobId === 'all' || a.jobId === selectedJobId);
  const filtered = jobFilteredApps.filter((app) => {
    if (selectedStatus === 'all') return true;
    if (selectedStatus === 'under_review') return app.status === 'under_review' || app.status === 'viewed';
    if (selectedStatus === 'selected') return app.status === 'selected' || app.status === 'hired';
    return app.status === selectedStatus;
  });

  const driverDetails = selectedApp ? DataStore.getDriverById(selectedApp.driverId) : null;
  const allowedNext = selectedApp ? EMPLOYER_TRANSITIONS[selectedApp.status] || [] : [];
  const showInterviewFields = Boolean(selectedApp) && (allowedNext.includes('interview') || selectedApp!.status === 'interview');
  const verifiedDocs = docs.filter(d => d.verificationStatus === 'verified');
  const licenceVerified = verifiedDocs.some(d => d.type === 'driving_license');
  const policeVerified = selectedApp?.driverPoliceVerified === true || verifiedDocs.some(d => d.type === 'police_verification');
  const whatsappNumber = (() => {
    const digits = (selectedApp?.driverPhone || '').replace(/\D/g, '');
    return digits.length === 10 ? `91${digits}` : digits;
  })();

  const statusActions: Array<{ status: ApplicationStatus; label: string; className: string }> = [
    { status: 'under_review', label: 'Mark under review', className: 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200' },
    { status: 'shortlisted', label: `✓ ${t('shortlistCandidate')}`, className: 'bg-amber-500 hover:bg-amber-600 text-slate-950' },
    { status: 'contacted', label: 'Mark as contacted', className: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200' },
    { status: 'interview', label: `🗓️ ${t('scheduleInterview')}`, className: 'bg-purple-600 hover:bg-purple-700 text-white' },
    { status: 'selected', label: `🏆 ${t('selectHire')}`, className: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    { status: 'hired', label: 'Mark as hired', className: 'bg-emerald-800 hover:bg-emerald-900 text-white' },
    { status: 'rejected', label: `✕ ${t('reject')}`, className: 'bg-red-100 hover:bg-red-200 text-red-700' }
  ];

  return (
    <div className="space-y-6">
      {/* Toast feedback: above the candidate modal (z-50) */}
      {toast && (
        <div
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={`fixed top-4 sm:top-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[60] flex items-start gap-2 p-3.5 rounded-2xl shadow-xl border text-xs font-semibold animate-in fade-in slide-in-from-top-3 ${
            toast.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-[#08233F] text-white border-slate-700'
          }`}
        >
          {toast.type === 'error'
            ? <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-px" />
            : <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-px" />}
          <span className="min-w-0 flex-1 break-words">{toast.text}</span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-display">{t('candidatePipeline')}</h1>
        <p className="text-xs text-slate-500 mt-1">{t('candidatePipelineDesc')}</p>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center gap-2 sm:gap-3 w-full sm:w-auto min-w-0">
          <label htmlFor="applications-job-filter" className="text-xs font-bold text-slate-700 shrink-0">{t('filterByVacancy')}:</label>
          <select
            id="applications-job-filter"
            value={selectedJobId}
            onChange={(e) => setFilters({ jobId: e.target.value })}
            className="w-full sm:w-72 min-h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none cursor-pointer"
          >
            <option value="all">{t('allJobs')} ({applications.length})</option>
            {selectedJobId !== 'all' && !jobs.some(j => j.id === selectedJobId) && (
              <option value={selectedJobId}>Selected job</option>
            )}
            {jobs.map((j) => {
              const jApps = applications.filter(a => a.jobId === j.id);
              return (
                <option key={j.id} value={j.id}>
                  {j.title} ({jApps.length} {jApps.length === 1 ? t('candidate') : t('candidates')})
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: t('all'), count: jobFilteredApps.length },
            { id: 'applied', label: t('applied'), count: jobFilteredApps.filter(a => a.status === 'applied').length },
            { id: 'under_review', label: t('underReview'), count: jobFilteredApps.filter(a => a.status === 'under_review' || a.status === 'viewed').length },
            { id: 'shortlisted', label: t('shortlisted'), count: jobFilteredApps.filter(a => a.status === 'shortlisted').length },
            { id: 'interview', label: t('interview'), count: jobFilteredApps.filter(a => a.status === 'interview').length },
            { id: 'selected', label: t('selected'), count: jobFilteredApps.filter(a => a.status === 'selected' || a.status === 'hired').length },
            { id: 'rejected', label: t('rejected'), count: jobFilteredApps.filter(a => a.status === 'rejected').length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilters({ status: tab.id })}
              className={`min-h-10 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedStatus === tab.id
                  ? 'bg-[#08233F] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedStatus === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-xs space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">{t('noCandidateApps')}</h3>
          <p className="text-xs text-slate-500">{t('appsWillAppearHere')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 break-words">
                    {app.driverName || t('driverCandidate')}
                  </h3>
                  {app.driverPoliceVerified && (
                    <span title="Police verification verified">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </span>
                  )}
                  <StatusBadge status={app.status} size="sm" />
                </div>

                <p className="text-xs text-slate-600 break-words">
                  {t('appliedFor')}: <span className="font-semibold text-slate-900">{app.jobTitle || 'Job listing'}</span> • {app.appliedDate}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>🚗 {t('category')}: {app.driverCategory ? t(app.driverCategory) : NOT_PROVIDED}</span>
                  <span>⏱️ {t('experience')}: {typeof app.driverExperienceYears === 'number' ? `${app.driverExperienceYears} ${app.driverExperienceYears === 1 ? t('yearExperience') : t('yearsExperience')}` : NOT_PROVIDED}</span>
                  <span className="break-words">📍 {t('location')}: {app.driverLocation || NOT_PROVIDED}</span>
                </div>

                {app.status === 'interview' && app.interviewDate && (
                  <p className="text-xs text-purple-800 font-semibold inline-flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5" /> Interview: {formatDateTimeIN(app.interviewDate)}
                    {app.interviewMode ? ` · ${app.interviewMode}` : ''}
                  </p>
                )}

                {app.coverMessage && (
                  <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 mt-2 line-clamp-1 break-words">
                    "{app.coverMessage}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 flex-wrap">
                <button
                  onClick={() => handleOpenCandidate(app)}
                  className="min-h-10 px-4 py-2 bg-[#0A2540] hover:bg-[#06182B] text-white text-xs font-semibold rounded-xl cursor-pointer transition-all shadow-xs"
                >
                  {t('viewDetailsAndManage')}
                </button>

                {app.status === 'applied' && (
                  <button
                    onClick={() => handleStatusUpdate(app, 'shortlisted', false)}
                    disabled={Boolean(savingAction)}
                    className="min-h-10 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-slate-950 text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all"
                  >
                    {t('shortlist')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Candidate Details & Status Transition Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-6 max-h-[90dvh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">{t('candidateProfile')}</span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5 break-words">{selectedApp.driverName || t('driverCandidate')}</h3>
                <p className="text-xs text-slate-500 break-words">{t('appliedFor')} {selectedApp.jobTitle}</p>
              </div>
              <button
                onClick={closeModal}
                aria-label="Close"
                className="min-h-10 min-w-10 inline-flex items-center justify-center text-slate-400 hover:text-slate-900 rounded-lg cursor-pointer transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Reach & Communication Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              {selectedApp.driverPhone && (
                <>
                  <a
                    href={`tel:${selectedApp.driverPhone}`}
                    className="min-h-10 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span className="break-all">{t('callDriver')} ({selectedApp.driverPhone})</span>
                  </a>

                  {whatsappNumber && (
                    <a
                      href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi ${selectedApp.driverName || ''}, we are reviewing your application for the ${selectedApp.jobTitle || ''} vacancy on DriverHub.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-10 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </>
              )}

              <Link
                to={`/employer/messages?driverId=${encodeURIComponent(selectedApp.driverId)}&jobId=${encodeURIComponent(selectedApp.jobId)}`}
                className="min-h-10 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{t('inAppChat')}</span>
              </Link>
            </div>

            {/* Candidate Info Grid */}
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
              <div className="min-w-0">
                <span className="text-slate-400 block">{t('phone')}</span>
                {selectedApp.driverPhone ? (
                  <a href={`tel:${selectedApp.driverPhone}`} className="font-bold text-blue-600 hover:underline break-all">
                    {selectedApp.driverPhone}
                  </a>
                ) : (
                  <span className="font-bold text-slate-500">{NOT_PROVIDED}</span>
                )}
              </div>
              <div className="min-w-0">
                <span className="text-slate-400 block">Email</span>
                <span className="font-bold text-slate-900 break-all">{selectedApp.driverEmail || NOT_PROVIDED}</span>
              </div>
              <div className="min-w-0">
                <span className="text-slate-400 block">{t('category')}</span>
                <span className="font-bold text-slate-900">{selectedApp.driverCategory ? t(selectedApp.driverCategory) : NOT_PROVIDED}</span>
              </div>
              <div className="min-w-0">
                <span className="text-slate-400 block">{t('experience')}</span>
                <span className="font-bold text-slate-900">
                  {typeof selectedApp.driverExperienceYears === 'number' ? `${selectedApp.driverExperienceYears} ${selectedApp.driverExperienceYears === 1 ? t('yearExperience') : t('yearsExperience')}` : NOT_PROVIDED}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-slate-400 block">{t('location')}</span>
                <span className="font-bold text-slate-900 break-words">{selectedApp.driverLocation || NOT_PROVIDED}</span>
              </div>
              <div className="min-w-0">
                <span className="text-slate-400 block">Expected salary</span>
                <span className="font-bold text-slate-900">
                  {typeof selectedApp.driverExpectedSalary === 'number' && selectedApp.driverExpectedSalary > 0
                    ? `₹${selectedApp.driverExpectedSalary.toLocaleString('en-IN')} / month`
                    : NOT_PROVIDED}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-slate-400 block">{t('appliedDate')}</span>
                <span className="font-bold text-slate-900">{selectedApp.appliedDate}</span>
              </div>
              <div className="min-w-0">
                <span className="text-slate-400 block">{t('currentStatus')}</span>
                <StatusBadge status={selectedApp.status} size="sm" />
              </div>
              {selectedApp.interviewDate && (
                <div className="min-w-0">
                  <span className="text-slate-400 block">Interview</span>
                  <span className="font-bold text-purple-800 break-words">
                    {formatDateTimeIN(selectedApp.interviewDate)}
                    {selectedApp.interviewMode ? ` · ${selectedApp.interviewMode}` : ''}
                    {selectedApp.interviewLocation ? ` · ${selectedApp.interviewLocation}` : ''}
                  </span>
                </div>
              )}
            </div>

            {(selectedApp.driverSkills?.length || 0) > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedApp.driverSkills!.map(skill => (
                  <span key={skill} className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-[11px] font-semibold">
                    ✓ {skill}
                  </span>
                ))}
              </div>
            )}

            {/* License & Verification */}
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 text-xs space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Licence &amp; verification
                </span>
                {policeVerified || licenceVerified ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    {[policeVerified ? 'Police verified' : '', licenceVerified ? 'Licence verified' : ''].filter(Boolean).join(' · ')}
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                    Not verified yet
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-slate-700 bg-white/80 p-3 rounded-xl border border-emerald-100">
                <p className="min-w-0 break-words"><strong>{t('licenseNumber')}:</strong> {selectedApp.driverLicenseNumber || driverDetails?.licenseNumber || NOT_PROVIDED}</p>
                <p className="min-w-0 break-words"><strong>{t('licenseType')}:</strong> {selectedApp.driverLicenseType || driverDetails?.licenseType || NOT_PROVIDED}</p>
                <p className="min-w-0 break-words"><strong>{t('licenseExpiry')}:</strong> {selectedApp.driverLicenseExpiry || driverDetails?.licenseExpiry || NOT_PROVIDED}</p>
              </div>

              {/* Uploaded Verification Documents List */}
              <div className="space-y-2 pt-1 border-t border-emerald-200/60">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    {t('uploadedDocuments')} ({docs.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => void loadDocuments(selectedApp)}
                    disabled={docsLoading}
                    className="min-h-10 px-2 text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>

                {docsLoading ? (
                  <div className="p-3 bg-white/60 rounded-xl border border-slate-200 text-center text-slate-500 text-xs inline-flex items-center justify-center gap-2 w-full">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading documents…
                  </div>
                ) : docsError ? (
                  <div role="alert" className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-700 text-xs space-y-1.5 break-words">
                    <p>{docsError}</p>
                    {/subscription|plan/i.test(docsError) && (
                      <Link to="/employer/plans" className="font-bold underline">View plans →</Link>
                    )}
                  </div>
                ) : docs.length === 0 ? (
                  <div className="p-3 bg-white/60 rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
                    {t('noDocsUploadedYet')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {docs.map((doc) => {
                      const chip = docStatusChip(doc.verificationStatus);
                      const opening = openingDocId === doc.id;
                      return (
                        <div
                          key={doc.id}
                          className="p-3 bg-white rounded-xl border border-emerald-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block text-xs break-all">{doc.name}</span>
                              <span className="text-[11px] text-slate-500">
                                {doc.type.replace(/_/g, ' ').toUpperCase()} • {t('uploadedOn')} {doc.uploadDate} {doc.fileSize ? `• ${doc.fileSize}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
                            <span className={`px-2 py-0.5 font-bold rounded-full text-[10px] ${chip.className}`}>
                              {chip.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => void openDocument(doc, false)}
                              disabled={Boolean(openingDocId)}
                              className="min-h-10 inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-800 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            >
                              {opening ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                              <span>{t('view')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void openDocument(doc, true)}
                              disabled={Boolean(openingDocId)}
                              className="min-h-10 inline-flex items-center gap-1 px-3 py-1 bg-[#08233F] hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                              <span>{t('download')}</span>
                            </button>
                            {docFallback?.id === doc.id && (
                              <a
                                href={docFallback.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setDocFallback(null)}
                                className="min-h-10 inline-flex items-center px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                              >
                                Tap to open
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-[10px] text-slate-500">Document links are valid for 60 seconds; each tap requests a fresh link.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Application History with This Employer */}
            <div className="space-y-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs">
              <h4 className="font-bold text-slate-800 flex items-center justify-between gap-2">
                <span>{t('companyAppHistory')}</span>
              </h4>
              <div className="space-y-1.5">
                {applications
                  .filter(a => a.driverId === selectedApp.driverId)
                  .map((historyApp) => (
                    <div
                      key={historyApp.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                        historyApp.id === selectedApp.id
                          ? 'bg-blue-50/70 border-blue-200 font-medium'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate">{historyApp.jobTitle}</span>
                        <span className="text-[10px] text-slate-500">{t('applied')}: {historyApp.appliedDate}</span>
                      </div>
                      <div className="shrink-0 flex items-center gap-2 flex-wrap justify-end">
                        {historyApp.id === selectedApp.id && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">{t('current')}</span>
                        )}
                        <StatusBadge status={historyApp.status} size="sm" />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Cover Message */}
            {selectedApp.coverMessage && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('coverNoteFromDriver')}</label>
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 leading-relaxed border border-slate-200/70 break-words">
                  {selectedApp.coverMessage}
                </div>
              </div>
            )}

            {/* Interview Slot & Notes Controls */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {t('updateStatusSchedule')}
              </h4>

              {showInterviewFields && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                  <div className="min-w-0">
                    <label htmlFor="interview-datetime" className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('interviewTrialSlot')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="interview-datetime"
                      type="datetime-local"
                      required
                      value={interviewDateInput}
                      onChange={(e) => setInterviewDateInput(e.target.value)}
                      className="w-full min-h-10 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="interview-mode" className="block text-xs font-semibold text-slate-700 mb-1">Interview mode</label>
                    <select
                      id="interview-mode"
                      value={interviewModeInput}
                      onChange={(e) => setInterviewModeInput(e.target.value as InterviewMode)}
                      className="w-full min-h-10 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                    >
                      {INTERVIEW_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2 min-w-0">
                    <label htmlFor="interview-location" className="block text-xs font-semibold text-slate-700 mb-1">
                      Interview location / call details
                    </label>
                    <input
                      id="interview-location"
                      type="text"
                      value={interviewLocationInput}
                      onChange={(e) => setInterviewLocationInput(e.target.value)}
                      placeholder="e.g. Peenya depot, Gate 2 — or the phone/video link"
                      className="w-full min-h-10 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  {selectedApp.status === 'interview' && (
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(selectedApp, 'interview', true)}
                        disabled={Boolean(savingAction)}
                        className="min-h-10 px-3.5 py-2 bg-white hover:bg-purple-50 border border-purple-300 text-purple-800 font-bold rounded-xl text-xs cursor-pointer disabled:opacity-60"
                      >
                        {savingAction === 'interview' ? 'Saving…' : 'Update interview details'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="employer-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('employerRemarks')}
                </label>
                <textarea
                  id="employer-notes"
                  rows={2}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder={t('employerRemarksPlaceholder')}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSaveNotes(selectedApp)}
                  disabled={Boolean(savingAction)}
                  className="mt-1.5 min-h-10 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold rounded-xl text-xs cursor-pointer disabled:opacity-60"
                >
                  {savingAction === 'notes' ? 'Saving…' : 'Save notes'}
                </button>
              </div>

              {/* Status Action Buttons: only transitions the database accepts */}
              {allowedNext.length === 0 ? (
                <p className="text-xs text-slate-500 pt-2">
                  This application is {STATUS_LABEL(selectedApp.status).toLowerCase()}; its status can no longer be changed.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {statusActions
                    .filter(action => allowedNext.includes(action.status))
                    .map(action => (
                      <button
                        key={action.status}
                        type="button"
                        onClick={() => handleStatusUpdate(selectedApp, action.status, true)}
                        disabled={Boolean(savingAction)}
                        className={`min-h-10 px-3.5 py-2 font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-all disabled:opacity-60 inline-flex items-center gap-1.5 ${action.className}`}
                      >
                        {savingAction === action.status && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {action.label}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
