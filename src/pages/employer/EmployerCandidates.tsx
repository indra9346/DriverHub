import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  Users, Search, MapPin, ShieldCheck, Phone, Mail, Briefcase, 
  CheckCircle2, Download, Bookmark, Filter, ChevronDown, ChevronRight, ChevronLeft,
  ArrowLeft, Sparkles, Lock, Unlock, FileText, Globe, MessageSquare, 
  Wallet, Trash2, Check, X, Building2, Award, LocateFixed, Compass, Loader2, Navigation
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { SupabaseSync } from '../../services/supabaseSync';
import { DriverProfile, EmployerSubscription, SavedSearch, CandidateUnlock } from '../../types';
import { 
  ALL_INDIAN_STATES, 
  getCitiesForState, 
  POPULAR_INDIAN_SKILLS,
  getSearchRoleSuggestions,
  POPULAR_SEARCH_ROLES
} from '../../data/indiaLocations';
import { useLanguage } from '../../services/i18n';
import { PanIndiaLocationSelector, RADIUS_OPTIONS, PanIndiaLocationValue } from '../../components/common/PanIndiaLocationSelector';
import { matchesPanIndiaLocationFilter, calculateHaversineDistanceKm, resolveLocationCoordinates, isDistrictInState, sanitizeLocalityName } from '../../services/indiaLocationService';
import { newId } from '../../lib/ids';
import {
  clearLastError, downloadCsv, fetchCandidateById, isCompanyVerificationError, isPlanOrCreditError, mapWithConcurrency
} from '../../services/employerApi';

const ACTIVE_IN_OPTIONS = ['any', '7 days', '15 days', '30 days', '6 months'];
/** 'any' -> no filter; '6 months' -> 180; 'N days' -> N. */
const activeInDaysToNumber = (value: string): number | undefined =>
  value === 'any' ? undefined : value === '6 months' ? 180 : (Number.parseInt(value, 10) || undefined);
const activeInDaysFromNumber = (days?: number | null): string =>
  !days ? 'any' : days === 180 ? '6 months' : `${days} days`;

/** Tracks the lg breakpoint so the phone layout renders a single location selector. */
function useIsDesktop(): boolean {
  const query = '(min-width: 1024px)';
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : true
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);
  return matches;
}

/** Remove button inside a filter pill: 40px tap area without enlarging the pill. */
const PillClose: React.FC<{ onClick: () => void; label: string; className?: string }> = ({ onClick, label, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={`Remove ${label}`}
    className={`-my-3 -mr-2 min-h-10 min-w-10 inline-flex items-center justify-center cursor-pointer ${className}`}
  >
    ✕
  </button>
);

export const EmployerCandidates: React.FC = () => {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentUser = DataStore.getCurrentUser();
  const employerId = currentUser?.role === 'employer' ? currentUser.id : '';

  const activeTab = (searchParams.get('tab') as 'search' | 'saved' | 'unlocked') || 'search';

  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [subscription, setSubscription] = useState<EmployerSubscription>(DataStore.getSubscription(employerId));
  const [unlocks, setUnlocks] = useState<CandidateUnlock[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  // Auto-suggestions states & refs
  const [showCandidateSearchSuggestions, setShowCandidateSearchSuggestions] = useState(false);
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
  const candidateSearchContainerRef = useRef<HTMLDivElement>(null);
  const skillContainerRef = useRef<HTMLDivElement>(null);

  // Filters matching ApnaHire Screenshot 1 (media_1790252022828.jpg)
  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get('category') || '');
  const [selectedState, setSelectedState] = useState<string>(searchParams.get('state') || '');
  const [selectedDistrict, setSelectedDistrict] = useState<string>(searchParams.get('district') || '');
  const [selectedCities, setSelectedCities] = useState<string[]>(
    searchParams.get('city') ? [searchParams.get('city')!] : []
  );
  const [selectedPincode, setSelectedPincode] = useState<string>(searchParams.get('pincode') || '');
  const [selectedRadiusKm, setSelectedRadiusKm] = useState<number>(
    searchParams.get('radius') ? Number(searchParams.get('radius')) : 0
  );
  const [searchCoords, setSearchCoords] = useState<{ lat?: number; lng?: number }>({
    lat: searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined,
    lng: searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined
  });
  const locationResolveVersionRef = useRef(0);
  const [minimumExperience, setMinimumExperience] = useState(0);
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('');
  const [citySearch, setCitySearch] = useState<string>('');
  const [hideUnlocked, setHideUnlocked] = useState<boolean>(false);
  const [hideDownloaded, setHideDownloaded] = useState<boolean>(false);
  const [onlyCvAttached, setOnlyCvAttached] = useState<boolean>(false);
  const [onlyPoliceVerified, setOnlyPoliceVerified] = useState<boolean>(false);
  const [mustHaveSkill, setMustHaveSkill] = useState<string>('');
  // "Any time" by default: a 15-day window hid most of the database.
  const [activeInDays, setActiveInDays] = useState<string>('any');
  const [perPage, setPerPage] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Selection for bulk Excel export
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [selectedDriverModal, setSelectedDriverModal] = useState<DriverProfile | null>(null);
  const [showNoCreditsModal, setShowNoCreditsModal] = useState<{ driver: DriverProfile } | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const [showModifySearchModal, setShowModifySearchModal] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const isDesktop = useIsDesktop();
  const resultsTopRef = useRef<HTMLDivElement>(null);

  // Per-driver unlock guard (a double tap must not start two paid unlocks).
  const [unlockingIds, setUnlockingIds] = useState<Set<string>>(() => new Set());
  const unlockingRef = useRef<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  // Unlocked tab: every unlocked driver, fetched by id (independent of filters).
  // undefined = not fetched yet, null = no longer available.
  const [unlockedProfiles, setUnlockedProfiles] = useState<Record<string, DriverProfile | null>>({});
  const [unlockedLoading, setUnlockedLoading] = useState(false);
  const [unlockedError, setUnlockedError] = useState('');
  const unlockedRunRef = useRef(0);

  // Click-outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (candidateSearchContainerRef.current && !candidateSearchContainerRef.current.contains(target)) {
        setShowCandidateSearchSuggestions(false);
      }
      if (skillContainerRef.current && !skillContainerRef.current.contains(target)) {
        setShowSkillSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const candidateSuggestions = useMemo(() => {
    return getSearchRoleSuggestions(keyword);
  }, [keyword]);

  const skillSuggestions = useMemo(() => {
    const q = mustHaveSkill.trim().toLowerCase();
    if (!q) return POPULAR_INDIAN_SKILLS.slice(0, 6);
    return POPULAR_INDIAN_SKILLS.filter(s => s.toLowerCase().includes(q)).slice(0, 6);
  }, [mustHaveSkill]);

  // Search results come only from the secured database search; the cached
  // driver list is never used as results.
  const loadAll = () => {
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
    const qDistrict = searchParams.get('district');
    const qState = searchParams.get('state');
    const qPincode = searchParams.get('pincode');
    const qTerm = searchParams.get('q');
    const qRadius = searchParams.get('radius');
    const qLat = searchParams.get('lat');
    const qLng = searchParams.get('lng');

    if (qCat !== null) setCategoryFilter(qCat);
    if (qCity !== null) setSelectedCities(qCity ? [qCity] : []);
    const validDist = (qState && qDistrict && !isDistrictInState(qState, qDistrict)) ? '' : (qDistrict || '');
    if (qDistrict !== null) setSelectedDistrict(validDist);
    if (qState !== null) setSelectedState(qState);
    if (qPincode !== null) setSelectedPincode(qPincode);
    if (qTerm !== null) setKeyword(qTerm);
    if (qRadius !== null) setSelectedRadiusKm(Number(qRadius) || 0);
    if (qLat !== null && qLng !== null) {
      setSearchCoords({ lat: parseFloat(qLat), lng: parseFloat(qLng) });
    }
  }, [searchParams]);

  // Re-resolve the radius center from the current hierarchy and keep URL state
  // in sync. This also replaces stale coordinates from old saved/search URLs.
  useEffect(() => {
    const version = ++locationResolveVersionRef.current;
    const city = selectedCities[0] || '';
    if (city || selectedDistrict || selectedState || selectedPincode) {
      resolveLocationCoordinates({
        city,
        district: selectedDistrict,
        state: selectedState,
        pincode: selectedPincode
      }).then(res => {
        if (res && version === locationResolveVersionRef.current) {
          setSearchCoords({ lat: res.lat, lng: res.lng });
          setSearchParams(current => {
            const next = new URLSearchParams(current);
            const lat = res.lat.toFixed(4);
            const lng = res.lng.toFixed(4);
            if (next.get('lat') === lat && next.get('lng') === lng) return current;
            next.set('lat', lat);
            next.set('lng', lng);
            return next;
          }, { replace: true });
        }
      }).catch(() => {});
    } else {
      setSearchCoords({});
    }
    return () => {
      locationResolveVersionRef.current += 1;
    };
  }, [selectedState, selectedDistrict, selectedCities, selectedPincode, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError('');
      const searchCriteria = {
        keyword,
        category: categoryFilter,
        city: selectedCities.length === 1 ? selectedCities[0] : '',
        district: selectedDistrict,
        state: selectedState,
        pincode: selectedPincode,
        latitude: searchCoords.lat,
        longitude: searchCoords.lng,
        radiusKm: selectedRadiusKm,
        minExperience: minimumExperience,
        skill: mustHaveSkill,
        vehicleType: vehicleTypeFilter,
        activeInDays: activeInDaysToNumber(activeInDays),
        limit: 250
      };

      try {
        const results = await SupabaseSync.searchDriverCandidates(searchCriteria);
        if (!cancelled) setDrivers(results);
      } catch (e) {
        if (!cancelled) {
          // No plan, company not verified, signed out: say why instead of showing nothing.
          setDrivers([]);
          setSearchError(e instanceof Error && e.message ? e.message : 'The driver database could not be searched. Please try again.');
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [employerId, keyword, categoryFilter, selectedCities, selectedDistrict, selectedState, selectedPincode, selectedRadiusKm, searchCoords, minimumExperience, mustHaveSkill, vehicleTypeFilter, activeInDays]);

  const showToast = (text: string, type: 'success' | 'warning' = 'success') => {
    window.clearTimeout(toastTimer.current);
    setToast({ text, type });
    toastTimer.current = window.setTimeout(() => setToast(null), type === 'warning' ? 6000 : 4000);
  };
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const unlockedDriverIds = useMemo(() => new Set(unlocks.map(u => u.driverId)), [unlocks]);
  const downloadedDriverIds = useMemo(
    () => new Set(unlocks.filter(u => u.downloadedExcel).map(u => u.driverId)),
    [unlocks]
  );
  // Newest unlock first.
  const unlockedIdsOrdered = useMemo(
    () => [...unlocks]
      .sort((a, b) => (Date.parse(b.unlockedAt) || 0) - (Date.parse(a.unlockedAt) || 0))
      .map(u => u.driverId)
      .filter((id, index, all) => all.indexOf(id) === index),
    [unlocks]
  );
  const unlockedKey = unlockedIdsOrdered.join(',');

  // Unlocked tab: fetch each unlocked driver by id so the list never depends on the search filters.
  useEffect(() => {
    if (activeTab !== 'unlocked' || !employerId) return;
    const missing = unlockedIdsOrdered.filter(id => !(id in unlockedProfiles));
    if (missing.length === 0) return;
    const run = ++unlockedRunRef.current;
    let aborted = false;
    setUnlockedLoading(true);
    setUnlockedError('');
    void mapWithConcurrency(
      missing,
      5,
      async (id): Promise<DriverProfile | null | undefined> => {
        if (aborted || run !== unlockedRunRef.current) return undefined;
        try {
          return await fetchCandidateById(id);
        } catch (e) {
          // The same refusal (plan expired, signed out) applies to every driver: stop here.
          aborted = true;
          if (run === unlockedRunRef.current) {
            setUnlockedError(e instanceof Error && e.message ? e.message : 'Unlocked drivers could not be loaded.');
          }
          return undefined;
        }
      },
      (id, profile) => {
        if (profile === undefined || run !== unlockedRunRef.current) return;
        setUnlockedProfiles(prev => ({ ...prev, [id]: profile }));
      }
    ).finally(() => {
      if (run === unlockedRunRef.current) setUnlockedLoading(false);
    });
    return () => {
      unlockedRunRef.current += 1;
      setUnlockedLoading(false);
    };
    // unlockedProfiles is read only to skip drivers already fetched
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, employerId, unlockedKey]);

  const unlockedList = useMemo(
    () => unlockedIdsOrdered.map(id => unlockedProfiles[id]).filter((d): d is DriverProfile => Boolean(d)),
    [unlockedIdsOrdered, unlockedProfiles]
  );
  const unavailableUnlockedCount = unlockedIdsOrdered.filter(id => unlockedProfiles[id] === null).length;

  // Real-time State Counts
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of drivers) {
      const st = d.state || 'Other';
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
    // The unlocked tab lists every unlocked driver, whatever the search filters are.
    if (activeTab === 'unlocked') {
      return unlockedList;
    }

    let list = [...drivers];

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

    const hasSearchCoords = typeof searchCoords.lat === 'number' && typeof searchCoords.lng === 'number' && !isNaN(searchCoords.lat) && !isNaN(searchCoords.lng);
    const hasLocationFilter = Boolean(selectedState || selectedDistrict || selectedPincode || selectedCities.length > 0);

    if (hasSearchCoords) {
      list = list.map(d => {
        if (typeof d.latitude === 'number' && typeof d.longitude === 'number' && !isNaN(d.latitude) && !isNaN(d.longitude)) {
          const dist = calculateHaversineDistanceKm(searchCoords.lat!, searchCoords.lng!, d.latitude, d.longitude);
          return { ...d, distanceKm: dist };
        }
        return d;
      });

      if (selectedRadiusKm > 0) {
        list = list.filter(d => typeof d.distanceKm === 'number' && d.distanceKm <= selectedRadiusKm);
      } else if (hasLocationFilter) {
        if (selectedCities.length > 1) {
          list = list.filter(d =>
            selectedCities.some(
              c => {
                const cleanC = sanitizeLocalityName(c).toLowerCase();
                return (
                  d.city?.toLowerCase().includes(cleanC) ||
                  d.location?.toLowerCase().includes(cleanC) ||
                  d.preferredLocation?.toLowerCase().includes(cleanC)
                );
              }
            )
          );
        } else {
          list = list.filter(d =>
            matchesPanIndiaLocationFilter(
              {
                state: d.state,
                district: d.district,
                city: d.city,
                pincode: d.pincode,
                location: `${d.location || ''} ${d.preferredLocation || ''}`
              },
              {
                state: selectedState,
                district: selectedDistrict,
                city: selectedCities.length === 1 ? sanitizeLocalityName(selectedCities[0]) : '',
                pincode: selectedPincode
              }
            )
          );
        }
      }

      list.sort((a, b) => {
        if (typeof a.distanceKm === 'number' && typeof b.distanceKm === 'number') {
          return a.distanceKm - b.distanceKm;
        }
        if (typeof a.distanceKm === 'number') return -1;
        if (typeof b.distanceKm === 'number') return 1;
        return 0;
      });
    } else if (hasLocationFilter) {
      if (selectedCities.length > 1) {
        list = list.filter(d =>
          selectedCities.some(
            c => {
              const cleanC = sanitizeLocalityName(c).toLowerCase();
              return (
                d.city?.toLowerCase().includes(cleanC) ||
                d.location?.toLowerCase().includes(cleanC) ||
                d.preferredLocation?.toLowerCase().includes(cleanC)
              );
            }
          )
        );
      } else {
        list = list.filter(d =>
          matchesPanIndiaLocationFilter(
            {
              state: d.state,
              district: d.district,
              city: d.city,
              pincode: d.pincode,
              location: `${d.location || ''} ${d.preferredLocation || ''}`
            },
            {
              state: selectedState,
              district: selectedDistrict,
              city: selectedCities.length === 1 ? sanitizeLocalityName(selectedCities[0]) : '',
              pincode: selectedPincode
            }
          )
        );
      }
    }

    if (hideUnlocked) {
      list = list.filter(d => !unlockedDriverIds.has(d.id));
    }

    if (hideDownloaded) {
      list = list.filter(d => !downloadedDriverIds.has(d.id));
    }

    if (onlyCvAttached) {
      list = list.filter(d => d.cvAttached === true);
    }

    if (onlyPoliceVerified) {
      list = list.filter(d => d.policeVerified === true);
    }

    if (mustHaveSkill.trim()) {
      const sk = mustHaveSkill.toLowerCase();
      list = list.filter(d => d.skills.some(s => s.toLowerCase().includes(sk)));
    }

    if (minimumExperience > 0) {
      list = list.filter(driver => driver.experienceYears >= minimumExperience);
    }

    if (vehicleTypeFilter) {
      const vehicle = vehicleTypeFilter.toLowerCase();
      list = list.filter(driver => (driver.vehicleTypes || []).some(type => type.toLowerCase().includes(vehicle)) || driver.licenseType.toLowerCase().includes(vehicle));
    }

    return list;
  }, [
    drivers,
    activeTab,
    keyword,
    categoryFilter,
    selectedState,
    selectedDistrict,
    selectedCities,
    selectedPincode,
    selectedRadiusKm,
    searchCoords,
    hideUnlocked,
    hideDownloaded,
    onlyCvAttached,
    onlyPoliceVerified,
    mustHaveSkill,
    minimumExperience,
    vehicleTypeFilter,
    unlockedDriverIds,
    downloadedDriverIds,
    unlockedList
  ]);

  const appliedFilterCount =
    (activeInDays !== 'any' ? 1 : 0) +
    (categoryFilter ? 1 : 0) +
    (selectedState ? 1 : 0) +
    (selectedDistrict ? 1 : 0) +
    (selectedPincode ? 1 : 0) +
    (selectedRadiusKm > 0 ? 1 : 0) +
    (hideUnlocked ? 1 : 0) +
    (hideDownloaded ? 1 : 0) +
    (onlyCvAttached ? 1 : 0) +
    (onlyPoliceVerified ? 1 : 0) +
    (mustHaveSkill ? 1 : 0) +
    (minimumExperience ? 1 : 0) +
    (vehicleTypeFilter ? 1 : 0) +
    selectedCities.length;

  const totalPages = Math.max(1, Math.ceil(filteredDrivers.length / perPage));

  // Reset to page 1 whenever search filters or perPage change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    keyword,
    categoryFilter,
    selectedState,
    selectedDistrict,
    selectedCities,
    selectedPincode,
    hideUnlocked,
    hideDownloaded,
    onlyCvAttached,
    onlyPoliceVerified,
    mustHaveSkill,
    minimumExperience,
    vehicleTypeFilter,
    activeInDays,
    activeTab,
    perPage
  ]);

  // Ensure current page does not exceed total pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedDrivers = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredDrivers.slice(start, start + perPage);
  }, [filteredDrivers, currentPage, perPage]);

  const hasVisiblePhone = (driver: DriverProfile) => Boolean(driver.phone) && !driver.phone.includes('•');

  const applyRefreshedCandidate = (fresh: DriverProfile) => {
    setDrivers(prev => prev.map(d => (d.id === fresh.id ? { ...d, ...fresh, distanceKm: d.distanceKm ?? fresh.distanceKm } : d)));
    setUnlockedProfiles(prev => ({ ...prev, [fresh.id]: fresh }));
    setSelectedDriverModal(prev => (prev && prev.id === fresh.id ? fresh : prev));
  };

  /** Already unlocked, but this row was loaded masked: fetch the contact again (no credit). */
  const refreshCandidate = async (driver: DriverProfile) => {
    if (unlockingRef.current.has(driver.id)) return;
    unlockingRef.current.add(driver.id);
    setUnlockingIds(new Set(unlockingRef.current));
    try {
      const fresh = await fetchCandidateById(driver.id);
      if (fresh && hasVisiblePhone(fresh)) applyRefreshedCandidate(fresh);
      else showToast('The phone number could not be loaded. Please try again.', 'warning');
    } catch (e) {
      showToast(e instanceof Error && e.message ? e.message : 'The phone number could not be loaded.', 'warning');
    } finally {
      unlockingRef.current.delete(driver.id);
      setUnlockingIds(new Set(unlockingRef.current));
    }
  };

  const handleUnlockPhone = async (driver: DriverProfile) => {
    if (!employerId) {
      showToast('Please sign in as an employer to unlock candidate contacts.', 'warning');
      return;
    }
    if (unlockingRef.current.has(driver.id)) return;
    const currentSub = DataStore.getSubscription(employerId);
    if (currentSub.dbUnlockCredits <= 0) {
      setShowNoCreditsModal({ driver });
      return;
    }
    unlockingRef.current.add(driver.id);
    setUnlockingIds(new Set(unlockingRef.current));
    try {
      clearLastError();
      const res = await DataStore.unlockCandidate(employerId, driver.id);
      if (!res.success) {
        showToast(DataStore.getLastError(res.message), 'warning');
        return;
      }
      loadAll();
      // Search rows are masked; fetch the now-unlocked contact details.
      let refreshed: DriverProfile | null = null;
      try {
        refreshed = await fetchCandidateById(driver.id);
      } catch (error) {
        console.warn('Could not refresh unlocked candidate details:', error);
      }
      if (refreshed) applyRefreshedCandidate(refreshed);
      const phone = refreshed && hasVisiblePhone(refreshed) ? refreshed.phone : '';
      showToast(phone
        ? `${driver.fullName}: ${phone}. ${res.message}`
        : `${driver.fullName} unlocked. ${res.message}`);
    } finally {
      unlockingRef.current.delete(driver.id);
      setUnlockingIds(new Set(unlockingRef.current));
    }
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

  const handleDownloadExcel = async () => {
    if (exporting) return;
    const selectedDrivers =
      selectedDriverIds.length > 0
        ? filteredDrivers.filter(d => selectedDriverIds.includes(d.id))
        : filteredDrivers;
    const targetIds = selectedDrivers.filter(d => unlockedDriverIds.has(d.id)).map(d => d.id);

    if (targetIds.length === 0) {
      showToast('Unlock candidates before exporting their contact or license details.', 'warning');
      return;
    }

    setExporting(true);
    let targetDrivers: DriverProfile[] = [];
    try {
      // Rows loaded before an in-session unlock still carry masked contacts: fetch fresh ones.
      const fresh = await mapWithConcurrency(targetIds, 5, async id => {
        try {
          return await fetchCandidateById(id);
        } catch {
          return null;
        }
      });
      targetDrivers = fresh.filter((d): d is DriverProfile => Boolean(d));
    } finally {
      setExporting(false);
    }
    if (targetDrivers.length === 0) {
      showToast('Contact details could not be loaded for export. Check your plan and try again.', 'warning');
      return;
    }

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

    const rows = targetDrivers.map(d => [
      d.fullName,
      d.driverCategory,
      `${d.experienceYears} yrs ${d.experienceMonths || 0} mos`,
      d.licenseNumber,
      d.licenseType,
      d.phone,
      d.email,
      d.location || [d.city, d.state].filter(Boolean).join(', '),
      typeof d.expectedSalary === 'number' && d.expectedSalary > 0 ? `Rs. ${d.expectedSalary}/month` : '',
      d.availability,
      (d.skills || []).join(' | ')
    ]);

    downloadCsv(`DriverHub_Candidates_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);

    await DataStore.markDriversDownloadedExcel(employerId, targetDrivers.map(d => d.id));
    loadAll();
    const skipped = targetIds.length - targetDrivers.length;
    showToast(`Downloaded ${targetDrivers.length} driver profile(s) to Excel (.csv).${skipped > 0 ? ` ${skipped} could not be loaded.` : ''}`);
  };

  const handleSaveCurrentSearch = async () => {
    const place = selectedCities.length > 0
      ? selectedCities.map(c => sanitizeLocalityName(c)).join(', ')
      : [selectedDistrict, selectedState].filter(Boolean).join(', ');
    const title = `${categoryFilter || keyword || 'All Commercial & Fleet Drivers'} — ${place || 'All India'}${selectedRadiusKm > 0 ? ` (${selectedRadiusKm} km)` : ''}`;
    const newSaved: SavedSearch = {
      id: newId(),
      employerId,
      title,
      category: categoryFilter,
      city: selectedCities[0] || '',
      district: selectedDistrict || undefined,
      state: selectedState,
      pincode: selectedPincode || undefined,
      radiusKm: selectedRadiusKm > 0 ? selectedRadiusKm : undefined,
      keyword,
      vehicleType: vehicleTypeFilter,
      activeInDays: activeInDaysToNumber(activeInDays),
      minExp: minimumExperience,
      mustHaveSkills: mustHaveSkill.trim() ? [mustHaveSkill.trim()] : [],
      createdAt: new Date().toISOString().slice(0, 10),
      matchCount: filteredDrivers.length
    };
    clearLastError();
    const saved = await DataStore.saveSearch(newSaved);
    if (!saved) {
      showToast(DataStore.getLastError('Could not save this search. Confirm you are signed in with an active hiring plan.'), 'warning');
      return;
    }
    loadAll();
    showToast(`Saved search "${title}" to your Database Saved Searches.`);
  };

  /** Restore every filter of a saved search and run it. */
  const runSavedSearch = (s: SavedSearch) => {
    setCategoryFilter(s.category || '');
    setSelectedCities(s.city ? [s.city] : []);
    setSelectedState(s.state || '');
    setSelectedDistrict(s.district || '');
    setSelectedPincode(s.pincode || '');
    setSelectedRadiusKm(s.radiusKm && s.radiusKm > 0 ? s.radiusKm : 0);
    setKeyword(s.keyword || '');
    setVehicleTypeFilter(s.vehicleType || '');
    setMinimumExperience(s.minExp || 0);
    setActiveInDays(activeInDaysFromNumber(s.activeInDays));
    setMustHaveSkill(s.mustHaveSkills?.[0] || '');
    setHideUnlocked(false);
    setHideDownloaded(false);
    setOnlyCvAttached(false);
    setOnlyPoliceVerified(false);
    setSearchCoords({});
    setCurrentPage(1);
    const params = new URLSearchParams({ tab: 'search' });
    if (s.category) params.set('category', s.category);
    if (s.city) params.set('city', s.city);
    if (s.district) params.set('district', s.district);
    if (s.state) params.set('state', s.state);
    if (s.pincode) params.set('pincode', s.pincode);
    if (s.radiusKm && s.radiusKm > 0) params.set('radius', String(s.radiusKm));
    if (s.keyword) params.set('q', s.keyword);
    setSearchParams(params);
  };

  const handleMessageDriver = async (driver: DriverProfile) => {
    if (!unlockedDriverIds.has(driver.id)) {
      showToast('Unlock this driver profile before starting a hiring conversation.', 'warning');
      return;
    }
    const companyName = DataStore.getEmployerById(employerId)?.companyName || subscription.billingCompanyName || 'Employer';
    clearLastError();
    const sent = await DataStore.sendMessage({
      id: newId(),
      senderId: employerId,
      senderName: companyName,
      senderRole: 'employer',
      receiverId: driver.id,
      receiverName: driver.fullName,
      text: `Hi ${driver.fullName}, we found your ${driver.driverCategory || 'driver'} profile on DriverHub and would like to invite you for a driving trial.`,
      timestamp: new Date().toISOString(),
      read: false
    });
    if (!sent) {
      showToast(DataStore.getLastError('Message could not be sent. Check your connection and hiring access, then try again.'), 'warning');
      return;
    }
    navigate(`/employer/messages?driverId=${encodeURIComponent(driver.id)}`);
  };

  const resetAllFilters = () => {
    setKeyword('');
    setCategoryFilter('');
    setSelectedState('');
    setSelectedDistrict('');
    setSelectedCities([]);
    setSelectedPincode('');
    setSelectedRadiusKm(0);
    setSearchCoords({});
    setCitySearch('');
    setMinimumExperience(0);
    setVehicleTypeFilter('');
    setHideUnlocked(false);
    setHideDownloaded(false);
    setOnlyCvAttached(false);
    setOnlyPoliceVerified(false);
    setMustHaveSkill('');
    setActiveInDays('any');
    setCurrentPage(1);
  };

  const searchErrorAction = searchError
    ? isCompanyVerificationError(searchError)
      ? { to: '/employer/company', label: 'Open company profile →' }
      : isPlanOrCreditError(searchError)
      ? { to: '/employer/billing', label: 'View plans & billing →' }
      : /sign in/i.test(searchError)
      ? { to: '/login', label: 'Sign in →' }
      : null
    : null;

  const showResultsOnMobile = () => {
    setShowMobileFilters(false);
    window.setTimeout(() => resultsTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
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
          role={toast.type === 'warning' ? 'alert' : 'status'}
          className={`fixed top-4 sm:top-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[60] flex items-start gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold animate-in fade-in slide-in-from-top-3 ${
            toast.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : 'bg-[#08233F] text-white border-slate-700'
          }`}
        >
          {toast.type === 'warning'
            ? <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-px" />
            : <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-px" />}
          <span className="min-w-0 break-words">{toast.text}</span>
        </div>
      )}

      {/* Top ApnaHire Database Navigation Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/employer/dashboard')}
            className="min-w-10 min-h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer shrink-0"
            title="Back to Dashboard"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {activeTab === 'unlocked' ? (
                <span className="text-sm sm:text-base font-extrabold text-[#08233F]">
                  {unlockedIdsOrdered.length} unlocked candidate{unlockedIdsOrdered.length === 1 ? '' : 's'}
                </span>
              ) : (
              <span className="text-sm sm:text-base font-extrabold text-[#08233F] break-words">
                {filteredDrivers.length} profiles found for{' '}
                <span className="underline decoration-amber-400 decoration-2 underline-offset-4">
                  {categoryFilter || 'Commercial & Personal Drivers'}
                  {selectedRadiusKm > 0 && (selectedCities[0] || selectedDistrict || selectedState)
                    ? ` within ${selectedRadiusKm} km of ${[sanitizeLocalityName(selectedCities[0] || ''), selectedDistrict, selectedState].filter(Boolean).join(', ')} (Nearest first)`
                    : selectedCities.length > 0
                    ? ` in ${selectedCities.map(c => sanitizeLocalityName(c)).join(', ')}`
                    : selectedDistrict
                    ? ` in ${selectedDistrict}, ${selectedState}`
                    : selectedState
                    ? ` in ${selectedState}`
                    : ' across India'}
                </span>
              </span>
              )}
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
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 animate-in fade-in">
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
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">State</label>
            <select value={selectedState} onChange={e => setSelectedState(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <option value="">All India</option>
              {ALL_INDIAN_STATES.map(state => <option key={state.state} value={state.state}>{state.state}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Min. Experience</label>
            <input type="number" min="0" max="40" value={minimumExperience} onChange={e => setMinimumExperience(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Vehicle Type</label>
            <input type="text" value={vehicleTypeFilter} onChange={e => setVehicleTypeFilter(e.target.value)} placeholder="e.g. Bus" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#08233F]">Saved Candidate Searches</h2>
              <p className="text-xs text-slate-500">One-click access to your recurring fleet hiring queries</p>
            </div>
          </div>

          {savedSearches.length === 0 && (
            <p className="text-xs text-slate-500 py-8 text-center">
              No saved searches yet. Set your filters on the Search tab and tap “Save search”.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedSearches.map(s => {
              const place = [s.city ? sanitizeLocalityName(s.city) : '', s.district, s.state].filter((v, i, a) => v && a.indexOf(v) === i).join(', ');
              return (
              <div
                key={s.id}
                className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-slate-50/60 flex flex-col justify-between gap-4 transition-all min-w-0"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-[#08233F] break-words min-w-0">{s.title}</h3>
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-bold shrink-0">
                      {s.matchCount ?? 0} Drivers
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[11px] font-semibold">
                      ★ {s.category || 'All categories'}
                    </span>
                    <span className="px-2 py-0.5 bg-white text-slate-700 border border-slate-200 rounded-md text-[11px]">
                      📍 {place || 'All India'}{s.pincode ? ` · PIN ${s.pincode}` : ''}{s.radiusKm ? ` · ${s.radiusKm} km` : ''}
                    </span>
                    {s.keyword && (
                      <span className="px-2 py-0.5 bg-white text-slate-700 border border-slate-200 rounded-md text-[11px] break-all">
                        🔎 {s.keyword}
                      </span>
                    )}
                    {s.minExp > 0 && (
                      <span className="px-2 py-0.5 bg-white text-slate-700 border border-slate-200 rounded-md text-[11px]">
                        💼 {s.minExp}+ Yrs Exp
                      </span>
                    )}
                    {s.activeInDays ? (
                      <span className="px-2 py-0.5 bg-white text-slate-700 border border-slate-200 rounded-md text-[11px]">
                        Active in {activeInDaysFromNumber(s.activeInDays)}
                      </span>
                    ) : null}
                    {(s.mustHaveSkills || []).map(sk => (
                      <span key={sk} className="px-2 py-0.5 bg-white text-slate-600 border border-slate-200 rounded-md text-[11px]">
                        ✓ {sk}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                  <span className="text-[11px] text-slate-400">Saved on {s.createdAt}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        void DataStore.deleteSavedSearch(s.id).then(deleted => {
                          if (deleted) loadAll();
                          else showToast('Could not delete the saved search. Try again.', 'warning');
                        });
                      }}
                      className="min-h-10 min-w-10 inline-flex items-center justify-center text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                      title="Delete Saved Search"
                      aria-label="Delete saved search"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => runSavedSearch(s)}
                      className="min-h-10 px-3.5 py-1.5 bg-[#08233F] hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Run Search →
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* MAIN 2-COLUMN APNAHIRE DATABASE LAYOUT (Left Filters + Right Candidate Cards) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Phone / tablet: the long filter panel opens on demand */}
          {activeTab === 'search' && (
            <button
              type="button"
              onClick={() => setShowMobileFilters(open => !open)}
              aria-expanded={showMobileFilters}
              className="lg:hidden w-full min-h-10 inline-flex items-center justify-between gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-subtle text-sm font-bold text-[#08233F] cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-700" /> Filters ({appliedFilterCount})
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
            </button>
          )}

          {/* LEFT FILTER PANEL (Col 1-4) — Matches Screenshot 1 */}
          {activeTab === 'search' && (
          <aside className={`${showMobileFilters ? 'block' : 'hidden'} lg:block lg:col-span-4 xl:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden`}>
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
                      <PillClose onClick={() => setCategoryFilter('')} label="filter" className="hover:text-blue-950" />
                    </span>
                  )}
                  {selectedState && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      State: {selectedState}
                      <PillClose onClick={() => { setSelectedState(''); setSelectedDistrict(''); setSelectedCities([]); setSelectedPincode(''); }} label="filter" className="hover:text-emerald-950" />
                    </span>
                  )}
                  {selectedDistrict && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      District: {selectedDistrict}
                      <PillClose onClick={() => { setSelectedDistrict(''); setSelectedCities([]); setSelectedPincode(''); }} label="filter" className="hover:text-emerald-950" />
                    </span>
                  )}
                  {selectedCities.map(city => (
                    <span
                      key={city}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200"
                    >
                      {sanitizeLocalityName(city)}
                      <PillClose onClick={() => setSelectedCities(selectedCities.filter(c => c !== city))} label={sanitizeLocalityName(city)} className="hover:text-blue-950" />
                    </span>
                  ))}
                  {selectedPincode && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                      PIN: {selectedPincode}
                      <PillClose onClick={() => setSelectedPincode('')} label="filter" className="hover:text-blue-950" />
                    </span>
                  )}
                  {selectedRadiusKm > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                      Within {selectedRadiusKm} km
                      <PillClose onClick={() => setSelectedRadiusKm(0)} label="filter" className="hover:text-purple-950" />
                    </span>
                  )}
                  {activeInDays !== 'any' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                      Active in {activeInDays}
                      <PillClose onClick={() => setActiveInDays('any')} label="activity filter" className="hover:text-purple-950" />
                    </span>
                  )}
                  {mustHaveSkill && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
                      Skill: {mustHaveSkill}
                      <PillClose onClick={() => setMustHaveSkill('')} label="filter" className="hover:text-slate-950" />
                    </span>
                  )}
                  {minimumExperience > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
                      Min {minimumExperience}+ yrs
                      <PillClose onClick={() => setMinimumExperience(0)} label="filter" className="hover:text-slate-950" />
                    </span>
                  )}
                  {vehicleTypeFilter && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
                      Vehicle: {vehicleTypeFilter}
                      <PillClose onClick={() => setVehicleTypeFilter('')} label="filter" className="hover:text-slate-950" />
                    </span>
                  )}
                  {hideUnlocked && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                      Hide: Already unlocked
                      <PillClose onClick={() => setHideUnlocked(false)} label="filter" className="hover:text-blue-950" />
                    </span>
                  )}
                  {hideDownloaded && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                      Hide: Already downloaded in excel
                      <PillClose onClick={() => setHideDownloaded(false)} label="filter" className="hover:text-blue-950" />
                    </span>
                  )}
                  {onlyCvAttached && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      CV Attached
                      <PillClose onClick={() => setOnlyCvAttached(false)} label="filter" className="hover:text-amber-950" />
                    </span>
                  )}
                  {onlyPoliceVerified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Police Verified
                      <PillClose onClick={() => setOnlyPoliceVerified(false)} label="filter" className="hover:text-emerald-950" />
                    </span>
                  )}
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

            {/* Section 4: Must-Have Keywords / Skills with Auto-Suggestions */}
            <div ref={skillContainerRef} className="relative p-4 border-b border-slate-200 space-y-3">
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
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={mustHaveSkill}
                  onFocus={() => setShowSkillSuggestions(true)}
                  onChange={e => {
                    setMustHaveSkill(e.target.value);
                    setShowSkillSuggestions(true);
                  }}
                  placeholder="Search skill (e.g. Night Driving, FASTag)..."
                  className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-none"
                />
                {mustHaveSkill && (
                  <button
                    type="button"
                    onClick={() => setMustHaveSkill('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Skill Auto-Suggestions Popup */}
              {showSkillSuggestions && skillSuggestions.length > 0 && (
                <div className="absolute z-50 left-4 right-4 top-20 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 max-h-52 overflow-y-auto animate-in fade-in">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span>Suggested Skills</span>
                    <button
                      type="button"
                      onClick={() => setShowSkillSuggestions(false)}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  {skillSuggestions.map((skill, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setMustHaveSkill(skill);
                        setShowSkillSuggestions(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-emerald-50 hover:text-emerald-950 flex items-center justify-between group transition-colors cursor-pointer border-b border-slate-50 last:border-0"
                    >
                      <span className="font-semibold text-slate-800 group-hover:text-emerald-900">{skill}</span>
                      <span className="text-[10px] text-slate-400 group-hover:text-emerald-800">Select ↵</span>
                    </button>
                  ))}
                </div>
              )}

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

            {/* Section 5: Pan-India Location Hierarchy (State/UT -> District -> Town/City -> PIN Code).
                Desktop only: on phones the search bar's selector is the single location control. */}
            {isDesktop && (
            <div className="p-4 border-b border-slate-200 space-y-3">
              <PanIndiaLocationSelector
                value={{
                  state: selectedState,
                  district: selectedDistrict,
                  city: selectedCities[0] || '',
                  pincode: selectedPincode,
                  latitude: searchCoords.lat,
                  longitude: searchCoords.lng
                }}
                showRadius={true}
                radiusKm={selectedRadiusKm}
                onRadiusChange={(r) => {
                  setSelectedRadiusKm(r);
                  const params = new URLSearchParams(searchParams);
                  if (r > 0) params.set('radius', String(r));
                  else params.delete('radius');
                  setSearchParams(params, { replace: true });
                }}
                showCurrentLocation={true}
                onCurrentLocationSuccess={(coords) => {
                  setSearchCoords(coords);
                  const params = new URLSearchParams(searchParams);
                  params.set('lat', coords.lat.toFixed(4));
                  params.set('lng', coords.lng.toFixed(4));
                  setSearchParams(params, { replace: true });
                }}
                onChange={(next) => {
                  setSelectedState(next.state);
                  setSelectedDistrict(next.district);
                  setSelectedCities(next.city ? [next.city] : []);
                  setSelectedPincode(next.pincode);
                  if (next.latitude !== undefined && next.longitude !== undefined) {
                    setSearchCoords({ lat: next.latitude, lng: next.longitude });
                  } else {
                    setSearchCoords({});
                  }
                  if (next.radiusKm !== undefined) {
                    setSelectedRadiusKm(next.radiusKm);
                  }
                  const params = new URLSearchParams(searchParams);
                  if (next.state) params.set('state', next.state);
                  else params.delete('state');
                  if (next.district) params.set('district', next.district);
                  else params.delete('district');
                  if (next.city) params.set('city', next.city);
                  else params.delete('city');
                  if (next.pincode) params.set('pincode', next.pincode);
                  else params.delete('pincode');
                  if (next.radiusKm && next.radiusKm > 0) params.set('radius', String(next.radiusKm));
                  else params.delete('radius');
                  if (next.latitude) params.set('lat', next.latitude.toFixed(4));
                  else params.delete('lat');
                  if (next.longitude) params.set('lng', next.longitude.toFixed(4));
                  else params.delete('lng');
                  setSearchParams(params, { replace: true });
                }}
                mode="filter"
                layout="vertical"
                idPrefix="emp-candidate-loc"
              />
            </div>
            )}

            {/* Section 6: Multi-City Quick Checkboxes */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Quick Multi-City Filter {selectedState ? `(${selectedState})` : ''}
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

            {/* Phone: close the panel and jump to the results */}
            <div className="lg:hidden p-4 border-t border-slate-200 bg-slate-50/70 flex gap-2">
              <button
                type="button"
                onClick={resetAllFilters}
                className="min-h-10 px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={showResultsOnMobile}
                className="flex-1 min-h-10 px-4 py-2 bg-[#19745B] hover:bg-[#135A46] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Show {filteredDrivers.length} result{filteredDrivers.length === 1 ? '' : 's'}
              </button>
            </div>
          </aside>
          )}

          {/* RIGHT CANDIDATE RESULTS LIST (Col 5-12) — Exact ApnaHire Candidate Card UI */}
          <div ref={resultsTopRef} className={`${activeTab === 'unlocked' ? 'lg:col-span-12' : 'lg:col-span-8 xl:col-span-9'} space-y-4 min-w-0 scroll-mt-20`}>
            {activeTab === 'unlocked' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-4 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-[#08233F] text-sm">Every driver you have unlocked</p>
                <p>This list ignores the search filters. Contacts and licence details are shown in full.</p>
                {unlockedLoading && (
                  <p className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading unlocked drivers ({unlockedList.length}/{unlockedIdsOrdered.length})…
                  </p>
                )}
                {unavailableUnlockedCount > 0 && (
                  <p className="text-amber-700">{unavailableUnlockedCount} unlocked driver profile(s) are no longer active on DriverHub.</p>
                )}
                {unlockedError && (
                  <p role="alert" className="text-rose-700 font-semibold break-words">
                    {unlockedError}{' '}
                    {isPlanOrCreditError(unlockedError) && <Link to="/employer/billing" className="underline">View plans →</Link>}
                  </p>
                )}
              </div>
            )}
            {/* Top Interactive Candidate Search Bar with Auto-Suggestions & Pan-India Location / Radius Hierarchy */}
            {activeTab === 'search' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-4 space-y-3.5">
              {/* Keyword / Role Input */}
              <div ref={candidateSearchContainerRef} className="relative">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={keyword}
                    onFocus={() => setShowCandidateSearchSuggestions(true)}
                    onChange={e => {
                      setKeyword(e.target.value);
                      setShowCandidateSearchSuggestions(true);
                    }}
                    placeholder="Search candidate profiles by role, license, vehicle (e.g. 'HMV Heavy Truck', 'LMV Chauffeur', 'Bus Driver', 'Trailer')..."
                    className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white font-medium"
                  />
                  {keyword && (
                    <button
                      type="button"
                      onClick={() => setKeyword('')}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Suggestions Popup */}
                {showCandidateSearchSuggestions && candidateSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 max-h-64 overflow-y-auto animate-in fade-in">
                    <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <span>Suggested Roles & Vehicle Categories</span>
                      <button
                        type="button"
                        onClick={() => setShowCandidateSearchSuggestions(false)}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    {candidateSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setKeyword(item.title);
                          if (item.category) setCategoryFilter(item.category);
                          setShowCandidateSearchSuggestions(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs hover:bg-emerald-50 hover:text-emerald-950 flex items-center justify-between group transition-colors cursor-pointer border-b border-slate-50 last:border-0"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-900 group-hover:text-emerald-900 truncate block">
                            {item.title}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate block">{item.subtitle}</span>
                        </div>
                        <span className="text-[10px] bg-slate-100 group-hover:bg-emerald-200 text-slate-700 group-hover:text-emerald-900 px-2 py-0.5 rounded font-bold shrink-0">
                          Filter ↵
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* State/UT -> District -> Town/City -> Radius Pan-India Controls */}
              <div className="pt-2 border-t border-slate-100">
                <PanIndiaLocationSelector
                  value={{
                    state: selectedState,
                    district: selectedDistrict,
                    city: selectedCities[0] || '',
                    pincode: selectedPincode,
                    latitude: searchCoords.lat,
                    longitude: searchCoords.lng
                  }}
                  showRadius={true}
                  radiusKm={selectedRadiusKm}
                  onRadiusChange={(r) => {
                    setSelectedRadiusKm(r);
                    const params = new URLSearchParams(searchParams);
                    if (r > 0) params.set('radius', String(r));
                    else params.delete('radius');
                    setSearchParams(params, { replace: true });
                  }}
                  showCurrentLocation={true}
                  onCurrentLocationSuccess={(coords) => {
                    setSearchCoords(coords);
                    const params = new URLSearchParams(searchParams);
                    params.set('lat', coords.lat.toFixed(4));
                    params.set('lng', coords.lng.toFixed(4));
                    setSearchParams(params, { replace: true });
                  }}
                  onChange={(next) => {
                    setSelectedState(next.state);
                    setSelectedDistrict(next.district);
                    setSelectedCities(next.city ? [next.city] : []);
                    setSelectedPincode(next.pincode);
                    if (next.latitude !== undefined && next.longitude !== undefined) {
                      setSearchCoords({ lat: next.latitude, lng: next.longitude });
                    } else {
                      setSearchCoords({});
                    }
                    if (next.radiusKm !== undefined) {
                      setSelectedRadiusKm(next.radiusKm);
                    }
                    const params = new URLSearchParams(searchParams);
                    if (next.state) params.set('state', next.state);
                    else params.delete('state');
                    if (next.district) params.set('district', next.district);
                    else params.delete('district');
                    if (next.city) params.set('city', next.city);
                    else params.delete('city');
                    if (next.pincode) params.set('pincode', next.pincode);
                    else params.delete('pincode');
                    if (next.radiusKm && next.radiusKm > 0) params.set('radius', String(next.radiusKm));
                    else params.delete('radius');
                    if (next.latitude) params.set('lat', next.latitude.toFixed(4));
                    else params.delete('lat');
                    if (next.longitude) params.set('lng', next.longitude.toFixed(4));
                    else params.delete('lng');
                    setSearchParams(params, { replace: true });
                  }}
                  mode="filter"
                  layout="grid-4"
                  idPrefix="top-candidate-loc"
                />
              </div>
            </div>
            )}

            {/* Candidate Database Preview Notice when 0 unlock credits remain */}
            {subscription.dbUnlockCredits <= 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">Candidate Database Preview Mode</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      You are actively searching and filtering verified drivers across India. To reveal unmasked phone numbers and call drivers directly, recharge your database unlock credits.
                    </p>
                  </div>
                </div>
                <Link
                  to="/employer/billing"
                  className="px-4 py-2 bg-[#08233F] hover:bg-slate-800 text-amber-300 font-bold rounded-xl text-xs shrink-0 self-start sm:self-center transition-all shadow-xs cursor-pointer"
                >
                  Recharge Credits →
                </Link>
              </div>
            )}

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
                  onClick={() => { void handleDownloadExcel(); }}
                  disabled={exporting}
                  className="min-h-10 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 disabled:opacity-60 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  {exporting ? 'Preparing export…' : 'Download Excel'}
                </button>
              </div>

              <div className="flex items-center gap-3 flex-wrap text-xs text-slate-600">
                {activeTab === 'search' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Active in</span>
                  <select
                    value={activeInDays}
                    onChange={e => setActiveInDays(e.target.value)}
                    className="min-h-10 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  >
                    {!ACTIVE_IN_OPTIONS.includes(activeInDays) && <option value={activeInDays}>{activeInDays}</option>}
                    <option value="any">Any time</option>
                    <option value="7 days">7 days</option>
                    <option value="15 days">15 days</option>
                    <option value="30 days">30 days</option>
                    <option value="6 months">6 months</option>
                  </select>
                </div>
                )}

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Showing</span>
                  <select
                    value={perPage}
                    onChange={e => {
                      setPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="min-h-10 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-slate-400">per page</span>
                </div>

                {/* Interactive Top Pagination Controls */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                    aria-label="Previous page"
                    className={`min-h-10 min-w-10 inline-flex items-center justify-center rounded-lg border text-xs font-bold transition-all ${
                      currentPage <= 1
                        ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer shadow-xs active:scale-95'
                    }`}
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 select-none">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    aria-label="Next page"
                    className={`min-h-10 min-w-10 inline-flex items-center justify-center rounded-lg border text-xs font-bold transition-all ${
                      currentPage >= totalPages
                        ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer shadow-xs active:scale-95'
                    }`}
                    title="Next Page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Candidate Cards List */}
            {filteredDrivers.length === 0 ? (
              activeTab === 'unlocked' ? (
                <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-slate-200 shadow-subtle space-y-3">
                  {unlockedLoading ? <Loader2 className="w-8 h-8 mx-auto text-emerald-600 animate-spin" /> : <Unlock className="w-12 h-12 text-slate-300 mx-auto" />}
                  <h3 className="text-base font-bold text-[#08233F]">
                    {unlockedLoading ? 'Loading unlocked drivers…' : unlockedError ? 'Unlocked drivers could not be loaded' : 'No unlocked drivers yet'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto break-words">
                    {unlockedError || (unlockedLoading ? '' : 'Unlock a driver from the search results to see their phone number and contact details here.')}
                  </p>
                </div>
              ) : (
              <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-slate-200 shadow-subtle space-y-3">
                {searchLoading ? <div className="w-8 h-8 mx-auto border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /> : searchError ? <Lock className="w-12 h-12 text-amber-400 mx-auto" /> : <Users className="w-12 h-12 text-slate-300 mx-auto" />}
                <h3 className="text-base font-bold text-[#08233F]">{searchLoading ? 'Searching driver profiles…' : searchError ? 'Driver search is unavailable' : 'No matching driver profiles found'}</h3>
                <p role={searchError ? 'alert' : undefined} className="text-xs text-slate-500 max-w-md mx-auto break-words">
                  {searchError || 'Try clearing some filters or selecting additional cities to view more verified drivers.'}
                </p>
                {searchError && !searchLoading && searchErrorAction && (
                  <Link
                    to={searchErrorAction.to}
                    className="inline-flex items-center min-h-10 px-4 py-2 bg-[#19745B] hover:bg-[#135A46] text-white rounded-xl text-xs font-bold"
                  >
                    {searchErrorAction.label}
                  </Link>
                )}
                {!searchError && !searchLoading && <button
                  onClick={resetAllFilters}
                  className="px-4 py-2 bg-[#08233F] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Reset Filters
                </button>}
              </div>
              )
            ) : (
              <div className="space-y-4">
                {paginatedDrivers.map(driver => {
                  const isUnlocked = unlockedDriverIds.has(driver.id);
                  const isSelected = selectedDriverIds.includes(driver.id);
                  const matchingTags = [
                    driver.driverCategory,
                    driver.licenseType ? `${driver.licenseType.split(' ')[0]} License` : '',
                    ...(driver.skills || []).slice(0, 3)
                  ].filter(Boolean);
                  const lastActiveDate = driver.lastActive && !Number.isNaN(Date.parse(driver.lastActive))
                    ? new Date(driver.lastActive).toLocaleDateString('en-IN')
                    : 'Not recorded';

                  return (
                    <div
                      key={driver.id}
                      className={`bg-white rounded-2xl border transition-all shadow-subtle hover:shadow-card overflow-hidden ${
                        isSelected ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-slate-200'
                      }`}
                    >
                      <div className="p-4 sm:p-6">
                        <div className="flex items-start gap-2.5 sm:gap-3.5">
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectDriver(driver.id)}
                            aria-label={`Select ${driver.fullName}`}
                            className="mt-2 w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                          />

                          {/* Avatar Initials Circle (like AK in ApnaHire screenshot) */}
                          <div
                            onClick={() => setSelectedDriverModal(driver)}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800 text-white font-bold text-sm flex items-center justify-center shrink-0 cursor-pointer hover:bg-[#08233F]"
                          >
                            {getInitials(driver.fullName)}
                          </div>

                          {/* Main Candidate Content */}
                          <div className="flex-1 min-w-0 space-y-3.5">
                            {/* Header Name & Meta */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="min-w-0">
                                <button
                                  onClick={() => setSelectedDriverModal(driver)}
                                  className="text-base font-bold text-slate-900 hover:text-blue-700 inline-flex items-center gap-1.5 cursor-pointer text-left min-w-0"
                                >
                                  <span className="break-words min-w-0">{driver.fullName}</span>
                                  <ChevronRight className="w-4 h-4 text-slate-400" />
                                  {driver.policeVerified && <span title="Police verification verified"><ShieldCheck className="w-4 h-4 text-emerald-600" /></span>}
                                </button>

                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                                  <span className="inline-flex items-center gap-1 font-medium">
                                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                    {driver.experienceYears} yrs {driver.experienceMonths ?? 0} mos
                                  </span>
                                  <span className="inline-flex items-center gap-1 font-medium">
                                    💵 {typeof driver.expectedSalary === 'number' && driver.expectedSalary > 0 ? `₹${driver.expectedSalary.toLocaleString('en-IN')}/mo` : 'Not Disclosed'}
                                  </span>
                                  <span className="inline-flex items-center gap-1 font-medium">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    {[sanitizeLocalityName(driver.city || ''), driver.district, driver.state].filter((v, i, a) => v && a.indexOf(v) === i).join(', ') || driver.location || 'Location not provided'}
                                  </span>
                                  {typeof driver.distanceKm === 'number' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                      📍 {driver.distanceKm.toFixed(1)} km away
                                    </span>
                                  )}
                                  {selectedRadiusKm > 0 && typeof driver.distanceKm !== 'number' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] text-slate-500 bg-slate-100 border border-slate-200">
                                      Distance unverified
                                    </span>
                                  )}
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
                                  {driver.currentRole || (driver.experiences?.[0]
                                    ? `${driver.experiences[0].roleTitle} at ${driver.experiences[0].companyName}`
                                    : 'Not provided')}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3">
                                <span className="sm:col-span-3 text-slate-400 font-medium flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Previous
                                </span>
                                <span className="sm:col-span-9 text-slate-700">
                                  {driver.previousRole || (driver.experiences?.[1]
                                    ? `${driver.experiences[1].roleTitle} at ${driver.experiences[1].companyName}`
                                    : 'Not provided')}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3">
                                <span className="sm:col-span-3 text-slate-400 font-medium flex items-center gap-1.5">
                                  <Award className="w-3.5 h-3.5 text-slate-400 shrink-0" /> License & Edu
                                </span>
                                <span className="sm:col-span-9 text-slate-700">
                                  {driver.licenseType || 'License type not provided'}{driver.licenseNumber ? ` (${driver.licenseNumber})` : isUnlocked ? '' : ' · Unlock to view license number'} • {driver.education || 'Education not provided'}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3">
                                <span className="sm:col-span-3 text-slate-400 font-medium flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Pref. Location
                                </span>
                                <span className="sm:col-span-9 text-slate-700">
                                  {sanitizeLocalityName(driver.preferredLocation || '') || [sanitizeLocalityName(driver.city || ''), driver.state].filter(Boolean).join(', ') || 'Not provided'}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3">
                                <span className="sm:col-span-3 text-slate-400 font-medium flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Skills & Vehicles
                                </span>
                                <span className="sm:col-span-9 text-slate-700">
                                  {[...(driver.vehicleTypes || []), ...driver.skills].join(' | ') || 'Not provided'}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3">
                                <span className="sm:col-span-3 text-slate-400 font-medium flex items-center gap-1.5">
                                  <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Languages
                                </span>
                                <span className="sm:col-span-9 text-slate-700">
                                  {(driver.languages || []).join(' | ') || 'Not provided'}
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons: View Phone Number (Green CTA like Screenshot 1) */}
                            <div className="pt-2 flex flex-wrap items-center gap-3">
                              {isUnlocked ? (
                                <div className="flex flex-wrap items-center gap-2.5">
                                  {hasVisiblePhone(driver) ? (
                                    <a
                                      href={`tel:${driver.phone}`}
                                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs transition-all break-all"
                                    >
                                      <Phone className="w-3.5 h-3.5 shrink-0" /> {driver.phone} (Call Now)
                                    </a>
                                  ) : (
                                    <button
                                      onClick={() => { void refreshCandidate(driver); }}
                                      disabled={unlockingIds.has(driver.id)}
                                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                                    >
                                      {unlockingIds.has(driver.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />} Show phone number
                                    </button>
                                  )}
                                  <button
                                    onClick={() => { void handleMessageDriver(driver); }}
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
                                    disabled={unlockingIds.has(driver.id)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#19745B] hover:bg-[#135A46] disabled:opacity-60 disabled:cursor-wait text-white font-bold rounded-lg text-xs shadow-xs transition-all cursor-pointer"
                                  >
                                    {unlockingIds.has(driver.id)
                                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Unlocking…</>
                                      : <><Phone className="w-3.5 h-3.5" /> View Phone Number</>}
                                  </button>
                                  <button
                                    onClick={() => setSelectedDriverModal(driver)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
                                  >
                                    View Profile
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Bottom Footer Bar (22 unlocks | CV attached | Active on 24 Sep '26) */}
                      <div className="px-4 sm:px-6 py-2.5 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <span>{driver.policeVerified ? 'Police verified' : 'Police verification pending'}</span>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>{driver.licenseType ? 'License details provided' : 'License details missing'}</span>
                          <span>{driver.cvAttached ? 'CV attached' : 'CV not attached'}</span>
                          <span>Active on {lastActiveDate}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Pagination Footer */}
            {filteredDrivers.length > 0 && totalPages > 1 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500 font-medium">
                  Showing <span className="font-bold text-slate-800">{(currentPage - 1) * perPage + 1}</span> to{' '}
                  <span className="font-bold text-slate-800">{Math.min(currentPage * perPage, filteredDrivers.length)}</span> of{' '}
                  <span className="font-bold text-slate-800">{filteredDrivers.length}</span> candidates
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage(prev => Math.max(1, prev - 1));
                      window.scrollTo({ top: 200, behavior: 'smooth' });
                    }}
                    disabled={currentPage <= 1}
                    aria-label="Previous page"
                    className={`min-h-10 min-w-10 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      currentPage <= 1
                        ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 cursor-pointer shadow-xs'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Previous</span>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .map((page, index, visible) => {
                    const isActive = page === currentPage;
                    const gap = index > 0 && page - visible[index - 1] > 1;
                    return (
                      <React.Fragment key={page}>
                        {gap && <span className="px-1 text-slate-400 select-none">…</span>}
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentPage(page);
                            window.scrollTo({ top: 200, behavior: 'smooth' });
                          }}
                          aria-current={isActive ? 'page' : undefined}
                          className={`min-w-10 min-h-10 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#08233F] text-white shadow-xs font-extrabold'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage(prev => Math.min(totalPages, prev + 1));
                      window.scrollTo({ top: 200, behavior: 'smooth' });
                    }}
                    disabled={currentPage >= totalPages}
                    aria-label="Next page"
                    className={`min-h-10 min-w-10 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      currentPage >= totalPages
                        ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 cursor-pointer shadow-xs'
                    }`}
                  >
                    <span className="hidden sm:inline">Next</span> <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed Driver Dossier Modal */}
      {selectedDriverModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div role="dialog" aria-modal="true" className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#08233F] text-amber-400 flex items-center justify-center font-bold text-lg shrink-0">
                  {getInitials(selectedDriverModal.fullName)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5 break-words">
                    {selectedDriverModal.fullName}
                    {selectedDriverModal.policeVerified && (
                      <span title="Police verification verified"><ShieldCheck className="w-4 h-4 text-emerald-600" /></span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 break-words">
                    {[selectedDriverModal.driverCategory, `${selectedDriverModal.experienceYears} Yrs ${selectedDriverModal.experienceMonths || 0} Mos Experience`, selectedDriverModal.location].filter(Boolean).join(' • ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDriverModal(null)}
                aria-label="Close"
                className="min-h-10 min-w-10 inline-flex items-center justify-center text-slate-400 hover:text-slate-900 rounded-lg cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div className="min-w-0">
                <span className="text-slate-400 block">Phone Number</span>
                {unlockedDriverIds.has(selectedDriverModal.id) ? (
                  hasVisiblePhone(selectedDriverModal) ? (
                    <a href={`tel:${selectedDriverModal.phone}`} className="font-bold text-emerald-700 hover:underline break-all">
                      {selectedDriverModal.phone}
                    </a>
                  ) : (
                    <button
                      onClick={() => { void refreshCandidate(selectedDriverModal); }}
                      disabled={unlockingIds.has(selectedDriverModal.id)}
                      className="min-h-10 font-bold text-emerald-700 hover:underline cursor-pointer disabled:opacity-60"
                    >
                      {unlockingIds.has(selectedDriverModal.id) ? 'Loading…' : 'Show phone number'}
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => handleUnlockPhone(selectedDriverModal)}
                    disabled={unlockingIds.has(selectedDriverModal.id)}
                    className="min-h-10 font-bold text-emerald-700 hover:underline cursor-pointer disabled:opacity-60"
                  >
                    {unlockingIds.has(selectedDriverModal.id) ? 'Unlocking…' : 'Unlock Phone (1 Credit)'}
                  </button>
                )}
              </div>
              <div className="min-w-0">
                <span className="text-slate-400 block">Email</span>
                <span className="font-bold text-slate-900 break-all">
                  {unlockedDriverIds.has(selectedDriverModal.id) ? (selectedDriverModal.email || 'Not provided') : 'Unlock profile to view'}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-slate-400 block">License Number</span>
                <span className="font-bold text-slate-900 break-all">{unlockedDriverIds.has(selectedDriverModal.id) ? (selectedDriverModal.licenseNumber || 'Not provided') : 'Unlock profile to view'}</span>
              </div>
              <div className="min-w-0">
                <span className="text-slate-400 block">License Validity</span>
                <span className="font-bold text-emerald-700">
                  {!unlockedDriverIds.has(selectedDriverModal.id)
                    ? 'Unlock profile to view'
                    : selectedDriverModal.licenseExpiry ? `Valid till ${selectedDriverModal.licenseExpiry}` : 'Not provided'}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-slate-400 block">Expected Salary</span>
                <span className="font-bold text-slate-900">
                  {typeof selectedDriverModal.expectedSalary === 'number' && selectedDriverModal.expectedSalary > 0
                    ? `₹${selectedDriverModal.expectedSalary.toLocaleString('en-IN')} / month`
                    : 'Not disclosed'}
                </span>
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

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedDriverModal(null)}
                className="min-h-10 px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const d = selectedDriverModal;
                  setSelectedDriverModal(null);
                  void handleMessageDriver(d);
                }}
                className="min-h-10 px-4 py-2 bg-[#08233F] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Send Interview Invite
              </button>
              {!unlockedDriverIds.has(selectedDriverModal.id) && (
                <button
                  onClick={() => handleUnlockPhone(selectedDriverModal)}
                  disabled={unlockingIds.has(selectedDriverModal.id)}
                  className="min-h-10 px-5 py-2 bg-[#19745B] hover:bg-[#135A46] disabled:opacity-60 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  {unlockingIds.has(selectedDriverModal.id) ? 'Unlocking…' : '📞 Unlock Phone Number'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 0 Credits / Recharge Plan Prompt Modal */}
      {showNoCreditsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div role="dialog" aria-modal="true" className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl border border-slate-200 text-center space-y-4 max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center mx-auto">
              <Wallet className="w-7 h-7 text-amber-600" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-extrabold text-[#08233F]">
                Database Credits Needed
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You have <strong>0 candidate unlock credits</strong> remaining. Each candidate contact unlock uses 1 Database Credit to reveal unmasked phone numbers, direct calling, and CV downloads.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-left space-y-1">
              <p className="text-slate-500 font-medium">Selected Candidate:</p>
              <p className="font-bold text-slate-900">{showNoCreditsModal.driver.fullName} ({showNoCreditsModal.driver.driverCategory})</p>
              <p className="text-slate-600 text-[11px]">{showNoCreditsModal.driver.experienceYears} Years Exp • {showNoCreditsModal.driver.location}</p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowNoCreditsModal(null);
                  navigate('/employer/billing');
                }}
                className="w-full py-2.5 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
              >
                View Plans & Recharge Credits →
              </button>

              <button
                type="button"
                onClick={() => setShowNoCreditsModal(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel / Keep Previewing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
