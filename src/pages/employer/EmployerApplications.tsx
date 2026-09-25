import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { 
  Users, FileText, CheckCircle2, XCircle, Clock, Award, 
  UserCheck, Phone, Mail, Calendar, MessageSquare, ShieldCheck, Download 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { Application, ApplicationStatus, DriverProfile, Job } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';

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

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = () => {
    if (!currentUser) return;
    const empJobs = DataStore.getJobs().filter(j => j.employerId === currentUser.id);
    setJobs(empJobs);

    const jobIds = empJobs.map(j => j.id);
    const empApps = DataStore.getApplications().filter(a => jobIds.includes(a.jobId));
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

  const handleOpenCandidate = (app: Application) => {
    setSelectedApp(app);
    const driver = DataStore.getDriverById(app.driverId);
    setDriverDetails(driver || null);
    setNotesInput(app.employerNotes || '');
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
                  <span title="License Verified">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </span>
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
                  className="px-4 py-2 bg-[#0A2540] hover:bg-[#06182B] text-white text-xs font-semibold rounded-xl"
                >
                  View Details & Manage
                </button>

                {app.status === 'applied' && (
                  <button
                    onClick={() => handleStatusUpdate(app.id, 'shortlisted')}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-xs"
                  >
                    Shortlist
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Candidate Details & Status Transition Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Candidate Profile</span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">{selectedApp.driverName}</h3>
                <p className="text-xs text-slate-500">Applied for {selectedApp.jobTitle}</p>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-slate-900">
                ✕
              </button>
            </div>

            {/* Active Duty Conflict Warning */}
            {(() => {
              const otherApps = applications.filter(a => 
                (a.driverId === selectedApp.driverId || a.driverName.toLowerCase() === selectedApp.driverName.toLowerCase()) && 
                a.id !== selectedApp.id
              );
              const hiredApp = otherApps.find(a => a.status === 'selected');

              if (hiredApp) {
                return (
                  <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start gap-3 shadow-xs animate-in fade-in">
                    <div className="w-9 h-9 bg-rose-100 text-rose-700 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                      ⚠️
                    </div>
                    <div className="text-xs space-y-1.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-rose-950 text-sm">
                          Concurrent Driving Assignment Conflict!
                        </span>
                        <span className="bg-rose-200 text-rose-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Already Hired & Active
                        </span>
                      </div>
                      <p className="text-rose-900 leading-relaxed">
                        Candidate <strong className="text-slate-950">{selectedApp.driverName}</strong> is already <strong>Hired & Working</strong> in your company for position:
                        <br />
                        <span className="font-semibold text-rose-950">"{hiredApp.jobTitle}"</span>.
                      </p>
                      <p className="text-rose-800 text-[11px]">
                        Safety & Fleet Policy: A single driver cannot operate two active commercial driving shifts simultaneously under the same fleet.
                      </p>
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(selectedApp.id, 'rejected')}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors"
                        >
                          ✕ Reject Concurrent Application (Recommended)
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

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
                  placeholder="e.g. 2026-09-22 at 11:00 AM at Depot Gate 2"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
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
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              {/* Status Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(selectedApp.id, 'shortlisted')}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
                >
                  ✓ Shortlist Candidate
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(selectedApp.id, 'interview')}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  🗓️ Schedule Interview
                </button>
                {(() => {
                  const isConflictHired = applications.some(a => 
                    (a.driverId === selectedApp.driverId || a.driverName.toLowerCase() === selectedApp.driverName.toLowerCase()) && 
                    a.id !== selectedApp.id && 
                    a.status === 'selected'
                  );

                  return (
                    <button
                      type="button"
                      disabled={isConflictHired}
                      onClick={() => handleStatusUpdate(selectedApp.id, 'selected')}
                      title={isConflictHired ? "Driver is already hired in another vacancy under this company" : "Select & Hire Driver"}
                      className={`px-3.5 py-2 font-bold rounded-xl text-xs transition-all ${
                        isConflictHired
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                      }`}
                    >
                      🏆 {isConflictHired ? 'Already Hired in Fleet' : 'Select / Hire'}
                    </button>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(selectedApp.id, 'rejected')}
                  className="px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-xs cursor-pointer"
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
