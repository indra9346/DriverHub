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
import { 
  ALL_INDIAN_STATES, 
  CITY_AREAS_MAP, 
  getCitiesForState, 
  POPULAR_INDIAN_SKILLS 
} from '../../data/indiaLocations';

export const JobsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentUser, setCurrentUser] = useState(DataStore.getCurrentUser());
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);

  // Pan-India Filter States
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedState, setSelectedState] = useState(searchParams.get('state') || '');
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || searchParams.get('location') || '');
  const [selectedArea, setSelectedArea] = useState(searchParams.get('area') || '');
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');
  const [minSalary, setMinSalary] = useState<number>(Number(searchParams.get('minSalary')) || 0);
  const [selectedSkill, setSelectedSkill] = useState(searchParams.get('skill') || '');
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

  // Sync state to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedState) params.set('state', selectedState);
    if (selectedCity) params.set('city', selectedCity);
    if (selectedArea) params.set('area', selectedArea);
    if (selectedType) params.set('type', selectedType);
    if (minSalary > 0) params.set('minSalary', minSalary.toString());
    if (selectedSkill) params.set('skill', selectedSkill);
    setSearchParams(params, { replace: true });
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedState, selectedCity, selectedArea, selectedType, minSalary, selectedSkill]);

  const handleToggleSave = (jobId: string) => {
    if (!currentUser) {
      alert('Please log in as a driver to save jobs.');
      return;
    }
    DataStore.toggleFavorite(currentUser.id, jobId);
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
    setSelectedSkill('');
    setSearchParams({}, { replace: true });
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

      // 7. Salary match
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
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
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
    { label: 'All India', city: '', state: '' },
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
              <Sparkles className="w-3.5 h-3.5" /> Pan-India Verified Driver Recruitment
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display text-white">
              Browse Driving Vacancies Across All Indian States
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
              Showing <span className="font-bold text-amber-400">{filteredJobs.length}</span> active vacancies from verified logistics fleets, corporate employers, and transport operators across India.
            </p>
          </div>

          {/* Mobile Filter Trigger */}
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="lg:hidden flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-3 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters ({[selectedCategory, selectedState, selectedCity, selectedArea, selectedType, selectedSkill].filter(Boolean).length})
          </button>
        </div>

        {/* Quick Location Pills Bar */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-slate-300 font-bold shrink-0 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-amber-400" /> Major Hubs:
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
              <Filter className="w-3.5 h-3.5 text-amber-500" /> Pan-India Job Filters
            </h3>
            {(selectedCategory || selectedState || selectedCity || selectedArea || selectedType || minSalary > 0 || selectedSkill || searchQuery) && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          {/* 1. Search Keyword */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Search Keywords / Roles</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Job title, transport fleet, skill..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
              />
            </div>
          </div>

          {/* 2. State Filter (All 36 Indian States & UTs) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Indian State / Union Territory</label>
              {selectedState && (
                <button
                  onClick={() => { setSelectedState(''); setSelectedCity(''); setSelectedArea(''); }}
                  className="text-[10px] text-blue-700 hover:underline font-bold"
                >
                  All States
                </button>
              )}
            </div>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedCity('');
                setSelectedArea('');
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer font-medium"
            >
              <option value="">All Indian States & UTs ({jobs.length} Jobs)</option>
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
                City / Operating District {selectedState ? `in ${selectedState}` : ''}
              </label>
              {selectedCity && (
                <button
                  onClick={() => { setSelectedCity(''); setSelectedArea(''); }}
                  className="text-[10px] text-blue-700 hover:underline font-bold"
                >
                  All Cities
                </button>
              )}
            </div>
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setSelectedArea('');
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="">{selectedState ? `-- Select City in ${selectedState} --` : 'All Major Indian Cities'}</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* 4. Industrial Corridor / Micro-Area Filter (If City Selected) */}
          {selectedCity && availableAreas.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Logistics Corridor / Area ({selectedCity})
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                <option value="">All Areas & Corridors in {selectedCity}</option>
                {availableAreas.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
          )}

          {/* 5. Driver License / Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Driver License / Vehicle Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="">All Vehicle Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* 6. Skills & Fleet Specialization */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Must-Have Skill</label>
              {selectedSkill && (
                <button
                  onClick={() => setSelectedSkill('')}
                  className="text-[10px] text-blue-700 hover:underline font-bold"
                >
                  Clear
                </button>
              )}
            </div>
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="">Any Driver Skill</option>
              {POPULAR_INDIAN_SKILLS.map((sk) => (
                <option key={sk} value={sk}>{sk}</option>
              ))}
            </select>
          </div>

          {/* 7. Employment Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Shift / Employment Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="">Any Type</option>
              <option value="Full-time">Full-time Regular</option>
              <option value="Part-time">Part-time / Split Shift</option>
              <option value="Contract">Contract / Trip-based Freight</option>
            </select>
          </div>

          {/* 8. Salary Min Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Minimum Guaranteed Salary</span>
              <span className="text-emerald-700 font-bold">
                {minSalary > 0 ? `₹${minSalary.toLocaleString('en-IN')}+/mo` : 'Any'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="40000"
              step="2000"
              value={minSalary}
              onChange={(e) => setMinSalary(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </aside>

        {/* Job Listings Column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Active Filter Chips */}
          {(selectedCategory || selectedState || selectedCity || selectedArea || selectedType || minSalary > 0 || selectedSkill || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2 bg-slate-100/90 p-3 rounded-2xl border border-slate-200/90">
              <span className="text-xs font-bold text-slate-700">Active Filters ({filteredJobs.length} Results):</span>
              
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  🚛 {selectedCategory}
                  <button onClick={() => setSelectedCategory('')} className="cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {selectedState && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  🏛️ {selectedState}
                  <button onClick={() => setSelectedState('')} className="cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {selectedCity && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  📍 {selectedCity}
                  <button onClick={() => setSelectedCity('')} className="cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {selectedArea && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  🏢 {selectedArea}
                  <button onClick={() => setSelectedArea('')} className="cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {selectedSkill && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  ⭐ {selectedSkill}
                  <button onClick={() => setSelectedSkill('')} className="cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {selectedType && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  {selectedType}
                  <button onClick={() => setSelectedType('')} className="cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {minSalary > 0 && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  ₹{minSalary.toLocaleString('en-IN')}+/mo
                  <button onClick={() => setMinSalary(0)} className="cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              {searchQuery && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                  "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="cursor-pointer hover:text-red-500"><X className="w-3 h-3 text-slate-400" /></button>
                </span>
              )}

              <button
                onClick={handleResetFilters}
                className="text-xs text-blue-700 hover:text-blue-900 font-bold ml-auto hover:underline cursor-pointer"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Job Feed Grid */}
          {displayedJobs.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 space-y-4 shadow-subtle">
              <Truck className="w-14 h-14 text-slate-300 mx-auto animate-bounce" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#08233F]">No driving vacancies matching your search</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Try clearing your state/city filter or search across all Indian states to see nationwide logistics openings.
                </p>
              </div>
              <button
                onClick={handleResetFilters}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all shadow cursor-pointer"
              >
                View All Pan-India Vacancies
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
                Page <span className="font-bold text-slate-900">{currentPage}</span> of{' '}
                <span className="font-bold text-slate-900">{totalPages}</span> ({filteredJobs.length} Vacancies)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
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
                  <Filter className="w-4 h-4 text-amber-500" /> Pan-India Job Filters
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">State / UT</label>
                <select
                  value={selectedState}
                  onChange={(e) => { setSelectedState(e.target.value); setSelectedCity(''); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="">All Indian States & UTs</option>
                  {ALL_INDIAN_STATES.map((st) => (
                    <option key={st.state} value={st.state}>{st.state}</option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="">All Cities</option>
                  {availableCities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Driver Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="">All Categories</option>
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Min Salary */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Min Salary</span>
                  <span className="text-emerald-700 font-bold">
                    {minSalary > 0 ? `₹${minSalary.toLocaleString('en-IN')}+` : 'Any'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40000"
                  step="2000"
                  value={minSalary}
                  onChange={(e) => setMinSalary(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-2">
              <button
                onClick={handleResetFilters}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Reset
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-2.5 bg-[#08233F] hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
