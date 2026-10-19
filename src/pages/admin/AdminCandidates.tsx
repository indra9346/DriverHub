import React, { useState, useEffect } from 'react';
import {
  LoaderCircle, Search, X
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { SupabaseSync } from '../../services/supabaseSync';
import { DriverProfile } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useLanguage } from '../../services/i18n';
import { PanIndiaLocationSelector } from '../../components/common/PanIndiaLocationSelector';
import { matchesPanIndiaLocationFilter, StructuredPanIndiaLocation } from '../../services/indiaLocationService';
import { logAdminAction } from '../../services/adminApi';
import { ConfirmDialog, normaliseAccountStatus } from './AdminUi';

export const AdminCandidates: React.FC = () => {
  const { t } = useLanguage();
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState<StructuredPanIndiaLocation>({
    state: '',
    district: '',
    city: '',
    pincode: '',
    formattedLocation: ''
  });
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [blockTarget, setBlockTarget] = useState<DriverProfile | null>(null);
  const [blockError, setBlockError] = useState('');

  const loadDrivers = () => {
    setDrivers(DataStore.getDrivers());
  };

  useEffect(() => {
    loadDrivers();
    const refresh = () => loadDrivers();
    window.addEventListener('driverhub_storage_updated', refresh);
    return () => window.removeEventListener('driverhub_storage_updated', refresh);
  }, []);

  /** Saves 'blocked' or 'active' (the database values). Returns an error message or ''. */
  const setAccountStatus = async (driver: DriverProfile, next: 'blocked' | 'active', reason?: string): Promise<string> => {
    setWorkingId(driver.id);
    setError('');
    setNotice('');
    SupabaseSync.lastError = '';
    try {
      const saved = await DataStore.updateUserStatus(driver.id, next);
      if (!saved) return DataStore.getLastError(t('accountUpdateFailed'));
      void logAdminAction({ targetType: 'driver', targetId: driver.id, action: next === 'blocked' ? 'block' : 'unblock', reason });
      loadDrivers();
      setNotice(next === 'blocked' ? t('driverBlockedNotice') : t('driverUnblockedNotice'));
      return '';
    } catch (cause) {
      return cause instanceof Error ? cause.message : t('accountUpdateFailed');
    } finally {
      setWorkingId('');
    }
  };

  const handleToggleBlock = async (driver: DriverProfile) => {
    if (normaliseAccountStatus(driver.status) !== 'blocked') {
      setBlockError('');
      setBlockTarget(driver);
      return;
    }
    const failure = await setAccountStatus(driver, 'active');
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
  const filtered = drivers.filter(d => {
    const matchesSearch =
      !query ||
      (d.fullName || '').toLowerCase().includes(query) ||
      (d.email || '').toLowerCase().includes(query) ||
      (d.driverCategory || '').toLowerCase().includes(query) ||
      (d.location || '').toLowerCase().includes(query);
    if (!matchesSearch) return false;
    return matchesPanIndiaLocationFilter(
      {
        state: d.state,
        district: d.district,
        city: d.city,
        pincode: d.pincode,
        location: d.location
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
    return drivers.filter(d =>
      (d.fullName || '').toLowerCase().includes(q) ||
      (d.driverCategory || '').toLowerCase().includes(q)
    ).slice(0, 5);
  }, [drivers, search]);

  const hasFilters = Boolean(search || locationFilter.state || locationFilter.district || locationFilter.city || locationFilter.pincode);

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-brand-navy font-display">{t('candidateModeration')}</h1>
          <p className="text-xs text-slate-500 mt-1">{t('candidateModerationSubtitle')}</p>
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
              placeholder={t('searchCandidatesPlaceholder')}
              aria-label={t('searchCandidatesPlaceholder')}
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
              {suggestions.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setSearch(d.fullName);
                    setShowSuggestions(false);
                  }}
                  className="w-full min-h-10 px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center justify-between gap-2 group transition-colors cursor-pointer border-b border-slate-50 last:border-0"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800 block truncate">{d.fullName}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{[d.driverCategory, d.city || d.location].filter(Boolean).join(' • ')}</span>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400 group-hover:text-amber-600">{t('select')} ↵</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pan-India Dependent Location Filter (State/UT -> District -> Town/City -> PIN Code) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-card">
        <PanIndiaLocationSelector
          value={locationFilter}
          onChange={setLocationFilter}
          mode="filter"
          layout="grid-4"
          idPrefix="admin-candidates-loc"
        />
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 break-words">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card divide-y divide-slate-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">{hasFilters ? t('noMatchingResults') : t('noCandidatesFound')}</div>
        ) : filtered.map((driver) => {
          const status = normaliseAccountStatus(driver.status);
          const busy = workingId === driver.id;
          return (
            <div key={driver.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
              <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-brand-surface text-brand-blue flex items-center justify-center font-bold text-base shrink-0 border border-slate-200">
                  {(driver.fullName || '?').charAt(0)}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-brand-navy break-words">{driver.fullName}</h3>
                    <StatusBadge status={status} size="sm" />
                  </div>
                  <p className="text-xs text-slate-500 break-words">
                    {[
                      driver.driverCategory ? t(driver.driverCategory) : '',
                      `${driver.experienceYears || 0} ${t('yearsExperience')}`,
                      driver.location || [driver.city, driver.district, driver.state].filter(Boolean).join(', ')
                    ].filter(Boolean).join(' • ')}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 min-w-0">
                    {driver.phone && <span className="break-all">📞 {driver.phone}</span>}
                    {driver.email && <span className="break-all min-w-0">✉️ {driver.email}</span>}
                    {driver.licenseNumber && <span className="break-all min-w-0">🪪 {driver.licenseNumber}</span>}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:shrink-0 pt-1 md:pt-0">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => { void handleToggleBlock(driver); }}
                  className={`inline-flex min-h-10 items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-60 ${
                    status === 'blocked'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                  }`}
                >
                  {busy && <LoaderCircle className="w-3.5 h-3.5 animate-spin" />}
                  {busy ? t('saving') : status === 'blocked' ? t('unblockAccount') : t('blockCandidate')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={Boolean(blockTarget)}
        title={t('blockDriverTitle')}
        body={blockTarget && t('blockDriverBody', { name: blockTarget.fullName || blockTarget.email })}
        confirmLabel={t('confirmBlock')}
        busy={Boolean(blockTarget) && workingId === blockTarget?.id}
        error={blockError}
        layer="base"
        reason={{ label: t('reasonOptional'), placeholder: t('blockReasonPlaceholder') }}
        onConfirm={(reason) => { void confirmBlock(reason); }}
        onCancel={() => setBlockTarget(null)}
      />
    </div>
  );
};
