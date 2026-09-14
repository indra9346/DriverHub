import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, MapPin, Filter, IndianRupee, Briefcase, Truck, 
  RotateCcw, SlidersHorizontal, ChevronLeft, ChevronRight, X 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { Job, DriverCategory } from '../../types';
import { JobCard } from '../../components/common/JobCard';

export const JobsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentUser, setCurrentUser] = useState(DataStore.getCurrentUser());
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);

  // Filter States initialized from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || '');
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');
  const [minSalary, setMinSalary] = useState<number>(Number(searchParams.get('minSalary')) || 0);
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
    if (selectedLocation) params.set('location', selectedLocation);
    if (selectedType) params.set('type', selectedType);
    if (minSalary > 0) params.set('minSalary', minSalary.toString());
    setSearchParams(params, { replace: true });
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedLocation, selectedType, minSalary]);

  const handleToggleSave = (jobId: string) => {
    if (!currentUser) {
      alert('Please log in as a driver to save jobs.');
      return;
    }
    const isSaved = DataStore.toggleFavorite(currentUser.id, jobId);
    setSavedJobIds(DataStore.getFavorites(currentUser.id));
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedLocation('');
    setSelectedType('');
    setMinSalary(0);
    setSearchParams({}, { replace: true });
  };

  // Filter logic
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesQuery = 
        !searchQuery ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = 
        !selectedCategory ||
        job.category.toLowerCase().includes(selectedCategory.toLowerCase());

      const matchesLocation = 
        !selectedLocation ||
        job.location.toLowerCase().includes(selectedLocation.toLowerCase()) ||
        job.city.toLowerCase().includes(selectedLocation.toLowerCase()) ||
        job.state.toLowerCase().includes(selectedLocation.toLowerCase());

      const matchesType = !selectedType || job.employmentType === selectedType;

      const matchesSalary = minSalary === 0 || job.salaryMax >= minSalary;

      return matchesQuery && matchesCategory && matchesLocation && matchesType && matchesSalary;
    });
  }, [jobs, searchQuery, selectedCategory, selectedLocation, selectedType, minSalary]);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#08233F] to-[#173E68] rounded-2xl p-6 sm:p-8 text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Driver Recruitment Directory</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display mt-1 text-white">
            Browse Active Driving Vacancies
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 mt-1">
            Showing {filteredJobs.length} verified jobs from approved logistics fleets and commercial employers.
          </p>
        </div>

        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setIsMobileFilterOpen(true)}
          className="md:hidden flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-subtle transition-all cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4" /> Filters ({[selectedCategory, selectedLocation, selectedType].filter(Boolean).length})
        </button>
      </div>

      {/* Main Grid: Filters Sidebar + Job Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Desktop Filter Panel */}
        <aside className="hidden lg:block bg-white p-5 rounded-2xl border border-slate-200/90 shadow-subtle space-y-5 sticky top-24">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-[#08233F] uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-amber-500" /> Filter Vacancies
            </h3>
            {(selectedCategory || selectedLocation || selectedType || minSalary > 0 || searchQuery) && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Search Keywords</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Title, company, skill..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
              />
            </div>
          </div>

          {/* Driver Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Driver License / Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="">All Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">City / Region</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                placeholder="e.g. Bengaluru, Chennai..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
              />
            </div>
          </div>

          {/* Employment Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="">Any Type</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract / Trip-based</option>
            </select>
          </div>

          {/* Salary Min Slider */}
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
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </aside>

        {/* Job Listings Column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Active Filter Chips */}
          {(selectedCategory || selectedLocation || selectedType || minSalary > 0 || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2 bg-slate-100/80 p-3 rounded-2xl border border-slate-200/90">
              <span className="text-xs font-bold text-slate-700">Active Filters:</span>
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-subtle">
                  {selectedCategory}
                  <button onClick={() => setSelectedCategory('')} className="cursor-pointer"><X className="w-3 h-3 text-slate-400 hover:text-slate-800" /></button>
                </span>
              )}
              {selectedLocation && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-subtle">
                  📍 {selectedLocation}
                  <button onClick={() => setSelectedLocation('')} className="cursor-pointer"><X className="w-3 h-3 text-slate-400 hover:text-slate-800" /></button>
                </span>
              )}
              {selectedType && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-subtle">
                  {selectedType}
                  <button onClick={() => setSelectedType('')} className="cursor-pointer"><X className="w-3 h-3 text-slate-400 hover:text-slate-800" /></button>
                </span>
              )}
              {minSalary > 0 && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-subtle">
                  ₹{minSalary.toLocaleString('en-IN')}+
                  <button onClick={() => setMinSalary(0)} className="cursor-pointer"><X className="w-3 h-3 text-slate-400 hover:text-slate-800" /></button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-subtle">
                  "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="cursor-pointer"><X className="w-3 h-3 text-slate-400 hover:text-slate-800" /></button>
                </span>
              )}
            </div>
          )}

          {/* Job Feed Grid */}
          {displayedJobs.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/90 space-y-4 shadow-subtle">
              <Truck className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-[#08233F]">No driving jobs found matching your criteria</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Try adjusting your filters or search terms, or view all available vacancies.
                </p>
              </div>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-[#08233F] text-white text-xs font-bold rounded-xl hover:bg-[#051626] cursor-pointer shadow-subtle"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isSaved={savedJobIds.includes(job.id)}
                  onToggleSave={handleToggleSave}
                  isApplied={appliedJobIds.includes(job.id)}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <span className="text-xs text-slate-500 font-medium">
                Page {currentPage} of {totalPages} ({filteredJobs.length} results)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-xl border border-slate-200 disabled:opacity-30 hover:bg-slate-50 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      currentPage === page
                        ? 'bg-[#08233F] text-white shadow-subtle'
                        : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 rounded-xl border border-slate-200 disabled:opacity-30 hover:bg-slate-50 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Filter Modal */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="w-[85vw] max-w-sm bg-white h-full p-5 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-150 shadow-modal">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-[#08233F] text-sm">Filters</h3>
              <button onClick={() => setIsMobileFilterOpen(false)} className="p-1 rounded-md text-slate-400 hover:text-slate-900 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Driver License / Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
              >
                <option value="">All Categories</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City / Location</label>
              <input
                type="text"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                placeholder="e.g. Bengaluru, Mysuru"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>

            <button
              onClick={() => setIsMobileFilterOpen(false)}
              className="w-full py-3 bg-[#08233F] text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
