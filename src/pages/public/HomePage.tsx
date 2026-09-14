import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, MapPin, Truck, ShieldCheck, Briefcase, Users, Award, 
  ArrowRight, CheckCircle2, Star, Sparkles, Building2, ChevronRight, 
  IndianRupee, Phone, Check, Clock, Zap, Shield, FileCheck, DollarSign, Bell
} from 'lucide-react';
import { DataStore } from '../../services/store';
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

  // Statistics Viewport Animation (fires ONCE)
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsAnimated, setStatsAnimated] = useState(false);
  const [counts, setCounts] = useState({ drivers: 0, employers: 0, jobs: 0, placement: 0 });

  const loadData = () => {
    const active = DataStore.getJobs().filter(j => j.status === 'active');
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

  // Intersection Observer for counting numbers once
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !statsAnimated) {
          setStatsAnimated(true);
          const duration = 1200;
          const steps = 30;
          const stepTime = duration / steps;
          let currentStep = 0;

          const timer = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;
            setCounts({
              drivers: Math.floor(12500 * progress),
              employers: Math.floor(450 * progress),
              jobs: Math.floor(850 * progress),
              placement: Math.floor(98 * progress),
            });

            if (currentStep >= steps) {
              clearInterval(timer);
              setCounts({ drivers: 12500, employers: 450, jobs: 850, placement: 98 });
            }
          }, stepTime);
        }
      },
      { threshold: 0.2 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, [statsAnimated]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.append('q', keyword);
    if (category) params.append('category', category);
    if (location) params.append('location', location);
    navigate(`/jobs?${params.toString()}`);
  };

  const categories = [
    { label: 'Heavy Truck (HMV)', icon: '🚛', count: 48, desc: 'Multi-axle, interstate & container transport' },
    { label: 'LMV Chauffeur', icon: '🚗', count: 92, desc: 'Personal, corporate sedans & luxury fleet' },
    { label: 'Cab Driver', icon: '🚕', count: 120, desc: 'App-based ride hailing & airport transfers' },
    { label: 'Delivery Driver', icon: '📦', count: 85, desc: 'E-commerce vans, 2-wheelers & hyperlocal' },
    { label: 'School / Staff Bus', icon: '🚌', count: 34, desc: 'Passenger transit & student shuttle' },
    { label: 'Tempo / Ace', icon: '🚚', count: 64, desc: 'Intra-city distribution & cargo logistics' },
    { label: '40ft Trailer Driver', icon: '🚜', count: 26, desc: 'Port container clearing & heavy haulage' },
    { label: 'Commercial Driver', icon: '🚐', count: 50, desc: 'Tour operations & outstation rentals' },
  ];

  // Professional Featured Recruitment & Platform Showcase Cards
  const siteAdCards = [
    {
      badge: '⚡ Direct Hiring',
      badgeColor: 'bg-amber-50 text-amber-900 border-amber-300',
      icon: '🤝',
      title: 'Zero Middlemen Commission',
      subtitle: 'Apply directly to 450+ verified transport and corporate fleets with 100% wage transparency.',
      cta: 'Explore Openings',
      link: '/jobs'
    },
    {
      badge: '🛡️ Verified Drivers',
      badgeColor: 'bg-emerald-50 text-emerald-900 border-emerald-300',
      icon: '✅',
      title: 'Get Verified & Hired 3x Faster',
      subtitle: 'Upload license & RTO documents once to earn the DriverHub Verified Badge for instant shortlists.',
      cta: 'Register as Driver',
      link: '/register?role=driver'
    },
    {
      badge: '💰 High Wage Guarantee',
      badgeColor: 'bg-blue-50 text-blue-900 border-blue-300',
      icon: '💵',
      title: '₹25,000 - ₹50,000/mo Salary',
      subtitle: 'Guaranteed base pay with documented overtime, food allowances, and route night stays.',
      cta: 'View High-Pay Jobs',
      link: '/jobs?sort=salary'
    },
    {
      badge: '🏢 Fleet Operators',
      badgeColor: 'bg-purple-50 text-purple-900 border-purple-300',
      icon: '🚛',
      title: 'Bharat Logistics & VRL Express',
      subtitle: 'National logistics fleets hiring Interstate HMV, Trailer & City Delivery Drivers today.',
      cta: 'View Top Employers',
      link: '/companies'
    },
    {
      badge: '🔔 Real-Time Alerts',
      badgeColor: 'bg-rose-50 text-rose-900 border-rose-300',
      icon: '📱',
      title: 'Instant SMS & Trial Updates',
      subtitle: 'Get notified immediately when employers view your profile or schedule driving trials.',
      cta: 'Create Free Account',
      link: '/register'
    },
    {
      badge: '⭐ VIP Chauffeur',
      badgeColor: 'bg-indigo-50 text-indigo-900 border-indigo-300',
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
      {/* SECTION 1: NAVY HERO (Unclipped, Generous Spacing, High Contrast) */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden bg-[#08233F] text-white pt-16 sm:pt-20 pb-20 sm:pb-24 px-4 sm:px-6 lg:px-8 shadow-md">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[radial-gradient(#F5A800_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="max-w-6xl mx-auto relative z-10 text-center space-y-8">
          
          {/* Trust Badge Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-xs border border-white/15 text-xs text-amber-400 font-bold shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>India's Premier Professional Driver Recruitment Network</span>
          </div>

          {/* Heading & Tagline */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-display text-white leading-tight">
              Drive Your Career Forward with <span className="text-amber-400">Driver Hub</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-200 max-w-2xl mx-auto font-normal leading-relaxed">
              Connecting verified commercial and personal drivers with top logistics fleets, corporate employers, and private vehicle owners. Direct hiring, verified licenses, zero agency cuts.
            </p>
          </div>

          {/* Integrated Floating Search Bar Box (Dominant White Surface) */}
          <div className="max-w-4xl mx-auto bg-white p-3.5 sm:p-4 rounded-2xl shadow-elevated border border-slate-200/90 text-slate-800 text-left">
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
              {/* Job Title / Keyword */}
              <div className="md:col-span-4 flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200/90">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Job title, 'HMV', 'Cab', 'Delivery'..."
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Driver Category */}
              <div className="md:col-span-3 flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200/90">
                <Truck className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-800 focus:outline-none cursor-pointer"
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

              {/* City / Location */}
              <div className="md:col-span-3 flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200/90">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City (Bengaluru, Chennai...)"
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Search Button */}
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full h-full min-h-[44px] flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-subtle transition-all duration-150 hover:scale-[1.02] cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </button>
              </div>
            </form>

            {/* Quick Keyword tags */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-3 text-xs text-slate-500 border-t border-slate-100 mt-2.5">
              <span className="font-bold text-slate-700">Trending:</span>
              <button onClick={() => { setCategory('HMV'); navigate('/jobs?category=HMV'); }} className="hover:text-blue-600 hover:underline cursor-pointer">
                Interstate HMV
              </button>
              <span>•</span>
              <button onClick={() => { setLocation('Bengaluru'); navigate('/jobs?location=Bengaluru'); }} className="hover:text-blue-600 hover:underline cursor-pointer">
                Bengaluru Sedans
              </button>
              <span>•</span>
              <button onClick={() => { setCategory('Delivery Driver'); navigate('/jobs?category=Delivery+Driver'); }} className="hover:text-blue-600 hover:underline cursor-pointer">
                Hyperlocal Delivery
              </button>
              <span>•</span>
              <button onClick={() => { setCategory('Bus Driver'); navigate('/jobs?category=Bus+Driver'); }} className="hover:text-blue-600 hover:underline cursor-pointer">
                School Buses
              </button>
            </div>
          </div>

          {/* Live Platform Stats Ticker with Viewport Animation */}
          <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-white/10 text-slate-200">
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-display">
                {statsAnimated ? `${counts.drivers.toLocaleString('en-IN')}+` : '12,500+'}
              </p>
              <p className="text-xs text-slate-300 mt-0.5">Verified Drivers</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-display">
                {statsAnimated ? `${counts.employers.toLocaleString('en-IN')}+` : '450+'}
              </p>
              <p className="text-xs text-slate-300 mt-0.5">Fleet & Corporate Employers</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-display">
                {statsAnimated ? `${counts.jobs.toLocaleString('en-IN')}+` : '850+'}
              </p>
              <p className="text-xs text-slate-300 mt-0.5">Active Job Openings</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-display">
                {statsAnimated ? `${counts.placement}%` : '98%'}
              </p>
              <p className="text-xs text-slate-300 mt-0.5">Placement Success Rate</p>
            </div>
          </div>
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
                className="w-80 shrink-0 p-4 bg-white rounded-2xl border border-slate-200/90 shadow-subtle hover:shadow-card hover:border-amber-400 transition-all duration-200 group flex flex-col justify-between"
              >
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
              to={`/jobs?category=${encodeURIComponent(cat.label.split(' ')[0])}`}
              className="group p-5 bg-white rounded-2xl border border-slate-200/90 shadow-subtle hover:shadow-card hover:border-amber-400 transition-all flex flex-col justify-between"
            >
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
                  {cat.count} Vacancies
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
              onToggleSave={(jobId) => {
                const user = DataStore.getCurrentUser();
                if (!user) {
                  alert('Please log in as a driver to save jobs.');
                  return;
                }
                DataStore.toggleFavorite(user.id, jobId);
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
            <div
              key={emp.id}
              className="p-5 bg-white rounded-2xl border border-slate-200/90 text-center space-y-2.5 shadow-subtle hover:shadow-card transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-50 mx-auto overflow-hidden border border-slate-200 flex items-center justify-center">
                {emp.logoUrl ? (
                  <img src={emp.logoUrl} alt={emp.companyName} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#08233F] line-clamp-1">{emp.companyName}</h4>
                <p className="text-[11px] text-slate-400">{emp.industry}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Partner
              </span>
            </div>
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
