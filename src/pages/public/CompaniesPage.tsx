import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, MapPin, ShieldCheck, Search, RefreshCw, Globe, ArrowRight, Sparkles 
} from 'lucide-react';
import { SupabaseSync } from '../../services/supabaseSync';
import { EmployerProfile } from '../../types';
import { useLanguage } from '../../services/i18n';
import { getCompanyCardBanner } from '../../services/cardBanners';

export const CompaniesPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [directory, setDirectory] = useState<Array<{ employer: EmployerProfile; activeVacancyCount: number }>>([]);
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
      <div className="bg-gradient-to-r from-[#08233F] to-[#173E68] rounded-3xl p-6 sm:p-8 text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 font-bold text-xs uppercase tracking-wider mb-2 border border-amber-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            {t('Verified Employer Directory')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white">
            {t('Top Logistics & Fleet Partners')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 mt-1.5 leading-relaxed">
            {t('Explore verified transport companies, corporate fleets, and schools hiring drivers directly.')}
          </p>
        </div>

        {/* Search & Verified filter */}
        <div className="relative z-10 w-full md:w-80 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'kn' ? 'ಕಂಪನಿ, ಉದ್ಯಮದ ಹೆಸರು ಹುಡುಕಿ...' : 'Search company, industry...'}
              className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 backdrop-blur-sm"
            />
          </div>
          <div className="flex items-center justify-between px-1">
            <button onClick={() => void loadDirectory()} className="inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white" disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> {lang === 'kn' ? 'ಪಟ್ಟಿಯನ್ನು ನವೀಕರಿಸಿ' : 'Refresh directory'}
            </button>
            <span className="text-[11px] text-amber-300 font-bold">
              {filtered.length} {filtered.length === 1 ? 'Fleet' : 'Fleets'}
            </span>
          </div>
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(({ employer: company, activeVacancyCount: openVacancies }) => {
          const banner = getCompanyCardBanner(company);
          return (
            <div
              key={company.id}
              className="group bg-white rounded-2xl border border-slate-200/90 shadow-subtle hover:shadow-card hover:border-amber-400 transition-all flex flex-col justify-between overflow-hidden"
            >
              {/* 100% Realistic Logistics Hub / Transport Terminal Banner */}
              <div className="relative h-32 w-full overflow-hidden bg-slate-900 shrink-0">
                <img
                  src={banner.url}
                  alt={banner.alt}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                
                {company.verified && (
                  <div className="absolute top-2.5 right-2.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/80 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-emerald-400/40 shadow-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {t('Verified Partner')}
                    </span>
                  </div>
                )}

                <div className="absolute bottom-2 right-2.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-200 bg-slate-950/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/15">
                    {banner.tag}
                  </span>
                </div>
              </div>

              <div className="p-5 pt-0 flex-1 flex flex-col justify-between">
                <div>
                  {/* Floating Logo Badge */}
                  <div className="flex items-end justify-between -mt-7 mb-2.5">
                    <Link
                      to={`/jobs?q=${encodeURIComponent(company.companyName)}`}
                      className="w-14 h-14 rounded-2xl bg-white border-2 border-white shadow-md overflow-hidden flex items-center justify-center shrink-0 hover:border-amber-400 transition-colors cursor-pointer relative z-10"
                    >
                      {company.logoUrl ? (
                        <img src={company.logoUrl} alt={company.companyName} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-7 h-7 text-slate-400" />
                      )}
                    </Link>
                  </div>

                  {/* Company Title and Category on clean white card surface */}
                  <div className="mb-3">
                    <Link
                      to={`/jobs?q=${encodeURIComponent(company.companyName)}`}
                      className="text-base font-bold text-[#08233F] group-hover:text-blue-700 transition-colors truncate block cursor-pointer"
                    >
                      {company.companyName}
                    </Link>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{company.industry}</p>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-1.5 text-xs text-slate-600 py-2.5 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{company.location || [company.city, company.state].filter(Boolean).join(', ') || 'Pan-India'}</span>
                    </div>
                    {company.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a href={company.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                          {company.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {company.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mt-2">
                      {company.description}
                    </p>
                  )}
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    {t('{count} Open Vacancies', { count: openVacancies })}
                  </span>

                  <Link
                    to={`/jobs?q=${encodeURIComponent(company.companyName)}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#08233F] hover:bg-amber-500 hover:text-slate-950 text-white text-xs font-bold rounded-xl shadow-subtle transition-all duration-150 cursor-pointer"
                  >
                    <span>{t('View Jobs')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
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

