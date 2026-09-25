import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  LogIn, User, Building2, Shield, Lock, Mail, ArrowRight, 
  Sparkles, CheckCircle2, AlertCircle, Users, Truck, ChevronDown,
  Eye, EyeOff
} from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { DataStore } from '../../services/store';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { SupabaseSync } from '../../services/supabaseSync';
import { UserRole, User as UserType } from '../../types';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirect = searchParams.get('redirect') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const initialRole = (searchParams.get('role') as UserRole) || 'driver';
  const [roleTab, setRoleTab] = useState<UserRole>(initialRole);
  const [error, setError] = useState<string | null>(null);
  const [suggestedRole, setSuggestedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);

  // Only restore this device's previously used email. Profiles are loaded after authentication.
  useEffect(() => {
    const saved = DataStore.getLastUserByRole(roleTab);
    if (saved?.email && !email) setEmail(saved.email);
  }, []);

  // Update email field when switching role tabs
  const handleRoleChange = (newRole: UserRole) => {
    setRoleTab(newRole);
    setError(null);
    setSuggestedRole(null);
    setPassword('');
    const saved = DataStore.getLastUserByRole(newRole);
    if (saved?.email) {
      setEmail(saved.email);
    } else {
      setEmail('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuggestedRole(null);
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      let matched: UserType | undefined;
      const demoAuth = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true';
      if (demoAuth) {
        matched = DataStore.getUsers().find(u => u.email.trim().toLowerCase() === cleanEmail);
        if (!matched || password !== '123456') throw new Error('Demo sign-in requires a seeded account and the local demo password.');
      } else {
        if (!isSupabaseConfigured) throw new Error('Supabase is not configured for this deployment. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel, then redeploy.');
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (authError || !authData.user) throw new Error(authError?.message || 'Sign-in failed. Check your email and password.');
        let { data: profile } = await supabase.from('profiles').select('*').eq('id', authData.user.id).maybeSingle();
        if (!profile) {
          // Self-heal: Create profile record from metadata if auth trigger had not created it yet
          const metadata = authData.user.user_metadata || {};
          const fallbackRole = (metadata.role as UserRole) || roleTab || 'driver';
          const fallbackName = metadata.full_name || cleanEmail.split('@')[0];
          const fallbackPhone = metadata.phone || '';
          const fallbackCity = metadata.city || 'Bengaluru';
          const fallbackState = metadata.state || 'Karnataka';

          try {
            await supabase.from('profiles').upsert({
              id: authData.user.id,
              role: fallbackRole,
              full_name: fallbackName,
              email: cleanEmail,
              phone: fallbackPhone,
              city: fallbackCity,
              state: fallbackState,
              status: 'active'
            }, { onConflict: 'id' });
          } catch {
            // Ignore if already created
          }

          profile = {
            id: authData.user.id,
            role: fallbackRole,
            full_name: fallbackName,
            email: cleanEmail,
            phone: fallbackPhone,
            city: fallbackCity,
            state: fallbackState,
            status: 'active',
            created_at: new Date().toISOString()
          };
        }
        if (!['driver', 'employer', 'admin'].includes(profile.role)) throw new Error('This account has no valid DriverHub role.');
        matched = {
          id: authData.user.id, email: authData.user.email || cleanEmail,
          role: profile.role as UserRole,
          status: profile.status === 'blocked' || profile.status === 'suspended' ? 'blocked' : profile.status || 'active',
          phone: profile.phone || '', createdAt: profile.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10)
        };
        DataStore.addUser(matched);
        if (matched.role === 'driver') {
          const { data: row } = await supabase.from('driver_profiles').select('*').eq('user_id', authData.user.id).maybeSingle();
          DataStore.updateDriverProfile({
            id: matched.id, fullName: profile.full_name || 'Driver', phone: matched.phone || '', email: matched.email,
            location: profile.location || profile.city || '', city: profile.city || '', state: profile.state || '',
            driverCategory: row?.driver_category || '', licenseNumber: row?.license_number || '',
            licenseType: row?.license_type || '', licenseExpiry: row?.license_expiry || '',
            experienceYears: row?.years_experience || 0, skills: row?.skills || [], availability: row?.availability || 'Flexible',
            status: matched.status, experiences: [], documents: []
          });
        } else if (matched.role === 'employer') {
          const { data: company } = await supabase.from('companies').select('*').eq('user_id', authData.user.id).maybeSingle();
          const metadata = authData.user.user_metadata || {};
          DataStore.updateEmployerProfile({
            id: matched.id, companyName: company?.company_name || metadata.company_name || `${profile.full_name || 'New'} Fleet`,
            contactPerson: company?.contact_person || profile.full_name || '', email: company?.email || matched.email,
            phone: company?.phone || matched.phone || '', industry: company?.industry || metadata.industry || 'Driver Hiring',
            location: company?.location || profile.location || profile.city || '', city: company?.city || profile.city || '',
            state: company?.state || profile.state || '', address: company?.address || '', website: company?.website || '',
            description: company?.description || '', verified: company?.verified === true,
            status: company?.status === 'suspended' ? 'blocked' : company?.status || 'pending',
            createdAt: company?.created_at?.slice(0, 10) || matched.createdAt
          });
        }
      }

      if (!matched) throw new Error('No account found. Please sign up first.');
      if (matched.status === 'blocked') {
        if (!(import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true')) await supabase.auth.signOut();
        throw new Error('This account is suspended. Contact DriverHub support.');
      }
      if (matched.role !== roleTab) {
        setSuggestedRole(matched.role);
        if (!(import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true')) await supabase.auth.signOut();
        throw new Error(`This account is registered as ${matched.role}. Switch to that sign-in role.`);
      }

      // Login Successful: Sets session and stores last-active user for this role on this device
      DataStore.setCurrentUser(matched);
      if (!(import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true')) {
        await SupabaseSync.fetchAndMergeRemoteData(DataStore);
      }
      setLoading(false);

      if (redirect) {
        navigate(redirect);
      } else if (matched.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (matched.role === 'employer') {
        navigate('/employer/dashboard');
      } else {
        navigate('/driver/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  const savedUserForRole = DataStore.getLastUserByRole(roleTab);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-0 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        
        {/* Left Column: 100% Full Uncropped HD Banner */}
        <div className="lg:col-span-6 bg-[#072038] p-4 sm:p-6 flex flex-col justify-center items-center">
          <div className="w-full h-full min-h-[320px] sm:min-h-[420px] lg:min-h-[520px] flex items-center justify-center rounded-2xl overflow-hidden">
            <img 
              src="/auth-banner.jpg" 
              alt="Find Driver Jobs Near You - Driver Hub" 
              className="w-full h-full object-contain object-center"
            />
          </div>
        </div>

        {/* Right Column: Clean Production Auth Form */}
        <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-center space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <Logo size="md" />
            <h1 className="text-2xl sm:text-3xl font-black text-[#08233F] font-display tracking-tight pt-2">
              {roleTab === 'admin' ? 'Admin Portal Sign In' : 'Sign In to Driver Hub'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              {roleTab === 'admin' 
                ? 'Authorized platform administration, job moderation & verification.'
                : 'Access your driver account, employer dashboard, or fleet tools.'
              }
            </p>
          </div>

          {/* Credentials Box */}
          <div className="space-y-4">
            {/* 3 Prominent Role Selector Tabs */}
            <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => handleRoleChange('driver')}
                className={`py-2 px-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 truncate ${
                  roleTab === 'driver'
                    ? 'bg-white text-[#08233F] shadow-sm'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Driver
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('employer')}
                className={`py-2 px-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 truncate ${
                  roleTab === 'employer'
                    ? 'bg-white text-[#08233F] shadow-sm'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Employer
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`py-2 px-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 truncate ${
                  roleTab === 'admin'
                    ? 'bg-[#08233F] text-amber-400 shadow-sm'
                    : 'text-slate-600 hover:text-[#08233F]'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Admin
              </button>
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 text-red-800 text-xs rounded-xl border border-red-200 animate-in fade-in space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{error}</span>
                </div>
                {suggestedRole && (
                  <div className="pl-6 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const currentTypedEmail = email;
                        setRoleTab(suggestedRole);
                        setEmail(currentTypedEmail);
                        setSuggestedRole(null);
                        setError(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#08233F] hover:bg-[#051626] text-amber-300 font-bold rounded-lg text-xs transition-all shadow-sm cursor-pointer hover:scale-[1.02]"
                    >
                      <span>Switch to {suggestedRole === 'driver' ? 'Driver' : suggestedRole === 'employer' ? 'Employer' : 'Admin'} Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={roleTab === 'admin' ? 'admin@driverhub.in' : roleTab === 'employer' ? 'employer@fleet.com' : 'driver@example.com'}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white focus:border-amber-400 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <Link to={`/forgot-password?role=${encodeURIComponent(roleTab)}${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''}`} className="text-[11px] text-blue-700 font-bold hover:underline">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white focus:border-amber-400 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#08233F] hover:bg-[#051626] text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
              >
                {loading ? 'Authenticating...' : `Sign In as ${roleTab === 'admin' ? 'Superadmin' : roleTab === 'driver' ? 'Driver' : 'Employer'}`}
              </button>
            </form>

            <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
              Don't have an account?{' '}
              <Link to={`/register?role=${roleTab === 'admin' ? 'driver' : roleTab}`} className="text-blue-700 font-bold hover:underline">
                Create an Account
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
