import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, MapPin, Truck, ShieldCheck, Briefcase, Users, Award, 
  ArrowRight, CheckCircle2, Star, Sparkles, Building2, ChevronRight, 
  IndianRupee, Phone, Check, Clock, Zap, Shield, FileCheck
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { SupabaseSync } from '../../services/supabaseSync';
import { Job } from '../../types';
import { JobCard } from '../../components/common/JobCard';
import { useLanguage } from '../../services/i18n';

export const HomePage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string>('');
  const [location, setLocation] = useState('');
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.append('q', keyword);
    if (category) params.append('category', category);
    if (location) params.append('location', location);
    navigate(`/jobs?${params.toString()}`);
  };

  const categories = [
    { label: 'Heavy Truck (HMV)', filter: 'HMV', countKeys: ['hmv', 'heavy truck (hmv)', 'heavy truck', 'hmv-transport'], icon: '🚛', image: '/hero-truck.jpg', desc: 'Multi-axle, interstate & container transport' },
    { label: 'LMV Chauffeur', filter: 'LMV', countKeys: ['lmv', 'lmv-transport', 'personal driver', 'personal chauffeur'], icon: '🚗', image: '/auth-banner.jpg', desc: 'Personal, corporate sedans & luxury fleet' },
    { label: 'Cab Driver', filter: 'Cab Driver', countKeys: ['cab driver', 'cab'], icon: '🚕', image: '/card-banners/taxi.svg', desc: 'App-based ride hailing & airport transfers' },
    { label: 'Delivery Driver', filter: 'Delivery Driver', countKeys: ['delivery driver', 'delivery'], icon: '📦', image: '/card-banners/delivery.svg', desc: 'E-commerce vans, 2-wheelers & hyperlocal' },
    { label: 'School / Staff Bus', filter: 'Bus Driver', countKeys: ['bus driver', 'school bus driver', 'school / staff bus'], icon: '🚌', image: '/card-banners/bus.svg', desc: 'Passenger transit & student shuttle' },
    { label: 'Tempo / Ace', filter: 'Tempo Driver', countKeys: ['tempo driver', 'tempo / ace'], icon: '🚚', image: '/card-banners/tempo.svg', desc: 'Intra-city distribution & cargo logistics' },
    { label: '40ft Trailer Driver', filter: 'Trailer Driver', countKeys: ['trailer driver', '40ft trailer driver'], icon: '🚜', image: '/hero-truck.jpg', desc: 'Port container clearing & heavy haulage' },
    { label: 'Commercial Driver', filter: 'Commercial Driver', countKeys: ['commercial driver'], icon: '🚐', image: '/card-banners/commercial.svg', desc: 'Tour operations & outstation rentals' },
  ];

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
      <section className="relative overflow-hidden bg-[#08233F] text-white pt-12 sm:pt-16 lg:pt-20 pb-16 sm:pb-20 lg:pb-24 px-4 sm:px-6 lg:px-8 shadow-xl min-h-[560px] flex flex-col justify-center">
        <div className="absolute inset-0 z-0">
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

        <div className="max-w-6xl mx-auto relative z-10 w-full text-center space-y-7 sm:space-y-8">
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

          {/* DESKTOP SEARCH BAR */}
          <div className="hidden lg:block max-w-4xl mx-auto bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-2xl border border-white/30 text-slate-800 text-left">
            <form onSubmit={handleSearch} className="grid grid-cols-12 gap-2.5 items-center">
              <div className="col-span-4 flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50/90 rounded-xl border border-slate-200">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder={lang === 'kn' ? "ಹುದ್ದೆ, 'HMV', 'ಕ್ಯಾಬ್', 'ಡೆಲಿವರಿ'..." : "Job title, 'HMV', 'Cab', 'Delivery'..."}
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="col-span-3 flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50/90 rounded-xl border border-slate-200">
                <Truck className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-800 focus:outline-none cursor-pointer font-medium"
                >
                  <option value="">{t('All Driver Types')}</option>
                  <option value="HMV">{t('Heavy Truck (HMV)')}</option>
                  <option value="LMV">{t('LMV Chauffeur')}</option>
                  <option value="Cab Driver">{t('Cab Driver')}</option>
                  <option value="Delivery Driver">{t('Delivery Driver')}</option>
                  <option value="Bus Driver">{t('School & Staff Bus Driver')}</option>
                  <option value="Trailer Driver">{t('40ft Container Trailer Driver')}</option>
                </select>
              </div>

              <div className="col-span-3 flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50/90 rounded-xl border border-slate-200">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={lang === 'kn' ? 'ನಗರ (ಬೆಂಗಳೂರು, ಮೈಸೂರು...)' : 'City (Bengaluru, Chennai...)'}
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <button
                  type="submit"
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow transition-all duration-150 hover:scale-[1.02] cursor-pointer text-xs sm:text-sm"
                >
                  <Search className="w-4 h-4" />
                  <span>{t('Search')}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Live aggregates; never substitute marketing estimates for database values. */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 max-w-5xl mx-auto pt-6 sm:pt-8 text-slate-200 text-center">
            <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/15 shadow-lg">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-400 font-display">
                {marketplaceStats?.verifiedDrivers.toLocaleString('en-IN') ?? '—'}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">{t('Verified Drivers')}</p>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/15 shadow-lg">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-400 font-display">
                {marketplaceStats?.verifiedEmployers.toLocaleString('en-IN') ?? '—'}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">{t('Fleet & Corporate Employers')}</p>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/15 shadow-lg">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-400 font-display">
                {marketplaceStats?.activeVacancies.toLocaleString('en-IN') ?? '—'}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">{t('Active Job Openings')}</p>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/15 shadow-lg">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-400 font-display">
                {marketplaceStats?.hires.toLocaleString('en-IN') ?? '—'}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">{t('Successful Hires')}</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-300/90" role="status" aria-live="polite">
            {marketplaceStats ? t('Live figures from the marketplace database.') : t('Live figures are unavailable. Please check the database setup.')}
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

      {/* SECTION 3: POPULAR SPECIALIZATIONS */}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat, idx) => {
            const count = marketplaceStats 
              ? cat.countKeys.reduce((acc, key) => acc + (marketplaceStats.vacanciesByCategory[key] || 0), 0)
              : 0;
            return (
            <Link
              key={idx}
              to={`/jobs?category=${encodeURIComponent(cat.filter)}`}
              className="group p-5 bg-white rounded-2xl border border-slate-200/90 shadow-subtle hover:shadow-card hover:border-amber-400 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <span className="text-3xl block group-hover:scale-105 transition-transform">{cat.icon}</span>
                <h3 className="text-sm font-bold text-[#08233F] group-hover:text-blue-700 transition-colors">
                  {t(cat.label)}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t(cat.desc)}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-slate-700">
                <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full text-[11px] font-bold border border-blue-200/60">
                  {t('{count} Vacancies', { count })}
                </span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-slate-500 group-hover:text-blue-700" />
              </div>
            </Link>
          )})}
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
