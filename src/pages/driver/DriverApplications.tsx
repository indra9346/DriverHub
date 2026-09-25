import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Clock, Building2, MapPin, CheckCircle2,
  XCircle, Award, UserCheck, AlertCircle, ArrowRight, MessageSquare
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { Application } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';

export const DriverApplications: React.FC = () => {
  const currentUser = DataStore.getCurrentUser();
  const [applications, setApplications] = useState<Application[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'shortlisted' | 'closed'>('all');

  const loadApps = () => {
    if (!currentUser) return;
    const all = DataStore.getApplications().filter(a => a.driverId === currentUser.id);
    setApplications(all);
  };

  useEffect(() => {
    loadApps();
  }, [currentUser]);

  const handleWithdraw = async (appId: string) => {
    if (confirm('Are you sure you want to withdraw this application?')) {
      const updated = await DataStore.updateApplicationStatus(appId, 'withdrawn');
      if (!updated) {
        alert('Your application could not be withdrawn. Refresh and try again.');
        return;
      }
      loadApps();
    }
  };

  const filtered = applications.filter((app) => {
    if (filter === 'active') return app.status === 'applied' || app.status === 'under_review';
    if (filter === 'shortlisted') return app.status === 'shortlisted' || app.status === 'interview' || app.status === 'selected';
    if (filter === 'closed') return app.status === 'rejected' || app.status === 'withdrawn';
    return true;
  });

  const getStepNumber = (status: Application['status']) => {
    const map: Record<string, number> = {
      applied: 1,
      under_review: 2,
      shortlisted: 3,
      interview: 4,
      selected: 5,
      rejected: 0,
      withdrawn: 0,
    };
    return map[status] || 1;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy font-display">My Job Applications</h1>
          <p className="text-xs text-slate-500 mt-1">Track status and review interview appointments</p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'all' ? 'bg-white text-brand-navy shadow-xs' : 'text-slate-500 hover:text-brand-navy'
            }`}
          >
            All ({applications.length})
          </button>
          <button
            onClick={() => setFilter('shortlisted')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'shortlisted' ? 'bg-white text-brand-amber shadow-xs' : 'text-slate-500 hover:text-brand-navy'
            }`}
          >
            Shortlisted / Interviews
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'active' ? 'bg-white text-brand-blue shadow-xs' : 'text-slate-500 hover:text-brand-navy'
            }`}
          >
            In Progress
          </button>
        </div>
      </div>

      {/* Applications List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-card space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-brand-navy font-display">No applications in this category</h3>
          <p className="text-xs text-slate-500">Apply to open driver vacancies across India</p>
          <Link to="/jobs" className="inline-block mt-2 px-4 py-2 bg-brand-navy hover:bg-brand-navy-light text-white rounded-xl text-xs font-bold transition-all">
            Search Open Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((app) => {
            const step = getStepNumber(app.status);
            return (
              <div
                key={app.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-card space-y-5"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Application ID: #{app.id}
                    </span>
                    <h3 className="text-base font-bold text-brand-navy font-display mt-0.5">
                      {app.jobTitle}
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {app.companyName} • Applied on {app.appliedDate}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={app.status} size="md" />
                    {app.status !== 'withdrawn' && app.status !== 'selected' && (
                      <button
                        onClick={() => handleWithdraw(app.id)}
                        className="text-xs text-red-600 hover:text-red-800 font-semibold hover:underline"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Timeline Bar */}
                {app.status !== 'rejected' && app.status !== 'withdrawn' && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <span className={step >= 1 ? 'text-brand-blue font-bold' : 'text-slate-400'}>1. Applied</span>
                      <span className={step >= 2 ? 'text-brand-blue font-bold' : 'text-slate-400'}>2. Under Review</span>
                      <span className={step >= 3 ? 'text-brand-amber font-bold' : 'text-slate-400'}>3. Shortlisted</span>
                      <span className={step >= 4 ? 'text-purple-700 font-bold' : 'text-slate-400'}>4. Driving Test / Trial</span>
                      <span className={step >= 5 ? 'text-emerald-700 font-bold' : 'text-slate-400'}>5. Hired</span>
                    </div>

                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 via-amber-400 to-emerald-500 transition-all duration-300"
                        style={{ width: `${(step / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Employer Notes & Interview slot */}
                {(app.employerNotes || app.interviewDate) && (
                  <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200/80 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <MessageSquare className="w-4 h-4 text-brand-amber" /> Employer Message & Instructions
                    </div>
                    {app.interviewDate && (
                      <p className="text-amber-900 font-semibold">
                        🗓️ Interview Slot: <span className="underline font-bold">{app.interviewDate}</span>
                      </p>
                    )}
                    {app.employerNotes && (
                      <p className="text-amber-800 leading-relaxed">
                        "{app.employerNotes}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
