import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Building2, MapPin, ShieldCheck, Search, RefreshCw, Globe, ArrowRight, ArrowUpRight, Sparkles
} from 'lucide-react';
import { SupabaseSync } from '../../services/supabaseSync';
import { EmployerProfile } from '../../types';
import { useLanguage } from '../../services/i18n';
import { getCompanyCardBanner } from '../../services/cardBanners';
import { PanIndiaLocationSelector } from '../../components/common/PanIndiaLocationSelector';
import { matchesPanIndiaLocationFilter, StructuredPanIndiaLocation } from '../../services/indiaLocationService';
import { toSafeExternalUrl, externalUrlLabel } from '../../services/publicApi';

export const CompaniesPage: React.FC = () => {
  const { t, lang } = useLanguage();
  // /companies/:id opens the directory at that employer's card.
  const { id: highlightedCompanyId } = useParams<{ id: string }>();
  const scrolledToCompanyRef = React.useRef('');
  const [directory, setDirectory] = useState<Array<{ employer: EmployerProfile; activeVacancyCount: number }>>([]);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState<StructuredPanIndiaLocation>({
    state: '',
    district: '',
    city: '',
    pincode: '',
    formattedLocation: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestVersion = React.useRef(0);

  const loadDirectory = useCallback(async () => {
    const version = ++requestVersion.current;
    setError('');
    setLoading(true);
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

  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const companySuggestions = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const suggestions: { title: string; subtitle: string; type: 'company' | 'industry' | 'city' }[] = [];
    const seen = new Set<string>();

    for (const { employer: e } of directory) {
      if (!q || e.companyName.toLowerCase().includes(q)) {
        if (!seen.has(e.companyName.toLowerCase())) {
          seen.add(e.companyName.toLowerCase());
          suggestions.push({
            title: e.companyName,
            subtitle: e.industry || 'Logistics & Transport Fleet',
            type: 'company'
          });
        }
      }
      if (e.industry && (!q || e.industry.toLowerCase().includes(q))) {
        if (!seen.has(e.industry.toLowerCase())) {
          seen.add(e.industry.toLowerCase());
          suggestions.push({
            title: e.industry,
            subtitle: 'Industry Category',
            type: 'industry'
          });
        }
      }
      if (e.city && (!q || e.city.toLowerCase().includes(q))) {
        if (!seen.has(e.city.toLowerCase())) {
          seen.add(e.city.toLowerCase());
          suggestions.push({
            title: e.city,
            subtitle: `${e.state || 'India'} Fleet Hub`,
            type: 'city'
          });
        }
      }
    }
    return suggestions.slice(0, 7);
  }, [directory, search]);

  const hasLocationFilter = Boolean(locationFilter.state || locationFilter.district || locationFilter.city || locationFilter.pincode);
  const filtered = directory.filter(({ employer: e }) => {
    const matchesSearch =
      !search.trim() ||
      e.companyName.toLowerCase().includes(search.toLowerCase()) ||
      (e.industry || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.city || '').toLowerCase().includes(search.toLowerCase());
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

  const highlightedVisible = Boolean(highlightedCompanyId) && filtered.some(({ employer }) => employer.id === highlightedCompanyId);
  const highlightedInDirectory = Boolean(highlightedCompanyId) && directory.some(({ employer }) => employer.id === highlightedCompanyId);

  useEffect(() => {
    if (!highlightedCompanyId || !highlightedVisible || scrolledToCompanyRef.current === highlightedCompanyId) return;
    scrolledToCompanyRef.current = highlightedCompanyId;
    const card = document.getElementById(`company-${highlightedCompanyId}`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightedCompanyId, highlightedVisible]);

  const clearFilters = () => {
    setSearch('');
    setLocationFilter({ state: '', district: '', city: '', pincode: '', formattedLocation: '' });
  };

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
        <div ref={searchRef} className="relative z-20 w-full md:w-80 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              placeholder={lang === 'kn' ? 'ಕಂಪನಿ, ಉದ್ಯಮದ ಹೆಸರು ಹುಡುಕಿ...' : 'Search company, industry...'}
              className="w-full min-h-[44px] pl-10 pr-11 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 backdrop-blur-sm"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch('')}
                className="absolute right-0.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-10 h-10 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Real-Time Auto-Suggestions Popup */}
          {showSuggestions && companySuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-12 mt-1 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 py-1.5 max-h-60 overflow-y-auto animate-in fade-in z-50">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span>Matching Employers & Fleets</span>
                <button
                  type="button"
                  aria-label="Close suggestions"
                  onClick={() => setShowSuggestions(false)}
                  className="inline-flex items-center justify-center w-10 h-10 -my-3 -mr-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              {companySuggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSearch(item.title);
                    setShowSuggestions(false);
                  }}
                  className="w-full min-h-[44px] px-3 py-2 text-left text-xs hover:bg-amber-50 hover:text-amber-950 flex items-center justify-between group transition-colors cursor-pointer border-b border-slate-50 last:border-0"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-slate-900 group-hover:text-amber-900 truncate block">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate block">{item.subtitle}</span>
                  </div>
                  <span className="text-[10px] bg-slate-100 group-hover:bg-amber-200 text-slate-700 group-hover:text-amber-900 px-2 py-0.5 rounded font-bold shrink-0">
                    Select ↵
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between px-1">
            <button onClick={() => void loadDirectory()} className="inline-flex items-center gap-1.5 min-h-[40px] text-xs text-white/80 hover:text-white cursor-pointer disabled:opacity-70 disabled:cursor-wait" disabled={loading} aria-busy={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> {loading && directory.length > 0 ? 'Refreshing…' : (lang === 'kn' ? 'ಪಟ್ಟಿಯನ್ನು ನವೀಕರಿಸಿ' : 'Refresh directory')}
            </button>
            <span className="text-[11px] text-amber-300 font-bold">
              {filtered.length} {filtered.length === 1 ? 'Fleet' : 'Fleets'}
            </span>
          </div>
        </div>
      </div>

      {/* Pan-India Dependent Location Filter (State/UT -> District -> Town/City -> PIN Code) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-card">
        <PanIndiaLocationSelector
          value={locationFilter}
          onChange={setLocationFilter}
          mode="filter"
          layout="grid-4"
          idPrefix="companies-directory-loc"
        />
      </div>

      {highlightedCompanyId && !loading && !error && directory.length > 0 && !highlightedVisible && (
        <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-3">
          <span>
            {highlightedInDirectory
              ? 'The employer you opened is hidden by the current search or location filter.'
              : 'The employer you opened is not in the verified employer directory.'}
          </span>
          {highlightedInDirectory && (
            <button type="button" onClick={clearFilters} className="min-h-[40px] px-3 font-bold underline cursor-pointer">
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy={loading}>
        {filtered.map(({ employer: company, activeVacancyCount: openVacancies }) => {
          const banner = getCompanyCardBanner(company);
          const websiteUrl = toSafeExternalUrl(company.website);
          const employerJobsLink = `/jobs?employer=${encodeURIComponent(company.id)}`;
          const isHighlighted = company.id === highlightedCompanyId;
          return (
            <div
              key={company.id}
              id={`company-${company.id}`}
              className={`group relative rounded-2xl overflow-hidden border shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between p-5 bg-slate-950 focus-within:ring-2 focus-within:ring-emerald-500 scroll-mt-24 min-w-0 ${
                isHighlighted ? 'border-amber-400 ring-2 ring-amber-400' : 'border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Realistic Logistics Hub / Transport Terminal Banner Background */}
              <img
                src={banner.url}
                alt={banner.alt}
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              {/* Multi-stop dark gradient overlay for crisp text legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/85 to-slate-950/50 transition-colors" />

              {/* Top Row: Floating Logo & Badges */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <Link
                  to={employerJobsLink}
                  aria-label={`${t('View Jobs')} ${company.companyName}`}
                  className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-1 flex items-center justify-center shrink-0 hover:border-emerald-400 transition-colors overflow-hidden"
                >
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt={company.companyName} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Building2 className="w-5 h-5 text-slate-300" />
                  )}
                </Link>

                <div className="flex items-center gap-1.5 shrink-0">
                  {company.verified && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-md border border-emerald-400/40">
                      <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" /> {t('Verified Partner')}
                    </span>
                  )}
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md border border-white/20 text-slate-200 shadow-sm">
                    {banner.tag.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Middle Section: Company Title, Industry, Metadata, Description */}
              <div className="relative z-10 space-y-2.5 pt-5 pb-3 min-w-0">
                <div className="min-w-0">
                  <Link
                    to={employerJobsLink}
                    className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors truncate block"
                  >
                    {company.companyName}
                  </Link>
                  <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{company.industry}</p>
                </div>

                {/* Metadata */}
                <div className="space-y-1.5 text-xs text-slate-300 py-2 border-t border-white/10">
                  <div className="flex items-start gap-2 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="break-words min-w-0">{company.location || [company.city, company.state].filter(Boolean).join(', ') || 'Pan-India'}</span>
                  </div>
                  {websiteUrl && (
                    <div className="flex items-center gap-2 min-w-0">
                      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a href={websiteUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-emerald-400 hover:underline truncate min-w-0">
                        {externalUrlLabel(websiteUrl)}
                      </a>
                    </div>
                  )}
                </div>

                {company.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed break-words">
                    {company.description}
                  </p>
                )}
              </div>

              {/* Bottom Row: Vacancies Count & Arrow CTA */}
              <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 leading-none tracking-tight">
                    {openVacancies}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-200 tracking-wider uppercase leading-none">
                    {lang === 'kn' ? 'ಖಾಲಿ ಹುದ್ದೆಗಳು' : 'VACANCIES'}
                  </span>
                </div>

                <Link
                  to={employerJobsLink}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white/90 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm"
                  title={t('View Jobs')}
                  aria-label={`${t('View Jobs')} ${company.companyName}`}
                >
                  <ArrowUpRight className="w-4 h-4" />
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
      {!loading && error && directory.length === 0 && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          <p>{lang === 'kn' ? 'ಪರಿಶೀಲಿತ ಉದ್ಯೋಗದಾತರ ಪಟ್ಟಿಯನ್ನು ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. Supabase ಸಂಪರ್ಕ ಮತ್ತು ಸಾರ್ವಜನಿಕ ಓದು ನೀತಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.' : error}</p>
          <button onClick={() => void loadDirectory()} className="mt-3 min-h-[40px] font-bold underline">{lang === 'kn' ? 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ' : 'Try again'}</button>
        </div>
      )}
      {error && directory.length > 0 && !loading && (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          Could not refresh the directory. Showing the last loaded list. {error}
        </p>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600 space-y-3">
          <p>
            {search && hasLocationFilter
              ? 'No verified employers match your search in the selected location.'
              : search
              ? (lang === 'kn' ? 'ನಿಮ್ಮ ಹುಡುಕಾಟಕ್ಕೆ ಹೊಂದುವ ಪರಿಶೀಲಿತ ಉದ್ಯೋಗದಾತರು ಸಿಗಲಿಲ್ಲ.' : 'No verified employers match your search.')
              : hasLocationFilter
              ? 'No verified employers are listed in the selected location. Try a wider area or clear the location filter.'
              : (lang === 'kn' ? 'ಪ್ರಸ್ತುತ ಯಾವುದೇ ಪರಿಶೀಲಿತ ಉದ್ಯೋಗದಾತರು ಪಟ್ಟಿಯಲ್ಲಿ ಇಲ್ಲ.' : 'No verified employers are currently listed.')}
          </p>
          {(search || hasLocationFilter) && (
            <button type="button" onClick={clearFilters} className="min-h-[40px] px-4 text-xs font-bold text-blue-700 underline cursor-pointer">
              Clear search and location
            </button>
          )}
        </div>
      )}
    </div>
  );
};

