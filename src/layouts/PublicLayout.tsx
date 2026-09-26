import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { AIChatbot } from '../components/common/AIChatbot';
import { RoutePageBoundary } from '../components/common/RoutePageBoundary';

export const PublicLayout: React.FC = () => {
  const location = useLocation();
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
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
