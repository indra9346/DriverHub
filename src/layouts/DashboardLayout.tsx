import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, House, Search, FileText, FileCheck, User, MessageSquare,
  Plus, Briefcase, Users, Building2, ShieldCheck
} from 'lucide-react';
import { PublicLayout } from './PublicLayout';
import { NotFoundPage } from '../pages/public/NotFoundPage';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { Sidebar, getNavLinks } from '../components/common/Sidebar';
import { AIChatbot } from '../components/common/AIChatbot';
import { MobileBottomNav } from '../components/common/MobileBottomNav';
import { RoutePageBoundary } from '../components/common/RoutePageBoundary';
import { DataStore } from '../services/store';
import { supabase } from '../services/supabaseClient';
import { SupabaseSync } from '../services/supabaseSync';
import { useLanguage } from '../services/i18n';
import { UserRole } from '../types';
import { getDashboardPathForRole, getLoginPathForRole, inferRoleFromPath, isUserRole } from '../services/authRouting';

interface DashboardLayoutProps {
  requiredRole?: UserRole;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ requiredRole }) => {
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState(DataStore.getCurrentUser());
  const [sessionReady, setSessionReady] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let live = true;
    const signOutLocally = async () => {
      try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* local sign-out only */ }
      DataStore.clearSessionCaches();
      setCurrentUser(null);
    };
    void (async () => {
      // The stored session decides whether anyone is signed in; a network
      // failure while verifying it must not sign the user out.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!live) return;
      if (!sessionData.session) {
        DataStore.setCurrentUser(null);
        setCurrentUser(null);
        setSessionReady(true);
        return;
      }
      const { data, error: authError } = await supabase.auth.getUser();
      if (!live) return;
      if (authError || !data.user) {
        const status = (authError as { status?: number } | null)?.status;
        if (!authError || status === 401 || status === 403) {
          await signOutLocally();
        } else {
          // Offline or a transient error: keep the cached account for now.
          setCurrentUser(DataStore.getCurrentUser());
        }
        setSessionReady(true);
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role,status,email,phone,created_at')
        .eq('id', data.user.id)
        .maybeSingle();
      if (!live) return;
      if (profileError && !profile) {
        setCurrentUser(DataStore.getCurrentUser());
        setSessionReady(true);
        return;
      }
      if (!profile || !isUserRole(profile.role) || profile.status === 'blocked' || profile.status === 'suspended'
        || (profile.role === 'admin' && profile.status !== 'active')) {
        await signOutLocally();
      } else {
        const cachedUser = DataStore.getCurrentUser();
        const cachedUserId = cachedUser?.id;
        const verified = {
          id: data.user.id,
          email: data.user.email || profile.email || '',
          role: profile.role,
          status: profile.status || 'active',
          phone: profile.phone || undefined,
          createdAt: profile.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        };
        if (cachedUserId && cachedUserId !== verified.id) DataStore.clearSessionCaches();
        DataStore.addUser(verified);
        DataStore.setCurrentUser(verified);
        setCurrentUser(verified);
        // Restored session (new tab, cleared cache) or a role changed in the
        // database (an employer repaired, an account made admin): load this
        // account's data for its current role.
        if (cachedUserId !== verified.id || cachedUser?.role !== verified.role) {
          void SupabaseSync.fetchAndMergeRemoteData(DataStore).then(() => {
            window.dispatchEvent(new Event('driverhub_storage_updated'));
          });
        }
      }
      setSessionReady(true);
    })().catch(() => {
      if (!live) return;
      // Unexpected failure: keep whatever account is cached rather than logging out.
      setCurrentUser(DataStore.getCurrentUser());
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

  // An administrator can block an account while it is signed in.
  useEffect(() => {
    if (!sessionReady || currentUser?.status !== 'blocked') return;
    void (async () => {
      try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* local sign-out only */ }
      DataStore.clearSessionCaches();
      setCurrentUser(null);
    })();
  }, [currentUser?.status, sessionReady]);

  useEffect(() => {
    if (!sessionReady) return;
    // The admin portal is not advertised: anyone but a signed-in admin gets the
    // not-found page (rendered below), never a sign-in page or a redirect.
    if (requiredRole === 'admin' && currentUser?.role !== 'admin') return;

    if (!currentUser) {
      const role = requiredRole || inferRoleFromPath(location.pathname) || 'driver';
      const redirect = `${location.pathname}${location.search}${location.hash}`;
      navigate(getLoginPathForRole(role, redirect), { replace: true });
      return;
    }

    if (requiredRole && currentUser.role !== requiredRole) {
      navigate(getDashboardPathForRole(currentUser.role), { replace: true });
    }
  }, [currentUser, requiredRole, location.pathname, location.search, location.hash, navigate, sessionReady]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  // While the mobile drawer is open the page behind it must not scroll, and
  // Escape closes it.
  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isMobileSidebarOpen]);

  if (sessionReady && requiredRole === 'admin' && currentUser?.role !== 'admin') {
    return <PublicLayout><NotFoundPage /></PublicLayout>;
  }

  if (!sessionReady || !currentUser || (requiredRole && currentUser.role !== requiredRole)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm font-medium text-slate-500">
        {sessionReady ? 'Redirecting…' : 'Checking your session…'}
      </div>
    );
  }

  const unreadNotifs = DataStore.getNotifications(currentUser.id).filter(n => !n.read).length;

  const roleTitle = currentUser.role === 'admin' 
    ? t('Admin Control') 
    : currentUser.role === 'employer' 
    ? t('Employer Desk') 
    : t('Driver Portal');

  // Determine current section title
  const navLinks = getNavLinks(currentUser.role, unreadNotifs, t);
  const currentNav = navLinks.find(link => location.pathname === link.to) 
    || navLinks.find(link => location.pathname.startsWith(link.to) && link.to !== '/driver/dashboard' && link.to !== '/employer/dashboard' && link.to !== '/admin/dashboard');
  const currentSectionTitle = currentNav?.label || t('Dashboard');

  // Phone bottom bar: four tabs around a raised centre action, per role.
  // The sticky header's Menu button opens every other section.
  const bottomNav: Pick<React.ComponentProps<typeof MobileBottomNav>, 'items' | 'center'> =
    currentUser.role === 'driver'
      ? {
          items: [
            { to: '/driver/dashboard', label: t('Home'), icon: House },
            { to: '/driver/applications', label: t('navApplied'), icon: FileText },
            { to: '/driver/messages', label: t('navMessages'), icon: MessageSquare },
            { to: '/driver/profile', label: t('navProfile'), icon: User, match: ['/driver/documents'] },
          ],
          center: { to: '/jobs', label: t('navFindJobs'), icon: Search, match: ['/driver/jobs'] },
        }
      : currentUser.role === 'employer'
      ? {
          items: [
            { to: '/employer/dashboard', label: t('Home'), icon: House },
            { to: '/employer/jobs', label: t('navJobs'), icon: Briefcase },
            { to: '/employer/applications', label: t('navApplicants'), icon: FileText },
            { to: '/employer/company', label: t('navCompany'), icon: Building2 },
          ],
          center: { to: '/employer/post-job', label: t('navPostJob'), icon: Plus },
        }
      : {
          items: [
            { to: '/admin/dashboard', label: t('Home'), icon: House },
            { to: '/admin/employers', label: t('navEmployers'), icon: Building2 },
            { to: '/admin/documents', label: t('navDocs'), icon: FileCheck },
            { to: '/admin/candidates', label: t('navDrivers'), icon: Users },
          ],
          center: { to: '/admin/jobs', label: t('navReview'), icon: ShieldCheck },
        };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />

      {/* Mobile Portal Sticky Context Header */}
      <div className="lg:hidden sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 py-2.5 shadow-2xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-800 min-w-0 max-w-[55%] shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate">{roleTitle}</span>
            </span>
            <span className="text-xs font-bold text-slate-900 truncate">
              {currentSectionTitle}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label="Open menu"
            aria-expanded={isMobileSidebarOpen}
            className="min-h-10 flex items-center gap-1.5 px-3 py-1.5 bg-[#08233F] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#051626] transition-colors shrink-0 cursor-pointer"
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

      {/* Main Content Layout with Responsive Sidebar. At least one screen tall,
          so the footer does not jump down once the page has loaded. */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto min-h-[calc(100vh-4rem)] supports-[height:100dvh]:min-h-[calc(100dvh-4rem)]">
        <Sidebar 
          role={currentUser.role} 
          unreadCount={unreadNotifs}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-8">
          <RoutePageBoundary key={location.pathname}>
            <Outlet />
          </RoutePageBoundary>
        </main>
      </div>

      {/* On phones the footer runs on under the bottom bar. */}
      <div className="bg-[#051626] pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
        <Footer />
      </div>

      <MobileBottomNav items={bottomNav.items} center={bottomNav.center} />

      <AIChatbot />
    </div>
  );
};
