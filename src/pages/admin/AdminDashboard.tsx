import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, Briefcase, Building2, ShieldCheck, Clock, CheckCircle2, 
  XCircle, Award, AlertTriangle, ArrowRight, TrendingUp 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { SupabaseSync } from '../../services/supabaseSync';
import { Job, DriverProfile, EmployerProfile, Application } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminDashboard: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [employers, setEmployers] = useState<EmployerProfile[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    setDrivers(DataStore.getDrivers());
    setEmployers(DataStore.getEmployers());
    setJobs(DataStore.getJobs());
    setApplications(DataStore.getApplications());
  }, []);

  const pendingJobs = jobs.filter(j => j.status === 'pending');
  const pendingEmployers = employers.filter(e => !e.verified || e.status === 'pending');
  const activeJobs = jobs.filter(j => j.status === 'active');
  const shortlistedCount = applications.filter(a => a.status === 'shortlisted' || a.status === 'interview' || a.status === 'selected');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-brand-navy rounded-2xl p-6 sm:p-8 text-white shadow-elevated flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-xs font-bold text-brand-amber uppercase tracking-wider">Superadmin Portal</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display mt-1">
            Driver Hub Administration & Moderation
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Real-time platform overview, moderation queues, and safety compliance audits
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={async () => {
              const btn = document.getElementById('supabase-sync-btn');
              if (btn) btn.innerText = 'Syncing to Supabase...';
              await SupabaseSync.syncAllData(jobs, employers, drivers, applications);
              if (btn) btn.innerText = '✓ Synced with Supabase';
              setTimeout(() => {
                if (btn) btn.innerText = 'Sync with Supabase DB';
              }, 3000);
            }}
            id="supabase-sync-btn"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            Sync with Supabase DB
          </button>
          
          <Link
            to="/admin/jobs"
            className="px-4 py-2.5 bg-brand-amber hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-xs"
          >
            Review Pending Jobs ({pendingJobs.length})
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-600">Total Drivers</span>
            <Users className="w-4 h-4 text-brand-blue" />
          </div>
          <p className="text-2xl font-bold text-brand-navy font-display">{drivers.length}</p>
          <Link to="/admin/candidates" className="text-[11px] text-brand-blue hover:underline font-semibold">
            Manage candidates →
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-600">Registered Fleets</span>
            <Building2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-brand-navy font-display">{employers.length}</p>
          <Link to="/admin/employers" className="text-[11px] text-brand-blue hover:underline font-semibold">
            Verify companies →
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-600">Active Jobs</span>
            <Briefcase className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 font-display">{activeJobs.length}</p>
          <span className="text-[11px] text-slate-500">Live on public portal</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-600">Pending Approvals</span>
            <Clock className="w-4 h-4 text-brand-amber" />
          </div>
          <p className="text-2xl font-bold text-brand-amber font-display">{pendingJobs.length}</p>
          <Link to="/admin/jobs" className="text-[11px] text-amber-700 font-bold hover:underline">
            Requires action →
          </Link>
        </div>
      </div>

      {/* Moderation Queue & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols: Pending Jobs Moderation */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-brand-navy font-display flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-amber" /> Pending Job Approvals ({pendingJobs.length})
            </h3>
            <Link to="/admin/jobs" className="text-xs font-bold text-brand-blue hover:underline">
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
                <div key={job.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-brand-navy">{job.title}</h4>
                    <p className="text-[11px] text-slate-500">{job.companyName} • {job.category} • {job.city}</p>
                  </div>
                  <Link
                    to="/admin/jobs"
                    className="px-3 py-1.5 bg-brand-navy hover:bg-brand-navy-light text-white text-xs font-semibold rounded-lg shrink-0 transition-all"
                  >
                    Review & Approve
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 5 Cols: Employer Accounts */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-brand-navy font-display flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-blue" /> Employer Accounts
            </h3>
            <Link to="/admin/employers" className="text-xs font-bold text-brand-blue hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {employers.slice(0, 4).map((emp) => (
              <div key={emp.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-brand-navy">{emp.companyName}</h4>
                  <p className="text-[11px] text-slate-500">{emp.industry} • {emp.city}</p>
                </div>
                <StatusBadge status={emp.verified ? 'verified' : 'pending'} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
