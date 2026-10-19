import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { AIChatbot } from '../components/common/AIChatbot';
import { RoutePageBoundary } from '../components/common/RoutePageBoundary';
// Loaded with the layout (not lazily) so it sees Supabase's PASSWORD_RECOVERY
// event and the recovery link before the reset page itself has loaded.
import '../services/publicApi';

export const PublicLayout: React.FC = () => {
  const location = useLocation();
  return (
    // overflow-x-clip (not hidden) guards phones against sideways scrolling
    // without breaking the sticky header.
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] overflow-x-clip">
      <Navbar />
      <main className="flex-1">
        <RoutePageBoundary key={location.pathname}>
          <Outlet />
        </RoutePageBoundary>
      </main>
      <Footer />
      <AIChatbot />
    </div>
  );
};
