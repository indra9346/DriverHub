import React, { useState, useEffect } from 'react';
import { 
  Building2, Search, Check 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { EmployerProfile } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useLanguage } from '../../services/i18n';

export const AdminEmployers: React.FC = () => {
  const { t } = useLanguage();
  const [employers, setEmployers] = useState<EmployerProfile[]>([]);
  const [search, setSearch] = useState('');
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadEmployers = () => {
    setEmployers(DataStore.getEmployers());
  };

  useEffect(() => {
    loadEmployers();
    const refresh = () => loadEmployers();
    window.addEventListener('driverhub_storage_updated', refresh);
    return () => window.removeEventListener('driverhub_storage_updated', refresh);
  }, []);

  const handleToggleVerify = async (empId: string, currentVerified: boolean) => {
    setWorkingId(empId);
    setError('');
    setNotice('');
    try {
      const saved = await DataStore.verifyEmployer(empId, !currentVerified);
      if (!saved) {
        setError('The verification change was not saved. Confirm your administrator access and database connection, then retry.');
        return;
      }
      loadEmployers();
      setNotice(`Company verification ${currentVerified ? 'revoked' : 'approved'}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update company verification.');
    } finally {
      setWorkingId('');
    }
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
          <h1 className="text-2xl font-bold text-brand-navy font-display">{t('fleetAccountsVerification')}</h1>
          <p className="text-xs text-slate-500 mt-1">{t('fleetAccountsSubtitle')}</p>
        </div>

        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchCompaniesPlaceholder')}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-amber"
            />
          </div>
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card divide-y divide-slate-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">{search ? t('noMatchingResults') : t('noEmployersFound')}</div>
        ) : filtered.map((emp) => (
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
                  <StatusBadge status={emp.status === 'blocked' ? 'blocked' : emp.verified ? 'verified' : 'pending'} size="sm" />
                </div>
                <p className="text-xs text-slate-500">
                  {emp.industry} • {t('contactPerson')}: {emp.contactPerson} • {emp.city}, {emp.state}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <span>📞 {emp.phone}</span>
                  <span>✉️ {emp.email}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
              <button
                disabled={workingId === emp.id || emp.companyName === 'Company profile incomplete'}
                onClick={() => { void handleToggleVerify(emp.id, emp.verified); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  emp.verified
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                }`}
              >
                {emp.companyName === 'Company profile incomplete' ? (
                  <>{t('companyProfileRequired')}</>
                ) : emp.verified ? (
                  <>{workingId === emp.id ? t('saving') : t('revokeVerifiedBadge')}</>
                ) : (
                  <>
                    {workingId === emp.id ? t('saving') : <><Check className="w-3.5 h-3.5" /> {t('approveVerifyCompany')}</>}
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
