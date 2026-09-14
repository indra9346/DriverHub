import React, { useState, useEffect } from 'react';
import { 
  Building2, Search, ShieldCheck, Check, X, 
  MapPin, Phone, Mail, ExternalLink 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { EmployerProfile } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminEmployers: React.FC = () => {
  const [employers, setEmployers] = useState<EmployerProfile[]>([]);
  const [search, setSearch] = useState('');

  const loadEmployers = () => {
    setEmployers(DataStore.getEmployers());
  };

  useEffect(() => {
    loadEmployers();
  }, []);

  const handleToggleVerify = (empId: string, currentVerified: boolean) => {
    DataStore.verifyEmployer(empId, !currentVerified);
    loadEmployers();
  };

  const filtered = employers.filter(e => 
    e.companyName.toLowerCase().includes(search.toLowerCase()) ||
    e.industry.toLowerCase().includes(search.toLowerCase()) ||
    e.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy font-display">Fleet Accounts & Verification</h1>
          <p className="text-xs text-slate-500 mt-1">Audit fleet companies, verify business registrations, and grant verification badges</p>
        </div>

        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, sector..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-amber"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card divide-y divide-slate-100 overflow-hidden">
        {filtered.map((emp) => (
          <div key={emp.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center shrink-0">
                {emp.logoUrl ? (
                  <img src={emp.logoUrl} alt={emp.companyName} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-6 h-6 text-slate-400" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-brand-navy">{emp.companyName}</h3>
                  <StatusBadge status={emp.verified ? 'verified' : 'pending'} size="sm" />
                </div>
                <p className="text-xs text-slate-500">
                  {emp.industry} • Contact: {emp.contactPerson} • {emp.city}, {emp.state}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <span>📞 {emp.phone}</span>
                  <span>✉️ {emp.email}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
              <button
                onClick={() => handleToggleVerify(emp.id, emp.verified)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  emp.verified
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                }`}
              >
                {emp.verified ? (
                  <>Revoke Verified Badge</>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Approve & Verify Company
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
