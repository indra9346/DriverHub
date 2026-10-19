import React, { useState, useEffect } from 'react';
import {
  Building2, Search, Check, LoaderCircle, X
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { SupabaseSync } from '../../services/supabaseSync';
import { EmployerProfile } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useLanguage } from '../../services/i18n';
import { PanIndiaLocationSelector } from '../../components/common/PanIndiaLocationSelector';
import { matchesPanIndiaLocationFilter, StructuredPanIndiaLocation } from '../../services/indiaLocationService';
import { logAdminAction } from '../../services/adminApi';
import { ConfirmDialog, normaliseAccountStatus } from './AdminUi';

/** Placeholder company name the admin directory uses for accounts without a company row. */
const INCOMPLETE_COMPANY = 'Company profile incomplete';

export const AdminEmployers: React.FC = () => {
  const { t } = useLanguage();
  const [employers, setEmployers] = useState<EmployerProfile[]>([]);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState<StructuredPanIndiaLocation>({
    state: '',
    district: '',
    city: '',
    pincode: '',
    formattedLocation: ''
  });
  // "<employerId>:verify" or "<employerId>:status" while a change is saving.
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [blockTarget, setBlockTarget] = useState<EmployerProfile | null>(null);
  const [blockError, setBlockError] = useState('');

  const loadEmployers = () => {
    setEmployers(DataStore.getEmployers());
  };

  useEffect(() => {
    loadEmployers();
    const refresh = () => loadEmployers();
    window.addEventListener('driverhub_storage_updated', refresh);
    return () => window.removeEventListener('driverhub_storage_updated', refresh);
  }, []);

  const handleToggleVerify = async (emp: EmployerProfile) => {
    const verify = !emp.verified;
    setWorking(`${emp.id}:verify`);
    setError('');
    setNotice('');
    SupabaseSync.lastError = '';
    try {
      const saved = await DataStore.verifyEmployer(emp.id, verify);
      if (!saved) {
        setError(DataStore.getLastError(t('verificationUpdateFailed')));
        return;
      }
      void logAdminAction({ targetType: 'employer', targetId: emp.id, action: verify ? 'verify' : 'unverify' });
      loadEmployers();
      setNotice(verify ? t('verificationApprovedNotice') : t('verificationRevokedNotice'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('verificationUpdateFailed'));
    } finally {
      setWorking('');
    }
  };

  /** Saves 'blocked' or 'active' (the database values). Returns an error message or ''. */
  const setAccountStatus = async (emp: EmployerProfile, next: 'blocked' | 'active', reason?: string): Promise<string> => {
    setWorking(`${emp.id}:status`);
    setError('');
    setNotice('');
    SupabaseSync.lastError = '';
    try {
      const saved = await DataStore.updateUserStatus(emp.id, next);
      if (!saved) return DataStore.getLastError(t('accountUpdateFailed'));
      void logAdminAction({ targetType: 'employer', targetId: emp.id, action: next === 'blocked' ? 'block' : 'unblock', reason });
      loadEmployers();
      setNotice(next === 'blocked' ? t('employerBlockedNotice') : t('employerUnblockedNotice'));
      return '';
    } catch (cause) {
      return cause instanceof Error ? cause.message : t('accountUpdateFailed');
    } finally {
      setWorking('');
    }
  };

  const handleToggleBlock = async (emp: EmployerProfile) => {
    if (normaliseAccountStatus(emp.status) !== 'blocked') {
      setBlockError('');
      setBlockTarget(emp);
      return;
    }
    const failure = await setAccountStatus(emp, 'active');
    if (failure) setError(failure);
  };

  const confirmBlock = async (reason: string) => {
    if (!blockTarget) return;
    const failure = await setAccountStatus(blockTarget, 'blocked', reason);
    if (failure) {
      setBlockError(failure);
      return;
    }
    setBlockTarget(null);
  };

  const query = search.trim().toLowerCase();
  const filtered = employers.filter(e => {
    const matchesSearch =
      !query ||
      (e.companyName || '').toLowerCase().includes(query) ||
      (e.industry || '').toLowerCase().includes(query) ||
      (e.city || '').toLowerCase().includes(query) ||
      (e.email || '').toLowerCase().includes(query);
    if (!matchesSearch) return false;
    return matchesPanIndiaLocationFilter(
      {
        state: e.state,
        district: e.district,
        city: e.city,
        pincode: e.pincode,
        location: e.location
      },
      locationFilter
    );
  });

  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const suggestions = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return employers.filter(e =>
      (e.companyName || '').toLowerCase().includes(q) ||
      (e.city || '').toLowerCase().includes(q) ||
      (e.industry || '').toLowerCase().includes(q)
    ).slice(0, 5);
  }, [employers, search]);

  const hasFilters = Boolean(search || locationFilter.state || locationFilter.district || locationFilter.city || locationFilter.pincode);

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-brand-navy font-display">{t('fleetAccountsVerification')}</h1>
          <p className="text-xs text-slate-500 mt-1">{t('fleetAccountsSubtitle')}</p>
        </div>

        <div ref={searchRef} className="relative w-full sm:w-72">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              placeholder={t('searchCompaniesPlaceholder')}
              aria-label={t('searchCompaniesPlaceholder')}
              className="w-full min-h-10 pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-amber"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label={t('clearSearch')}
                className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 max-h-60 overflow-y-auto animate-in fade-in">
              {suggestions.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    setSearch(e.companyName);
                    setShowSuggestions(false);
                  }}
                  className="w-full min-h-10 px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center justify-between gap-2 group transition-colors cursor-pointer border-b border-slate-50 last:border-0"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800 block truncate">{e.companyName}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{[e.industry, e.city].filter(Boolean).join(' • ')}</span>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400 group-hover:text-amber-600">{t('select')} ↵</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pan-India Dependent Location Filter */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-card">
        <PanIndiaLocationSelector
          value={locationFilter}
          onChange={setLocationFilter}
          mode="filter"
          layout="grid-4"
          idPrefix="admin-employers-loc"
        />
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 break-words">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card divide-y divide-slate-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">{hasFilters ? t('noMatchingResults') : t('noEmployersFound')}</div>
        ) : filtered.map((emp) => {
          const status = normaliseAccountStatus(emp.status);
          const incomplete = emp.companyName === INCOMPLETE_COMPANY;
          const verifying = working === `${emp.id}:verify`;
          const savingStatus = working === `${emp.id}:status`;
          const busy = verifying || savingStatus;
          return (
            <div key={emp.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
              <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center shrink-0">
                  {emp.logoUrl ? (
                    <img src={emp.logoUrl} alt={emp.companyName} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-6 h-6 text-slate-400" />
                  )}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-brand-navy break-words">{incomplete ? t(INCOMPLETE_COMPANY) : emp.companyName}</h3>
                    {status === 'blocked' && <StatusBadge status="blocked" size="sm" />}
                    <StatusBadge status={emp.verified ? 'verified' : 'pending'} size="sm" />
                  </div>
                  <p className="text-xs text-slate-500 break-words">
                    {[
                      emp.industry,
                      emp.contactPerson ? `${t('contactPerson')}: ${emp.contactPerson}` : '',
                      emp.location || [emp.city, emp.district, emp.state].filter(Boolean).join(', ')
                    ].filter(Boolean).join(' • ')}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 min-w-0">
                    {emp.phone && <span className="break-all">📞 {emp.phone}</span>}
                    {emp.email && <span className="break-all min-w-0">✉️ {emp.email}</span>}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:justify-end pt-1 md:pt-0">
                <button
                  type="button"
                  disabled={busy || incomplete}
                  onClick={() => { void handleToggleVerify(emp); }}
                  className={`inline-flex min-h-10 items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                    emp.verified
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  }`}
                >
                  {verifying ? (
                    <><LoaderCircle className="w-3.5 h-3.5 animate-spin" /> {t('saving')}</>
                  ) : incomplete ? (
                    t('companyProfileRequired')
                  ) : emp.verified ? (
                    t('revokeVerifiedBadge')
                  ) : (
                    <><Check className="w-3.5 h-3.5" /> {t('approveVerifyCompany')}</>
                  )}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => { void handleToggleBlock(emp); }}
                  className={`inline-flex min-h-10 items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-60 ${
                    status === 'blocked'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                  }`}
                >
                  {savingStatus && <LoaderCircle className="w-3.5 h-3.5 animate-spin" />}
                  {savingStatus ? t('saving') : status === 'blocked' ? t('unblockAccount') : t('blockEmployer')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={Boolean(blockTarget)}
        title={t('blockEmployerTitle')}
        body={blockTarget && t('blockEmployerBody', {
          name: blockTarget.companyName === INCOMPLETE_COMPANY ? blockTarget.email : blockTarget.companyName
        })}
        confirmLabel={t('confirmBlock')}
        busy={Boolean(blockTarget) && working === `${blockTarget?.id}:status`}
        error={blockError}
        layer="base"
        reason={{ label: t('reasonOptional'), placeholder: t('blockReasonPlaceholder') }}
        onConfirm={(reason) => { void confirmBlock(reason); }}
        onCancel={() => setBlockTarget(null)}
      />
    </div>
  );
};
