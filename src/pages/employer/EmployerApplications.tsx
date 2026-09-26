import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { 
  Users, FileText, CheckCircle2, XCircle, Clock, Award, 
  UserCheck, Phone, Mail, Calendar, MessageSquare, ShieldCheck, Download 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { Application, ApplicationStatus, DriverDocument, DriverProfile, Job } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SupabaseSync } from '../../services/supabaseSync';

export const EmployerApplications: React.FC = () => {
  const { jobId: paramJobId } = useParams<{ jobId?: string }>();
  const [searchParams] = useSearchParams();
  const currentUser = DataStore.getCurrentUser();
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(
    paramJobId || searchParams.get('jobId') || 'all'
  );
  const [selectedStatus, setSelectedStatus] = useState<string>(
    searchParams.get('status') || 'all'
  );

  // Candidate detail / status modal
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [interviewDateInput, setInterviewDateInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [driverDetails, setDriverDetails] = useState<DriverProfile | null>(null);
  const [driverDocuments, setDriverDocuments] = useState<DriverDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = () => {
    if (!currentUser) return;
    const allJobs = DataStore.getJobs();
    const emp = DataStore.getEmployerById(currentUser.id);
    const empJobs = allJobs.filter(j => 
      j.employerId === currentUser.id || 
      (emp && emp.companyName && j.companyName.toLowerCase() === emp.companyName.toLowerCase())
    );
    setJobs(empJobs);

    const jobIds = new Set(empJobs.map(j => j.id));
    const allApps = DataStore.getApplications();
    const empApps = allApps.filter(a => 
      jobIds.has(a.jobId) || 
      (emp && emp.companyName && a.companyName && a.companyName.toLowerCase() === emp.companyName.toLowerCase())
    );
    setApplications(empApps);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('driverhub_storage_updated', loadData);
    return () => window.removeEventListener('driverhub_storage_updated', loadData);
  }, [currentUser]);

  const handleStatusUpdate = async (appId: string, status: ApplicationStatus) => {
    const saved = await DataStore.updateApplicationStatus(appId, status, {
      employerNotes: notesInput.trim() || undefined,
      interviewDate: status === 'interview' ? interviewDateInput : undefined,
    });
    if (!saved) {
      setToastMessage('This application could not be updated. Refresh and try again.');
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }
    setToastMessage(`Status updated to "${status.replace('_', ' ').toUpperCase()}"`);
    loadData();
    if (selectedApp?.id === appId) {
      const updated = DataStore.getApplicationById(appId);
      setSelectedApp(updated || null);
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenCandidate = async (app: Application) => {
    setSelectedApp(app);
    const driver = DataStore.getDriverById(app.driverId);
    setDriverDetails(driver || null);
    setDriverDocuments([]);
    setDocumentsError('');
    setDocumentsLoading(true);
    setNotesInput(app.employerNotes || '');
    setInterviewDateInput(app.interviewDate || '');
    try {
      setDriverDocuments(await SupabaseSync.getEmployerApplicantDocuments(app.driverId, app.jobId));
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : 'Could not load driver documents.');
    } finally {
      setDocumentsLoading(false);
    }
  };

  const filtered = applications.filter((app) => {
    if (selectedJobId !== 'all' && app.jobId !== selectedJobId) return false;
    if (selectedStatus === 'all') return true;
    if (selectedStatus === 'under_review') return app.status === 'under_review' || app.status === 'viewed';
    if (selectedStatus === 'selected') return app.status === 'selected' || app.status === 'hired';
    return app.status === selectedStatus;
  });

  return (
    <div className="space-y-6">
      {/* Real-time Toast Feedback */}
      {toastMessage && (
        <div className="flex items-center gap-2 p-3.5 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700 text-xs font-semibold animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-display">Candidate Application Pipeline</h1>
        <p className="text-xs text-slate-500 mt-1">Review driver profiles, schedule driving tests, and shortlist candidates</p>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-bold text-slate-700 shrink-0">Filter by Vacancy:</label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full sm:w-72 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none cursor-pointer"
          >
            <option value="all">All Jobs ({applications.length})</option>
            {jobs.map((j) => {
              const jApps = applications.filter(a => a.jobId === j.id);
              return (
                <option key={j.id} value={j.id}>
                  {j.title} ({jApps.length} Candidates)
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All', count: applications.filter(a => selectedJobId === 'all' || a.jobId === selectedJobId).length },
            { id: 'applied', label: 'Applied', count: applications.filter(a => (selectedJobId === 'all' || a.jobId === selectedJobId) && a.status === 'applied').length },
            { id: 'under_review', label: 'Under Review', count: applications.filter(a => (selectedJobId === 'all' || a.jobId === selectedJobId) && (a.status === 'under_review' || a.status === 'viewed')).length },
            { id: 'shortlisted', label: 'Shortlisted', count: applications.filter(a => (selectedJobId === 'all' || a.jobId === selectedJobId) && a.status === 'shortlisted').length },
            { id: 'interview', label: 'Interview', count: applications.filter(a => (selectedJobId === 'all' || a.jobId === selectedJobId) && a.status === 'interview').length },
            { id: 'selected', label: 'Selected', count: applications.filter(a => (selectedJobId === 'all' || a.jobId === selectedJobId) && (a.status === 'selected' || a.status === 'hired')).length },
            { id: 'rejected', label: 'Rejected', count: applications.filter(a => (selectedJobId === 'all' || a.jobId === selectedJobId) && a.status === 'rejected').length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
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
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No candidate applications found</h3>
          <p className="text-xs text-slate-500">Applications will appear here once candidates apply.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {app.driverName || 'Driver Candidate'}
                  </h3>
                  <StatusBadge status={app.status} size="sm" />
                </div>

                <p className="text-xs text-slate-600">
                  Applied for: <span className="font-semibold text-slate-900">{app.jobTitle}</span> • {app.appliedDate}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span>🚗 Category: {app.driverCategory || 'HMV'}</span>
                  <span>⏱️ Experience: {app.driverExperienceYears || 3} Years</span>
                  <span>📍 Location: {app.driverLocation || 'Bengaluru'}</span>
                </div>

                {app.coverMessage && (
                  <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 mt-2 line-clamp-1">
                    "{app.coverMessage}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                <button
                  onClick={() => handleOpenCandidate(app)}
                  className="px-4 py-2 bg-[#0A2540] hover:bg-[#06182B] text-white text-xs font-semibold rounded-xl cursor-pointer transition-all shadow-xs"
                >
                  View Details & Manage
                </button>

                {app.status === 'applied' && (
                  <button
                    onClick={() => handleStatusUpdate(app.id, 'shortlisted')}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all"
                  >
                    Shortlist
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Candidate Details & Status Transition Modal (Pic 5) */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Candidate Profile</span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">{selectedApp.driverName}</h3>
                <p className="text-xs text-slate-500">Applied for {selectedApp.jobTitle}</p>
              </div>
              <button 
                onClick={() => setSelectedApp(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Quick Reach & Communication Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              {selectedApp.driverPhone && (
                <>
                  <a
                    href={`tel:${selectedApp.driverPhone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Driver ({selectedApp.driverPhone})</span>
                  </a>

                  <a
                    href={`https://wa.me/${selectedApp.driverPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${selectedApp.driverName}, we are reviewing your application for the ${selectedApp.jobTitle} vacancy on DriverHub.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </>
              )}

              <Link
                to={`/employer/messages?driverId=${selectedApp.driverId}&jobId=${selectedApp.jobId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>In-App Chat</span>
              </Link>
            </div>

            {/* Candidate Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-400 block">Phone Number</span>
                <a href={selectedApp.driverPhone ? `tel:${selectedApp.driverPhone}` : undefined} className="font-bold text-blue-600 hover:underline">
                  {selectedApp.driverPhone || 'Not provided'}
                </a>
              </div>
              <div>
                <span className="text-slate-400 block">Driver Category</span>
                <span className="font-bold text-slate-900">{selectedApp.driverCategory || 'HMV'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Experience</span>
                <span className="font-bold text-slate-900">{selectedApp.driverExperienceYears || 3} Years</span>
              </div>
              <div>
                <span className="text-slate-400 block">Location</span>
                <span className="font-bold text-slate-900">{selectedApp.driverLocation || 'Bengaluru'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Applied Date</span>
                <span className="font-bold text-slate-900">{selectedApp.appliedDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Current Status</span>
                <StatusBadge status={selectedApp.status} size="sm" />
              </div>
            </div>

            {/* License & Verification Specs */}
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Verified Driver Credentials & License Specs
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Driver details
                </span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-slate-700 bg-white/80 p-3 rounded-xl border border-emerald-100">
                <p><strong>License No:</strong> {driverDetails?.licenseNumber || 'Not provided'}</p>
                <p><strong>License Class:</strong> {driverDetails?.licenseType || selectedApp.driverCategory || 'Not provided'}</p>
                <p><strong>Expiry Date:</strong> {driverDetails?.licenseExpiry || 'Not provided'}</p>
              </div>

              {/* Uploaded Verification Documents List (Pic 1 & 2 Fix) */}
              <div className="space-y-2 pt-1 border-t border-emerald-200/60">
                <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                    Uploaded Documents ({driverDocuments.length})
                  </span>
                  <span className="text-[10px] text-slate-500">Private, temporary access</span>
                </div>

                {documentsLoading ? (
                  <div className="p-3 bg-white/60 rounded-xl border border-slate-200 text-center text-slate-500 text-xs">Loading documents…</div>
                ) : documentsError ? (
                  <div role="alert" className="p-3 bg-red-50 rounded-xl border border-red-200 text-center text-red-700 text-xs">{documentsError}</div>
                ) : driverDocuments.length === 0 ? (
                  <div className="p-3 bg-white/60 rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
                    No documents uploaded by driver yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {driverDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 bg-white rounded-xl border border-emerald-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">{doc.name}</span>
                            <span className="text-[11px] text-slate-500">
                              {doc.type.replace('_', ' ').toUpperCase()} • Uploaded on {doc.uploadDate} {doc.fileSize ? `• ${doc.fileSize}` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <span className={`px-2 py-0.5 font-bold rounded-full text-[10px] ${doc.verificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-800' : doc.verificationStatus === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                            {doc.verificationStatus === 'verified' ? '✓ Verified' : doc.verificationStatus === 'rejected' ? 'Rejected' : 'Pending review'}
                          </span>

                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all shadow-2xs"
                            >
                              <span>View</span>
                            </a>
                          )}

                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              download={doc.name}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#08233F] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
                            >
                              <Download className="w-3 h-3" />
                              <span>Download</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Application History with This Employer */}
            <div className="space-y-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs">
              <h4 className="font-bold text-slate-800 flex items-center justify-between">
                <span>Company Application & Employment History</span>
                <span className="text-[10px] text-slate-500 font-normal">Tracked across your fleet</span>
              </h4>
              <div className="space-y-1.5">
                {applications
                  .filter(a => a.driverId === selectedApp.driverId || a.driverName.toLowerCase() === selectedApp.driverName.toLowerCase())
                  .map((historyApp) => (
                    <div 
                      key={historyApp.id} 
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                        historyApp.id === selectedApp.id 
                          ? 'bg-blue-50/70 border-blue-200 font-medium' 
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="truncate">
                        <span className="font-bold text-slate-900 block truncate">{historyApp.jobTitle}</span>
                        <span className="text-[10px] text-slate-500">Applied: {historyApp.appliedDate}</span>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {historyApp.id === selectedApp.id && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">Current</span>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cover Note from Driver</label>
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 leading-relaxed border border-slate-200/70">
                  {selectedApp.coverMessage}
                </div>
              </div>
            )}

            {/* Interview Slot & Notes Controls */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Update Status & Schedule
              </h4>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Interview / Trial Slot Time
                </label>
                <input
                  type="text"
                  value={interviewDateInput}
                  onChange={(e) => setInterviewDateInput(e.target.value)}
                  placeholder="e.g. 2026-09-28 at 11:00 AM at Chikkaballapur Depot Gate 2"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Employer Remarks / Feedback
                </label>
                <textarea
                  rows={2}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Notes on driving skills, route tests, background clearance..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Status Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(selectedApp.id, 'shortlisted')}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-all"
                >
                  ✓ Shortlist Candidate
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(selectedApp.id, 'interview')}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-all"
                >
                  🗓️ Schedule Interview
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(selectedApp.id, 'selected')}
                  title="Select & Hire Driver"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-all"
                >
                  🏆 Select / Hire
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(selectedApp.id, 'rejected')}
                  className="px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-all"
                >
                  ✕ Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
