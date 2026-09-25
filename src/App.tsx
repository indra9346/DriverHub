import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

// Public Pages
import { HomePage } from './pages/public/HomePage';
import { JobsPage } from './pages/public/JobsPage';
import { JobDetailPage } from './pages/public/JobDetailPage';
import { CompaniesPage } from './pages/public/CompaniesPage';
import { AboutPage } from './pages/public/AboutPage';
import { ContactPage } from './pages/public/ContactPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage';

// Driver Pages
import { DriverDashboard } from './pages/driver/DriverDashboard';
import { DriverApplications } from './pages/driver/DriverApplications';
import { DriverSavedJobs } from './pages/driver/DriverSavedJobs';
import { DriverProfilePage } from './pages/driver/DriverProfile';
import { DriverDocuments } from './pages/driver/DriverDocuments';
import { DriverNotifications } from './pages/driver/DriverNotifications';
import { DriverSettings } from './pages/driver/DriverSettings';

// Employer Pages
import { EmployerDashboard } from './pages/employer/EmployerDashboard';
import { EmployerPostJob } from './pages/employer/EmployerPostJob';
import { EmployerManageJobs } from './pages/employer/EmployerManageJobs';
import { EmployerApplications } from './pages/employer/EmployerApplications';
import { EmployerCandidates } from './pages/employer/EmployerCandidates';
import { EmployerCompanyProfile } from './pages/employer/EmployerCompanyProfile';
import { EmployerReports } from './pages/employer/EmployerReports';
import { EmployerBilling } from './pages/employer/EmployerBilling';

// Common Pages
import { MessagesPage } from './pages/common/MessagesPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminJobs } from './pages/admin/AdminJobs';
import { AdminCandidates } from './pages/admin/AdminCandidates';
import { AdminEmployers } from './pages/admin/AdminEmployers';
import { AdminApplications } from './pages/admin/AdminApplications';

import { ScrollToTop } from './components/common/ScrollToTop';
import { SupabaseSync } from './services/supabaseSync';
import { DataStore } from './services/store';
import { LanguageProvider } from './services/i18n';

export const App: React.FC = () => {
  React.useEffect(() => {
    // Fetch role-scoped authenticated data. Never upload local/demo records on startup.
    void SupabaseSync.fetchAndMergeRemoteData(DataStore);

    // Listen for database changes and refresh only data visible to the current session.
    const cleanup = SupabaseSync.initRealtimeListeners(() => {
      SupabaseSync.fetchAndMergeRemoteData(DataStore).then(() => {
        window.dispatchEvent(new Event('driverhub_storage_updated'));
      });
    });
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <LanguageProvider>
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/search" element={<JobsPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/companies/:id" element={<CompaniesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<AboutPage />} />
          <Route path="/terms" element={<AboutPage />} />
          <Route path="/safety" element={<AboutPage />} />
          <Route path="/help" element={<ContactPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/driver" element={<RegisterPage />} />
          <Route path="/register/employer" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ForgotPasswordPage />} />
          <Route path="/post-job" element={<Navigate to="/employer/post-job" replace />} />
        </Route>

        {/* Driver Portal */}
        <Route path="/driver" element={<DashboardLayout requiredRole="driver" />}>
          <Route index element={<Navigate to="/driver/dashboard" replace />} />
          <Route path="dashboard" element={<DriverDashboard />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="applications" element={<DriverApplications />} />
          <Route path="saved" element={<DriverSavedJobs />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="profile" element={<DriverProfilePage />} />
          <Route path="documents" element={<DriverDocuments />} />
          <Route path="notifications" element={<DriverNotifications />} />
          <Route path="settings" element={<DriverSettings />} />
        </Route>

        {/* Employer Portal */}
        <Route path="/employer" element={<DashboardLayout requiredRole="employer" />}>
          <Route index element={<Navigate to="/employer/dashboard" replace />} />
          <Route path="dashboard" element={<EmployerDashboard />} />
          <Route path="post-job" element={<EmployerPostJob />} />
          <Route path="jobs/new" element={<EmployerPostJob />} />
          <Route path="jobs" element={<EmployerManageJobs />} />
          <Route path="jobs/:jobId" element={<EmployerManageJobs />} />
          <Route path="jobs/:jobId/applications" element={<EmployerApplications />} />
          <Route path="applications" element={<EmployerApplications />} />
          <Route path="candidates" element={<EmployerCandidates />} />
          <Route path="database" element={<EmployerCandidates />} />
          <Route path="reports" element={<EmployerReports />} />
          <Route path="download-applications" element={<EmployerReports />} />
          <Route path="billing" element={<EmployerBilling />} />
          <Route path="credits" element={<EmployerBilling />} />
          <Route path="plans" element={<EmployerBilling />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="company" element={<EmployerCompanyProfile />} />
          <Route path="notifications" element={<DriverNotifications />} />
          <Route path="settings" element={<DriverSettings />} />
        </Route>

        {/* Admin Portal */}
        <Route path="/admin" element={<DashboardLayout requiredRole="admin" />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="jobs" element={<AdminJobs />} />
          <Route path="moderation" element={<AdminJobs />} />
          <Route path="candidates" element={<AdminCandidates />} />
          <Route path="drivers" element={<AdminCandidates />} />
          <Route path="employers" element={<AdminEmployers />} />
          <Route path="applications" element={<AdminApplications />} />
          <Route path="reports" element={<AdminDashboard />} />
          <Route path="settings" element={<DriverSettings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LanguageProvider>
  );
};
