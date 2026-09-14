import React, { useState, useEffect } from 'react';
import { 
  Users, Search, ShieldCheck, Ban, CheckCircle2, 
  Award, Phone, Mail, MapPin, AlertCircle 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { DriverProfile, UserStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminCandidates: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [search, setSearch] = useState('');

  const loadDrivers = () => {
    setDrivers(DataStore.getDrivers());
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const handleToggleBlock = (driverId: string, currentStatus: UserStatus) => {
    const newStatus: UserStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    DataStore.updateUserStatus(driverId, newStatus);
    loadDrivers();
  };

  const filtered = drivers.filter(d => 
    d.fullName.toLowerCase().includes(search.toLowerCase()) ||
    d.email.toLowerCase().includes(search.toLowerCase()) ||
    d.driverCategory.toLowerCase().includes(search.toLowerCase()) ||
    d.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy font-display">Candidate Moderation</h1>
          <p className="text-xs text-slate-500 mt-1">Review driver profiles, license verification documents, and ban/unblock accounts</p>
        </div>

        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, category, city..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-amber"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card divide-y divide-slate-100 overflow-hidden">
        {filtered.map((driver) => (
          <div key={driver.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-surface text-brand-blue flex items-center justify-center font-bold text-base shrink-0 border border-slate-200">
                {driver.fullName.charAt(0)}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-brand-navy">{driver.fullName}</h3>
                  <StatusBadge status={driver.status} size="sm" />
                </div>
                <p className="text-xs text-slate-500">
                  {driver.driverCategory} • {driver.experienceYears} Years Exp • {driver.location}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span>📞 {driver.phone}</span>
                  <span>✉️ {driver.email}</span>
                  <span>🪪 {driver.licenseNumber}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
              <button
                onClick={() => handleToggleBlock(driver.id, driver.status)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  driver.status === 'blocked'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                }`}
              >
                {driver.status === 'blocked' ? 'Unblock Account' : 'Block Candidate'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
