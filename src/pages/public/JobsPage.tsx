import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, MapPin, Filter, IndianRupee, Briefcase, Truck, 
  RotateCcw, SlidersHorizontal, ChevronLeft, ChevronRight, X,
  Building2, Compass, CheckCircle2, ShieldCheck, Sparkles
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { Job, DriverCategory } from '../../types';
import { JobCard } from '../../components/common/JobCard';
import { useLanguage, formatMinSalaryThreshold } from '../../services/i18n';
import { 
  ALL_INDIAN_STATES, 
  CITY_AREAS_MAP, 
  getCitiesForState, 
  POPULAR_INDIAN_SKILLS 
} from '../../data/indiaLocations';

export const JobsPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentUser, setCurrentUser] = useState(DataStore.getCurrentUser());
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);

  // Pan-India Filter States
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('category') || '');
  const [selectedState, setSelectedState] = useState(() => searchParams.get('state') || '');
  const [selectedCity, setSelectedCity] = useState(() => searchParams.get('city') || searchParams.get('location') || '');
  const [selectedArea, setSelectedArea] = useState(() => searchParams.get('area') || '');
  const [selectedType, setSelectedType] = useState(() => searchParams.get('type') || '');
  const [minSalary, setMinSalary] = useState<number>(() => Number(searchParams.get('minSalary')) || 0);
  const [salaryDraft, setSalaryDraft] = useState<number>(() => Number(searchParams.get('minSalary')) || 0);
  const [isSalaryAdjusting, setIsSalaryAdjusting] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(() => searchParams.get('skill') || '');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const loadData = () => {
    const user = DataStore.getCurrentUser();
    setCurrentUser(user);
    const allJobs = DataStore.getJobs().filter(j => j.status === 'active');
    setJobs(allJobs);

    if (user && user.role === 'driver') {
      setSavedJobIds(DataStore.getFavorites(user.id));
      const myApps = DataStore.getApplications().filter(a => a.driverId === user.id && a.status !== 'withdrawn');
      setAppliedJobIds(myApps.map(a => a.jobId));
    } else {
      setSavedJobIds([]);
      setAppliedJobIds([]);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('driverhub_storage_updated', loadData);
    return () => window.removeEventListener('driverhub_storage_updated', loadData);
  }, []);

  // Sync from URL search params on navigation (back/forward)
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const cat = searchParams.get('category') || '';
    const st = searchParams.get('state') || '';
    const ct = searchParams.get('city') || searchParams.get('location') || '';
    const ar = searchParams.get('area') || '';
    const ty = searchParams.get('type') || '';
    const sal = Number(searchParams.get('minSalary')) || 0;
    const sk = searchParams.get('skill') || '';

    setSearchQuery(q);
    setSelectedCategory(cat);
    setSelectedState(st);
    setSelectedCity(ct);
    setSelectedArea(ar);
    setSelectedType(ty);
    setMinSalary(sal);
    setSalaryDraft(sal);
    setIsSalaryAdjusting(false);
    setSelectedSkill(sk);
  }, [searchParams]);

  // Sync state changes back to URL params
  const updateUrlParams = (updates: {
    q?: string;
    category?: string;
    state?: string;
    city?: string;
    area?: string;
    type?: string;
    minSalary?: number;
    skill?: string;
  }) => {
    const nextQ = updates.q !== undefined ? updates.q : searchQuery;
    const nextCat = updates.category !== undefined ? updates.category : selectedCategory;
    const nextSt = updates.state !== undefined ? updates.state : selectedState;
    const nextCt = updates.city !== undefined ? updates.city : selectedCity;
    const nextAr = updates.area !== undefined ? updates.area : selectedArea;
    const nextTy = updates.type !== undefined ? updates.type : selectedType;
    const nextSal = updates.minSalary !== undefined ? updates.minSalary : minSalary;
    const nextSk = updates.skill !== undefined ? updates.skill : selectedSkill;

    const params = new URLSearchParams();
    if (nextQ) params.set('q', nextQ);
    if (nextCat) params.set('category', nextCat);
    if (nextSt) params.set('state', nextSt);
    if (nextCt) params.set('city', nextCt);
    if (nextAr) params.set('area', nextAr);
    if (nextTy) params.set('type', nextTy);
    if (nextSal > 0) params.set('minSalary', nextSal.toString());
    if (nextSk) params.set('skill', nextSk);

    setSearchParams(params, { replace: true });
    setCurrentPage(1);
  };

  const handleSalaryInput = (newSalary: number) => {
    // Keep the thumb/amount responsive during a drag, but don't change the
    // result grid or URL until release. Replacing cards on every pointer move
    // changes document height and makes the browser scroll position jump.
    setSalaryDraft(newSalary);
    setIsSalaryAdjusting(true);
  };

  const applySalaryFilter = (newSalary: number) => {
    setSalaryDraft(newSalary);
    setIsSalaryAdjusting(false);
    if (newSalary === minSalary) return;
    setMinSalary(newSalary);
    updateUrlParams({ minSalary: newSalary });
  };

  const handleToggleSave = async (jobId: string) => {
    if (!currentUser) {
      alert(t('Please log in as a driver to save jobs.'));
      return;
    }
    const saved = await DataStore.toggleFavorite(currentUser.id, jobId);
    if (saved === savedJobIds.includes(jobId)) {
      alert(t('Could not update saved jobs. Check your connection and try again.'));
      return;
    }
    setSavedJobIds(DataStore.getFavorites(currentUser.id));
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedState('');
    setSelectedCity('');
    setSelectedArea('');
    setSelectedType('');
    setMinSalary(0);
    setSalaryDraft(0);
    setIsSalaryAdjusting(false);
    setSelectedSkill('');
    setSearchParams({}, { replace: true });
    setCurrentPage(1);
  };

  // Quick State/City Available Options
  const availableCities = useMemo(() => {
    if (!selectedState) {
      return ['Bengaluru', 'Mumbai', 'Delhi NCR', 'Chennai', 'Hyderabad', 'Pune', 'Ahmedabad', 'Kolkata', 'Jaipur', 'Lucknow', 'Kochi', 'Mysuru', 'Hubballi-Dharwad', 'Chandigarh', 'Indore', 'Surat'];
    }
    return getCitiesForState(selectedState);
  }, [selectedState]);

  const availableAreas = useMemo(() => {
    if (!selectedCity) return [];
    return CITY_AREAS_MAP[selectedCity] || [
      `${selectedCity} Central Hub`,
      `${selectedCity} Industrial Area`,
      `${selectedCity} Transport Nagar`,
      `${selectedCity} Highway Bypass`
    ];
  }, [selectedCity]);

  // Real-time counts
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const job of jobs) {
      const st = job.state || 'Other';
      counts[st] = (counts[st] || 0) + 1;
    }
    return counts;
  }, [jobs]);

  // Filter logic
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // 1. Keyword search (title, company, description, location, state, city)
      const matchesQuery = 
        !searchQuery ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.requiredSkills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

      // 2. Category match
      const matchesCategory = 
        !selectedCategory ||
        job.category.toLowerCase() === selectedCategory.toLowerCase() ||
        job.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        selectedCategory.toLowerCase().includes(job.category.toLowerCase()) ||
        (selectedCategory === 'HMV' && ['HMV', 'HMV-Transport', 'Trailer Driver', 'Heavy Truck'].some(c => job.category.includes(c))) ||
        (selectedCategory === 'LMV' && ['LMV', 'LMV-Transport', 'Personal Driver', 'Cab Driver', 'Tempo Driver'].some(c => job.category.includes(c)));

      // 3. State match
      const matchesState = 
        !selectedState ||
        job.state.toLowerCase() === selectedState.toLowerCase() ||
        job.location.toLowerCase().includes(selectedState.toLowerCase());

      // 4. City match
      const matchesCity = 
        !selectedCity ||
        job.city.toLowerCase() === selectedCity.toLowerCase() ||
        job.location.toLowerCase().includes(selectedCity.toLowerCase());

      // 5. Area / Corridor match
      const matchesArea = 
        !selectedArea ||
        job.location.toLowerCase().includes(selectedArea.toLowerCase()) ||
        job.description.toLowerCase().includes(selectedArea.toLowerCase());

      // 6. Employment type match
      const matchesType = !selectedType || job.employmentType === selectedType;

      // 7. Salary match (Exact minimum guaranteed threshold)
      const matchesSalary = minSalary === 0 || job.salaryMax >= minSalary;

      // 8. Skill match
      const matchesSkill = 
        !selectedSkill ||
        job.requiredSkills?.some(s => s.toLowerCase().includes(selectedSkill.toLowerCase())) ||
        job.description.toLowerCase().includes(selectedSkill.toLowerCase());

      return matchesQuery && matchesCategory && matchesState && matchesCity && matchesArea && matchesType && matchesSalary && matchesSkill;
    });
  }, [jobs, searchQuery, selectedCategory, selectedState, selectedCity, selectedArea, selectedType, minSalary, selectedSkill]);

  // Paginated jobs
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / itemsPerPage));
  const displayedJobs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredJobs.slice(start, start + itemsPerPage);
  }, [filteredJobs, currentPage]);

  const categoriesList: DriverCategory[] = [
    'HMV',
    'LMV',
    'Cab Driver',
    'Delivery Driver',
    'Bus Driver',
    'Trailer Driver',
    'Tempo Driver',
    'Personal Driver',
    'Commercial Driver',
    'LMV-Transport',
    'HMV-Transport',
  ];

  const popularHubCities = [
    { label: t('All India'), city: '', state: '' },
    { label: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka' },
    { label: 'Mumbai', city: 'Mumbai', state: 'Maharashtra' },
    { label: 'Delhi NCR', city: 'Delhi NCR', state: 'Delhi NCR' },
    { label: 'Chennai', city: 'Chennai', state: 'Tamil Nadu' },
    { label: 'Hyderabad', city: 'Hyderabad', state: 'Telangana' },
    { label: 'Pune', city: 'Pune', state: 'Maharashtra' },
    { label: 'Kolkata', city: 'Kolkata', state: 'West Bengal' },
    { label: 'Ahmedabad', city: 'Ahmedabad', state: 'Gujarat' },
    { label: 'Jaipur', city: 'Jaipur', state: 'Rajasthan' },
    { label: 'Kochi', city: 'Kochi', state: 'Kerala' },
    { label: 'Mysuru', city: 'Mysuru', state: 'Karnataka' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner with Pan-India Branding */}
      <div className="bg-gradient-to-r from-[#08233F] via-[#103860] to-[#173E68] rounded-3xl p-6 sm:p-8 text-white shadow-card relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 border border-amber-400/30 text-amber-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> {t('Pan-India Verified Driver Recruitment')}
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display text-white">
              {t('Browse Driving Vacancies Across All Indian States')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
              {lang === 'kn' ? (
                <>ಭಾರತದಾದ್ಯಂತ ಪರಿಶೀಲಿಸಿದ ಲಾಜಿಸ್ಟಿಕ್ಸ್ ಫ್ಲೀಟ್‌ಗಳು ಮತ್ತು ಉದ್ಯೋಗದಾತರಿಂದ <span className="font-bold text-amber-400">{filteredJobs.length}</span> ಸಕ್ರಿಯ ಹುದ್ದೆಗಳು ಲಭ್ಯವಿವೆ.</>
              ) : (
                <>Showing <span className="font-bold text-amber-400">{filteredJobs.length}</span> active vacancies from verified logistics fleets, corporate employers, and transport operators across India.</>
              )}
            </p>
          </div>

          {/* Mobile Filter Trigger */}
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="lg:hidden flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-3 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" /> {t('Filters ({count})', { count: [selectedCategory, selectedState, selectedCity, selectedArea, selectedType, minSalary > 0, selectedSkill].filter(Boolean).length })}
          </button>
        </div>

        {/* Quick Location Pills Bar */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-slate-300 font-bold shrink-0 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-amber-400" /> {lang === 'kn' ? 'ಪ್ರಮುಖ ಕೇಂದ್ರಗಳು:' : 'Major Hubs:'}
          </span>
          {popularHubCities.map(hub => {
            const isSelected = selectedCity === hub.city && (!hub.state || selectedState === hub.state);
            return (
              <button
                key={hub.label}
                type="button"
                onClick={() => {
                  setSelectedCity(hub.city);
                  setSelectedState(hub.state);
                  setSelectedArea('');
                  updateUrlParams({ city: hub.city, state: hub.state, area: '' });
                }}
                className={`shrink-0 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-[11px] ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold scale-105'
                    : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm border border-white/10'
                }`}
              >
                {hub.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Filters Sidebar + Job Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Desktop Filter Panel */}
        <aside className="hidden lg:block bg-white p-5 rounded-2xl border border-slate-200/90 shadow-subtle space-y-5 sticky top-24">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-[#08233F] uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-amber-500" /> {t('Pan-India Job Filters')}
            </h3>
            {(selectedCategory || selectedState || selectedCity || selectedArea || selectedType || minSalary > 0 || selectedSkill || searchQuery) && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> {t('Reset')}
              </button>
            )}
          </div>

          {/* 1. Search Keyword */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Search Keywords / Roles')}</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  updateUrlParams({ q: e.target.value });
                }}
                placeholder={lang === 'kn' ? "ಹುದ್ದೆಯ ಹೆಸರು, ಫ್ಲೀಟ್, ಕೌಶಲ್ಯ..." : "Job title, transport fleet, skill..."}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
              />
            </div>
          </div>

          {/* 2. State Filter (All 36 Indian States & UTs) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">{t('Indian State / Union Territory')}</label>
              {selectedState && (
                <button
                  onClick={() => {
                    setSelectedState('');
                    setSelectedCity('');
                    setSelectedArea('');
                    updateUrlParams({ state: '', city: '', area: '' });
                  }}
                  className="text-[10px] text-blue-700 hover:underline font-bold cursor-pointer"
                >
                  {t('All States')}
                </button>
              )}
            </div>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedCity('');
                setSelectedArea('');
                updateUrlParams({ state: e.target.value, city: '', area: '' });
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer font-medium"
            >
              <option value="">{t('All Indian States & UTs ({count} Jobs)', { count: jobs.length })}</option>
              {ALL_INDIAN_STATES.map((st) => (
                <option key={st.state} value={st.state}>
                  {st.state} ({st.region}) {stateCounts[st.state] ? `• ${stateCounts[st.state]} active` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 3. City / Major District Filter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                {t('City / Operating District')} {selectedState ? `(${selectedState})` : ''}
              </label>
              {selectedCity && (
                <button
                  onClick={() => {
                    setSelectedCity('');
                    setSelectedArea('');
                    updateUrlParams({ city: '', area: '' });
                  }}
                  className="text-[10px] text-blue-700 hover:underline font-bold cursor-pointer"
                >
                  {t('All Cities')}
                </button>
              )}
            </div>
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setSelectedArea('');
                updateUrlParams({ city: e.target.value, area: '' });
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="">{selectedState ? `-- ${t('City / Operating District')} in ${selectedState} --` : t('All Major Indian Cities')}</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* 4. Industrial Corridor / Micro-Area Filter (If City Selected) */}
          {selectedCity && availableAreas.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('Logistics Corridor / Area')} ({selectedCity})
              </label>
              <select
                value={selectedArea}
                onChange={(e) => {
                  setSelectedArea(e.target.value);
                  updateUrlParams({ area: e.target.value });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                <option value="">{lang === 'kn' ? `${selectedCity} ನ ಎಲ್ಲಾ ಪ್ರದೇಶಗಳು` : `All Areas & Corridors in ${selectedCity}`}</option>
                {availableAreas.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
          )}

          {/* 5. Driver License / Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Driver License / Vehicle Category')}</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                updateUrlParams({ category: e.target.value });
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="">{t('All Vehicle Categories')}</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>{t(cat)}</option>
              ))}
            </select>
          </div>

          {/* 6. Skills & Fleet Specialization */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">{t('Must-Have Skill')}</label>
              {selectedSkill && (
                <button
                  onClick={() => {
                    setSelectedSkill('');
                    updateUrlParams({ skill: '' });
                  }}
                  className="text-[10px] text-blue-700 hover:underline font-bold cursor-pointer"
                >
                  {t('Clear')}
                </button>
              )}
            </div>
            <select
              value={selectedSkill}
              onChange={(e) => {
                setSelectedSkill(e.target.value);
                updateUrlParams({ skill: e.target.value });
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="">{t('Any Driver Skill')}</option>
              {POPULAR_INDIAN_SKILLS.map((sk) => (
                <option key={sk} value={sk}>{sk}</option>
              ))}
            </select>
          </div>

          {/* 7. Employment Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Shift / Employment Type')}</label>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                updateUrlParams({ type: e.target.value });
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="">{t('Any Type')}</option>
              <option value="Full-time">{t('Full-time Regular')}</option>
              <option value="Part-time">{t('Part-time / Split Shift')}</option>
              <option value="Contract">{t('Contract / Trip-based Freight')}</option>
            </select>
          </div>

          {/* 8. Salary Min Slider (Single Threshold, Real-Time Synchronized, Touch Safe) */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>{t('Minimum Guaranteed Salary')}</span>
              <span className="text-emerald-700 font-bold" aria-live="polite">
                {formatMinSalaryThreshold(salaryDraft, lang)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="40000"
              step="2000"
              value={salaryDraft}
              aria-label={t('Minimum Guaranteed Salary')}
              aria-valuemin={0}
              aria-valuemax={40000}
              aria-valuenow={salaryDraft}
              aria-valuetext={formatMinSalaryThreshold(salaryDraft, lang)}
              onChange={(e) => handleSalaryInput(Number(e.target.value))}
              onPointerUp={(e) => applySalaryFilter(Number(e.currentTarget.value))}
              onPointerCancel={(e) => applySalaryFilter(Number(e.currentTarget.value))}
              onKeyUp={(e) => applySalaryFilter(Number(e.currentTarget.value))}
              onBlur={(e) => applySalaryFilter(Number(e.currentTarget.value))}
              style={{ touchAction: 'none' }}
              className="w-full accent-amber-500 cursor-pointer touch-none"
            />
            {isSalaryAdjusting && (
              <p className="mt-1 text-[10px] text-slate-500" aria-live="polite">
                {lang === 'kn' ? 'ಸ್ಲೈಡರ್ ಬಿಡಿಸಿದಾಗ ಫಲಿತಾಂಶಗಳನ್ನು ಅನ್ವಯಿಸಲಾಗುತ್ತದೆ.' : 'Release the slider to apply results.'}
              </p>
            )}
          </div>
        </aside>

        {/* Job Listings Column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Active Filter Chips */}
          {(selectedCategory || selectedState || selectedCity || selectedArea || selectedType || minSalary > 0 || selectedSkill || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2 bg-slate-100/90 p-3 rounded-2xl border border-slate-200/90">
              <span className="text-xs font-bold text-slate-700">
                {t('Active Filters ({count} Results):', { count: filteredJobs.length })}
              </span>
              
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  🚛 {t(selectedCategory)}
                  <button onClick={() => { setSelectedCategory(''); updateUrlParams({ category: '' }); }} className="cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {selectedState && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  🏛️ {selectedState}
                  <button onClick={() => { setSelectedState(''); updateUrlParams({ state: '' }); }} className="cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {selectedCity && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  📍 {selectedCity}
                  <button onClick={() => { setSelectedCity(''); updateUrlParams({ city: '' }); }} className="cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {selectedArea && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  🏢 {selectedArea}
                  <button onClick={() => { setSelectedArea(''); updateUrlParams({ area: '' }); }} className="cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {selectedSkill && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  ⭐ {selectedSkill}
                  <button onClick={() => { setSelectedSkill(''); updateUrlParams({ skill: '' }); }} className="cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {selectedType && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  {t(selectedType)}
                  <button onClick={() => { setSelectedType(''); updateUrlParams({ type: '' }); }} className="cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {minSalary > 0 && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  {formatMinSalaryThreshold(minSalary, lang)}
                  <button onClick={() => applySalaryFilter(0)} className="cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {searchQuery && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  "{searchQuery}"
                  <button onClick={() => { setSearchQuery(''); updateUrlParams({ q: '' }); }} className="cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              <button
                onClick={handleResetFilters}
                className="text-xs text-blue-700 hover:text-blue-900 font-bold ml-auto hover:underline cursor-pointer"
              >
                {t('Clear All')}
              </button>
            </div>
          )}

          {/* Job Feed Grid */}
          {displayedJobs.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 space-y-4 shadow-subtle">
              <Truck className="w-14 h-14 text-slate-300 mx-auto animate-bounce" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#08233F]">{t('No driving vacancies matching your search')}</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {t('Try clearing your state/city filter or search across all Indian states to see nationwide logistics openings.')}
                </p>
              </div>
              <button
                onClick={handleResetFilters}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all shadow cursor-pointer"
              >
                {t('View All Pan-India Vacancies')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isSaved={savedJobIds.includes(job.id)}
                  isApplied={appliedJobIds.includes(job.id)}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/90 shadow-subtle">
              <span className="text-xs text-slate-600 font-medium">
                {t('Page {curr} of {total} ({count} Vacancies)', { curr: currentPage, total: totalPages, count: filteredJobs.length })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> {t('Previous')}
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer flex items-center gap-1"
                >
                  {t('Next')} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters Drawer Modal */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-sm h-full overflow-y-auto p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-[#08233F] flex items-center gap-2">
                  <Filter className="w-4 h-4 text-amber-500" /> {t('Pan-India Job Filters')}
                </h3>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* State */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Indian State / Union Territory')}</label>
                <select
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    setSelectedCity('');
                    updateUrlParams({ state: e.target.value, city: '', area: '' });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="">{t('All Indian States & UTs')}</option>
                  {ALL_INDIAN_STATES.map((st) => (
                    <option key={st.state} value={st.state}>{st.state}</option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('City / Operating District')}</label>
                <select
                  value={selectedCity}
                  onChange={(e) => {
                    setSelectedCity(e.target.value);
                    updateUrlParams({ city: e.target.value });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="">{t('All Cities')}</option>
                  {availableCities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Driver License / Vehicle Category')}</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    updateUrlParams({ category: e.target.value });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="">{t('All Vehicle Categories')}</option>
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>{t(cat)}</option>
                  ))}
                </select>
              </div>

              {/* Min Salary */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>{t('Minimum Guaranteed Salary')}</span>
                  <span className="text-emerald-700 font-bold">
                    {formatMinSalaryThreshold(salaryDraft, lang)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40000"
                  step="2000"
                  value={salaryDraft}
                  onChange={(e) => handleSalaryInput(Number(e.target.value))}
                  onPointerUp={(e) => applySalaryFilter(Number(e.currentTarget.value))}
                  onPointerCancel={(e) => applySalaryFilter(Number(e.currentTarget.value))}
                  onKeyUp={(e) => applySalaryFilter(Number(e.currentTarget.value))}
                  onBlur={(e) => applySalaryFilter(Number(e.currentTarget.value))}
                  style={{ touchAction: 'none' }}
                  className="w-full accent-amber-500 touch-none"
                />
                {isSalaryAdjusting && (
                  <p className="mt-1 text-[10px] text-slate-500" aria-live="polite">
                    {lang === 'kn' ? 'ಸ್ಲೈಡರ್ ಬಿಡಿಸಿದಾಗ ಫಲಿತಾಂಶಗಳನ್ನು ಅನ್ವಯಿಸಲಾಗುತ್ತದೆ.' : 'Release the slider to apply results.'}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-2">
              <button
                onClick={handleResetFilters}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                {t('Reset')}
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-2.5 bg-[#08233F] hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {t('Apply Filters')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
