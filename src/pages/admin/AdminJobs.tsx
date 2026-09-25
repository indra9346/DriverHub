import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Check, X, Ban, Eye, Briefcase, 
  Building2, MapPin, IndianRupee, Clock, CheckCircle2 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { Job, JobStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminJobs: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<string>('pending');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const loadJobs = () => {
    setJobs(DataStore.getJobs());
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleUpdateStatus = async (jobId: string, status: JobStatus) => {
    const updated = await DataStore.updateJobStatus(jobId, status);
    if (!updated) return;
    loadJobs();
    if (selectedJob?.id === jobId) {
      setSelectedJob({ ...selectedJob, status });
    }
  };

  const filtered = jobs.filter((j) => {
    if (filter === 'all') return true;
    return j.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy font-display">Job Vacancies Moderation Queue</h1>
          <p className="text-xs text-slate-500 mt-1">Review new employer listings, enforce safety standards, approve or reject</p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto">
          {['pending', 'active', 'closed', 'rejected', 'all'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                filter === st
                  ? 'bg-white text-brand-navy shadow-xs'
                  : 'text-slate-500 hover:text-brand-navy'
              }`}
            >
              {st} ({jobs.filter(j => st === 'all' ? true : j.status === st).length})
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-card space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-brand-navy font-display">No jobs in this category</h3>
          <p className="text-xs text-slate-500">All submissions have been moderated.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="badge-category text-[11px] bg-brand-surface text-brand-blue border border-slate-200">
                    {job.category}
                  </span>
                  <StatusBadge status={job.status} size="sm" />
                  <span className="text-[11px] text-slate-400">ID: {job.id} • Posted {job.postedDate}</span>
                </div>

                <h3 className="text-base font-bold text-brand-navy font-display">{job.title}</h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <span className="font-semibold text-slate-900">🏢 {job.companyName}</span>
                  <span>📍 {job.location}</span>
                  <span className="font-bold text-emerald-700">💰 ₹{job.salaryMin.toLocaleString('en-IN')} - ₹{job.salaryMax.toLocaleString('en-IN')}</span>
                  <span>👥 {job.vacancies} Openings</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                <button
                  onClick={() => setSelectedJob(job)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Eye className="w-3.5 h-3.5" /> Inspect
                </button>

                {job.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(job.id, 'active')}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs cursor-pointer transition-all"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve & Publish
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(job.id, 'rejected')}
                      className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </>
                )}

                {job.status === 'active' && (
                  <button
                    onClick={() => handleUpdateStatus(job.id, 'closed')}
                    className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer transition-all"
                  >
                    Suspend / Close
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inspect Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Moderation Inspection</span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">{selectedJob.title}</h3>
                <p className="text-xs text-slate-500">{selectedJob.companyName}</p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-slate-400 hover:text-slate-900">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                <p><span className="font-semibold text-slate-900">Category:</span> {selectedJob.category}</p>
                <p><span className="font-semibold text-slate-900">Location:</span> {selectedJob.location}</p>
                <p><span className="font-semibold text-slate-900">Salary:</span> ₹{selectedJob.salaryMin} - ₹{selectedJob.salaryMax}</p>
                <p><span className="font-semibold text-slate-900">Shifts:</span> {selectedJob.workingHours}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-900 block mb-1">Description:</span>
                <p className="p-3 bg-slate-50 rounded-xl whitespace-pre-line text-slate-600 max-h-40 overflow-y-auto">
                  {selectedJob.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600"
              >
                Close
              </button>
              {selectedJob.status === 'pending' && (
                <button
                  onClick={() => {
                    handleUpdateStatus(selectedJob.id, 'active');
                    setSelectedJob(null);
                  }}
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs"
                >
                  Approve Job Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
