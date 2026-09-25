import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, Briefcase, Building2, ShieldCheck, Clock, CheckCircle2, 
  XCircle, Award, AlertTriangle, ArrowRight, TrendingUp 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { Job, DriverProfile, EmployerProfile, Application } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminDashboard: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [employers, setEmployers] = useState<EmployerProfile[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    const refresh = () => {
    setDrivers(DataStore.getDrivers());
    setEmployers(DataStore.getEmployers());
    setJobs(DataStore.getJobs());
    setApplications(DataStore.getApplications());
    };
    refresh();
    window.addEventListener('driverhub_storage_updated', refresh);
    return () => window.removeEventListener('driverhub_storage_updated', refresh);
  }, []);

  const pendingJobs = jobs.filter(j => j.status === 'pending');
  const pendingEmployers = employers.filter(e => !e.verified || e.status === 'pending');
  const activeJobs = jobs.filter(j => j.status === 'active');
  const shortlistedCount = applications.filter(a => a.status === 'shortlisted' || a.status === 'interview' || a.status === 'selected');

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="bg-[#08233F] rounded-2xl p-5 sm:p-8 text-white shadow-elevated flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/10 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> Superadmin Portal
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-display text-white">
            Driver Hub Administration & Moderation
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Real-time platform overview, moderation queues, and safety compliance audits
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 relative z-10">
          <Link
            to="/admin/jobs"
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-xs text-center"
          >
            Review Pending Jobs ({pendingJobs.length})
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-card space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-600">Total Drivers</span>
            <Users className="w-4 h-4 text-brand-blue" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-brand-navy font-display">{drivers.length}</p>
          <Link to="/admin/candidates" className="text-[10px] sm:text-[11px] text-brand-blue hover:underline font-semibold block truncate">
            Manage candidates →
          </Link>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-card space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-600">Registered Fleets</span>
            <Building2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-brand-navy font-display">{employers.length}</p>
          <Link to="/admin/employers" className="text-[10px] sm:text-[11px] text-brand-blue hover:underline font-semibold block truncate">
            Verify companies →
          </Link>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-card space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-600">Active Jobs</span>
            <Briefcase className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 font-display">{activeJobs.length}</p>
          <span className="text-[10px] sm:text-[11px] text-slate-500 block truncate">Live on public portal</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-card space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-600">Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-amber-600 font-display">{pendingJobs.length}</p>
          <Link to="/admin/jobs" className="text-[10px] sm:text-[11px] text-amber-700 font-bold hover:underline block truncate">
            Requires action →
          </Link>
        </div>
      </div>

      {/* Moderation Queue & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left 7 Cols: Pending Jobs Moderation */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-brand-navy font-display flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" /> 
              <span>Pending Approvals ({pendingJobs.length})</span>
            </h3>
            <Link to="/admin/jobs" className="text-xs font-bold text-brand-blue hover:underline shrink-0">
              Moderate Queue
            </Link>
          </div>

          {pendingJobs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
              All posted jobs have been reviewed!
            </div>
          ) : (
            <div className="space-y-3">
              {pendingJobs.map((job) => (
                <div key={job.id} className="p-3.5 sm:p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs font-bold text-brand-navy truncate">{job.title}</h4>
                    <p className="text-[11px] text-slate-500 truncate">{job.companyName} • {job.category} • {job.city}</p>
                  </div>
                  <Link
                    to="/admin/jobs"
                    className="px-3 py-1.5 bg-[#08233F] hover:bg-[#051626] text-white text-xs font-semibold rounded-lg shrink-0 text-center transition-all"
                  >
                    Review & Approve
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 5 Cols: Employer Accounts */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-brand-navy font-display flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-blue shrink-0" /> 
              <span>Employer Accounts</span>
            </h3>
            <Link to="/admin/employers" className="text-xs font-bold text-brand-blue hover:underline shrink-0">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {employers.slice(0, 4).map((emp) => (
              <div key={emp.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-brand-navy truncate">{emp.companyName}</h4>
                  <p className="text-[11px] text-slate-500 truncate">{emp.industry} • {emp.city}</p>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={emp.verified ? 'verified' : 'pending'} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
