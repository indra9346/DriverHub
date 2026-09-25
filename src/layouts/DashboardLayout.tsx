import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link, NavLink } from 'react-router-dom';
import { 
  Menu, Sparkles, LayoutDashboard, Search, FileText, FileCheck, User,
  PlusCircle, Briefcase, Users, Building2, ShieldCheck, Settings 
} from 'lucide-react';
import { Navbar } from '../components/common/Navbar';
import { Sidebar, getNavLinks } from '../components/common/Sidebar';
import { AIChatbot } from '../components/common/AIChatbot';
import { DataStore } from '../services/store';
import { supabase } from '../services/supabaseClient';
import { UserRole } from '../types';

interface DashboardLayoutProps {
  requiredRole?: UserRole;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ requiredRole }) => {
  const [currentUser, setCurrentUser] = useState(DataStore.getCurrentUser());
  const [sessionReady, setSessionReady] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let live = true;
    const demoAuth = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true';
    if (demoAuth) {
      setSessionReady(true);
      return () => { live = false; };
    }
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const stored = DataStore.getCurrentUser();
      if (!live) return;
      if (!data.user || !stored || stored.id !== data.user.id) {
        DataStore.setCurrentUser(null);
        setCurrentUser(null);
        setSessionReady(true);
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('role,status').eq('id', data.user.id).maybeSingle();
      if (!live) return;
      if (!profile || profile.role !== stored.role || profile.status === 'blocked' || profile.status === 'suspended') {
        await supabase.auth.signOut();
        DataStore.setCurrentUser(null);
        setCurrentUser(null);
      } else {
        const verified = { ...stored, status: profile.status === 'suspended' ? 'blocked' as const : profile.status };
        DataStore.setCurrentUser(verified);
        setCurrentUser(verified);
      }
      setSessionReady(true);
    })().catch(() => {
      if (!live) return;
      DataStore.setCurrentUser(null);
      setCurrentUser(null);
      setSessionReady(true);
    });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const handleStorage = () => {
      setCurrentUser(DataStore.getCurrentUser());
    };
    window.addEventListener('driverhub_storage_updated', handleStorage);
    return () => window.removeEventListener('driverhub_storage_updated', handleStorage);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login?redirect=' + encodeURIComponent(location.pathname));
      return;
    }

    if (requiredRole && currentUser.role !== requiredRole) {
      // Redirect to user's proper role dashboard
      if (currentUser.role === 'employer') navigate('/employer/dashboard');
      else if (currentUser.role === 'driver') navigate('/driver/dashboard');
      else navigate('/admin/dashboard');
    }
  }, [currentUser, requiredRole, location.pathname, navigate]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  if (!sessionReady || !currentUser || (requiredRole && currentUser.role !== requiredRole)) {
    return null;
  }

  const unreadNotifs = DataStore.getNotifications(currentUser.id).filter(n => !n.read).length;

  const roleTitle = currentUser.role === 'admin' 
    ? 'Admin Control' 
    : currentUser.role === 'employer' 
    ? 'Employer Desk' 
    : 'Driver Portal';

  // Determine current section title
  const navLinks = getNavLinks(currentUser.role, unreadNotifs);
  const currentNav = navLinks.find(link => location.pathname === link.to) 
    || navLinks.find(link => location.pathname.startsWith(link.to) && link.to !== '/driver/dashboard' && link.to !== '/employer/dashboard' && link.to !== '/admin/dashboard');
  const currentSectionTitle = currentNav?.label || 'Overview';

  // Bottom quick tabs for mobile
  const getBottomTabs = () => {
    if (currentUser.role === 'driver') {
      return [
        { to: '/driver/dashboard', label: 'Home', icon: LayoutDashboard },
        { to: '/jobs', label: 'Jobs', icon: Search },
        { to: '/driver/applications', label: 'Applied', icon: FileText },
        { to: '/driver/profile', label: 'Profile', icon: User },
      ];
    } else if (currentUser.role === 'employer') {
      return [
        { to: '/employer/dashboard', label: 'Home', icon: LayoutDashboard },
        { to: '/employer/post-job', label: '+ Post', icon: PlusCircle, highlight: true },
        { to: '/employer/jobs', label: 'Jobs', icon: Briefcase },
        { to: '/employer/applications', label: 'Pipeline', icon: FileText },
      ];
    } else {
      return [
        { to: '/admin/dashboard', label: 'Home', icon: LayoutDashboard },
        { to: '/admin/jobs', label: 'Queue', icon: ShieldCheck },
        { to: '/admin/employers', label: 'Fleets', icon: Building2 },
        { to: '/admin/documents', label: 'Documents', icon: FileCheck },
        { to: '/admin/candidates', label: 'Talent', icon: Users },
      ];
    }
  };

  const bottomTabs = getBottomTabs();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />

      {/* Mobile Portal Sticky Context Header */}
      <div className="lg:hidden sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 py-2.5 shadow-2xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-800 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {roleTitle}
            </span>
            <span className="text-xs font-bold text-slate-900 truncate">
              {currentSectionTitle}
            </span>
          </div>

          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#08233F] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#051626] transition-colors shrink-0 cursor-pointer"
          >
            <Menu className="w-3.5 h-3.5 text-amber-400" />
            <span>Menu</span>
            {unreadNotifs > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                {unreadNotifs}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Layout with Responsive Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar 
          role={currentUser.role} 
          unreadCount={unreadNotifs}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Sleek Mobile Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-1.5 shadow-elevated safe-area-bottom">
        <div className="flex items-center justify-around">
          {bottomTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to.endsWith('dashboard')}
                className={({ isActive }) => `
                  flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all min-w-[54px]
                  ${
                    isActive
                      ? 'text-[#08233F]'
                      : 'text-slate-500 hover:text-slate-900'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <div className={`p-1 rounded-lg transition-all ${
                      isActive 
                        ? 'bg-amber-400 text-slate-950 shadow-xs scale-105' 
                        : tab.highlight 
                        ? 'bg-amber-100 text-amber-900' 
                        : 'text-slate-600'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`mt-0.5 leading-none ${isActive ? 'font-extrabold text-[#08233F]' : ''}`}>
                      {tab.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}

          {/* More / Menu Drawer Toggle in Bottom Bar */}
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-bold text-slate-500 hover:text-slate-900 min-w-[54px] cursor-pointer"
          >
            <div className="p-1 rounded-lg text-slate-600 relative">
              <Menu className="w-4 h-4" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full" />
              )}
            </div>
            <span className="mt-0.5 leading-none">More</span>
          </button>
        </div>
      </nav>

      <AIChatbot />
    </div>
  );
};
