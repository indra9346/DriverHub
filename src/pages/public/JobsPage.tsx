import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, MapPin, Filter, IndianRupee, Briefcase, Truck,
  RotateCcw, SlidersHorizontal, ChevronLeft, ChevronRight, X,
  Building2, Compass, CheckCircle2, ShieldCheck, Sparkles
} from 'lucide-react';
import { DataStore, isJobOpenForApplications } from '../../services/store';
import { categoryMatches, getSaveJobMode } from '../../services/publicApi';
import { getLoginPathForRole } from '../../services/authRouting';
import { Job, DriverCategory } from '../../types';
import { JobCard } from '../../components/common/JobCard';
import { PanIndiaLocationSelector } from '../../components/common/PanIndiaLocationSelector';
import { matchesPanIndiaLocationFilter, isDistrictInState } from '../../services/indiaLocationService';
import { useLanguage, formatMinSalaryThreshold } from '../../services/i18n';
import {
  ALL_INDIAN_STATES,
  CITY_AREAS_MAP,
  getCitiesForState,
  POPULAR_INDIAN_SKILLS,
  getSearchRoleSuggestions,
  getSearchLocationSuggestions,
  POPULAR_SEARCH_ROLES,
  POPULAR_INDIAN_LOCATIONS
} from '../../data/indiaLocations';

export const JobsPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentUser, setCurrentUser] = useState(DataStore.getCurrentUser());
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);

  // Pan-India Filter States (State/UT -> District -> Town/City -> PIN code)
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('category') || '');
  const [selectedState, setSelectedState] = useState(() => searchParams.get('state') || '');
  const [selectedDistrict, setSelectedDistrict] = useState(() => searchParams.get('district') || '');
  const [selectedCity, setSelectedCity] = useState(() => searchParams.get('city') || searchParams.get('location') || '');
  const [selectedPincode, setSelectedPincode] = useState(() => searchParams.get('pincode') || '');
  const [selectedArea, setSelectedArea] = useState(() => searchParams.get('area') || '');
  const [selectedType, setSelectedType] = useState(() => searchParams.get('type') || '');
  const [minSalary, setMinSalary] = useState<number>(() => Number(searchParams.get('minSalary')) || 0);
  const [salaryDraft, setSalaryDraft] = useState<number>(() => Number(searchParams.get('minSalary')) || 0);
  const [isSalaryAdjusting, setIsSalaryAdjusting] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(() => searchParams.get('skill') || '');
  const [selectedEmployer, setSelectedEmployer] = useState(() => searchParams.get('employer') || '');
  const [sortBy, setSortBy] = useState<'newest' | 'salary'>(() => (searchParams.get('sort') === 'salary' ? 'salary' : 'newest'));
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const navigate = useNavigate();
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-suggestions states & refs
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [citySearchInput, setCitySearchInput] = useState('');
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const cityContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);
  const mobileCityContainerRef = useRef<HTMLDivElement>(null);
  const [showMobileSearchSuggestions, setShowMobileSearchSuggestions] = useState(false);
  const [showMobileCitySuggestions, setShowMobileCitySuggestions] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const loadData = () => {
    const user = DataStore.getCurrentUser();
    setCurrentUser(user);
    // Only jobs a driver can still apply to: live, not expired, deadline not passed.
    setJobs(DataStore.getJobs().filter(isJobOpenForApplications));

    if (user && user.role === 'driver') {
      setSavedJobIds(DataStore.getFavorites(user.id));
      // Withdrawn ones too: an application cannot be submitted again.
      const myApps = DataStore.getApplications().filter(a => a.driverId === user.id);
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
    let dist = searchParams.get('district') || '';
    const ct = searchParams.get('city') || searchParams.get('location') || '';
    const pin = searchParams.get('pincode') || '';
    const ar = searchParams.get('area') || '';
    const ty = searchParams.get('type') || '';
    const sal = Number(searchParams.get('minSalary')) || 0;
    const sk = searchParams.get('skill') || '';
    const emp = searchParams.get('employer') || '';
    const sort = searchParams.get('sort') === 'salary' ? 'salary' : 'newest';

    // Enforce that district belongs to state when both are present
    if (st && dist && !isDistrictInState(st, dist)) {
      dist = '';
    }

    setSearchQuery(q);
    setSelectedCategory(cat);
    setSelectedState(st);
    setSelectedDistrict(dist);
    setSelectedCity(ct);
    setSelectedPincode(pin);
    setSelectedArea(ar);
    setSelectedType(ty);
    setMinSalary(sal);
    setSalaryDraft(sal);
    setIsSalaryAdjusting(false);
    setSelectedSkill(sk);
    setSelectedEmployer(emp);
    setSortBy(sort);
  }, [searchParams]);

  // Click-outside listener to dismiss auto-suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setShowSearchSuggestions(false);
      }
      if (cityContainerRef.current && !cityContainerRef.current.contains(target)) {
        setShowCitySuggestions(false);
      }
      if (mobileSearchContainerRef.current && !mobileSearchContainerRef.current.contains(target)) {
        setShowMobileSearchSuggestions(false);
      }
      if (mobileCityContainerRef.current && !mobileCityContainerRef.current.contains(target)) {
        setShowMobileCitySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchRoleSuggestions = useMemo(() => {
    const liveJobs = jobs.map(j => ({ title: j.title, category: j.category, company: j.companyName }));
    return getSearchRoleSuggestions(searchQuery, liveJobs);
  }, [searchQuery, jobs]);

  const citySuggestions = useMemo(() => {
    return getSearchLocationSuggestions(citySearchInput);
  }, [citySearchInput]);

  // Sync filter changes back to the URL, touching only the keys passed in.
  // react-router hands the updater this render's params (it does not queue
  // updates like setState), so each update starts from the live URL instead:
  // two changes in the same tick (e.g. both location selectors) never undo
  // each other or bring back stale values.
  const updateUrlParams = useCallback((updates: {
    q?: string;
    category?: string;
    state?: string;
    district?: string;
    city?: string;
    pincode?: string;
    area?: string;
    type?: string;
    minSalary?: number;
    skill?: string;
    employer?: string;
    sort?: string;
  }) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : prev);
      for (const [key, raw] of Object.entries(updates)) {
        if (raw === undefined) continue;
        // Not trimmed: the keyword box mirrors the URL, so trimming would eat the space being typed.
        const value = String(raw);
        const empty = !value.trim() || (key === 'minSalary' && !(Number(value) > 0)) || (key === 'sort' && value === 'newest');
        if (empty) next.delete(key);
        else next.set(key, value);
        // "location" is the legacy alias of "city".
        if (key === 'city') next.delete('location');
      }
      const nextState = next.get('state') || '';
      const nextDistrict = next.get('district') || '';
      if (nextState && nextDistrict && !isDistrictInState(nextState, nextDistrict)) {
        next.delete('district');
      }
      return next;
    }, { replace: true });
    setCurrentPage(1);
  }, [setSearchParams]);

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

  // Drivers save jobs; visitors are sent to the driver sign-in; employer and
  // admin accounts get no save control.
  const saveJobMode = getSaveJobMode(currentUser);
  const handleToggleSave = async (jobId: string) => {
    if (!currentUser || currentUser.role !== 'driver') {
      navigate(getLoginPathForRole('driver', `/jobs/${jobId}`));
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
    setSelectedDistrict('');
    setSelectedCity('');
    setSelectedPincode('');
    setSelectedArea('');
    setSelectedType('');
    setMinSalary(0);
    setSalaryDraft(0);
    setIsSalaryAdjusting(false);
    setSelectedSkill('');
    setSelectedEmployer('');
    setSearchParams(new URLSearchParams(), { replace: true });
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    selectedCategory || selectedState || selectedDistrict || selectedCity || selectedPincode ||
    selectedArea || selectedType || minSalary > 0 || selectedSkill || searchQuery || selectedEmployer
  );
  const selectedEmployerName = useMemo(() => {
    if (!selectedEmployer) return '';
    return DataStore.getEmployerById(selectedEmployer)?.companyName ||
      jobs.find(job => job.employerId === selectedEmployer)?.companyName ||
      'Selected employer';
  }, [selectedEmployer, jobs]);

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
    const matched = jobs.filter((job) => {
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

      // 2. Category match (same grouping as the home page category cards)
      const matchesCategory = categoryMatches(selectedCategory, job.category);

      // 3. Pan-India Location match (State/UT -> District -> Town/City -> PIN code)
      const matchesPanIndia = matchesPanIndiaLocationFilter(job, {
        state: selectedState,
        district: selectedDistrict,
        city: selectedCity,
        pincode: selectedPincode
      });

      // 4. Area / Corridor match
      const matchesArea =
        !selectedArea ||
        job.location.toLowerCase().includes(selectedArea.toLowerCase()) ||
        job.description.toLowerCase().includes(selectedArea.toLowerCase());

      // 5. Employment type match
      const matchesType = !selectedType || job.employmentType === selectedType;

      // 6. Salary match: the job's guaranteed minimum pay reaches the threshold
      const matchesSalary = minSalary === 0 || Number(job.salaryMin || 0) >= minSalary;

      // 7. Skill match
      const matchesSkill =
        !selectedSkill ||
        job.requiredSkills?.some(s => s.toLowerCase().includes(selectedSkill.toLowerCase())) ||
        job.description.toLowerCase().includes(selectedSkill.toLowerCase());

      // 8. Employer (from a company card)
      const matchesEmployer = !selectedEmployer || job.employerId === selectedEmployer;

      return matchesQuery && matchesCategory && matchesPanIndia && matchesArea && matchesType && matchesSalary && matchesSkill && matchesEmployer;
    });
    if (sortBy === 'salary') {
      return [...matched].sort((a, b) =>
        (Number(b.salaryMax || 0) - Number(a.salaryMax || 0)) || (Number(b.salaryMin || 0) - Number(a.salaryMin || 0))
      );
    }
    return matched;
  }, [jobs, searchQuery, selectedCategory, selectedState, selectedDistrict, selectedCity, selectedPincode, selectedArea, selectedType, minSalary, selectedSkill, selectedEmployer, sortBy]);

  // Paginated jobs
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / itemsPerPage));
  // Results can shrink under the current page (filters, closed jobs): stay in range.
  const safePage = Math.min(currentPage, totalPages);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
  const displayedJobs = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return filteredJobs.slice(start, start + itemsPerPage);
  }, [filteredJobs, safePage]);
  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Mobile filter drawer: Escape closes it and the page behind does not scroll.
  useEffect(() => {
    if (!isMobileFilterOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileFilterOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileFilterOpen]);

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
                <>Showing <span className="font-bold text-amber-400">{filteredJobs.length}</span> active {filteredJobs.length === 1 ? 'vacancy' : 'vacancies'} from verified logistics fleets, corporate employers, and transport operators across India.</>
              )}
            </p>
          </div>

          {/* Mobile Filter Trigger */}
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            aria-expanded={isMobileFilterOpen}
            className="lg:hidden flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-3 min-h-[44px] rounded-xl text-xs shadow-lg transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" /> {t('Filters ({count})', { count: [selectedCategory, selectedState, selectedDistrict, selectedCity, selectedPincode, selectedArea, selectedType, minSalary > 0, selectedSkill, selectedEmployer].filter(Boolean).length })}
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
                  setSelectedDistrict('');
                  setSelectedPincode('');
                  setSelectedArea('');
                  updateUrlParams({ city: hub.city, state: hub.state, district: '', pincode: '', area: '' });
                }}
                className={`shrink-0 inline-flex items-center min-h-[40px] px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-[11px] ${
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

      {/* Pan-India Dependent Location Filter Bar (State/UT -> District -> Town/City -> PIN code) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-subtle">
        <PanIndiaLocationSelector
          mode="filter"
          layout="grid"
          value={{
            state: selectedState,
            district: selectedDistrict,
            city: selectedCity,
            pincode: selectedPincode
          }}
          onChange={(next) => {
            setSelectedState(next.state);
            setSelectedDistrict(next.district);
            setSelectedCity(next.city);
            setSelectedPincode(next.pincode);
            setSelectedArea('');
            updateUrlParams({
              state: next.state,
              district: next.district,
              city: next.city,
              pincode: next.pincode,
              area: ''
            });
          }}
        />
      </div>

      {/* Main Grid: Filters Sidebar + Job Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">

        {/* Desktop Filter Panel */}
        <aside className="hidden lg:block bg-white p-5 rounded-2xl border border-slate-200/90 shadow-subtle space-y-5 sticky top-24">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-[#08233F] uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-amber-500" /> {t('Pan-India Job Filters')}
            </h3>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> {t('Reset')}
              </button>
            )}
          </div>

          {/* 1. Search Keyword with Real-Time Auto-Suggestions */}
          <div ref={searchContainerRef} className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">{t('Search Keywords / Roles')}</label>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    updateUrlParams({ q: '' });
                  }}
                  className="text-[10px] text-blue-700 hover:underline font-bold cursor-pointer"
                >
                  {t('Clear')}
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setShowSearchSuggestions(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  updateUrlParams({ q: e.target.value });
                  setShowSearchSuggestions(true);
                }}
                placeholder={lang === 'kn' ? "ಹುದ್ದೆಯ ಹೆಸರು, ಫ್ಲೀಟ್, ಕೌಶಲ್ಯ..." : "Job title, transport fleet, skill..."}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    updateUrlParams({ q: '' });
                  }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Real-time Role & Vacancy Auto-Suggestions Popup */}
            {showSearchSuggestions && searchRoleSuggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 max-h-72 overflow-y-auto animate-in fade-in">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <span>Suggested Vacancies & Roles</span>
                  <button
                    type="button"
                    onClick={() => setShowSearchSuggestions(false)}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                {searchRoleSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSearchQuery(item.title);
                      const updates: Record<string, string> = { q: item.title };
                      if (item.category) {
                        setSelectedCategory(item.category);
                        updates.category = item.category;
                      }
                      updateUrlParams(updates);
                      setShowSearchSuggestions(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-amber-50 hover:text-amber-950 flex items-center justify-between group transition-colors cursor-pointer border-b border-slate-50 last:border-0"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 group-hover:text-amber-900 truncate block">
                          {item.title}
                        </span>
                        {item.source === 'job' && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold shrink-0">
                            Vacancy
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 truncate block">{item.subtitle}</span>
                    </div>
                    <span className="text-[10px] bg-slate-100 group-hover:bg-amber-200 text-slate-700 group-hover:text-amber-900 px-2 py-0.5 rounded font-bold shrink-0">
                      Select ↵
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Pan-India Searchable Location Filter (State/UT -> District -> Town/City -> PIN Code) */}
          <div className="pt-2 border-t border-slate-100">
            <PanIndiaLocationSelector
              idPrefix="jobs-sidebar-location"
              mode="filter"
              layout="vertical"
              value={{
                state: selectedState,
                district: selectedDistrict,
                city: selectedCity,
                pincode: selectedPincode
              }}
              onChange={(loc) => {
                setSelectedState(loc.state);
                setSelectedDistrict(loc.district);
                setSelectedCity(loc.city);
                setSelectedPincode(loc.pincode);
                setCitySearchInput(loc.city);
                updateUrlParams({
                  state: loc.state,
                  district: loc.district,
                  city: loc.city,
                  pincode: loc.pincode
                });
              }}
            />
          </div>

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
        <div ref={resultsRef} className="lg:col-span-3 space-y-4 scroll-mt-20 min-w-0">
          {/* Sort */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-600" aria-live="polite">
              {filteredJobs.length} {filteredJobs.length === 1 ? 'open vacancy' : 'open vacancies'}
            </p>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <span>Sort by</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  const value = e.target.value === 'salary' ? 'salary' : 'newest';
                  setSortBy(value);
                  updateUrlParams({ sort: value });
                }}
                className="min-h-[40px] bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                <option value="newest">Newest first</option>
                <option value="salary">Highest salary</option>
              </select>
            </label>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 bg-slate-100/90 p-3 rounded-2xl border border-slate-200/90">
              <span className="text-xs font-bold text-slate-700">
                {t('Active Filters ({count} Results):', { count: filteredJobs.length })}
              </span>

              {selectedEmployer && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs max-w-full">
                  <Building2 className="w-3 h-3 text-slate-500 shrink-0" /> <span className="truncate">{selectedEmployerName}</span>
                  <button aria-label="Remove employer filter" onClick={() => { setSelectedEmployer(''); updateUrlParams({ employer: '' }); }} className="inline-flex items-center justify-center w-10 h-10 -my-2.5 -mr-3 shrink-0 rounded-full cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {selectedCategory && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  🚛 {t(selectedCategory)}
                  <button onClick={() => { setSelectedCategory(''); updateUrlParams({ category: '' }); }} className="inline-flex items-center justify-center w-10 h-10 -my-2.5 -mr-3 shrink-0 rounded-full cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {selectedState && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  🏛️ {selectedState}
                  <button aria-label="Remove state filter" onClick={() => { setSelectedState(''); setSelectedDistrict(''); setSelectedCity(''); setSelectedPincode(''); setSelectedArea(''); updateUrlParams({ state: '', district: '', city: '', pincode: '', area: '' }); }} className="inline-flex items-center justify-center w-10 h-10 -my-2.5 -mr-3 shrink-0 rounded-full cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {selectedDistrict && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  🗺️ {selectedDistrict}
                  <button aria-label="Remove district filter" onClick={() => { setSelectedDistrict(''); setSelectedCity(''); setSelectedArea(''); updateUrlParams({ district: '', city: '', area: '' }); }} className="inline-flex items-center justify-center w-10 h-10 -my-2.5 -mr-3 shrink-0 rounded-full cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {selectedCity && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  📍 {selectedCity}
                  <button onClick={() => { setSelectedCity(''); updateUrlParams({ city: '' }); }} className="inline-flex items-center justify-center w-10 h-10 -my-2.5 -mr-3 shrink-0 rounded-full cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {selectedPincode && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  📮 PIN {selectedPincode}
                  <button onClick={() => { setSelectedPincode(''); updateUrlParams({ pincode: '' }); }} className="inline-flex items-center justify-center w-10 h-10 -my-2.5 -mr-3 shrink-0 rounded-full cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {selectedArea && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  🏢 {selectedArea}
                  <button onClick={() => { setSelectedArea(''); updateUrlParams({ area: '' }); }} className="inline-flex items-center justify-center w-10 h-10 -my-2.5 -mr-3 shrink-0 rounded-full cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {selectedSkill && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  ⭐ {selectedSkill}
                  <button onClick={() => { setSelectedSkill(''); updateUrlParams({ skill: '' }); }} className="inline-flex items-center justify-center w-10 h-10 -my-2.5 -mr-3 shrink-0 rounded-full cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {selectedType && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  {t(selectedType)}
                  <button onClick={() => { setSelectedType(''); updateUrlParams({ type: '' }); }} className="inline-flex items-center justify-center w-10 h-10 -my-2.5 -mr-3 shrink-0 rounded-full cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {minSalary > 0 && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  {formatMinSalaryThreshold(minSalary, lang)}
                  <button onClick={() => applySalaryFilter(0)} className="inline-flex items-center justify-center w-10 h-10 -my-2.5 -mr-3 shrink-0 rounded-full cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {searchQuery && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  "{searchQuery}"
                  <button onClick={() => { setSearchQuery(''); updateUrlParams({ q: '' }); }} className="inline-flex items-center justify-center w-10 h-10 -my-2.5 -mr-3 shrink-0 rounded-full cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              <button
                onClick={handleResetFilters}
                className="min-h-[40px] px-2 text-xs text-blue-700 hover:text-blue-900 font-bold ml-auto hover:underline cursor-pointer"
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
                className="min-h-[44px] px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all shadow cursor-pointer"
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
                  onToggleSave={saveJobMode === 'hidden' ? undefined : handleToggleSave}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-subtle">
              <span className="text-xs text-slate-600 font-medium">
                {t('Page {curr} of {total} ({count} Vacancies)', { curr: safePage, total: totalPages, count: filteredJobs.length })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={safePage === 1}
                  onClick={() => goToPage(safePage - 1)}
                  className="min-h-[40px] px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> {t('Previous')}
                </button>
                <button
                  disabled={safePage === totalPages}
                  onClick={() => goToPage(safePage + 1)}
                  className="min-h-[40px] px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer flex items-center gap-1"
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
        <div
          className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex justify-end"
          onClick={(e) => { if (e.target === e.currentTarget) setIsMobileFilterOpen(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('Pan-India Job Filters')}
            className="bg-white w-full max-w-sm h-[100dvh] max-h-[100dvh] overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-5 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-[#08233F] flex items-center gap-2">
                  <Filter className="w-4 h-4 text-amber-500" /> {t('Pan-India Job Filters')}
                </h3>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  aria-label="Close filters"
                  className="inline-flex items-center justify-center w-10 h-10 -mr-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Search Keyword */}
              <div ref={mobileSearchContainerRef} className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Search Keywords / Roles')}</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onFocus={() => setShowMobileSearchSuggestions(true)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      updateUrlParams({ q: e.target.value });
                      setShowMobileSearchSuggestions(true);
                    }}
                    placeholder={lang === 'kn' ? "ಹುದ್ದೆಯ ಹೆಸರು, ಫ್ಲೀಟ್, ಕೌಶಲ್ಯ..." : "Job title, transport fleet, skill..."}
                    className="w-full min-h-[44px] pl-9 pr-11 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => {
                        setSearchQuery('');
                        updateUrlParams({ q: '' });
                      }}
                      className="absolute right-0.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-10 h-10 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Mobile Suggestions Popup */}
                {showMobileSearchSuggestions && searchRoleSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 max-h-60 overflow-y-auto animate-in fade-in">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <span>Suggested Roles & Vacancies</span>
                      <button
                        type="button"
                        aria-label="Close suggestions"
                        onClick={() => setShowMobileSearchSuggestions(false)}
                        className="inline-flex items-center justify-center w-10 h-10 -my-3 -mr-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    {searchRoleSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSearchQuery(item.title);
                          const updates: Record<string, string> = { q: item.title };
                          if (item.category) {
                            setSelectedCategory(item.category);
                            updates.category = item.category;
                          }
                          updateUrlParams(updates);
                          setShowMobileSearchSuggestions(false);
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
              </div>

              {/* State */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Indian State / Union Territory')}</label>
                <select
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    setSelectedDistrict('');
                    setSelectedCity('');
                    setSelectedPincode('');
                    setSelectedArea('');
                    updateUrlParams({ state: e.target.value, district: '', city: '', pincode: '', area: '' });
                  }}
                  className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
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
                    setSelectedArea('');
                    updateUrlParams({ city: e.target.value, area: '' });
                  }}
                  className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
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
                  className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
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
                className="flex-1 min-h-[44px] py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                {t('Reset')}
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 min-h-[44px] py-2.5 bg-[#08233F] hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
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
