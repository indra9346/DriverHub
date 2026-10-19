import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { AIChatbot } from '../components/common/AIChatbot';
import { RoutePageBoundary } from '../components/common/RoutePageBoundary';
// Loaded with the layout (not lazily) so it sees Supabase's PASSWORD_RECOVERY
// event and the recovery link before the reset page itself has loaded.
import '../services/publicApi';

/** Renders `children` in place of the routed page when given. */
export const PublicLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
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
      <Footer />
      <AIChatbot />
    </div>
  );
};
