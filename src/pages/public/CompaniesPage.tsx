import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, ShieldCheck, Search, RefreshCw } from 'lucide-react';
import { SupabaseSync } from '../../services/supabaseSync';
import { EmployerProfile } from '../../types';
import { useLanguage } from '../../services/i18n';

export const CompaniesPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [directory, setDirectory] = useState<Array<{ employer: EmployerProfile; activeJobCount: number }>>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestVersion = React.useRef(0);

  const loadDirectory = useCallback(async () => {
    const version = ++requestVersion.current;
    setError('');
    try {
      const rows = await SupabaseSync.fetchPublicEmployerDirectory();
      if (version !== requestVersion.current) return;
      setDirectory(rows);
    } catch (cause) {
      if (version !== requestVersion.current) return;
      setError(cause instanceof Error ? cause.message : 'Could not load verified employers. Please try again.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let refreshTimer: number | undefined;
    let disposed = false;
    const refresh = () => {
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => { if (!disposed) void loadDirectory(); }, 250);
    };

    void loadDirectory();
    const unsubscribe = SupabaseSync.subscribeToPublicEmployerDirectory(refresh);
    const onStorageUpdate = () => refresh();
    const onFocus = () => refresh();
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener('driverhub_storage_updated', onStorageUpdate);
    window.addEventListener('focus', onFocus);
    return () => {
      disposed = true;
      requestVersion.current++;
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      window.clearInterval(interval);
      window.removeEventListener('driverhub_storage_updated', onStorageUpdate);
      window.removeEventListener('focus', onFocus);
      unsubscribe();
    };
  }, [loadDirectory]);

  const filtered = directory.filter(({ employer: e }) =>
    e.companyName.toLowerCase().includes(search.toLowerCase()) ||
    (e.industry || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.city || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#08233F] to-[#173E68] rounded-2xl p-8 text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            {t('Verified Employer Directory')}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display mt-1 text-white">
            {t('Top Logistics & Fleet Partners')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-xl">
            {t('Explore verified transport companies, corporate fleets, and schools hiring drivers directly.')}
          </p>
        </div>

        {/* Search */}
        <div className="w-full md:w-72">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'kn' ? 'ಕಂಪನಿ, ಉದ್ಯಮದ ಹೆಸರು ಹುಡುಕಿ...' : 'Search company, industry...'}
              className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <button onClick={() => void loadDirectory()} className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white" disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> {lang === 'kn' ? 'ಪಟ್ಟಿಯನ್ನು ನವೀಕರಿಸಿ' : 'Refresh directory'}
          </button>
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(({ employer: company, activeJobCount: openJobs }) => {
          return (
            <div
              key={company.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Link
                    to={`/jobs?q=${encodeURIComponent(company.companyName)}`}
                    className="w-14 h-14 rounded-xl bg-slate-50 overflow-hidden border border-slate-200 flex items-center justify-center shrink-0 shadow-subtle hover:border-amber-400 transition-colors cursor-pointer"
                  >
                    {company.logoUrl ? (
                      <img src={company.logoUrl} alt={company.companyName} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-7 h-7 text-slate-400" />
                    )}
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/jobs?q=${encodeURIComponent(company.companyName)}`}
                        className="text-base font-bold text-[#08233F] hover:text-blue-700 transition-colors truncate cursor-pointer"
                      >
                        {company.companyName}
                      </Link>
                      {company.verified && (
                        <span title={t('Verified Employer')}>
                          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{company.industry}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{company.location}, {company.state}</span>
                  </div>
                  {company.website && (
                    <div className="flex items-center gap-2">
                      <a href={company.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                        {company.website.replace('https://', '')}
                      </a>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                  {company.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {t('{count} Open Jobs', { count: openJobs })}
                </span>

                <Link
                  to={`/jobs?q=${encodeURIComponent(company.companyName)}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#08233F] hover:text-amber-600 cursor-pointer"
                >
                  {lang === 'kn' ? 'ಖಾಲಿ ಹುದ್ದೆಗಳನ್ನು ನೋಡಿ →' : 'View Vacancies →'}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      {loading && directory.length === 0 && (
        <div role="status" className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
          {lang === 'kn' ? 'ನೈಜ ಸಮಯದ ಪಟ್ಟಿಯಿಂದ ಪರಿಶೀಲಿತ ಉದ್ಯೋಗದಾತರನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ…' : 'Loading verified employers from the live directory…'}
        </div>
      )}
      {!loading && error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          <p>{lang === 'kn' ? 'ಪರಿಶೀಲಿತ ಉದ್ಯೋಗದಾತರ ಪಟ್ಟಿಯನ್ನು ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. Supabase ಸಂಪರ್ಕ ಮತ್ತು ಸಾರ್ವಜನಿಕ ಓದು ನೀತಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.' : error}</p>
          <button onClick={() => void loadDirectory()} className="mt-3 font-bold underline">{lang === 'kn' ? 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ' : 'Try again'}</button>
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
          {search
            ? (lang === 'kn' ? 'ನಿಮ್ಮ ಹುಡುಕಾಟಕ್ಕೆ ಹೊಂದುವ ಪರಿಶೀಲಿತ ಉದ್ಯೋಗದಾತರು ಸಿಗಲಿಲ್ಲ.' : 'No verified employers match your search.')
            : (lang === 'kn' ? 'ಪ್ರಸ್ತುತ ಯಾವುದೇ ಪರಿಶೀಲಿತ ಉದ್ಯೋಗದಾತರು ಪಟ್ಟಿಯಲ್ಲಿ ಇಲ್ಲ.' : 'No verified employers are currently listed.')}
        </div>
      )}
    </div>
  );
};
