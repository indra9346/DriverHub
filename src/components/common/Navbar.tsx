import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, X, Briefcase, Building2, User, LogIn, LogOut, ChevronDown, 
  Shield, Heart, FileText, Settings, LayoutDashboard, PlusCircle, Sparkles 
} from 'lucide-react';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';
import { DataStore } from '../../services/store';
import { User as UserType } from '../../types';

export const Navbar: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserType | null>(DataStore.getCurrentUser());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleStorageUpdate = () => {
      setCurrentUser(DataStore.getCurrentUser());
    };
    window.addEventListener('driverhub_storage_updated', handleStorageUpdate);
    return () => window.removeEventListener('driverhub_storage_updated', handleStorageUpdate);
  }, []);

  // Always close mobile navigation menu and user dropdown on any route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    DataStore.setCurrentUser(null);
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (!currentUser) return '/login';
    if (currentUser.role === 'admin') return '/admin/dashboard';
    if (currentUser.role === 'employer') return '/employer/dashboard';
    return '/driver/dashboard';
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/98 backdrop-blur-xs border-b border-slate-200/90 shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Logo size="md" />

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className={`px-3.5 py-2 text-xs font-bold tracking-tight uppercase transition-all duration-150 ${
                  isActive('/') 
                    ? 'text-[#08233F] border-b-2 border-amber-500 font-extrabold' 
                    : 'text-slate-600 hover:text-[#08233F] hover:bg-slate-50/80 rounded-lg'
                }`}
              >
                Home
              </Link>
              <Link
                to="/jobs"
                className={`px-3.5 py-2 text-xs font-bold tracking-tight uppercase transition-all duration-150 ${
                  isActive('/jobs') 
                    ? 'text-[#08233F] border-b-2 border-amber-500 font-extrabold' 
                    : 'text-slate-600 hover:text-[#08233F] hover:bg-slate-50/80 rounded-lg'
                }`}
              >
                Find Jobs
              </Link>
              <Link
                to="/companies"
                className={`px-3.5 py-2 text-xs font-bold tracking-tight uppercase transition-all duration-150 ${
                  isActive('/companies') 
                    ? 'text-[#08233F] border-b-2 border-amber-500 font-extrabold' 
                    : 'text-slate-600 hover:text-[#08233F] hover:bg-slate-50/80 rounded-lg'
                }`}
              >
                Top Employers
              </Link>
              <Link
                to="/about"
                className={`px-3.5 py-2 text-xs font-bold tracking-tight uppercase transition-all duration-150 ${
                  isActive('/about') 
                    ? 'text-[#08233F] border-b-2 border-amber-500 font-extrabold' 
                    : 'text-slate-600 hover:text-[#08233F] hover:bg-slate-50/80 rounded-lg'
                }`}
              >
                About
              </Link>
              <Link
                to="/contact"
                className={`px-3.5 py-2 text-xs font-bold tracking-tight uppercase transition-all duration-150 ${
                  isActive('/contact') 
                    ? 'text-[#08233F] border-b-2 border-amber-500 font-extrabold' 
                    : 'text-slate-600 hover:text-[#08233F] hover:bg-slate-50/80 rounded-lg'
                }`}
              >
                Contact
              </Link>
            </nav>
          </div>

          {/* Right Action Area */}
          <div className="hidden md:flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                {/* Employer Available Credits Pill & Post Job shortcut (Matches Screenshot 7) */}
                {currentUser.role === 'employer' && (
                  <>
                    <Link
                      to="/employer/billing"
                      className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs transition-colors"
                    >
                      <span className="text-slate-700">💳 Available credits</span>
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold">
                        {DataStore.getSubscription(currentUser.id).dbUnlockCredits}
                      </span>
                    </Link>

                    <Link
                      to="/employer/post-job"
                      className="flex items-center gap-1.5 bg-[#19745B] hover:bg-[#135A46] text-white font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-xs transition-all duration-150"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Post a new job
                    </Link>
                  </>
                )}

                {/* Notifications */}
                <NotificationBell userId={currentUser.id} />

                {/* User Dropdown (Matches Screenshot 7: Avatar Circle + Name + Phone + View profile + Company profile + Sign out) */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1 pr-2.5 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#3A2E39] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                      {currentUser.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left text-xs">
                      <div className="font-semibold text-slate-900 capitalize leading-tight">
                        {currentUser.role === 'employer'
                          ? DataStore.getEmployerById(currentUser.id)?.contactPerson?.split(' ')[0] || 'Employer'
                          : currentUser.role === 'driver'
                          ? DataStore.getDriverById(currentUser.id)?.fullName?.split(' ')[0] || 'Driver'
                          : 'Admin'}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[100px]">
                        {currentUser.phone || currentUser.email.split('@')[0]}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-elevated border border-slate-200/90 py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-100">
                      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#3A2E39] text-white font-bold flex items-center justify-center text-xs shrink-0">
                          {currentUser.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-slate-900 truncate">
                            {currentUser.role === 'employer'
                              ? DataStore.getEmployerById(currentUser.id)?.contactPerson || 'Deepa Nair'
                              : currentUser.role === 'driver'
                              ? DataStore.getDriverById(currentUser.id)?.fullName || 'Ravi Kumar'
                              : 'Platform Admin'}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {currentUser.phone || '9341556688'}
                          </p>
                        </div>
                      </div>

                      <Link
                        to={getDashboardPath()}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-semibold"
                      >
                        <LayoutDashboard className="w-4 h-4 text-slate-500" /> Dashboard
                      </Link>

                      {currentUser.role === 'driver' && (
                        <>
                          <Link
                            to="/driver/profile"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-semibold"
                          >
                            <User className="w-4 h-4 text-slate-500" /> View profile
                          </Link>
                          <Link
                            to="/driver/applications"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-semibold"
                          >
                            <FileText className="w-4 h-4 text-slate-500" /> My Applications
                          </Link>
                          <Link
                            to="/driver/saved"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-semibold"
                          >
                            <Heart className="w-4 h-4 text-slate-500" /> Saved Jobs
                          </Link>
                        </>
                      )}

                      {currentUser.role === 'employer' && (
                        <>
                          <Link
                            to="/employer/company"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-semibold"
                          >
                            <User className="w-4 h-4 text-slate-500" /> View profile
                          </Link>
                          <Link
                            to="/employer/company"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-semibold"
                          >
                            <Building2 className="w-4 h-4 text-slate-500" /> Company profile
                          </Link>
                          <Link
                            to="/employer/candidates"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-semibold"
                          >
                            <Briefcase className="w-4 h-4 text-slate-500" /> Driver Database
                          </Link>
                          <Link
                            to="/employer/billing"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-semibold"
                          >
                            <Settings className="w-4 h-4 text-slate-500" /> Billing & Credits
                          </Link>
                        </>
                      )}

                      {currentUser.role === 'admin' && (
                        <Link
                          to="/admin/jobs"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-semibold"
                        >
                          <Shield className="w-4 h-4 text-slate-500" /> Moderation Queue
                        </Link>
                      )}

                      <div className="border-t border-slate-100 my-1" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 font-bold cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" /> Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-[#08233F] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-[#08233F] hover:bg-[#051626] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-all duration-150 hover:scale-[1.02]"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            {currentUser && <NotificationBell userId={currentUser.id} />}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-[#08233F] rounded-xl hover:bg-slate-100"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 top-16 bg-slate-950/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-4 max-h-[calc(100vh-4.5rem)] overflow-y-auto shadow-2xl animate-in slide-in-from-top-2 duration-150">
            {/* User Profile Header (Mobile) */}
            {currentUser ? (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#08233F] text-amber-400 font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                    {currentUser.role === 'admin' ? 'AD' : currentUser.role === 'employer' ? 'EM' : 'DR'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{currentUser.email}</p>
                    <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 mt-0.5">
                      {currentUser.role} Portal
                    </span>
                  </div>
                </div>

                {/* Portal Quick Links */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-200/60">
                  <Link
                    to={getDashboardPath()}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-white bg-slate-100/70 border border-slate-200/60 transition-colors"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-brand-navy shrink-0" />
                    <span className="truncate">Dashboard</span>
                  </Link>

                  {currentUser.role === 'driver' && (
                    <>
                      <Link
                        to="/driver/applications"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-white bg-slate-100/70 border border-slate-200/60 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                        <span className="truncate">Applications</span>
                      </Link>
                      <Link
                        to="/driver/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-white bg-slate-100/70 border border-slate-200/60 transition-colors"
                      >
                        <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">My Profile</span>
                      </Link>
                      <Link
                        to="/driver/saved"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-white bg-slate-100/70 border border-slate-200/60 transition-colors"
                      >
                        <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">Saved Jobs</span>
                      </Link>
                    </>
                  )}

                  {currentUser.role === 'employer' && (
                    <>
                      <Link
                        to="/employer/post-job"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-amber-950 bg-amber-100/80 border border-amber-300 hover:bg-amber-200 transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span className="truncate">Post Vacancy</span>
                      </Link>
                      <Link
                        to="/employer/jobs"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-white bg-slate-100/70 border border-slate-200/60 transition-colors"
                      >
                        <Briefcase className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">Manage Jobs</span>
                      </Link>
                      <Link
                        to="/employer/applications"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-white bg-slate-100/70 border border-slate-200/60 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                        <span className="truncate">Candidates</span>
                      </Link>
                    </>
                  )}

                  {currentUser.role === 'admin' && (
                    <>
                      <Link
                        to="/admin/jobs"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-white bg-slate-100/70 border border-slate-200/60 transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">Moderation</span>
                      </Link>
                      <Link
                        to="/admin/employers"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-white bg-slate-100/70 border border-slate-200/60 transition-colors"
                      >
                        <Building2 className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                        <span className="truncate">Fleets</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-center px-4 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-center px-4 py-2.5 bg-[#08233F] text-white font-bold rounded-xl text-xs shadow-xs hover:bg-[#051626] transition-colors"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Public Navigation Links */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3.5 block mb-1">
                Navigation
              </span>
              <nav className="space-y-1">
                <Link
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3.5 py-2 rounded-xl text-xs font-bold tracking-tight uppercase ${
                    isActive('/') ? 'bg-slate-100 text-[#08233F]' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Home
                </Link>
                <Link
                  to="/jobs"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3.5 py-2 rounded-xl text-xs font-bold tracking-tight uppercase ${
                    isActive('/jobs') ? 'bg-slate-100 text-[#08233F]' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Find Jobs
                </Link>
                <Link
                  to="/companies"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3.5 py-2 rounded-xl text-xs font-bold tracking-tight uppercase ${
                    isActive('/companies') ? 'bg-slate-100 text-[#08233F]' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Top Employers
                </Link>
                <Link
                  to="/about"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3.5 py-2 rounded-xl text-xs font-bold tracking-tight uppercase ${
                    isActive('/about') ? 'bg-slate-100 text-[#08233F]' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  About
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3.5 py-2 rounded-xl text-xs font-bold tracking-tight uppercase ${
                    isActive('/contact') ? 'bg-slate-100 text-[#08233F]' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Contact
                </Link>
              </nav>
            </div>

            {currentUser && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 font-bold rounded-xl text-xs border border-red-200 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
