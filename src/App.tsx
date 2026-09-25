import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

// Load portal pages on demand so the public landing page doesn't ship every dashboard.
const HomePage = React.lazy(() => import('./pages/public/HomePage').then(module => ({ default: module.HomePage })));
const JobsPage = React.lazy(() => import('./pages/public/JobsPage').then(module => ({ default: module.JobsPage })));
const JobDetailPage = React.lazy(() => import('./pages/public/JobDetailPage').then(module => ({ default: module.JobDetailPage })));
const CompaniesPage = React.lazy(() => import('./pages/public/CompaniesPage').then(module => ({ default: module.CompaniesPage })));
const AboutPage = React.lazy(() => import('./pages/public/AboutPage').then(module => ({ default: module.AboutPage })));
const ContactPage = React.lazy(() => import('./pages/public/ContactPage').then(module => ({ default: module.ContactPage })));
const LoginPage = React.lazy(() => import('./pages/public/LoginPage').then(module => ({ default: module.LoginPage })));
const RegisterPage = React.lazy(() => import('./pages/public/RegisterPage').then(module => ({ default: module.RegisterPage })));
const ForgotPasswordPage = React.lazy(() => import('./pages/public/ForgotPasswordPage').then(module => ({ default: module.ForgotPasswordPage })));
const DriverDashboard = React.lazy(() => import('./pages/driver/DriverDashboard').then(module => ({ default: module.DriverDashboard })));
const DriverApplications = React.lazy(() => import('./pages/driver/DriverApplications').then(module => ({ default: module.DriverApplications })));
const DriverSavedJobs = React.lazy(() => import('./pages/driver/DriverSavedJobs').then(module => ({ default: module.DriverSavedJobs })));
const DriverProfilePage = React.lazy(() => import('./pages/driver/DriverProfile').then(module => ({ default: module.DriverProfilePage })));
const DriverDocuments = React.lazy(() => import('./pages/driver/DriverDocuments').then(module => ({ default: module.DriverDocuments })));
const DriverNotifications = React.lazy(() => import('./pages/driver/DriverNotifications').then(module => ({ default: module.DriverNotifications })));
const DriverSettings = React.lazy(() => import('./pages/driver/DriverSettings').then(module => ({ default: module.DriverSettings })));
const EmployerDashboard = React.lazy(() => import('./pages/employer/EmployerDashboard').then(module => ({ default: module.EmployerDashboard })));
const EmployerPostJob = React.lazy(() => import('./pages/employer/EmployerPostJob').then(module => ({ default: module.EmployerPostJob })));
const EmployerManageJobs = React.lazy(() => import('./pages/employer/EmployerManageJobs').then(module => ({ default: module.EmployerManageJobs })));
const EmployerApplications = React.lazy(() => import('./pages/employer/EmployerApplications').then(module => ({ default: module.EmployerApplications })));
const EmployerCandidates = React.lazy(() => import('./pages/employer/EmployerCandidates').then(module => ({ default: module.EmployerCandidates })));
const EmployerCompanyProfile = React.lazy(() => import('./pages/employer/EmployerCompanyProfile').then(module => ({ default: module.EmployerCompanyProfile })));
const EmployerReports = React.lazy(() => import('./pages/employer/EmployerReports').then(module => ({ default: module.EmployerReports })));
const EmployerBilling = React.lazy(() => import('./pages/employer/EmployerBilling').then(module => ({ default: module.EmployerBilling })));
const MessagesPage = React.lazy(() => import('./pages/common/MessagesPage').then(module => ({ default: module.MessagesPage })));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const AdminJobs = React.lazy(() => import('./pages/admin/AdminJobs').then(module => ({ default: module.AdminJobs })));
const AdminCandidates = React.lazy(() => import('./pages/admin/AdminCandidates').then(module => ({ default: module.AdminCandidates })));
const AdminEmployers = React.lazy(() => import('./pages/admin/AdminEmployers').then(module => ({ default: module.AdminEmployers })));
const AdminApplications = React.lazy(() => import('./pages/admin/AdminApplications').then(module => ({ default: module.AdminApplications })));
const AdminDocuments = React.lazy(() => import('./pages/admin/AdminDocuments').then(module => ({ default: module.AdminDocuments })));

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
      <React.Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-sm font-medium text-slate-500">Loading DriverHub…</div>}>
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
          <Route path="documents" element={<AdminDocuments />} />
          <Route path="reports" element={<AdminDashboard />} />
          <Route path="settings" element={<DriverSettings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </React.Suspense>
    </LanguageProvider>
  );
};
