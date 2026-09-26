import React, { useState, useEffect } from 'react';
import { 
  Search 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { DriverProfile, UserStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useLanguage } from '../../services/i18n';

export const AdminCandidates: React.FC = () => {
  const { t } = useLanguage();
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [search, setSearch] = useState('');
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadDrivers = () => {
    setDrivers(DataStore.getDrivers());
  };

  useEffect(() => {
    loadDrivers();
    const refresh = () => loadDrivers();
    window.addEventListener('driverhub_storage_updated', refresh);
    return () => window.removeEventListener('driverhub_storage_updated', refresh);
  }, []);

  const handleToggleBlock = async (driverId: string, currentStatus: UserStatus) => {
    const newStatus: UserStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    setWorkingId(driverId);
    setError('');
    setNotice('');
    try {
      const saved = await DataStore.updateUserStatus(driverId, newStatus);
      if (!saved) {
        setError('The account status was not saved. Confirm your administrator access and database connection, then retry.');
        return;
      }
      loadDrivers();
      setNotice(`Driver account ${newStatus === 'blocked' ? 'blocked' : 'unblocked'}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the driver account.');
    } finally {
      setWorkingId('');
    }
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
          <h1 className="text-2xl font-bold text-brand-navy font-display">{t('candidateModeration')}</h1>
          <p className="text-xs text-slate-500 mt-1">{t('candidateModerationSubtitle')}</p>
        </div>

        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchCandidatesPlaceholder')}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-amber"
            />
          </div>
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card divide-y divide-slate-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">{search ? t('noMatchingResults') : t('noCandidatesFound')}</div>
        ) : filtered.map((driver) => (
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
                  {t(driver.driverCategory)} • {driver.experienceYears} {t('yearsExperience')} • {driver.location}
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
                disabled={workingId === driver.id}
                onClick={() => { void handleToggleBlock(driver.id, driver.status); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  driver.status === 'blocked'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                }`}
              >
                {workingId === driver.id ? t('saving') : driver.status === 'blocked' ? t('unblockAccount') : t('blockCandidate')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
