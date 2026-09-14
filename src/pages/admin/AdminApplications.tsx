import React, { useState, useEffect } from 'react';
import { FileText, Search, Building2, Users, CheckCircle2 } from 'lucide-react';
import { DataStore } from '../../services/store';
import { Application } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminApplications: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setApplications(DataStore.getApplications());
  }, []);

  const filtered = applications.filter(a => 
    (a.jobTitle || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.companyName || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.driverName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy font-display">Global Applications Audit Log</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time candidate hiring audit and application statuses across all fleets</p>
        </div>

        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate, job, fleet..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-amber"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card divide-y divide-slate-100 overflow-hidden">
        {filtered.map((app) => (
          <div key={app.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-brand-navy">{app.driverName}</span>
                <span className="text-slate-400 text-xs">applied for</span>
                <span className="text-xs font-bold text-brand-blue">{app.jobTitle}</span>
                <StatusBadge status={app.status} size="sm" />
              </div>
              <p className="text-xs text-slate-500">
                Employer: <span className="font-semibold text-slate-800">{app.companyName}</span> • Applied on {app.appliedDate}
              </p>
              {app.interviewDate && (
                <p className="text-xs text-purple-700 font-semibold">
                  🗓️ Scheduled Interview: {app.interviewDate}
                </p>
              )}
            </div>

            <span className="text-[11px] text-slate-400 font-mono">App #{app.id}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
