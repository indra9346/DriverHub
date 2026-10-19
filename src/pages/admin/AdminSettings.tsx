import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, Building2, CheckCircle2, Database, FileCheck, FileText, Lock, RefreshCw, ShieldAlert, ShieldCheck, Users
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../services/supabaseClient';
import { DataStore } from '../../services/store';
import { User } from '../../types';
import { useLanguage } from '../../services/i18n';
import { normaliseAccountStatus } from './AdminUi';

type AccessState = {
  email: string;
  role: string;
  status: string;
};

type Workload = {
  pendingJobs: number;
  pendingDocuments: number;
  unverifiedCompanies: number;
  blockedAccounts: number;
};

const INCOMPLETE_COMPANY = 'Company profile incomplete';

function readWorkload(): Workload {
  const drivers = DataStore.getDrivers();
  const employers = DataStore.getEmployers();
  return {
    pendingJobs: DataStore.getJobs().filter(job => job.status === 'pending').length,
    pendingDocuments: drivers.reduce((sum, driver) =>
      sum + (driver.documents || []).filter(document => document.verificationStatus === 'pending').length, 0),
    unverifiedCompanies: employers.filter(employer =>
      !employer.verified && employer.companyName !== INCOMPLETE_COMPANY && normaliseAccountStatus(employer.status) !== 'blocked').length,
    blockedAccounts: [...drivers, ...employers].filter(account => normaliseAccountStatus(account.status) === 'blocked').length
  };
}

const sameWorkload = (a: Workload, b: Workload) =>
  a.pendingJobs === b.pendingJobs && a.pendingDocuments === b.pendingDocuments &&
  a.unverifiedCompanies === b.unverifiedCompanies && a.blockedAccounts === b.blockedAccounts;

/**
 * Read-only "Access & system status" page. DriverHub has no editable
 * platform settings in the database, so nothing here saves anything.
 */
export const AdminSettings: React.FC = () => {
  const { t } = useLanguage();
  const [access, setAccess] = useState<AccessState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workload, setWorkload] = useState<Workload>(readWorkload);
  const demoMode = DataStore.isDemoMode();

  const loadAccess = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!isSupabaseConfigured) throw new Error('Supabase is not configured for this deployment.');
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error('No authenticated Supabase session was found. Sign in again.');
      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('email,role,status,phone,created_at').eq('id', auth.user.id).maybeSingle();
      if (profileError) throw profileError;
      if (!profile) throw new Error('The signed-in account has no DriverHub profile.');
      setAccess({ email: profile.email || auth.user.email || '', role: profile.role, status: profile.status });

      // Keep the cached session in step with the database (e.g. a role or
      // status changed elsewhere). Only written when something differs.
      const status = normaliseAccountStatus(profile.status);
      const cached = DataStore.getCurrentUser();
      if (!cached || cached.id !== auth.user.id || cached.role !== profile.role || cached.status !== status) {
        const currentUser: User = {
          id: auth.user.id,
          email: profile.email || auth.user.email || '',
          role: profile.role as User['role'],
          status,
          phone: profile.phone || '',
          createdAt: profile.created_at?.slice(0, 10) || ''
        };
        DataStore.addUser(currentUser);
        DataStore.setCurrentUser(currentUser);
      }
    } catch (cause) {
      setAccess(null);
      setError(cause instanceof Error ? cause.message : 'Could not check the administrator session.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAccess(); }, [loadAccess]);

  useEffect(() => {
    const refresh = () => setWorkload(previous => {
      const next = readWorkload();
      return sameWorkload(previous, next) ? previous : next;
    });
    window.addEventListener('driverhub_storage_updated', refresh);
    return () => window.removeEventListener('driverhub_storage_updated', refresh);
  }, []);

  const isActiveAdmin = access?.role === 'admin' && normaliseAccountStatus(access.status) === 'active';

  const links = [
    { to: '/admin/jobs', label: t('moderateJobListings'), icon: ShieldCheck },
    { to: '/admin/documents', label: t('reviewDriverDocuments'), icon: FileCheck },
    { to: '/admin/candidates', label: t('manageDriverAccounts'), icon: Users },
    { to: '/admin/employers', label: t('verifyEmployerCompanies'), icon: Building2 },
    { to: '/admin/applications', label: t('auditApplications'), icon: FileText }
  ];

  const workloadItems = [
    { label: t('pendingJobs'), value: workload.pendingJobs, to: '/admin/jobs' },
    { label: t('pendingDocuments'), value: workload.pendingDocuments, to: '/admin/documents' },
    { label: t('unverifiedCompanies'), value: workload.unverifiedCompanies, to: '/admin/employers' },
    { label: t('blockedAccounts'), value: workload.blockedAccounts, to: '/admin/candidates' }
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 min-w-0">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-[#08233F]">{t('adminAccountAccess')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('adminAccountAccessSubtitle')}</p>
        </div>
        <button type="button" onClick={() => { void loadAccess(); }} disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {t('refreshAccessCheck')}
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 break-words">{error}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="shrink-0 rounded-xl bg-blue-50 p-2.5 text-blue-700"><Activity className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-slate-900">{t('liveSupabaseAccess')}</h2>
            {loading ? <p className="mt-2 text-sm text-slate-500">{t('checkingAuthAndProfile')}</p> : access ? (
              <>
                <p className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${isActiveAdmin ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
                  {isActiveAdmin ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                  {isActiveAdmin ? t('accessConfirmed') : t('accessNotAdmin')}
                </p>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                  <div className="min-w-0"><dt className="text-xs text-slate-500">{t('account')}</dt><dd className="mt-1 break-all font-semibold text-slate-800">{access.email}</dd></div>
                  <div><dt className="text-xs text-slate-500">{t('profileRole')}</dt><dd className="mt-1 font-semibold capitalize text-slate-800">{access.role}</dd></div>
                  <div><dt className="text-xs text-slate-500">{t('accountStatus')}</dt><dd className="mt-1 font-semibold text-slate-800">{t(normaliseAccountStatus(access.status))}</dd></div>
                </dl>
              </>
            ) : !error ? <p className="mt-2 text-sm text-slate-500">{t('noAccountDetails')}</p> : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">{t('systemStatus')}</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 sm:p-4 min-w-0">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">{t('dataSource')}</dt>
              <dd className="mt-1 font-semibold text-slate-800 break-words">
                {demoMode ? t('demoData') : isSupabaseConfigured ? t('liveDatabase') : t('supabaseNotConfigured')}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 sm:p-4 min-w-0">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">{t('platformSettings')}</dt>
              <dd className="mt-1 font-semibold text-slate-800 break-words">{t('noEditableSettings')}</dd>
            </div>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">{t('moderationWorkload')}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {workloadItems.map(item => (
            <Link key={item.label} to={item.to} className="min-h-10 rounded-xl border border-slate-200 p-3 sm:p-4 hover:border-blue-300 hover:bg-blue-50 min-w-0">
              <span className="block text-xs text-slate-500 break-words">{item.label}</span>
              <span className="mt-1 block text-xl font-bold text-[#08233F]">{item.value}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">{t('adminWorkflows')}</h2>
        <p className="mt-1 text-xs text-slate-500">{t('adminWorkflowsSubtitle')}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {links.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="flex min-h-10 items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50">
              <Icon className="h-4 w-4 shrink-0 text-blue-700" /> <span className="min-w-0 break-words">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <p className="rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-900 break-words">
        {t('adminRoleNotice')}
      </p>
    </div>
  );
};
