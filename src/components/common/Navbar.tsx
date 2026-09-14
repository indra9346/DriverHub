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

  const handleLogout = () => {
    DataStore.setCurrentUser(null);
    setIsUserMenuOpen(false);
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
                {/* Employer Post Job button shortcut */}
                {currentUser.role === 'employer' && (
                  <Link
                    to="/employer/post-job"
                    className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-xs transition-all duration-150 hover:scale-[1.02]"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Post a Job
                  </Link>
                )}

                {/* Notifications */}
                <NotificationBell userId={currentUser.id} />

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1.5 pr-3 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors focus:outline-none"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#08233F] text-amber-400 font-bold flex items-center justify-center text-xs shadow-xs">
                      {currentUser.role === 'admin' ? 'AD' : currentUser.role === 'employer' ? 'EM' : 'DR'}
                    </div>
                    <div className="text-left text-xs">
                      <div className="font-semibold text-slate-900 capitalize leading-tight">
                        {currentUser.role}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[100px]">
                        {currentUser.email.split('@')[0]}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-elevated border border-slate-200/90 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-100">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-900 truncate">{currentUser.email}</p>
                        <span className="inline-block mt-0.5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          {currentUser.role} portal
                        </span>
                      </div>

                      <Link
                        to={getDashboardPath()}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                      >
                        <LayoutDashboard className="w-4 h-4 text-slate-400" /> Dashboard
                      </Link>

                      {currentUser.role === 'driver' && (
                        <>
                          <Link
                            to="/driver/applications"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                          >
                            <FileText className="w-4 h-4 text-slate-400" /> My Applications
                          </Link>
                          <Link
                            to="/driver/saved"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                          >
                            <Heart className="w-4 h-4 text-slate-400" /> Saved Jobs
                          </Link>
                          <Link
                            to="/driver/profile"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                          >
                            <User className="w-4 h-4 text-slate-400" /> My Profile
                          </Link>
                        </>
                      )}

                      {currentUser.role === 'employer' && (
                        <>
                          <Link
                            to="/employer/jobs"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                          >
                            <Briefcase className="w-4 h-4 text-slate-400" /> Manage Jobs
                          </Link>
                          <Link
                            to="/employer/company"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                          >
                            <Building2 className="w-4 h-4 text-slate-400" /> Company Profile
                          </Link>
                        </>
                      )}

                      {currentUser.role === 'admin' && (
                        <Link
                          to="/admin/jobs"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <Shield className="w-4 h-4 text-slate-400" /> Moderation Queue
                        </Link>
                      )}

                      <div className="border-t border-slate-100 my-1" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-semibold"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
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

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <nav className="space-y-1">
            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-tight uppercase ${
                isActive('/') ? 'bg-slate-100 text-[#08233F]' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Home
            </Link>
            <Link
              to="/jobs"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-tight uppercase ${
                isActive('/jobs') ? 'bg-slate-100 text-[#08233F]' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Find Jobs
            </Link>
            <Link
              to="/companies"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-tight uppercase ${
                isActive('/companies') ? 'bg-slate-100 text-[#08233F]' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Top Employers
            </Link>
            <Link
              to="/about"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-tight uppercase ${
                isActive('/about') ? 'bg-slate-100 text-[#08233F]' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              About
            </Link>
            <Link
              to="/contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-tight uppercase ${
                isActive('/contact') ? 'bg-slate-100 text-[#08233F]' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Contact
            </Link>
          </nav>

          <div className="pt-3 border-t border-slate-100">
            {currentUser ? (
              <div className="space-y-2">
                <div className="px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200/80">
                  <p className="text-xs font-semibold text-slate-900">{currentUser.email}</p>
                  <p className="text-[11px] text-slate-500 capitalize">{currentUser.role} Account</p>
                </div>
                <Link
                  to={getDashboardPath()}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-2.5 bg-[#08233F] text-white font-bold rounded-xl text-xs"
                >
                  Go to Dashboard
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-center px-4 py-2.5 text-red-600 hover:bg-red-50 font-bold rounded-xl text-xs border border-red-200"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-center px-4 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-center px-4 py-2.5 bg-[#08233F] text-white font-bold rounded-xl text-xs"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
