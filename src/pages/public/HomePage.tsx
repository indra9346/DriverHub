import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, MapPin, Truck, ShieldCheck, Briefcase, Users, Award, 
  ArrowRight, CheckCircle2, Star, Sparkles, Building2, ChevronRight, 
  IndianRupee, Phone, Check, Clock, Zap, Shield, FileCheck, DollarSign, Bell
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { SupabaseSync } from '../../services/supabaseSync';
import { Job } from '../../types';
import { JobCard } from '../../components/common/JobCard';

export const HomePage: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string>('');
  const [location, setLocation] = useState('');
  const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const navigate = useNavigate();

  const [stats, setStats] = useState<{ verifiedDrivers: number; verifiedEmployers: number; activeVacancies: number; hires: number; vacanciesByCategory: Record<string, number> } | null>(null);

  const loadData = () => {
    const now = Date.now();
    const active = DataStore.getJobs().filter(j =>
      j.status === 'active' &&
      (!j.expiresAt || new Date(j.expiresAt).getTime() > now) &&
      (!j.applicationDeadline || new Date(j.applicationDeadline).getTime() > now)
    );
    setFeaturedJobs(active.slice(0, 6));

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
    let mounted = true;
    const refreshStats = async () => {
      const latest = await SupabaseSync.fetchPublicMarketplaceStats();
      if (mounted && latest) setStats(latest);
    };
    void refreshStats();
    const intervalId = window.setInterval(refreshStats, 30_000);
    window.addEventListener('driverhub_storage_updated', refreshStats);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('driverhub_storage_updated', refreshStats);
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
    { label: 'Heavy Truck (HMV)', filter: 'HMV', icon: '🚛', desc: 'Multi-axle, interstate & container transport', image: '/hero-truck.jpg' },
    { label: 'LMV Chauffeur', filter: 'LMV', icon: '🚗', desc: 'Personal, corporate sedans & luxury fleet', image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80' },
    { label: 'Cab Driver', filter: 'Cab Driver', icon: '🚕', desc: 'App-based ride hailing & airport transfers', image: 'https://images.unsplash.com/photo-1718943824702-e4dbcff35452?auto=format&fit=crop&w=900&q=80' },
    { label: 'Delivery Driver', filter: 'Delivery Driver', icon: '📦', desc: 'E-commerce vans, 2-wheelers & hyperlocal', image: 'https://images.unsplash.com/photo-1758707845038-1f28b342b487?auto=format&fit=crop&w=900&q=80' },
    { label: 'School / Staff Bus', filter: 'Bus Driver', icon: '🚌', desc: 'Passenger transit & student shuttle', image: 'https://images.unsplash.com/photo-1613688263142-67f1e0c25ef1?auto=format&fit=crop&w=900&q=80' },
    { label: 'Tempo / Ace', filter: 'Tempo Driver', icon: '🚚', desc: 'Intra-city distribution & cargo logistics', image: 'https://images.unsplash.com/photo-1758707845038-1f28b342b487?auto=format&fit=crop&w=900&q=80' },
    { label: '40ft Trailer Driver', filter: 'Trailer Driver', icon: '🚜', desc: 'Port container clearing & heavy haulage', image: 'https://images.unsplash.com/photo-1501700493788-fa1a4fc9fe62?auto=format&fit=crop&w=900&q=80' },
    { label: 'Commercial Driver', filter: 'Commercial Driver', icon: '🚐', desc: 'Tour operations & outstation rentals', image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80' },
  ];

  const categoryVacancyCount = (filter: string) => {
    if (!stats) return null;
    const key = (value: string) => value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const aliases: Record<string, string[]> = {
      HMV: ['hmv', 'hmv transport', 'heavy truck', 'truck driver', 'trailer driver'],
      LMV: ['lmv', 'lmv transport', 'personal driver'],
    };
    const keys = aliases[filter] || [key(filter)];
    return Object.entries(stats.vacanciesByCategory).reduce((sum, [categoryKey, count]) => {
      const normalizedCategory = key(categoryKey);
      return keys.includes(normalizedCategory) ? sum + count : sum;
    }, 0);
  };

  // Professional Featured Recruitment & Platform Showcase Cards
  const siteAdCards = [
    {
      badge: '⚡ Direct Hiring',
      badgeColor: 'bg-amber-50 text-amber-900 border-amber-300',
      image: '/hero-truck.jpg',
      icon: '🤝',
      title: 'Zero Middlemen Commission',
      subtitle: 'Apply directly to verified transport and corporate fleets with clear wage details.',
      cta: 'Explore Openings',
      link: '/jobs'
    },
    {
      badge: '🛡️ Verified Drivers',
      badgeColor: 'bg-emerald-50 text-emerald-900 border-emerald-300',
      image: '/auth-banner.jpg',
      icon: '✅',
      title: 'Get Verified & Hired 3x Faster',
      subtitle: 'Upload license & RTO documents once to earn the DriverHub Verified Badge for instant shortlists.',
      cta: 'Register as Driver',
      link: '/register?role=driver'
    },
    {
      badge: '💰 High Wage Guarantee',
      badgeColor: 'bg-blue-50 text-blue-900 border-blue-300',
      image: '/hero-truck.jpg',
      icon: '💵',
      title: '₹25,000 - ₹50,000/mo Salary',
      subtitle: 'Guaranteed base pay with documented overtime, food allowances, and route night stays.',
      cta: 'View High-Pay Jobs',
      link: '/jobs?sort=salary'
    },
    {
      badge: '🏢 Fleet Operators',
      badgeColor: 'bg-purple-50 text-purple-900 border-purple-300',
      image: 'https://images.unsplash.com/photo-1501700493788-fa1a4fc9fe62?auto=format&fit=crop&w=900&q=80',
      icon: '🚛',
      title: 'Bharat Logistics & VRL Express',
      subtitle: 'National logistics fleets hiring Interstate HMV, Trailer & City Delivery Drivers today.',
      cta: 'View Top Employers',
      link: '/companies'
    },
    {
      badge: '🔔 Real-Time Alerts',
      badgeColor: 'bg-rose-50 text-rose-900 border-rose-300',
      image: 'https://images.unsplash.com/photo-1758707845038-1f28b342b487?auto=format&fit=crop&w=900&q=80',
      icon: '📱',
      title: 'Instant SMS & Trial Updates',
      subtitle: 'Get notified immediately when employers view your profile or schedule driving trials.',
      cta: 'Create Free Account',
      link: '/register'
    },
    {
      badge: '⭐ VIP Chauffeur',
      badgeColor: 'bg-indigo-50 text-indigo-900 border-indigo-300',
      image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80',
      icon: '🚗',
      title: 'Corporate & Executive Sedans',
      subtitle: 'Premium sedan & SUV openings with top IT tech parks, 5-star hotels, and luxury fleet operators.',
      cta: 'View Chauffeur Jobs',
      link: '/jobs?category=LMV'
    }
  ];

  return (
    <div className="space-y-16 pb-20 bg-[#F5F8FB]">
      
      {/* ========================================================================= */}
      {/* SECTION 1: HERO SECTION WITH TRUCK BACKGROUND BANNER */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden bg-[#08233F] text-white pt-12 sm:pt-16 lg:pt-20 pb-16 sm:pb-20 lg:pb-24 px-4 sm:px-6 lg:px-8 shadow-xl min-h-[560px] flex flex-col justify-center">
        
        {/* Full-bleed Highway Truck Background Banner Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-truck.jpg"
            alt="Driver Hub Commercial Transport & Heavy Fleet Truck on Highway Background Banner"
            className="w-full h-full object-cover object-center lg:object-[center_40%] scale-105"
            loading="eager"
          />
          {/* Layered cinematic gradient overlays for contrast and readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#08233F]/95 via-[#08233F]/85 to-[#08233F]/75 hidden lg:block" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#08233F]/90 via-[#08233F]/80 to-[#08233F]/95 lg:hidden" />
          <div className="absolute inset-0 bg-[radial-gradient(#F5A800_1px,transparent_1px)] opacity-[0.07] [background-size:24px_24px] pointer-events-none" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10 w-full text-center space-y-7 sm:space-y-8">
          
          {/* Trust Badge Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-amber-400/30 text-xs text-amber-400 font-bold shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Professional Driver Recruitment Network</span>
          </div>

          {/* Headline & Subtitle */}
          <div className="space-y-3.5 max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-display text-white leading-[1.15] drop-shadow-md">
              Drive Your Career Forward with <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400">Driver Hub</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-200 max-w-2xl mx-auto font-normal leading-relaxed drop-shadow">
              Connecting verified commercial and personal drivers directly with top logistics fleets, corporate employers, and private vehicle owners. Direct hiring, verified licenses, zero agency cuts.
            </p>
          </div>

          {/* Value proposition key highlights */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-slate-200 max-w-3xl mx-auto">
            <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/70 backdrop-blur-md border border-white/15 text-[11px] sm:text-xs font-semibold shadow">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Direct Hiring
            </span>
            <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/70 backdrop-blur-md border border-white/15 text-[11px] sm:text-xs font-semibold shadow">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" /> 100% RTO Verified
            </span>
            <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/70 backdrop-blur-md border border-white/15 text-[11px] sm:text-xs font-semibold shadow">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> ₹25k - ₹50k/mo Salary
            </span>
            <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/70 backdrop-blur-md border border-white/15 text-[11px] sm:text-xs font-semibold shadow">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Zero Commission
            </span>
          </div>

          {/* ========================================================= */}
          {/* MOBILE STREAMLINED SEARCH & ACTIONS (No Clunky 4-Row Box) */}
          {/* ========================================================= */}
          <div className="lg:hidden space-y-3.5 max-w-md mx-auto pt-1">
            <form onSubmit={handleSearch} className="flex items-center bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-2xl border border-white/30 text-slate-800">
              <div className="flex-1 flex items-center gap-2 px-3 py-1.5 text-slate-800">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Search jobs, 'HMV', 'Cab', 'Chennai'..."
                  className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </form>

            {/* Mobile Quick Category Chips */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none text-xs">
              <button
                onClick={() => { setCategory('HMV'); navigate('/jobs?category=HMV'); }}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-900/75 backdrop-blur-md hover:bg-slate-900/90 border border-white/20 text-white font-medium flex items-center gap-1.5 text-[11px] transition-all shadow"
              >
                <span>🚛</span> Heavy HMV
              </button>
              <button
                onClick={() => { setCategory('LMV'); navigate('/jobs?category=LMV'); }}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-900/75 backdrop-blur-md hover:bg-slate-900/90 border border-white/20 text-white font-medium flex items-center gap-1.5 text-[11px] transition-all shadow"
              >
                <span>🚗</span> Chauffeur
              </button>
              <button
                onClick={() => { setCategory('Cab Driver'); navigate('/jobs?category=Cab+Driver'); }}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-900/75 backdrop-blur-md hover:bg-slate-900/90 border border-white/20 text-white font-medium flex items-center gap-1.5 text-[11px] transition-all shadow"
              >
                <span>🚕</span> Cab Driver
              </button>
              <button
                onClick={() => { setCategory('Delivery Driver'); navigate('/jobs?category=Delivery+Driver'); }}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-900/75 backdrop-blur-md hover:bg-slate-900/90 border border-white/20 text-white font-medium flex items-center gap-1.5 text-[11px] transition-all shadow"
              >
                <span>📦</span> Delivery
              </button>
              <button
                onClick={() => { setCategory('Bus Driver'); navigate('/jobs?category=Bus+Driver'); }}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-900/75 backdrop-blur-md hover:bg-slate-900/90 border border-white/20 text-white font-medium flex items-center gap-1.5 text-[11px] transition-all shadow"
              >
                <span>🚌</span> Bus
              </button>
            </div>

            {/* Mobile Dual Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Link
                to="/jobs"
                className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 px-3 rounded-xl text-xs shadow-lg transition-all text-center active:scale-95"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Browse Jobs</span>
              </Link>
              <Link
                to="/employer/post-job"
                className="flex items-center justify-center gap-1.5 bg-slate-900/80 hover:bg-slate-900 text-white font-bold py-3 px-3 rounded-xl text-xs border border-white/25 transition-all text-center active:scale-95 backdrop-blur-md shadow-lg"
              >
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Post Vacancy</span>
              </Link>
            </div>
          </div>

          {/* ========================================================= */}
          {/* DESKTOP SEARCH BAR (Sleek Integrated Glassmorphic Box) */}
          {/* ========================================================= */}
          <div className="hidden lg:block max-w-4xl mx-auto bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-2xl border border-white/30 text-slate-800 text-left">
            <form onSubmit={handleSearch} className="grid grid-cols-12 gap-2.5 items-center">
              {/* Keyword */}
              <div className="col-span-4 flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50/90 rounded-xl border border-slate-200">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Job title, 'HMV', 'Cab', 'Delivery'..."
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Driver Category */}
              <div className="col-span-3 flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50/90 rounded-xl border border-slate-200">
                <Truck className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-800 focus:outline-none cursor-pointer font-medium"
                >
                  <option value="">All Driver Types</option>
                  <option value="HMV">Heavy Truck (HMV)</option>
                  <option value="LMV">LMV / Chauffeur</option>
                  <option value="Cab Driver">Cab Driver</option>
                  <option value="Delivery Driver">Delivery Pilot</option>
                  <option value="Bus Driver">Bus Driver</option>
                  <option value="Trailer Driver">Trailer Driver</option>
                </select>
              </div>

              {/* Location */}
              <div className="col-span-3 flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50/90 rounded-xl border border-slate-200">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City (Bengaluru, Chennai...)"
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Search Button */}
              <div className="col-span-2">
                <button
                  type="submit"
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow transition-all duration-150 hover:scale-[1.02] cursor-pointer text-xs sm:text-sm"
                >
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </button>
              </div>
            </form>

            {/* Trending Tags & Pan-India Metros */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-3 text-xs text-slate-600 border-t border-slate-200/80 mt-2.5">
              <span className="font-bold text-slate-800">Pan-India Hubs:</span>
              <button onClick={() => { setLocation('Bengaluru'); navigate('/jobs?city=Bengaluru&state=Karnataka'); }} className="hover:text-blue-600 hover:underline cursor-pointer font-medium">
                Bengaluru
              </button>
              <span>•</span>
              <button onClick={() => { setLocation('Mumbai'); navigate('/jobs?city=Mumbai&state=Maharashtra'); }} className="hover:text-blue-600 hover:underline cursor-pointer font-medium">
                Mumbai
              </button>
              <span>•</span>
              <button onClick={() => { setLocation('Delhi NCR'); navigate('/jobs?city=Delhi+NCR'); }} className="hover:text-blue-600 hover:underline cursor-pointer font-medium">
                Delhi NCR
              </button>
              <span>•</span>
              <button onClick={() => { setLocation('Chennai'); navigate('/jobs?city=Chennai&state=Tamil+Nadu'); }} className="hover:text-blue-600 hover:underline cursor-pointer font-medium">
                Chennai
              </button>
              <span>•</span>
              <button onClick={() => { setLocation('Hyderabad'); navigate('/jobs?city=Hyderabad&state=Telangana'); }} className="hover:text-blue-600 hover:underline cursor-pointer font-medium">
                Hyderabad
              </button>
              <span>•</span>
              <button onClick={() => { setLocation('Pune'); navigate('/jobs?city=Pune&state=Maharashtra'); }} className="hover:text-blue-600 hover:underline cursor-pointer font-medium">
                Pune
              </button>
              <span>•</span>
              <button onClick={() => { setLocation('Ahmedabad'); navigate('/jobs?city=Ahmedabad&state=Gujarat'); }} className="hover:text-blue-600 hover:underline cursor-pointer font-medium">
                Ahmedabad
              </button>
              <span>•</span>
              <button onClick={() => { setLocation('Kolkata'); navigate('/jobs?city=Kolkata&state=West+Bengal'); }} className="hover:text-blue-600 hover:underline cursor-pointer font-medium">
                Kolkata
              </button>
            </div>
          </div>

          {/* Live platform statistics from the public aggregate endpoint */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 max-w-5xl mx-auto pt-6 sm:pt-8 text-slate-200 text-center">
            <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/15 shadow-lg">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-400 font-display">
                {stats ? stats.verifiedDrivers.toLocaleString('en-IN') : '—'}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">Verified Drivers</p>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/15 shadow-lg">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-400 font-display">
                {stats ? stats.verifiedEmployers.toLocaleString('en-IN') : '—'}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">Verified Fleet & Corporate Employers</p>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/15 shadow-lg">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-400 font-display">
                {stats ? stats.activeVacancies.toLocaleString('en-IN') : '—'}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">Active Job Openings</p>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/15 shadow-lg">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-400 font-display">
                {stats ? stats.hires.toLocaleString('en-IN') : '—'}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">Hired Applications</p>
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-300/90 text-center max-w-3xl mx-auto -mt-3">
            Live database totals refresh automatically. Driver counts require an approved driving license; hires count applications marked hired.
          </p>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: WHITE SECTION — FEATURED OPPORTUNITIES & VALUE PROPOSITIONS SLIDER */}
      {/* ========================================================================= */}
      <section className="relative -mt-6 z-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#08233F]">
              Featured Opportunities & Why Driver Hub
            </span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Hover or touch to pause • Smooth auto-scroll
          </span>
        </div>

        {/* Continuous Smooth Horizontal Marquee Stream */}
        <div className="w-full overflow-hidden py-2">
          <div className="animate-marquee-smooth flex gap-4">
            {[...siteAdCards, ...siteAdCards].map((card, idx) => (
              <Link
                key={idx}
                to={card.link}
                className="relative isolate w-80 min-h-[190px] shrink-0 overflow-hidden rounded-2xl border border-slate-200/90 shadow-subtle hover:shadow-card hover:border-amber-400 transition-all duration-200 group flex flex-col justify-between p-4"
              >
                <img src={card.image} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-br from-white/85 via-white/75 to-white/60 group-hover:from-white/80 group-hover:via-white/70 group-hover:to-white/55 transition-colors" />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${card.badgeColor}`}>
                      {card.badge}
                    </span>
                    <span className="text-xl">{card.icon}</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#08233F] group-hover:text-blue-700 transition-colors line-clamp-1">
                    {card.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {card.subtitle}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700 group-hover:text-blue-900">
                  <span>{card.cta}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: WHITE SECTION — POPULAR DRIVING SPECIALIZATIONS */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider mb-2 border border-amber-200/80">
              <Briefcase className="w-3.5 h-3.5 text-amber-600" /> Explore by License & Category
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#08233F] font-display">
              Popular Driving Specializations
            </h2>
          </div>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline"
          >
            Browse All Categories <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat, idx) => (
            <Link
              key={idx}
              to={`/jobs?category=${encodeURIComponent(cat.filter)}`}
              className="group relative isolate min-h-[224px] overflow-hidden rounded-2xl border border-slate-200/90 shadow-subtle hover:shadow-card hover:border-amber-400 transition-all flex flex-col justify-between p-5"
            >
              <img src={cat.image} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-br from-white/85 via-white/75 to-white/60 group-hover:from-white/80 group-hover:via-white/70 group-hover:to-white/55 transition-colors" />
              <div className="space-y-2">
                <span className="text-3xl block group-hover:scale-105 transition-transform">{cat.icon}</span>
                <h3 className="text-sm font-bold text-[#08233F] group-hover:text-blue-700 transition-colors">
                  {cat.label}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {cat.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-slate-700">
                <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full text-[11px] font-bold border border-blue-200/60">
                  {categoryVacancyCount(cat.filter)?.toLocaleString('en-IN') ?? '—'} Vacancies
                </span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-slate-500 group-hover:text-blue-700" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: LIGHT GRAY SECTION — HOW DRIVER HUB WORKS (3 Steps) */}
      {/* ========================================================================= */}
      <section className="bg-slate-100/90 py-16 px-4 sm:px-6 lg:px-8 border-y border-slate-200/90">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#08233F] font-display">
              How Driver Hub Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Simple, transparent recruitment connecting candidates with employers in 3 easy steps.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* For Drivers */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-subtle space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center font-bold text-lg">
                  🚗
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#08233F]">For Drivers & Job Seekers</h3>
                  <p className="text-xs text-slate-500">Get hired by verified employers with top salaries</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <span className="w-6 h-6 rounded-full bg-[#08233F] text-amber-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Create Profile & Upload License</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Enter your vehicle category (LMV/HMV), driving experience, and upload a photo of your license for instant verification.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <span className="w-6 h-6 rounded-full bg-[#08233F] text-amber-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Search & 1-Tap Apply</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Browse jobs matching your preferred location and vehicle type. Apply directly without paying any agency commission.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <span className="w-6 h-6 rounded-full bg-[#08233F] text-amber-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Get Shortlisted & Hired</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Receive real-time notifications when employers shortlist you, attend a driving trial, and start earning.</p>
                  </div>
                </div>
              </div>

              <Link
                to="/register?role=driver"
                className="inline-flex items-center justify-center w-full gap-2 bg-[#08233F] hover:bg-[#051626] text-white font-bold py-3 rounded-xl text-xs shadow-subtle transition-all duration-150 cursor-pointer"
              >
                Register as a Driver <ArrowRight className="w-4 h-4 text-amber-400" />
              </Link>
            </div>

            {/* For Employers */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-subtle space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 flex items-center justify-center font-bold text-lg">
                  🏢
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#08233F]">For Employers & Fleet Owners</h3>
                  <p className="text-xs text-slate-500">Hire verified, disciplined drivers in record time</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Post Vacancy with Specifics</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Set required vehicle licenses, salary brackets, working hours, and location. Our admin team verifies all listings.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Review Verified Candidate Profiles</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Filter applicant pool by experience years, license legitimacy, past routes, and verified document attachments.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Shortlist & Schedule Driving Tests</h4>
                    <p className="text-xs text-slate-500 mt-0.5">1-click shortlist candidates, reveal verified phone numbers, and coordinate trial drives directly.</p>
                  </div>
                </div>
              </div>

              <Link
                to="/register?role=employer"
                className="inline-flex items-center justify-center w-full gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 rounded-xl text-xs shadow-subtle transition-all duration-150 cursor-pointer"
              >
                Hire Drivers for Your Fleet <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5: WHITE SECTION — FEATURED DRIVER OPENINGS */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider mb-2 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Handpicked & Admin-Verified
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#08233F] font-display">
              Featured Driver Openings
            </h2>
          </div>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline"
          >
            View All {DataStore.getJobs().length} Jobs <ArrowRight className="w-4 h-4" />
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
                  alert('Please log in as a driver to save jobs.');
                  return;
                }
                const wasSaved = savedJobIds.includes(jobId);
                const saved = await DataStore.toggleFavorite(user.id, jobId);
                if (saved === wasSaved) {
                  alert('Could not update saved jobs. Check your connection and try again.');
                  return;
                }
                loadData();
              }}
            />
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 6: LIGHT GRAY SECTION — TRUSTED EMPLOYERS SHOWCASE */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Top Hiring Partners</span>
          <h2 className="text-2xl font-extrabold text-[#08233F] font-display">
            Trusted by Leading Fleets & Enterprises
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {DataStore.getEmployers().map((emp) => (
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
                <p className="text-[11px] text-slate-400">{emp.industry}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Partner
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 7: NAVY CTA BANNER (High Impact & Restrained) */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden bg-gradient-to-r from-[#08233F] to-[#173E68] rounded-3xl p-8 sm:p-12 text-white shadow-elevated flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display leading-tight">
              Ready to Hire or Start Driving Today?
            </h2>
            <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
              Join thousands of verified drivers and leading transport companies already building their future on Driver Hub.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
            <Link
              to="/jobs"
              className="w-full sm:w-auto text-center px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-subtle transition-all duration-150 hover:scale-[1.02] cursor-pointer"
            >
              Find Driver Jobs
            </Link>
            <Link
              to="/employer/post-job"
              className="w-full sm:w-auto text-center px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs sm:text-sm border border-white/20 transition-all cursor-pointer"
            >
              Post a Driver Vacancy
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
