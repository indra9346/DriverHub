import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, MapPin, Truck, ShieldCheck, Briefcase, Users, Award, 
  ArrowRight, CheckCircle2, Star, Sparkles, Building2, ChevronRight, 
  IndianRupee, Phone, Check, Clock, Zap, Shield, FileCheck, ChevronDown
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { SupabaseSync } from '../../services/supabaseSync';
import { Job } from '../../types';
import { JobCard } from '../../components/common/JobCard';
import { useLanguage } from '../../services/i18n';
import { 
  ALL_INDIAN_STATES, 
  getSearchRoleSuggestions, 
  getSearchLocationSuggestions 
} from '../../data/indiaLocations';

export const HomePage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string>('');
  const [location, setLocation] = useState('');
  const [showKeywordSuggestions, setShowKeywordSuggestions] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [activeKeywordIndex, setActiveKeywordIndex] = useState<number>(-1);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number>(0);
  const [activeLocationIndex, setActiveLocationIndex] = useState<number>(-1);

  const keywordContainerRef = useRef<HTMLDivElement>(null);
  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const locationContainerRef = useRef<HTMLDivElement>(null);

  const [allActiveJobs, setAllActiveJobs] = useState<Job[]>([]);
  const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
  const [trustedEmployers, setTrustedEmployers] = useState<Awaited<ReturnType<typeof SupabaseSync.fetchPublicEmployerDirectory>>>([]);
  const [trustedEmployersLoading, setTrustedEmployersLoading] = useState(true);
  const [trustedEmployersError, setTrustedEmployersError] = useState(false);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [verifiedEmployers, setVerifiedEmployers] = useState<any[]>([]);
  const navigate = useNavigate();

  const [marketplaceStats, setMarketplaceStats] = useState<Awaited<ReturnType<typeof SupabaseSync.fetchPublicMarketplaceStats>>>(null);

  const loadData = () => {
    const active = DataStore.getJobs().filter(j => j.status === 'active');
    setAllActiveJobs(active);
    setFeaturedJobs(active.slice(0, 6));

    // Dynamic verified partners list (employers approved/verified by admin)
    const allEmps = DataStore.getEmployers();
    const verified = allEmps.filter(e => e.verified);
    setVerifiedEmployers(verified.length > 0 ? verified : allEmps.slice(0, 8));

    const user = DataStore.getCurrentUser();
    if (user && user.role === 'driver') {
      const myApps = DataStore.getApplications().filter(a => a.driverId === user.id && a.status !== 'withdrawn');
      setAppliedJobIds(myApps.map(a => a.jobId));
      setSavedJobIds(DataStore.getFavorites(user.id));
    } else {
      setAppliedJobIds([]);
      setSavedJobIds([]);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('driverhub_storage_updated', loadData);
    return () => window.removeEventListener('driverhub_storage_updated', loadData);
  }, []);

  useEffect(() => {
    let disposed = false;
    let refreshTimer: number | undefined;
    let requestVersion = 0;
    const refresh = async () => {
      const version = ++requestVersion;
      try {
        const employers = await SupabaseSync.fetchPublicEmployerDirectory();
        if (!disposed && version === requestVersion) {
          setTrustedEmployers(employers);
          setTrustedEmployersError(false);
        }
      } catch (error) {
        console.warn('Could not load the live verified employer cards:', error);
        if (!disposed && version === requestVersion) setTrustedEmployersError(true);
      } finally {
        if (!disposed && version === requestVersion) setTrustedEmployersLoading(false);
      }
    };
    const scheduleRefresh = () => {
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => { if (!disposed) void refresh(); }, 250);
    };
    void refresh();
    const unsubscribe = SupabaseSync.subscribeToPublicEmployerDirectory(scheduleRefresh);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      disposed = true;
      requestVersion++;
      unsubscribe();
      window.clearInterval(interval);
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      const stats = await SupabaseSync.fetchPublicMarketplaceStats();
      if (!disposed) setMarketplaceStats(stats);
    };
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { void refresh(); }, 350);
    };
    void refresh();
    const unsubscribe = SupabaseSync.subscribeToPublicMarketplaceStats(scheduleRefresh);
    const poll = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      disposed = true;
      unsubscribe();
      window.clearInterval(poll);
      if (refreshTimer) clearTimeout(refreshTimer);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (keywordContainerRef.current && !keywordContainerRef.current.contains(target)) {
        setShowKeywordSuggestions(false);
      }
      if (categoryContainerRef.current && !categoryContainerRef.current.contains(target)) {
        setShowCategoryDropdown(false);
      }
      if (locationContainerRef.current && !locationContainerRef.current.contains(target)) {
        setShowLocationSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const keywordSuggestions = useMemo(() => {
    return getSearchRoleSuggestions(
      keyword,
      allActiveJobs.map(j => ({ title: j.title, category: j.category, company: j.companyName }))
    );
  }, [keyword, allActiveJobs]);

  const [liveHeroLocations, setLiveHeroLocations] = useState<
    Array<{ city: string; district?: string; state: string; pincode?: string; label: string }>
  >([]);
  const [loadingHeroLocations, setLoadingHeroLocations] = useState(false);
  const [selectedHeroStructuredLoc, setSelectedHeroStructuredLoc] = useState<{
    city?: string;
    district?: string;
    state?: string;
    pincode?: string;
  } | null>(null);

  useEffect(() => {
    const q = location.trim();
    if (q.length < 2) {
      setLiveHeroLocations([]);
      setLoadingHeroLocations(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingHeroLocations(true);
      try {
        const { searchPanIndiaPlacesLive } = await import('../../services/indiaLocationService');
        const res = await searchPanIndiaPlacesLive(q, undefined, undefined, controller.signal);
        setLiveHeroLocations(
          res.suggestions.slice(0, 12).map(s => ({
            city: s.city,
            district: s.district,
            state: s.state,
            pincode: s.pincode,
            label: `${s.city}, ${s.district}, ${s.state}${s.pincode ? ` (${s.pincode})` : ''}`
          }))
        );
      } catch {
        // Ignore abort
      } finally {
        setLoadingHeroLocations(false);
      }
    }, 240);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [location]);

  const locationSuggestions = useMemo(() => {
    const base: Array<{
      city: string;
      district?: string;
      state: string;
      pincode?: string;
      label: string;
    }> = getSearchLocationSuggestions(location).map(item => ({
      city: item.city,
      state: item.state,
      label: item.label
    }));
    const seen = new Set(base.map(b => `${b.city.toLowerCase()}|${b.state.toLowerCase()}`));
    for (const live of liveHeroLocations) {
      const key = `${live.city.toLowerCase()}|${live.state.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        base.push(live);
      }
    }
    return base.slice(0, 14);
  }, [location, liveHeroLocations]);

  const driverTypeOptions = useMemo(() => [
    { value: '', label: t('All Driver Types'), subtitle: 'Browse all commercial & personal roles', icon: '🚛' },
    { value: 'HMV', label: t('Heavy Truck (HMV)'), subtitle: 'Multi-axle, interstate & container transport', icon: '🚛' },
    { value: 'LMV', label: t('LMV Chauffeur'), subtitle: 'Personal, corporate sedans & luxury fleet', icon: '🚗' },
    { value: 'Cab Driver', label: t('Cab Driver'), subtitle: 'App-based ride hailing & airport transfers', icon: '🚕' },
    { value: 'Delivery Driver', label: t('Delivery Driver'), subtitle: 'E-commerce vans, 2-wheelers & hyperlocal', icon: '📦' },
    { value: 'Bus Driver', label: t('School / Staff Bus'), subtitle: 'Passenger transit & student shuttle', icon: '🚌' },
    { value: 'Tempo Driver', label: t('Tempo / Ace'), subtitle: 'Intra-city distribution & cargo logistics', icon: '🚚' },
    { value: 'Trailer Driver', label: t('40ft Trailer Driver'), subtitle: 'Port container clearing & heavy haulage', icon: '🚜' },
    { value: 'Commercial Driver', label: t('Commercial Driver'), subtitle: 'Tour operations & outstation rentals', icon: '🚐' },
    { value: 'Personal Driver', label: t('Personal Driver'), subtitle: 'Private family & executive cars', icon: '🚘' },
  ], [t]);

  const selectedDriverTypeOption = useMemo(
    () => driverTypeOptions.find(opt => opt.value === category) || driverTypeOptions[0],
    [driverTypeOptions, category]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowKeywordSuggestions(false);
    setShowCategoryDropdown(false);
    setShowLocationSuggestions(false);
    const params = new URLSearchParams();
    if (keyword.trim()) params.append('q', keyword.trim());
    if (category) params.append('category', category);
    if (location.trim()) {
      if (selectedHeroStructuredLoc && selectedHeroStructuredLoc.city?.toLowerCase() === location.trim().toLowerCase()) {
        if (selectedHeroStructuredLoc.state) params.append('state', selectedHeroStructuredLoc.state);
        if (selectedHeroStructuredLoc.district) params.append('district', selectedHeroStructuredLoc.district);
        if (selectedHeroStructuredLoc.city) params.append('city', selectedHeroStructuredLoc.city);
        if (selectedHeroStructuredLoc.pincode) params.append('pincode', selectedHeroStructuredLoc.pincode);
      } else {
        params.append('city', location.trim());
        params.append('location', location.trim());
      }
    }
    navigate(`/jobs?${params.toString()}`);
  };

  const categories = [
    {
      label: 'Heavy Truck (HMV)',
      filter: 'HMV',
      countKeys: ['hmv', 'heavy truck (hmv)', 'heavy truck', 'hmv-transport'],
      icon: '🚛',
      image: '/banners/heavy_freight_truck.jpg',
      alt: 'Heavy Commercial Multi-Axle Freight Truck on Indian Highway',
      desc: 'Multi-axle, interstate & container transport'
    },
    {
      label: 'LMV Chauffeur',
      filter: 'LMV',
      countKeys: ['lmv', 'lmv-transport', 'personal driver', 'personal chauffeur'],
      icon: '🚗',
      image: '/banners/executive_chauffeur_car.jpg',
      alt: 'Executive Sedan & Corporate LMV Chauffeur Vehicle',
      desc: 'Personal, corporate sedans & luxury fleet'
    },
    {
      label: 'Cab Driver',
      filter: 'Cab Driver',
      countKeys: ['cab driver', 'cab'],
      icon: '🚕',
      image: '/banners/urban_cab_fleet.jpg',
      alt: 'Urban Ride-Hailing Cab & Airport Taxi Fleet',
      desc: 'App-based ride hailing & airport transfers'
    },
    {
      label: 'Delivery Driver',
      filter: 'Delivery Driver',
      countKeys: ['delivery driver', 'delivery'],
      icon: '📦',
      image: '/banners/electric_delivery_van.jpg',
      alt: 'E-Commerce Delivery Cargo Van & Last-Mile Logistics Fleet',
      desc: 'E-commerce vans, 2-wheelers & hyperlocal'
    },
    {
      label: 'School / Staff Bus',
      filter: 'Bus Driver',
      countKeys: ['bus driver', 'school bus driver', 'school / staff bus'],
      icon: '🚌',
      image: '/banners/school_bus_transit.jpg',
      alt: 'Yellow School Bus & Corporate Staff Transit Shuttle',
      desc: 'Passenger transit & student shuttle'
    },
    {
      label: 'Tempo / Ace',
      filter: 'Tempo Driver',
      countKeys: ['tempo driver', 'tempo / ace'],
      icon: '🚚',
      image: '/banners/tempo_delivery_truck.jpg',
      alt: 'Tata Ace Mini Cargo Tempo & Intra-City Logistics Pickup',
      desc: 'Intra-city distribution & cargo logistics'
    },
    {
      label: '40ft Trailer Driver',
      filter: 'Trailer Driver',
      countKeys: ['trailer driver', '40ft trailer driver'],
      icon: '🚜',
      image: '/banners/container_trailer_truck.jpg',
      alt: '40ft Heavy Port Container Trailer Truck',
      desc: 'Port container clearing & heavy haulage'
    },
    {
      label: 'Commercial Driver',
      filter: 'Commercial Driver',
      countKeys: ['commercial driver'],
      icon: '🚐',
      image: '/banners/intercity_passenger_coach.jpg',
      alt: 'Commercial Tour Operations & Outstation Passenger Coach',
      desc: 'Tour operations & outstation rentals'
    },
  ];

  // Calculate live active vacancy count per category matching JobsPage.tsx filter semantics
  const getLiveCategoryVacancies = (catFilter: string, countKeys: string[]): number => {
    const rpcCount = marketplaceStats
      ? countKeys.reduce((acc, key) => acc + (marketplaceStats.vacanciesByCategory[key] || 0), 0)
      : 0;

    const matchingJobs = allActiveJobs.filter(job => {
      const jobCat = (job.category || '').toLowerCase();
      const target = catFilter.toLowerCase();
      if (jobCat === target || jobCat.includes(target) || target.includes(jobCat)) return true;
      if (catFilter === 'HMV' && ['hmv', 'hmv-transport', 'trailer driver', 'heavy truck'].some(c => jobCat.includes(c))) return true;
      if (catFilter === 'LMV' && ['lmv', 'lmv-transport', 'personal driver', 'cab driver', 'tempo driver'].some(c => jobCat.includes(c))) return true;
      if (catFilter === 'Commercial Driver' && ['commercial driver', 'bus driver', 'cab driver', 'lmv-transport'].some(c => jobCat.includes(c))) return true;
      return false;
    });

    const storeVacancies = matchingJobs.reduce((sum, j) => sum + Math.max(1, Number(j.vacancies) || 1), 0);
    return Math.max(rpcCount, storeVacancies);
  };

  // Resolved hero statistics (live database stats with active store fallback)
  const resolvedStats = useMemo(() => {
    const storeDrivers = DataStore.getDrivers().filter(d => d.status === 'active').length;
    const storeEmps = DataStore.getEmployers().filter(e => e.verified).length;
    const storeVacancies = allActiveJobs.reduce((sum, j) => sum + Math.max(1, Number(j.vacancies) || 1), 0);
    const storeHires = DataStore.getApplications().filter(a => a.status === 'hired' || a.status === 'selected').length;

    return {
      verifiedDrivers: Math.max(marketplaceStats?.verifiedDrivers || 0, storeDrivers),
      verifiedEmployers: Math.max(marketplaceStats?.verifiedEmployers || 0, storeEmps),
      activeVacancies: Math.max(marketplaceStats?.activeVacancies || 0, storeVacancies),
      hires: Math.max(marketplaceStats?.hires || 0, storeHires),
    };
  }, [marketplaceStats, allActiveJobs]);

  const siteAdCards = [
    {
      badge: 'Direct Hiring',
      icon: '🤝',
      title: 'Zero Middlemen Commission',
      subtitle: 'Browse verified employers and review each job listing for its pay and hiring details.',
      cta: 'Explore Openings',
      link: '/jobs',
      image: '/auth-banner.jpg',
      imagePosition: '70% center'
    },
    {
      badge: 'Verified Drivers',
      icon: '✅',
      title: 'Driver License Verification',
      subtitle: 'Upload your driving license for review. A verification badge appears after an administrator approves it.',
      cta: 'Register as Driver',
      link: '/register?role=driver',
      image: '/card-banners/license.svg'
    },
    {
      badge: 'Salary Details',
      icon: '💵',
      title: 'Compare Driver Job Salaries',
      subtitle: 'Salary and benefits vary by employer and vacancy. Check the details on each active job listing.',
      cta: 'Browse All Jobs',
      link: '/jobs?sort=salary',
      image: '/card-banners/salary.svg'
    },
    {
      badge: 'Fleet Operators',
      icon: '🚛',
      title: 'Verified Fleet Employers',
      subtitle: 'Explore verified employers and see their active vacancies.',
      cta: 'Top Employers',
      link: '/companies',
      image: '/hero-truck.jpg',
      imagePosition: 'center 60%'
    },
    {
      badge: 'Real-Time Alerts',
      icon: '📱',
      title: 'Application Updates',
      subtitle: 'Check your account notifications for updates supported by your current account settings.',
      cta: 'Register',
      link: '/register',
      image: '/card-banners/notifications.svg'
    },
    {
      badge: 'Corporate Driver Hiring',
      icon: '🚗',
      title: 'Corporate & Executive Sedans',
      subtitle: 'Browse chauffeur openings and review each employer\'s requirements and pay details.',
      cta: 'Find Jobs',
      link: '/jobs?category=LMV',
      image: '/card-banners/sedan.svg'
    }
  ];

  return (
    <div className="space-y-16 pb-20 bg-[#F5F8FB]">
      
      {/* SECTION 1: HERO SECTION */}
      <section className="relative bg-[#08233F] text-white pt-12 sm:pt-16 lg:pt-20 pb-16 sm:pb-20 lg:pb-24 px-4 sm:px-6 lg:px-8 shadow-xl min-h-[560px] flex flex-col justify-center">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="/hero-truck.jpg"
            alt="Driver Hub Commercial Transport & Heavy Fleet Truck on Highway"
            className="w-full h-full object-cover object-center lg:object-[center_40%] scale-105"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#08233F]/95 via-[#08233F]/85 to-[#08233F]/75 hidden lg:block" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#08233F]/90 via-[#08233F]/80 to-[#08233F]/95 lg:hidden" />
          <div className="absolute inset-0 bg-[radial-gradient(#F5A800_1px,transparent_1px)] opacity-[0.07] [background-size:24px_24px] pointer-events-none" />
        </div>

        <div className="max-w-6xl mx-auto relative z-20 w-full text-center space-y-7 sm:space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-amber-400/30 text-xs text-amber-400 font-bold shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>{t('Driver Recruitment & Fleet Hiring')}</span>
          </div>

          <div className="space-y-3.5 max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-display text-white leading-[1.15] drop-shadow-md">
              {t('Drive Your Career Forward with')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400">
                Driver Hub
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-200 max-w-2xl mx-auto font-normal leading-relaxed drop-shadow">
              {t('Connecting verified commercial and personal drivers directly with top logistics fleets, corporate employers, and private vehicle owners. Direct hiring, verified licenses, zero agency cuts.')}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-slate-200 max-w-3xl mx-auto">
            <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/70 backdrop-blur-md border border-white/15 text-[11px] sm:text-xs font-semibold shadow">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {t('Direct Hiring')}
            </span>
            <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/70 backdrop-blur-md border border-white/15 text-[11px] sm:text-xs font-semibold shadow">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" /> {t('License documents reviewed')}
            </span>
            <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/70 backdrop-blur-md border border-white/15 text-[11px] sm:text-xs font-semibold shadow">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {t('Salary shown on each job listing')}
            </span>
            <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/70 backdrop-blur-md border border-white/15 text-[11px] sm:text-xs font-semibold shadow">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" /> {t('Zero Commission')}
            </span>
          </div>

          {/* SEARCH BAR (Elevated stacking context z-40 so open dropdowns always appear above hero stat cards) */}
          <div className="relative z-40 max-w-4xl mx-auto bg-white/95 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl shadow-2xl border border-white/30 text-slate-800 text-left">
            <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
              {/* 1. Keyword / Job Title Combobox with Keyboard Navigation */}
              <div ref={keywordContainerRef} className="relative sm:col-span-4">
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50/90 rounded-xl border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    role="combobox"
                    aria-label="Search by job title, vehicle type, or role"
                    aria-expanded={showKeywordSuggestions && keywordSuggestions.length > 0}
                    aria-controls="hero-keyword-listbox"
                    aria-activedescendant={
                      activeKeywordIndex >= 0 ? `hero-keyword-opt-${activeKeywordIndex}` : undefined
                    }
                    value={keyword}
                    onFocus={() => {
                      setShowKeywordSuggestions(true);
                      setShowCategoryDropdown(false);
                      setShowLocationSuggestions(false);
                    }}
                    onChange={(e) => {
                      setKeyword(e.target.value);
                      setShowKeywordSuggestions(true);
                      setActiveKeywordIndex(-1);
                    }}
                    onKeyDown={(e) => {
                      if (!showKeywordSuggestions && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                        setShowKeywordSuggestions(true);
                        return;
                      }
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setActiveKeywordIndex((prev) =>
                          prev < keywordSuggestions.length - 1 ? prev + 1 : 0
                        );
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setActiveKeywordIndex((prev) =>
                          prev > 0 ? prev - 1 : keywordSuggestions.length - 1
                        );
                      } else if (e.key === 'Enter' && activeKeywordIndex >= 0 && keywordSuggestions[activeKeywordIndex]) {
                        e.preventDefault();
                        const chosen = keywordSuggestions[activeKeywordIndex];
                        setKeyword(chosen.title);
                        if (chosen.category) setCategory(chosen.category);
                        setShowKeywordSuggestions(false);
                        setActiveKeywordIndex(-1);
                      } else if (e.key === 'Escape') {
                        setShowKeywordSuggestions(false);
                        setActiveKeywordIndex(-1);
                      }
                    }}
                    placeholder={lang === 'kn' ? "ಹುದ್ದೆ, 'HMV', 'ಕ್ಯಾಬ್', 'ಡೆಲಿವರಿ'..." : "Job title, 'HMV', 'Cab', 'Delivery'..."}
                    className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-500 focus:outline-none"
                  />
                  {keyword && (
                    <button
                      type="button"
                      aria-label="Clear job title search"
                      onClick={() => {
                        setKeyword('');
                        setActiveKeywordIndex(-1);
                      }}
                      className="text-slate-400 hover:text-slate-700 text-xs px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Accessible Role Suggestions Dropdown */}
                {showKeywordSuggestions && keywordSuggestions.length > 0 && (
                  <div
                    id="hero-keyword-listbox"
                    role="listbox"
                    aria-label="Suggested Roles and Categories"
                    className="absolute z-50 left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200/95 py-2 max-h-72 overflow-y-auto ring-1 ring-slate-900/5"
                  >
                    <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
                      <span>Suggested Roles &amp; Categories</span>
                      <button
                        type="button"
                        aria-label="Close role suggestions"
                        onClick={() => setShowKeywordSuggestions(false)}
                        className="text-slate-400 hover:text-slate-700 px-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {keywordSuggestions.map((item, idx) => {
                        const isSelected = keyword.toLowerCase() === item.title.toLowerCase();
                        const isActive = activeKeywordIndex === idx;
                        return (
                          <button
                            key={idx}
                            id={`hero-keyword-opt-${idx}`}
                            role="option"
                            aria-selected={isSelected || isActive}
                            type="button"
                            onMouseEnter={() => setActiveKeywordIndex(idx)}
                            onClick={() => {
                              setKeyword(item.title);
                              if (item.category) setCategory(item.category);
                              setShowKeywordSuggestions(false);
                              setActiveKeywordIndex(-1);
                            }}
                            className={`w-full px-4 py-3 text-left text-xs flex items-center justify-between gap-3 group transition-colors cursor-pointer ${
                              isActive || isSelected
                                ? 'bg-emerald-50/95 text-emerald-950'
                                : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 group-hover:text-emerald-900 truncate">
                                  {item.title}
                                </span>
                                {item.category && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200/80 shrink-0">
                                    {item.category}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 block line-clamp-1">
                                {item.subtitle}
                              </span>
                            </div>
                            <span
                              className={`text-[10px] px-2.5 py-1 rounded-lg font-bold shrink-0 flex items-center gap-1 transition-colors ${
                                isSelected
                                  ? 'bg-emerald-600 text-white'
                                  : isActive
                                  ? 'bg-emerald-200 text-emerald-950'
                                  : 'bg-slate-100 text-slate-700 group-hover:bg-emerald-100 group-hover:text-emerald-900'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-3 h-3" /> Selected
                                </>
                              ) : (
                                'Select ↵'
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Driver Type Accessible Custom Dropdown */}
              <div ref={categoryContainerRef} className="relative sm:col-span-3">
                <button
                  type="button"
                  role="combobox"
                  aria-label="Select Driver Category"
                  aria-expanded={showCategoryDropdown}
                  aria-controls="hero-category-listbox"
                  onClick={() => {
                    setShowCategoryDropdown((prev) => !prev);
                    setShowKeywordSuggestions(false);
                    setShowLocationSuggestions(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setShowCategoryDropdown(true);
                      setActiveCategoryIndex((prev) =>
                        prev < driverTypeOptions.length - 1 ? prev + 1 : 0
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setShowCategoryDropdown(true);
                      setActiveCategoryIndex((prev) =>
                        prev > 0 ? prev - 1 : driverTypeOptions.length - 1
                      );
                    } else if (e.key === 'Enter' || e.key === ' ') {
                      if (showCategoryDropdown && driverTypeOptions[activeCategoryIndex]) {
                        e.preventDefault();
                        setCategory(driverTypeOptions[activeCategoryIndex].value);
                        setShowCategoryDropdown(false);
                      }
                    } else if (e.key === 'Escape') {
                      setShowCategoryDropdown(false);
                    }
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    category
                      ? 'bg-emerald-50/70 border-emerald-400 text-emerald-950'
                      : 'bg-slate-50/90 border-slate-200 text-slate-800 hover:bg-white'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Truck className={`w-4 h-4 shrink-0 ${category ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-xs sm:text-sm font-semibold truncate">
                      {selectedDriverTypeOption.label}
                    </span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                      showCategoryDropdown ? 'rotate-180 text-emerald-600' : ''
                    }`}
                  />
                </button>

                {showCategoryDropdown && (
                  <div
                    id="hero-category-listbox"
                    role="listbox"
                    aria-label="Driver Categories"
                    className="absolute z-50 left-0 right-0 sm:w-72 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200/95 py-2 max-h-80 overflow-y-auto ring-1 ring-slate-900/5"
                  >
                    <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
                      <span>Filter by Vehicle / License Type</span>
                      <button
                        type="button"
                        aria-label="Close category menu"
                        onClick={() => setShowCategoryDropdown(false)}
                        className="text-slate-400 hover:text-slate-700 px-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {driverTypeOptions.map((opt, idx) => {
                        const isSelected = category === opt.value;
                        const isActive = activeCategoryIndex === idx;
                        return (
                          <button
                            key={opt.value || 'all'}
                            role="option"
                            aria-selected={isSelected}
                            type="button"
                            onMouseEnter={() => setActiveCategoryIndex(idx)}
                            onClick={() => {
                              setCategory(opt.value);
                              setShowCategoryDropdown(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-950 font-bold'
                                : isActive
                                ? 'bg-slate-100 text-slate-900'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className="text-base leading-none mt-0.5 shrink-0">{opt.icon}</span>
                              <div className="min-w-0">
                                <span className="block font-bold text-slate-900 truncate">{opt.label}</span>
                                <span className="block text-[11px] text-slate-500 truncate">{opt.subtitle}</span>
                              </div>
                            </div>
                            {isSelected && (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white shrink-0">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Location / City Combobox with Keyboard Navigation */}
              <div ref={locationContainerRef} className="relative sm:col-span-3">
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50/90 rounded-xl border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    role="combobox"
                    aria-label="Search by Indian city, district, or state"
                    aria-expanded={showLocationSuggestions && locationSuggestions.length > 0}
                    aria-controls="hero-location-listbox"
                    aria-activedescendant={
                      activeLocationIndex >= 0 ? `hero-location-opt-${activeLocationIndex}` : undefined
                    }
                    value={location}
                    onFocus={() => {
                      setShowLocationSuggestions(true);
                      setShowKeywordSuggestions(false);
                      setShowCategoryDropdown(false);
                    }}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      setShowLocationSuggestions(true);
                      setActiveLocationIndex(-1);
                    }}
                    onKeyDown={(e) => {
                      if (!showLocationSuggestions && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                        setShowLocationSuggestions(true);
                        return;
                      }
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setActiveLocationIndex((prev) =>
                          prev < locationSuggestions.length - 1 ? prev + 1 : 0
                        );
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setActiveLocationIndex((prev) =>
                          prev > 0 ? prev - 1 : locationSuggestions.length - 1
                        );
                      } else if (e.key === 'Enter' && activeLocationIndex >= 0 && locationSuggestions[activeLocationIndex]) {
                        e.preventDefault();
                        const chosen = locationSuggestions[activeLocationIndex];
                        setLocation(chosen.city);
                        setSelectedHeroStructuredLoc(chosen);
                        setShowLocationSuggestions(false);
                        setActiveLocationIndex(-1);
                      } else if (e.key === 'Escape') {
                        setShowLocationSuggestions(false);
                        setActiveLocationIndex(-1);
                      }
                    }}
                    placeholder={lang === 'kn' ? 'ನಗರ / ಪಿನ್ ಕೋಡ್ (ಬೆಂಗಳೂರು, 560001...)' : 'City, District or PIN (e.g. Bengaluru, 560001...)'}
                    className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-500 focus:outline-none"
                  />
                  {location && (
                    <button
                      type="button"
                      aria-label="Clear city filter"
                      onClick={() => {
                        setLocation('');
                        setSelectedHeroStructuredLoc(null);
                        setActiveLocationIndex(-1);
                      }}
                      className="text-slate-400 hover:text-slate-700 text-xs px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Accessible Location Suggestions Dropdown */}
                {showLocationSuggestions && (locationSuggestions.length > 0 || loadingHeroLocations) && (
                  <div
                    id="hero-location-listbox"
                    role="listbox"
                    aria-label="Suggested Indian Cities, Districts, States and PINs"
                    className="absolute z-50 left-0 right-0 sm:w-80 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200/95 py-2 max-h-72 overflow-y-auto ring-1 ring-slate-900/5"
                  >
                    <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
                      <span>{loadingHeroLocations ? 'Searching India Post Directory…' : 'Pan-India Cities, Districts & PINs'}</span>
                      <button
                        type="button"
                        aria-label="Close location suggestions"
                        onClick={() => setShowLocationSuggestions(false)}
                        className="text-slate-400 hover:text-slate-700 px-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {locationSuggestions.map((item, idx) => {
                        const isSelected = location.toLowerCase() === item.city.toLowerCase();
                        const isActive = activeLocationIndex === idx;
                        return (
                          <button
                            key={`${item.city}-${item.state}-${item.pincode || idx}`}
                            id={`hero-location-opt-${idx}`}
                            role="option"
                            aria-selected={isSelected || isActive}
                            type="button"
                            onMouseEnter={() => setActiveLocationIndex(idx)}
                            onClick={() => {
                              setLocation(item.city);
                              setSelectedHeroStructuredLoc(item);
                              setShowLocationSuggestions(false);
                              setActiveLocationIndex(-1);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-xs flex items-center justify-between gap-2 group transition-colors cursor-pointer ${
                              isActive || isSelected
                                ? 'bg-emerald-50 text-emerald-950'
                                : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-bold text-slate-900 truncate">{item.label}</span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 group-hover:text-emerald-800 shrink-0">
                              {isSelected ? '✓ Selected' : 'Select ↵'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Search Button */}
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow transition-all duration-150 hover:scale-[1.02] cursor-pointer text-xs sm:text-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  <Search className="w-4 h-4" />
                  <span>{t('Search')}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Live aggregates (z-10 so open dropdowns from search bar z-40 render cleanly above) */}
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 max-w-5xl mx-auto pt-6 sm:pt-8 text-slate-200 text-center">
            <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/15 shadow-lg">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-400 font-display">
                {resolvedStats.verifiedDrivers.toLocaleString('en-IN')}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">{t('Verified Drivers')}</p>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/15 shadow-lg">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-400 font-display">
                {resolvedStats.verifiedEmployers.toLocaleString('en-IN')}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">{t('Fleet & Corporate Employers')}</p>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/15 shadow-lg">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-400 font-display">
                {resolvedStats.activeVacancies.toLocaleString('en-IN')}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">{t('Active Job Openings')}</p>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/15 shadow-lg">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-400 font-display">
                {resolvedStats.hires.toLocaleString('en-IN')}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">{t('Successful Hires')}</p>
            </div>
          </div>
          <p className="relative z-10 text-[11px] text-slate-300/90" role="status" aria-live="polite">
            {t('Live figures from active marketplace listings & verified records.')}
          </p>
        </div>
      </section>

      {/* SECTION 2: VALUE PROPOSITIONS MARQUEE */}
      <section className="relative -mt-6 z-20 overflow-hidden">
        <div className="w-full overflow-hidden py-2">
          <div className="animate-marquee-smooth flex gap-4">
            {[...siteAdCards, ...siteAdCards].map((card, idx) => (
              <Link
                key={idx}
                to={card.link}
                className="w-80 shrink-0 overflow-hidden bg-white rounded-2xl border border-slate-200/90 shadow-subtle hover:shadow-card hover:border-amber-400 transition-all duration-300 group flex flex-col justify-between"
              >
                <div className="relative h-28 overflow-hidden bg-[#0d3154]">
                  <img
                    src={card.image}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 motion-reduce:transition-none"
                    style={{ objectPosition: card.imagePosition || 'center' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#08233F]/80 via-[#08233F]/30 to-transparent" />
                  <span className="absolute bottom-3 left-4 inline-flex rounded-full border border-white/50 bg-white/90 px-2.5 py-1 text-[10px] font-bold text-[#08233F] shadow-sm">
                    {t(card.badge)}
                  </span>
                </div>
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl">{card.icon}</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#08233F] group-hover:text-blue-700 transition-colors line-clamp-1">
                      {t(card.title)}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {t(card.subtitle)}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700 group-hover:text-blue-900">
                    <span>{t(card.cta)}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: POPULAR SPECIALIZATIONS (Picture 4 — Realistic Vehicle Background Cards) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider mb-2 border border-amber-200/80">
              <Briefcase className="w-3.5 h-3.5 text-amber-600" /> {t('Explore by Vehicle & License Category')}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#08233F] font-display">
              {lang === 'kn' ? 'ಪ್ರಮುಖ ಚಾಲನಾ ವಿಭಾಗಗಳು' : 'Popular Driving Specializations'}
            </h2>
          </div>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline"
          >
            {t('Browse All Jobs')} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((cat, idx) => {
            const count = getLiveCategoryVacancies(cat.filter, cat.countKeys);
            return (
              <Link
                key={idx}
                to={`/jobs?category=${encodeURIComponent(cat.filter)}`}
                aria-label={`${cat.label} — ${cat.desc} (${count} Vacancies)`}
                className="group relative min-h-[210px] rounded-2xl overflow-hidden border border-slate-800/80 hover:border-amber-400 shadow-card hover:shadow-2xl transition-all duration-300 flex flex-col justify-between p-5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
              >
                {/* Realistic Vehicle Photography Background */}
                <img
                  src={cat.image}
                  alt={cat.alt}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-110"
                />
                {/* Multi-stop dark gradient overlay for crisp text legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#04101E]/95 via-[#071C34]/75 to-[#08233F]/40 group-hover:from-[#04101E]/95 group-hover:via-[#071C34]/70 transition-colors" />

                <div className="relative z-10 flex items-center justify-between">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-950/65 backdrop-blur-md border border-white/20 text-xl shadow-sm group-hover:scale-105 transition-transform">
                    {cat.icon}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/95 text-slate-950 shadow-sm">
                    {cat.filter}
                  </span>
                </div>

                <div className="relative z-10 space-y-1.5 pt-8">
                  <h3 className="text-base font-extrabold text-white group-hover:text-amber-300 transition-colors font-display drop-shadow-sm">
                    {t(cat.label)}
                  </h3>
                  <p className="text-xs text-slate-200/95 leading-relaxed line-clamp-2 drop-shadow-xs">
                    {t(cat.desc)}
                  </p>

                  <div className="pt-3 mt-2 border-t border-white/15 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md text-white px-3 py-1 rounded-full text-[11px] font-bold border border-white/25 group-hover:bg-amber-400 group-hover:text-slate-950 group-hover:border-amber-300 transition-colors">
                      {t('{count} Vacancies', { count })}
                    </span>
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/10 group-hover:bg-amber-400 text-white group-hover:text-slate-950 transition-all">
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* SECTION 4: FEATURED DRIVER OPENINGS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider mb-2 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> {t('Active & Verified')}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#08233F] font-display">
              {t('Featured Driver Openings')}
            </h2>
          </div>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline"
          >
            {t('View All {count} Jobs', { count: DataStore.getJobs().length })} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {featuredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isApplied={appliedJobIds.includes(job.id)}
              isSaved={savedJobIds.includes(job.id)}
              onToggleSave={async (jobId) => {
                const user = DataStore.getCurrentUser();
                if (!user) {
                  alert(t('Please log in as a driver to save jobs.'));
                  return;
                }
                const wasSaved = savedJobIds.includes(jobId);
                const saved = await DataStore.toggleFavorite(user.id, jobId);
                if (saved === wasSaved) {
                  alert(t('Could not update saved jobs. Check your connection and try again.'));
                  return;
                }
                loadData();
              }}
            />
          ))}
        </div>
      </section>

      {/* SECTION 5: TRUSTED FLEETS SHOWCASE (Verified Partners auto-dropped when verified by Admin) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-wider border border-amber-200">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> {t('Verified Partner')}
          </span>
          <h2 className="text-2xl font-extrabold text-[#08233F] font-display">
            {lang === 'kn' ? 'ಭಾರತದ ಪ್ರಮುಖ ಫ್ಲೀಟ್ ಮತ್ತು ಸಾರಿಗೆ ಸಂಸ್ಥೆಗಳು' : 'Trusted by Leading Fleets & Enterprises'}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {t('Explore verified transport companies, corporate fleets, and schools hiring drivers directly.')}
          </p>
        </div>

        {trustedEmployersLoading && trustedEmployers.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 bg-white rounded-2xl border border-slate-200/90 text-center space-y-3 animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-slate-200 mx-auto" />
                <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto" />
                <div className="h-3 bg-slate-100 rounded w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(trustedEmployers.length > 0
              ? trustedEmployers.map((t) => t.employer)
              : DataStore.getEmployers().filter((e) => e.verified)
            ).map((emp) => (
              <Link
                key={emp.id}
                to={`/jobs?q=${encodeURIComponent(emp.companyName)}`}
                className="p-5 bg-white rounded-2xl border border-slate-200/90 text-center space-y-2.5 shadow-subtle hover:shadow-card hover:border-amber-400 transition-all group block cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-50 mx-auto overflow-hidden border border-slate-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                  {emp.logoUrl ? (
                    <img src={emp.logoUrl} alt={emp.companyName} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#08233F] group-hover:text-blue-700 transition-colors line-clamp-1">{emp.companyName}</h4>
                  <p className="text-[11px] text-slate-400 truncate">{emp.industry}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> {t('Verified Partner')}
                </span>
              </Link>
            ))}
          </div>
        )}
        {!trustedEmployersLoading && trustedEmployersError && trustedEmployers.length === 0 && (
          <p className="py-5 text-center text-sm text-slate-500">{t('Verified employers could not be loaded. Please try again.')}</p>
        )}
      </section>

      {/* SECTION 6: CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden bg-gradient-to-r from-[#08233F] to-[#173E68] rounded-3xl p-8 sm:p-12 text-white shadow-elevated flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display leading-tight">
              {lang === 'kn' ? 'ಇಂದೇ ಚಾಲಕರನ್ನು ನೇಮಿಸಿ ಅಥವಾ ಕೆಲಸ ಪ್ರಾರಂಭಿಸಿ' : 'Ready to Hire or Start Driving Today?'}
            </h2>
            <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
              {t('Connecting verified commercial and personal drivers directly with top logistics fleets, corporate employers, and private vehicle owners. Direct hiring, verified licenses, zero agency cuts.')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
            <Link
              to="/jobs"
              className="w-full sm:w-auto text-center px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-subtle transition-all duration-150 hover:scale-[1.02] cursor-pointer"
            >
              {t('Find Jobs')}
            </Link>
            <Link
              to="/employer/post-job"
              className="w-full sm:w-auto text-center px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs sm:text-sm border border-white/20 transition-all cursor-pointer"
            >
              {t('Post Driver Vacancy')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
