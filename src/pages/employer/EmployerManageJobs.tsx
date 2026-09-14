import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Briefcase, PlusCircle, Users, Clock, CheckCircle2, 
  XCircle, ArrowRight, Eye, Trash2, Edit 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { Job, JobStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';

export const EmployerManageJobs: React.FC = () => {
  const currentUser = DataStore.getCurrentUser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadJobs = () => {
    if (!currentUser) return;
    const allJobs = DataStore.getJobs();
    const empJobs = allJobs.filter(j => 
      j.employerId === currentUser.id || 
      (currentUser.email === 'deepa@bharatlogistics.in' && (j.employerId === 'usr-employer-1' || j.companyName?.includes('Bharat')))
    );
    setJobs(empJobs);
  };

  useEffect(() => {
    loadJobs();
    const handleStorageUpdate = () => loadJobs();
    window.addEventListener('driverhub_storage_updated', handleStorageUpdate);
    return () => window.removeEventListener('driverhub_storage_updated', handleStorageUpdate);
  }, [currentUser]);

  const handleStatusChange = (jobId: string, newStatus: JobStatus) => {
    DataStore.updateJobStatus(jobId, newStatus);
    loadJobs();
  };

  const filtered = jobs.filter(j => {
    if (statusFilter === 'all') return true;
    return j.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy font-display">Manage Posted Vacancies</h1>
          <p className="text-xs text-slate-500 mt-1">View, track, close, or reopen your fleet driver listings</p>
        </div>

        <Link
          to="/employer/post-job"
          className="inline-flex items-center gap-2 bg-brand-amber hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" /> Post Vacancy
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
        {['all', 'active', 'pending', 'closed', 'rejected'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
              statusFilter === st
                ? 'bg-white text-brand-navy shadow-xs'
                : 'text-slate-500 hover:text-brand-navy'
            }`}
          >
            {st === 'all' ? `All (${jobs.length})` : st}
          </button>
        ))}
      </div>

      {/* Listings Table / Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-card space-y-3">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-brand-navy font-display">No vacancies found</h3>
          <p className="text-xs text-slate-500">Post a new vacancy to hire certified commercial drivers.</p>
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
                  <span className="text-[11px] text-slate-400">Posted on {job.postedDate}</span>
                </div>

                <h3 className="text-base font-bold text-brand-navy font-display">{job.title}</h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <span>📍 {job.location}</span>
                  <span className="font-bold text-emerald-700">💰 ₹{job.salaryMin.toLocaleString('en-IN')} - ₹{job.salaryMax.toLocaleString('en-IN')} / mo</span>
                  <span>👥 {job.vacancies} Vacancies</span>
                  <span className="font-semibold text-brand-blue">📄 {job.applicationsCount || 0} Applications</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                <Link
                  to={`/jobs/${job.id}`}
                  className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 transition-all"
                >
                  <Eye className="w-3.5 h-3.5" /> View Public Page
                </Link>

                <Link
                  to="/employer/applications"
                  className="px-3.5 py-2 bg-brand-navy hover:bg-brand-navy-light text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
                >
                  <Users className="w-3.5 h-3.5 text-brand-amber" /> Applicants ({job.applicationsCount || 0})
                </Link>

                {job.status === 'active' && (
                  <button
                    onClick={() => handleStatusChange(job.id, 'closed')}
                    className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                  >
                    Close Job
                  </button>
                )}

                {job.status === 'closed' && (
                  <button
                    onClick={() => handleStatusChange(job.id, 'active')}
                    className="px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer"
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
