import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { AIChatbot } from '../components/common/AIChatbot';
import { DataStore } from '../services/store';
import { UserRole } from '../types';

interface DashboardLayoutProps {
  requiredRole?: UserRole;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ requiredRole }) => {
  const [currentUser, setCurrentUser] = useState(DataStore.getCurrentUser());
  const navigate = useNavigate();
  const location = useLocation();

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

    if (requiredRole && currentUser.role !== requiredRole && currentUser.role !== 'admin') {
      // Redirect to user's proper role dashboard
      if (currentUser.role === 'employer') navigate('/employer/dashboard');
      else if (currentUser.role === 'driver') navigate('/driver/dashboard');
      else if (currentUser.role === 'admin') navigate('/admin/dashboard');
    }
  }, [currentUser, requiredRole, location.pathname, navigate]);

  if (!currentUser) {
    return null;
  }

  const unreadNotifs = DataStore.getNotifications(currentUser.id).filter(n => !n.read).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar role={currentUser.role} unreadCount={unreadNotifs} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      <AIChatbot />
    </div>
  );
};
