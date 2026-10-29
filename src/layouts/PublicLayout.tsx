import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { House, Briefcase, Send, Building2, User } from 'lucide-react';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { AIChatbot } from '../components/common/AIChatbot';
import { RoutePageBoundary } from '../components/common/RoutePageBoundary';
import { MobileBottomNav } from '../components/common/MobileBottomNav';
import { DataStore } from '../services/store';
import { useLanguage } from '../services/i18n';
// Loaded with the layout (not lazily) so it sees Supabase's PASSWORD_RECOVERY
// event and the recovery link before the reset page itself has loaded.
import '../services/publicApi';

/** Renders `children` in place of the routed page when given. */
export const PublicLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState(DataStore.getCurrentUser());

  useEffect(() => {
    const handleStorageUpdate = () => setCurrentUser(DataStore.getCurrentUser());
    window.addEventListener('driverhub_storage_updated', handleStorageUpdate);
    return () => window.removeEventListener('driverhub_storage_updated', handleStorageUpdate);
  }, []);

  // Signed-in visitors go to their own profile; everyone else to sign in.
  const profileTab = currentUser?.role === 'employer'
    ? { to: '/employer/company' }
    : currentUser?.role === 'admin'
    ? { to: '/admin/settings' }
    : currentUser
    ? { to: '/driver/profile' }
    : { to: '/login', match: ['/register', '/forgot-password', '/reset-password'] };

  return (
    // overflow-x-clip (not hidden) guards phones against sideways scrolling
    // without breaking the sticky header.
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] overflow-x-clip">
      <Navbar />
      {/* At least one screen tall, so the footer never shows mid-screen while
          a page loads and then jumps down (layout shift). */}
      <main className="flex-1 min-h-[calc(100vh-4rem)] supports-[height:100dvh]:min-h-[calc(100dvh-4rem)]">
        <RoutePageBoundary key={location.pathname}>
          {children ?? <Outlet />}
        </RoutePageBoundary>
      </main>
      {/* On phones the footer runs on under the bottom bar so it never hides
          the last footer links. */}
      <div className="mt-auto bg-[#051626] pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
        <Footer />
      </div>
      <AIChatbot />
      <MobileBottomNav
        items={[
          { to: '/', label: t('Home'), icon: House },
          { to: '/jobs', label: t('navJobs'), icon: Briefcase, match: ['/search'] },
          { to: '/companies', label: t('navEmployers'), icon: Building2 },
          { ...profileTab, label: t('navProfile'), icon: User },
        ]}
        center={{ to: '/contact', label: t('navReachOut'), icon: Send, match: ['/help'] }}
      />
    </div>
  );
};
