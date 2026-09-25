import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  Users, Search, MapPin, ShieldCheck, Phone, Mail, Briefcase, 
  CheckCircle2, Download, Bookmark, Filter, ChevronDown, ChevronRight, 
  ArrowLeft, Sparkles, Lock, Unlock, FileText, Globe, MessageSquare, 
  Wallet, Trash2, Check, X, Building2, Award
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { DriverProfile, EmployerSubscription, SavedSearch, CandidateUnlock } from '../../types';
import { ALL_INDIAN_STATES, getCitiesForState, POPULAR_INDIAN_SKILLS } from '../../data/indiaLocations';

export const EmployerCandidates: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentUser = DataStore.getCurrentUser();
  const employerId = currentUser?.role === 'employer' ? currentUser.id : '';

  const activeTab = (searchParams.get('tab') as 'search' | 'saved' | 'unlocked') || 'search';

  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [subscription, setSubscription] = useState<EmployerSubscription>(DataStore.getSubscription(employerId));
  const [unlocks, setUnlocks] = useState<CandidateUnlock[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  // Filters matching ApnaHire Screenshot 1 (media_1790252022828.jpg)
  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get('category') || '');
  const [selectedState, setSelectedState] = useState<string>(searchParams.get('state') || '');
  const [selectedCities, setSelectedCities] = useState<string[]>(
    searchParams.get('city') ? [searchParams.get('city')!] : []
  );
  const [citySearch, setCitySearch] = useState<string>('');
  const [hideUnlocked, setHideUnlocked] = useState<boolean>(false);
  const [hideDownloaded, setHideDownloaded] = useState<boolean>(false);
  const [onlyCvAttached, setOnlyCvAttached] = useState<boolean>(false);
  const [onlyPoliceVerified, setOnlyPoliceVerified] = useState<boolean>(false);
  const [mustHaveSkill, setMustHaveSkill] = useState<string>('');
  const [activeInDays, setActiveInDays] = useState<string>('15 days');
  const [perPage, setPerPage] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Selection for bulk Excel export
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [selectedDriverModal, setSelectedDriverModal] = useState<DriverProfile | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);
  const [showModifySearchModal, setShowModifySearchModal] = useState(false);

  const loadAll = () => {
    setDrivers(DataStore.getDrivers().filter(d => d.status === 'active'));
    setSubscription(DataStore.getSubscription(employerId));
    setUnlocks(DataStore.getCandidateUnlocks(employerId));
    setSavedSearches(DataStore.getSavedSearches(employerId));
  };

  useEffect(() => {
    loadAll();
    window.addEventListener('driverhub_storage_updated', loadAll);
    return () => window.removeEventListener('driverhub_storage_updated', loadAll);
  }, [employerId]);

  useEffect(() => {
    const qCat = searchParams.get('category');
    const qCity = searchParams.get('city');
    const qState = searchParams.get('state');
    const qTerm = searchParams.get('q');
    if (qCat !== null) setCategoryFilter(qCat);
    if (qCity !== null) setSelectedCities(qCity ? [qCity] : []);
    if (qState !== null) setSelectedState(qState);
    if (qTerm !== null) setKeyword(qTerm);
  }, [searchParams]);

  const showToast = (text: string, type: 'success' | 'warning' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const unlockedDriverIds = useMemo(() => new Set(unlocks.map(u => u.driverId)), [unlocks]);
  const downloadedDriverIds = useMemo(
    () => new Set(unlocks.filter(u => u.downloadedExcel).map(u => u.driverId)),
    [unlocks]
  );

  // Real-time State Counts
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of drivers) {
      const st = d.state || 'Karnataka';
      counts[st] = (counts[st] || 0) + 1;
    }
    return counts;
  }, [drivers]);

  // Available cities based on selected state
  const availableCandidateCities = useMemo(() => {
    if (!selectedState) {
      return ['Bengaluru', 'Mumbai', 'Delhi NCR', 'Chennai', 'Hyderabad', 'Pune', 'Ahmedabad', 'Kolkata', 'Jaipur', 'Lucknow', 'Kochi', 'Mysuru', 'Hubballi-Dharwad', 'Belagavi', 'Chikkaballapur', 'Kolar', 'Tumakuru', 'Coimbatore', 'Surat', 'Chandigarh'];
    }
    return getCitiesForState(selectedState);
  }, [selectedState]);

  const filteredDrivers = useMemo(() => {
    let list = [...drivers];

    if (activeTab === 'unlocked') {
      return list.filter(d => unlockedDriverIds.has(d.id));
    }

    if (keyword.trim()) {
      const q = keyword.toLowerCase();
      list = list.filter(
        d =>
          d.fullName.toLowerCase().includes(q) ||
          d.driverCategory.toLowerCase().includes(q) ||
          d.location.toLowerCase().includes(q) ||
          d.licenseType.toLowerCase().includes(q) ||
          d.currentRole?.toLowerCase().includes(q) ||
          d.skills.some(s => s.toLowerCase().includes(q))
      );
    }

    if (categoryFilter) {
      list = list.filter(d =>
        d.driverCategory === categoryFilter ||
        (categoryFilter === 'HMV' && ['HMV', 'HMV-Transport', 'Truck Driver', 'Trailer Driver'].includes(d.driverCategory)) ||
        (categoryFilter === 'LMV' && ['LMV', 'LMV-Transport', 'Personal Driver', 'Cab Driver', 'Tempo Driver'].includes(d.driverCategory))
      );
    }

    if (selectedState) {
      list = list.filter(d =>
        (d.state || '').toLowerCase().includes(selectedState.toLowerCase()) ||
        (d.location || '').toLowerCase().includes(selectedState.toLowerCase()) ||
        (d.preferredLocation || '').toLowerCase().includes(selectedState.toLowerCase())
      );
    }

    if (selectedCities.length > 0) {
      list = list.filter(d =>
        selectedCities.some(
          c =>
            d.city.toLowerCase().includes(c.toLowerCase()) ||
            d.location.toLowerCase().includes(c.toLowerCase()) ||
            d.preferredLocation?.toLowerCase().includes(c.toLowerCase())
        )
      );
    }

    if (hideUnlocked) {
      list = list.filter(d => !unlockedDriverIds.has(d.id));
    }

    if (hideDownloaded) {
      list = list.filter(d => !downloadedDriverIds.has(d.id));
    }

    if (onlyCvAttached) {
      list = list.filter(d => d.cvAttached !== false);
    }

    if (onlyPoliceVerified) {
      list = list.filter(d => d.policeVerified !== false);
    }

    if (mustHaveSkill.trim()) {
      const sk = mustHaveSkill.toLowerCase();
      list = list.filter(d => d.skills.some(s => s.toLowerCase().includes(sk)));
    }

    return list;
  }, [
    drivers,
    activeTab,
    keyword,
    categoryFilter,
    selectedState,
    selectedCities,
    hideUnlocked,
    hideDownloaded,
    onlyCvAttached,
    onlyPoliceVerified,
    mustHaveSkill,
    unlockedDriverIds,
    downloadedDriverIds
  ]);

  const appliedFilterCount =
    (categoryFilter ? 1 : 0) +
    (hideUnlocked ? 1 : 0) +
    (hideDownloaded ? 1 : 0) +
    (onlyCvAttached ? 1 : 0) +
    (onlyPoliceVerified ? 1 : 0) +
    (mustHaveSkill ? 1 : 0) +
    selectedCities.length;

  const handleUnlockPhone = async (driver: DriverProfile) => {
    if (!employerId) return;
    const res = await DataStore.unlockCandidate(employerId, driver.id);
    if (!res.success) {
      showToast(res.message, 'warning');
      return;
    }
    loadAll();
    showToast(`Unlocked ${driver.fullName}'s phone number (${driver.phone}). 1 Database Credit used.`);
  };

  const handleSelectAll = () => {
    if (selectedDriverIds.length === filteredDrivers.length) {
      setSelectedDriverIds([]);
    } else {
      setSelectedDriverIds(filteredDrivers.map(d => d.id));
    }
  };

  const toggleSelectDriver = (id: string) => {
    if (selectedDriverIds.includes(id)) {
      setSelectedDriverIds(selectedDriverIds.filter(i => i !== id));
    } else {
      setSelectedDriverIds([...selectedDriverIds, id]);
    }
  };

  const handleDownloadExcel = () => {
    const selectedDrivers =
      selectedDriverIds.length > 0
        ? filteredDrivers.filter(d => selectedDriverIds.includes(d.id))
        : filteredDrivers;
    const targetDrivers = selectedDrivers.filter(d => unlockedDriverIds.has(d.id));

    if (targetDrivers.length === 0) {
      showToast('Unlock candidates before exporting their contact or license details.', 'warning');
      return;
    }

    // Create CSV content
    const headers = [
      'Driver Name',
      'Category',
      'Experience (Years)',
      'License Number',
      'License Type',
      'Phone Number',
      'Email',
      'Current Location',
      'Expected Salary (INR)',
      'Availability',
      'Key Driving Skills'
    ];

    const rows = targetDrivers.map(d => {
      return [
        `"${d.fullName}"`,
        `"${d.driverCategory}"`,
        `"${d.experienceYears} yrs ${d.experienceMonths || 0} mos"`,
        `"${d.licenseNumber}"`,
        `"${d.licenseType}"`,
        `"${d.phone}"`,
        `"${d.email}"`,
        `"${d.location}, ${d.city}"`,
        `"Rs. ${d.expectedSalary || 25000}/month"`,
        `"${d.availability}"`,
        `"${d.skills.join(' | ')}"`
      ].join(',');
    });

    const csvString = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvString);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DriverHub_Candidates_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    DataStore.markDriversDownloadedExcel(
      employerId,
      targetDrivers.map(d => d.id)
    );
    loadAll();
    showToast(`Downloaded ${targetDrivers.length} driver profile(s) to Excel (.csv).`);
  };

  const handleSaveCurrentSearch = () => {
    const title = `${categoryFilter || 'All Commercial & Fleet Drivers'} — ${selectedCities.join(', ') || 'All India'}`;
    const newSaved: SavedSearch = {
      id: 'srch-' + Date.now(),
      employerId,
      title,
      category: categoryFilter || 'HMV',
      city: selectedCities[0] || 'Bengaluru',
      minExp: 2,
      mustHaveSkills: mustHaveSkill ? [mustHaveSkill] : ['Commercial License', 'Safe Driving'],
      createdAt: new Date().toISOString().slice(0, 10),
      matchCount: filteredDrivers.length
    };
    DataStore.saveSearch(newSaved);
    loadAll();
    showToast(`Saved search "${title}" to your Database Saved Searches.`);
  };

  const handleMessageDriver = (driver: DriverProfile) => {
    DataStore.sendMessage({
      id: 'msg-' + Date.now(),
      senderId: employerId,
      senderName: subscription.billingCompanyName || 'Verified Fleet Employer',
      senderRole: 'employer',
      receiverId: driver.id,
      receiverName: driver.fullName,
      text: `Hi ${driver.fullName}, we found your ${driver.driverCategory} profile on DriverHub Database and would like to invite you for a driving trial.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    });
    navigate('/employer/messages');
  };

  const resetAllFilters = () => {
    setKeyword('');
    setCategoryFilter('');
    setSelectedCities([]);
    setHideUnlocked(false);
    setHideDownloaded(false);
    setOnlyCvAttached(false);
    setOnlyPoliceVerified(false);
    setMustHaveSkill('');
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const citiesList = ['Bengaluru', 'Mysuru', 'Chennai', 'Hyderabad', 'Mumbai', 'Pune', 'Delhi', 'Mangaluru', 'Hubballi'];

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold animate-in fade-in slide-in-from-top-3 ${
            toast.type === 'warning'
              ? 'bg-amber-950 text-amber-200 border-amber-700'
              : 'bg-[#08233F] text-white border-slate-700'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top ApnaHire Database Navigation Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/employer/dashboard')}
            className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm sm:text-base font-extrabold text-[#08233F]">
                {filteredDrivers.length} profiles found for{' '}
                <span className="underline decoration-amber-400 decoration-2 underline-offset-4">
                  {categoryFilter || 'HMV, LMV, Commercial Chauffeur, Truck Driver'}
                  {selectedCities.length > 0 ? `, ${selectedCities.join(', ')}` : ''}
                </span>
              </span>
              <button
                onClick={() => setShowModifySearchModal(!showModifySearchModal)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 cursor-pointer"
              >
                View details <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              DriverHub Verified Candidate Database • Active commercial & personal drivers ready for deployment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowModifySearchModal(!showModifySearchModal)}
            className="px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
          >
            Modify search
          </button>

          <button
            onClick={handleSaveCurrentSearch}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5 text-slate-600" /> Save search
          </button>

          <Link
            to="/employer/billing"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold text-slate-900 transition-colors"
          >
            <Wallet className="w-3.5 h-3.5 text-amber-600" />
            <span>Available Credits:</span>
            <span className="px-1.5 py-0.5 bg-[#08233F] text-amber-400 rounded-md text-[11px] font-extrabold">
              {subscription.dbUnlockCredits} Unlocks
            </span>
          </Link>
        </div>
      </div>

      {/* Sub-navigation Tabs (Search Candidates | Saved Searches | Unlocked Candidates) */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 rounded-t-2xl">
        <div className="flex items-center gap-6 overflow-x-auto">
          <button
            onClick={() => setSearchParams({ tab: 'search' })}
            className={`py-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'search'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" /> Search Candidates ({drivers.length})
          </button>
          <button
            onClick={() => setSearchParams({ tab: 'saved' })}
            className={`py-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'saved'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" /> Saved Searches ({savedSearches.length})
          </button>
          <button
            onClick={() => setSearchParams({ tab: 'unlocked' })}
            className={`py-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'unlocked'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" /> Unlocked Candidates ({unlocks.length})
          </button>
        </div>
      </div>

      {/* Quick Modify Search Bar Drawer */}
      {showModifySearchModal && (
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-card grid grid-cols-1 sm:grid-cols-4 gap-3 animate-in fade-in">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Role / License / Vehicle Keyword</label>
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="e.g. Heavy Truck, 40ft Trailer, Innova Chauffeur, Bus..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Driver Category</label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="">All Categories</option>
              <option value="HMV">Heavy Motor Vehicle (HMV)</option>
              <option value="LMV">Light Motor Vehicle (LMV)</option>
              <option value="Personal Driver">Personal / Executive Chauffeur</option>
              <option value="Trailer Driver">40ft Trailer Driver</option>
              <option value="Bus Driver">School / Staff Bus Driver</option>
              <option value="Cab Driver">Corporate Cab Driver</option>
              <option value="Tempo Driver">LCV / Tempo Driver</option>
              <option value="Delivery Driver">Delivery Van Driver</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setShowModifySearchModal(false)}
              className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Apply Search
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: SAVED SEARCHES VIEW */}
      {activeTab === 'saved' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#08233F]">Saved Candidate Searches</h2>
              <p className="text-xs text-slate-500">One-click access to your recurring fleet hiring queries</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedSearches.map(s => (
              <div
                key={s.id}
                className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-slate-50/60 flex flex-col justify-between gap-4 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-[#08233F]">{s.title}</h3>
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-bold shrink-0">
                      {s.matchCount} Drivers
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[11px] font-semibold">
                      ★ {s.category}
                    </span>
                    <span className="px-2 py-0.5 bg-white text-slate-700 border border-slate-200 rounded-md text-[11px]">
                      📍 {s.city}
                    </span>
                    <span className="px-2 py-0.5 bg-white text-slate-700 border border-slate-200 rounded-md text-[11px]">
                      💼 {s.minExp}+ Yrs Exp
                    </span>
                    {s.mustHaveSkills.map(sk => (
                      <span key={sk} className="px-2 py-0.5 bg-white text-slate-600 border border-slate-200 rounded-md text-[11px]">
                        ✓ {sk}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
                  <span className="text-[11px] text-slate-400">Saved on {s.createdAt}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        DataStore.deleteSavedSearch(s.id);
                        loadAll();
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                      title="Delete Saved Search"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setCategoryFilter(s.category);
                        setSelectedCities([s.city]);
                        setSearchParams({ tab: 'search' });
                      }}
                      className="px-3.5 py-1.5 bg-[#08233F] hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Run Search →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* MAIN 2-COLUMN APNAHIRE DATABASE LAYOUT (Left Filters + Right Candidate Cards) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT FILTER PANEL (Col 1-4) — Matches Screenshot 1 */}
          <aside className="lg:col-span-4 xl:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-[#08233F]">
                <Filter className="w-4 h-4 text-slate-700" />
                <span>Filters ({appliedFilterCount})</span>
              </div>
              <button
                onClick={resetAllFilters}
                className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                Reset
              </button>
            </div>

            {/* Active Filter Pills Box */}
            {appliedFilterCount > 0 && (
              <div className="p-3.5 bg-slate-50/70 border-b border-slate-200 space-y-2">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  {appliedFilterCount} filter{appliedFilterCount > 1 ? 's' : ''} applied
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {categoryFilter && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                      ★ {categoryFilter}
                      <button onClick={() => setCategoryFilter('')} className="hover:text-blue-950 ml-0.5 cursor-pointer">✕</button>
                    </span>
                  )}
                  {hideUnlocked && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                      Hide: Already unlocked
                      <button onClick={() => setHideUnlocked(false)} className="hover:text-blue-950 ml-0.5 cursor-pointer">✕</button>
                    </span>
                  )}
                  {hideDownloaded && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                      Hide: Already downloaded in excel
                      <button onClick={() => setHideDownloaded(false)} className="hover:text-blue-950 ml-0.5 cursor-pointer">✕</button>
                    </span>
                  )}
                  {selectedCities.map(city => (
                    <span
                      key={city}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200"
                    >
                      {city}/Region
                      <button
                        onClick={() => setSelectedCities(selectedCities.filter(c => c !== city))}
                        className="hover:text-blue-950 ml-0.5 cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Section 1: Hide candidates that are */}
            <div className="p-4 border-b border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Hide candidates that are ({(hideUnlocked ? 1 : 0) + (hideDownloaded ? 1 : 0)})
                </span>
                <button
                  onClick={() => {
                    setHideUnlocked(false);
                    setHideDownloaded(false);
                  }}
                  className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideUnlocked}
                  onChange={e => setHideUnlocked(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span>Already unlocked</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideDownloaded}
                  onChange={e => setHideDownloaded(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span>Already downloaded in excel</span>
              </label>

              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                <span>by</span>
                <select className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                  <option>Me</option>
                  <option>Company Team</option>
                </select>
                <span>in the last</span>
                <select className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                  <option>2 months</option>
                  <option>6 months</option>
                  <option>1 year</option>
                </select>
              </div>
            </div>

            {/* Section 2: Show only candidates who */}
            <div className="p-4 border-b border-slate-200 space-y-2.5">
              <span className="text-xs font-bold text-slate-800 block">Show only candidates who</span>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyCvAttached}
                  onChange={e => setOnlyCvAttached(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span>Have CV & Driving License attached</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyPoliceVerified}
                  onChange={e => setOnlyPoliceVerified(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span>Police & RTO Badge Verified</span>
              </label>
            </div>

            {/* Section 3: Driver Category */}
            <div className="p-4 border-b border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Driver Category / License</span>
                {categoryFilter && (
                  <button
                    onClick={() => setCategoryFilter('')}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
              >
                <option value="">All Driver Categories</option>
                <option value="HMV">Heavy Motor Vehicle (HMV)</option>
                <option value="LMV">Light Motor Vehicle (LMV)</option>
                <option value="Personal Driver">Personal / Family Chauffeur</option>
                <option value="Trailer Driver">40ft Container Trailer</option>
                <option value="Bus Driver">School / Staff Bus Driver</option>
                <option value="Cab Driver">Cab / Yellow-Board Driver</option>
                <option value="Tempo Driver">Tempo / LCV Goods Driver</option>
                <option value="Delivery Driver">Delivery Van Driver</option>
              </select>

              {/* Quick Category Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: 'All', val: '' },
                  { label: 'HMV Truck', val: 'HMV' },
                  { label: 'LMV Fleet', val: 'LMV' },
                  { label: 'Chauffeur', val: 'Personal Driver' },
                  { label: 'Trailer', val: 'Trailer Driver' },
                  { label: 'Bus Driver', val: 'Bus Driver' },
                  { label: 'Delivery', val: 'Delivery Driver' }
                ].map(cat => {
                  const isActive = categoryFilter === cat.val;
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => setCategoryFilter(isActive ? '' : cat.val)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#08233F] text-amber-300 shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 4: Must-Have Keywords / Skills */}
            <div className="p-4 border-b border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Must-Have Keywords / Skills</span>
                {mustHaveSkill && (
                  <button
                    onClick={() => setMustHaveSkill('')}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={mustHaveSkill}
                  onChange={e => setMustHaveSkill(e.target.value)}
                  placeholder="Search skill (e.g. Night Driving, FASTag)..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Clickable Popular Skill Tag Chips */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Popular Capabilities:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Highway Navigation', 'Night Driving', 'Automatic Transmission',
                    'FASTag & Tolls', 'Pre-Trip Inspection', 'VIP Protocol',
                    'Heavy Freight', 'Ghat Roads', 'Fleet Safety', 'GPS Navigation'
                  ].map(skill => {
                    const isSelected = mustHaveSkill.toLowerCase() === skill.toLowerCase();
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => setMustHaveSkill(isSelected ? '' : skill)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                        }`}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section 5: State & Union Territory */}
            <div className="p-4 border-b border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Operating State / UT</span>
                {selectedState && (
                  <button
                    onClick={() => {
                      setSelectedState('');
                      setSelectedCities([]);
                    }}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <select
                value={selectedState}
                onChange={e => {
                  setSelectedState(e.target.value);
                  setSelectedCities([]);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
              >
                <option value="">All Indian States & UTs ({drivers.length} Drivers)</option>
                {ALL_INDIAN_STATES.map(st => (
                  <option key={st.state} value={st.state}>
                    {st.state} ({st.region}) {stateCounts[st.state] ? `• ${stateCounts[st.state]} active` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Section 6: Current City / Area */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Current City / Area {selectedState ? `(${selectedState})` : ''}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedCities(availableCandidateCities.slice(0, 6))}
                    className="text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer"
                  >
                    Select Top
                  </button>
                  {selectedCities.length > 0 && (
                    <button
                      onClick={() => setSelectedCities([])}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* City Quick Dropdown */}
              <select
                value={selectedCities[0] || ''}
                onChange={e => {
                  if (e.target.value) setSelectedCities([e.target.value]);
                  else setSelectedCities([]);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
              >
                <option value="">-- Quick Select City / Region --</option>
                {availableCandidateCities.map(c => (
                  <option key={c} value={c}>{c} Region</option>
                ))}
              </select>

              {/* Live Search Input for Cities */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={citySearch}
                  onChange={e => setCitySearch(e.target.value)}
                  placeholder="Filter cities / districts..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-amber-400 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Filterable Checkbox List */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {availableCandidateCities
                  .filter(city => !citySearch || city.toLowerCase().includes(citySearch.toLowerCase()))
                  .map(city => {
                    const checked = selectedCities.includes(city);
                    const countInCity = drivers.filter(d => (d.city || d.location || d.preferredLocation || '').toLowerCase().includes(city.toLowerCase())).length;
                    return (
                      <label key={city} className="flex items-center justify-between text-xs text-slate-700 cursor-pointer p-1 hover:bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) setSelectedCities(selectedCities.filter(c => c !== city));
                              else setSelectedCities([...selectedCities, city]);
                            }}
                            className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer"
                          />
                          <span className={checked ? 'font-bold text-slate-900' : ''}>{city}</span>
                        </div>
                        {countInCity > 0 && (
                          <span className="text-[10px] font-semibold text-emerald-700 px-1.5 py-0.5 bg-emerald-50 rounded-full border border-emerald-200">
                            {countInCity} drivers
                          </span>
                        )}
                      </label>
                    );
                  })}
              </div>
            </div>
          </aside>

          {/* RIGHT CANDIDATE RESULTS LIST (Col 5-12) — Exact ApnaHire Candidate Card UI */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            {/* Top Controls Row: Active in 15 days | Showing 20 per page | Select All + Download Excel */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filteredDrivers.length > 0 && selectedDriverIds.length === filteredDrivers.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span>Select All ({selectedDriverIds.length > 0 ? selectedDriverIds.length : filteredDrivers.length})</span>
                </label>

                <button
                  onClick={handleDownloadExcel}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download Excel
                </button>
              </div>

              <div className="flex items-center gap-3 flex-wrap text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Active in</span>
                  <select
                    value={activeInDays}
                    onChange={e => setActiveInDays(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  >
                    <option>7 days</option>
                    <option>15 days</option>
                    <option>30 days</option>
                    <option>6 months</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Showing</span>
                  <select
                    value={perPage}
                    onChange={e => setPerPage(Number(e.target.value))}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-slate-400">per page</span>
                </div>

                <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700">
                  Page {currentPage} of {Math.max(1, Math.ceil(filteredDrivers.length / perPage))}
                </span>
              </div>
            </div>

            {/* Candidate Cards List */}
            {filteredDrivers.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-subtle space-y-3">
                <Users className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-[#08233F]">No matching driver profiles found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Try clearing some filters or selecting additional cities to view more verified drivers.
                </p>
                <button
                  onClick={resetAllFilters}
                  className="px-4 py-2 bg-[#08233F] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDrivers.slice((currentPage - 1) * perPage, currentPage * perPage).map(driver => {
                  const isUnlocked = unlockedDriverIds.has(driver.id);
                  const isSelected = selectedDriverIds.includes(driver.id);
                  const matchingTags = [
                    driver.driverCategory,
                    driver.licenseType.split(' ')[0] + ' License',
                    ...(driver.skills || []).slice(0, 3)
                  ];

                  return (
                    <div
                      key={driver.id}
                      className={`bg-white rounded-2xl border transition-all shadow-subtle hover:shadow-card overflow-hidden ${
                        isSelected ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-slate-200'
                      }`}
                    >
                      <div className="p-5 sm:p-6">
                        <div className="flex items-start gap-3.5">
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectDriver(driver.id)}
                            className="mt-2 w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                          />

                          {/* Avatar Initials Circle (like AK in ApnaHire screenshot) */}
                          <div
                            onClick={() => setSelectedDriverModal(driver)}
                            className="w-12 h-12 rounded-full bg-slate-800 text-white font-bold text-sm flex items-center justify-center shrink-0 cursor-pointer hover:bg-[#08233F]"
                          >
                            {getInitials(driver.fullName)}
                          </div>

                          {/* Main Candidate Content */}
                          <div className="flex-1 min-w-0 space-y-3.5">
                            {/* Header Name & Meta */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <button
                                  onClick={() => setSelectedDriverModal(driver)}
                                  className="text-base font-bold text-slate-900 hover:text-blue-700 inline-flex items-center gap-1.5 cursor-pointer text-left"
                                >
                                  <span>{driver.fullName}</span>
                                  <ChevronRight className="w-4 h-4 text-slate-400" />
                                  <span title="RTO License & ID Verified">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                  </span>
                                </button>

                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                                  <span className="inline-flex items-center gap-1 font-medium">
                                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                    {driver.experienceYears} yrs {driver.experienceMonths ?? 0} mos
                                  </span>
                                  <span className="inline-flex items-center gap-1 font-medium">
                                    💵 {driver.expectedSalary ? `₹${driver.expectedSalary.toLocaleString('en-IN')}/mo` : 'Not Disclosed'}
                                  </span>
                                  <span className="inline-flex items-center gap-1 font-medium">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    {driver.location}, {driver.city}/Bangalore
                                  </span>
                                </div>
                              </div>

                              <span className="self-start sm:self-center px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold">
                                {driver.availability} Joining
                              </span>
                            </div>

                            {/* Mint-Green "Matching: ✓ ..." Highlight Bar (Exact match to Screenshot 1) */}
                            <div className="bg-[#E6F6F2] border border-emerald-200/80 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-slate-800 mr-1">Matching:</span>
                              {matchingTags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white text-slate-800 rounded-full text-[11px] font-semibold shadow-2xs border border-emerald-100"
                                >
                                  <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                                  {tag}
                                </span>
                              ))}
                            </div>

                            {/* Structured Metadata Rows (Current / Latest, Previous, Education/License, Pref Location, Skills, Languages) */}
                            <div className="grid grid-cols-1 gap-2 text-xs">
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3">
                                <span className="sm:col-span-3 text-slate-400 font-medium flex items-center gap-1.5">
                                  <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Current / Latest
                                </span>
                                <span className="sm:col-span-9 text-slate-800 font-medium">
                                  {driver.currentRole ||
                                    `${driver.experiences?.[0]?.roleTitle || `Senior ${driver.driverCategory} Operator`} at ${
                                      driver.experiences?.[0]?.companyName || 'Verified Logistics Fleet Pvt Ltd'
                                    }`}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3">
                                <span className="sm:col-span-3 text-slate-400 font-medium flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Previous
                                </span>
                                <span className="sm:col-span-9 text-slate-700">
                                  {driver.previousRole ||
                                    `${driver.experiences?.[1]?.roleTitle || 'Previous role not provided'} at ${
                                      driver.experiences?.[1]?.companyName || 'Previous employer not provided'
                                    }`}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3">
                                <span className="sm:col-span-3 text-slate-400 font-medium flex items-center gap-1.5">
                                  <Award className="w-3.5 h-3.5 text-slate-400 shrink-0" /> License & Edu
                                </span>
                                <span className="sm:col-span-9 text-slate-700">
                                  {driver.licenseType} ({driver.licenseNumber}) • {driver.education || '10th/12th Pass + RTO Badge'}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3">
                                <span className="sm:col-span-3 text-slate-400 font-medium flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Pref. Location
                                </span>
                                <span className="sm:col-span-9 text-slate-700">
                                  {driver.preferredLocation || `${driver.city}/Bangalore Region & Highway Routes`}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3">
                                <span className="sm:col-span-3 text-slate-400 font-medium flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Skills & Vehicles
                                </span>
                                <span className="sm:col-span-9 text-slate-700">
                                  {[...(driver.vehicleTypes || []), ...driver.skills].join(' | ')}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3">
                                <span className="sm:col-span-3 text-slate-400 font-medium flex items-center gap-1.5">
                                  <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Languages
                                </span>
                                <span className="sm:col-span-9 text-slate-700">
                                  {(driver.languages || ['Kannada (Fluent)', 'Hindi', 'English', 'Tamil']).join(' | ')}
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons: View Phone Number (Green CTA like Screenshot 1) */}
                            <div className="pt-2 flex flex-wrap items-center gap-3">
                              {isUnlocked ? (
                                <div className="flex flex-wrap items-center gap-2.5">
                                  <a
                                    href={`tel:${driver.phone}`}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs transition-all"
                                  >
                                    <Phone className="w-3.5 h-3.5" /> {driver.phone} (Call Now)
                                  </a>
                                  <button
                                    onClick={() => handleMessageDriver(driver)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-brand-blue" /> Send Message
                                  </button>
                                  <button
                                    onClick={() => setSelectedDriverModal(driver)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
                                  >
                                    View Full Dossier
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2.5">
                                  <button
                                    onClick={() => handleUnlockPhone(driver)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-lg text-xs shadow-xs transition-all cursor-pointer"
                                  >
                                    <Phone className="w-3.5 h-3.5" /> View Phone Number
                                  </button>
                                  <button
                                    onClick={() => setSelectedDriverModal(driver)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
                                  >
                                    View Profile
                                  </button>
                                  <button
                                    onClick={() => handleMessageDriver(driver)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" /> Message Driver
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Bottom Footer Bar (22 unlocks | CV attached | Active on 24 Sep '26) */}
                      <div className="px-6 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>🔓 {driver.unlockCount || 18} unlocks</span>
                        <div className="flex items-center gap-4">
                          <span>📎 DL & CV attached</span>
                          <span>• Active on {driver.lastActive || "24 Sep '26"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed Driver Dossier Modal */}
      {selectedDriverModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-[#08233F] text-amber-400 flex items-center justify-center font-bold text-lg">
                  {getInitials(selectedDriverModal.fullName)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                    {selectedDriverModal.fullName}
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedDriverModal.driverCategory} • {selectedDriverModal.experienceYears} Yrs {selectedDriverModal.experienceMonths || 0} Mos Experience • {selectedDriverModal.location}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDriverModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block">Phone Number</span>
                {unlockedDriverIds.has(selectedDriverModal.id) ? (
                  <a href={`tel:${selectedDriverModal.phone}`} className="font-bold text-emerald-700 hover:underline">
                    {selectedDriverModal.phone}
                  </a>
                ) : (
                  <button
                    onClick={() => handleUnlockPhone(selectedDriverModal)}
                    className="font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Unlock Phone (1 Credit)
                  </button>
                )}
              </div>
              <div>
                <span className="text-slate-400 block">License Number</span>
                <span className="font-bold text-slate-900">{unlockedDriverIds.has(selectedDriverModal.id) ? selectedDriverModal.licenseNumber : 'Unlock profile to view'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">License Validity</span>
                <span className="font-bold text-emerald-700">{unlockedDriverIds.has(selectedDriverModal.id) ? `Valid till ${selectedDriverModal.licenseExpiry}` : 'Unlock profile to view'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Expected Salary</span>
                <span className="font-bold text-slate-900">₹{(selectedDriverModal.expectedSalary || 26000).toLocaleString('en-IN')} / month</span>
              </div>
              <div>
                <span className="text-slate-400 block">Joining Availability</span>
                <span className="font-bold text-slate-900">{selectedDriverModal.availability}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Police Verification</span>
                <span className={`font-bold ${selectedDriverModal.policeVerified ? 'text-emerald-700' : 'text-slate-600'}`}>{selectedDriverModal.policeVerified ? 'Verified clear' : 'Not verified'}</span>
              </div>
            </div>

            {selectedDriverModal.bio && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs text-slate-700 leading-relaxed">
                <strong className="text-slate-900 block mb-1">Driver Summary:</strong>
                {selectedDriverModal.bio}
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Skills & Vehicle Competencies</h4>
              <div className="flex flex-wrap gap-1.5">
                {[...(selectedDriverModal.vehicleTypes || []), ...selectedDriverModal.skills].map((sk, i) => (
                  <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold">
                    ✓ {sk}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedDriverModal(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const d = selectedDriverModal;
                  setSelectedDriverModal(null);
                  handleMessageDriver(d);
                }}
                className="px-4 py-2 bg-[#08233F] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Send Interview Invite
              </button>
              {!unlockedDriverIds.has(selectedDriverModal.id) && (
                <button
                  onClick={() => handleUnlockPhone(selectedDriverModal)}
                  className="px-5 py-2 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  📞 Unlock Phone Number
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
