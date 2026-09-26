import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Building2, FileCheck, FileText, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { DataStore } from '../../services/store';
import { User } from '../../types';
import { useLanguage } from '../../services/i18n';

type AccessState = {
  email: string;
  role: string;
  status: string;
};

export const AdminSettings: React.FC = () => {
  const { t } = useLanguage();
  const [access, setAccess] = useState<AccessState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAccess = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error('No authenticated Supabase session was found. Sign in again.');
      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('email,role,status,phone,created_at').eq('id', auth.user.id).maybeSingle();
      if (profileError) throw profileError;
      if (!profile) throw new Error('The signed-in account has no DriverHub profile.');
      setAccess({ email: profile.email || auth.user.email || '', role: profile.role, status: profile.status });
      const currentUser: User = {
        id: auth.user.id,
        email: profile.email || auth.user.email || '',
        role: profile.role as User['role'],
        status: (profile.status === 'suspended' ? 'blocked' : profile.status || 'active') as User['status'],
        phone: profile.phone || '',
        createdAt: profile.created_at?.slice(0, 10) || ''
      };
      DataStore.addUser(currentUser);
      DataStore.setCurrentUser(currentUser);
    } catch (cause) {
      setAccess(null);
      setError(cause instanceof Error ? cause.message : 'Could not check the administrator session.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAccess(); }, [loadAccess]);

  const links = [
    { to: '/admin/jobs', label: t('moderateJobListings'), icon: ShieldCheck },
    { to: '/admin/documents', label: t('reviewDriverDocuments'), icon: FileCheck },
    { to: '/admin/candidates', label: t('manageDriverAccounts'), icon: Users },
    { to: '/admin/employers', label: t('verifyEmployerCompanies'), icon: Building2 },
    { to: '/admin/applications', label: t('auditApplications'), icon: FileText }
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#08233F]">{t('adminAccountAccess')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('adminAccountAccessSubtitle')}</p>
        </div>
        <button onClick={() => { void loadAccess(); }} disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {t('refreshAccessCheck')}
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Activity className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-slate-900">{t('liveSupabaseAccess')}</h2>
            {loading ? <p className="mt-2 text-sm text-slate-500">{t('checkingAuthAndProfile')}</p> : access ? (
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-xs text-slate-500">{t('account')}</dt><dd className="mt-1 break-all font-semibold text-slate-800">{access.email}</dd></div>
                <div><dt className="text-xs text-slate-500">{t('profileRole')}</dt><dd className="mt-1 font-semibold capitalize text-slate-800">{access.role}</dd></div>
                <div><dt className="text-xs text-slate-500">{t('accountStatus')}</dt><dd className="mt-1 font-semibold capitalize text-slate-800">{access.status}</dd></div>
              </dl>
            ) : !error ? <p className="mt-2 text-sm text-slate-500">{t('noAccountDetails')}</p> : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">{t('adminWorkflows')}</h2>
        <p className="mt-1 text-xs text-slate-500">{t('adminWorkflowsSubtitle')}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {links.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50">
              <Icon className="h-4 w-4 text-blue-700" /> {label}
            </Link>
          ))}
        </div>
      </section>

      <p className="rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-900">
        {t('adminRoleNotice')}
      </p>
    </div>
  );
};
