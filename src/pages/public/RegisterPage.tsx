import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { 
  Truck, Building2, Eye, EyeOff
} from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { DataStore } from '../../services/store';
import { SupabaseSync } from '../../services/supabaseSync';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { useLanguage } from '../../services/i18n';
import { UserRole, DriverCategory, DriverProfile, EmployerProfile, User as UserType } from '../../types';
import { getLoginPathForRole, getPostLoginPath } from '../../services/authRouting';

export const RegisterPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [searchParams] = useSearchParams();
  const routeLoc = useLocation();
  const navigate = useNavigate();
  const initialRole: UserRole =
    routeLoc.pathname.includes('/employer') || searchParams.get('role') === 'employer'
      ? 'employer'
      : 'driver';

  const [role, setRole] = useState<UserRole>(initialRole);

  // Common fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [location, setLocation] = useState('');

  // Driver fields
  const [driverName, setDriverName] = useState('');
  const [driverCategory, setDriverCategory] = useState<DriverCategory | ''>('');
  const [licenseType, setLicenseType] = useState('');
  const [experienceYears, setExperienceYears] = useState(0);

  // Employer fields
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [industry, setIndustry] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanEmail = email.trim().toLowerCase();

    if (password.length < 6) {
      setError(lang === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್ ಕನಿಷ್ಠ 6 ಅಕ್ಷರಗಳನ್ನು ಹೊಂದಿರಬೇಕು.' : 'Password must be at least 6 characters long.');
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured for this deployment. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as Vercel Config environment variables, then redeploy.');
      return;
    }

    setLoading(true);
    try {
      const fullName = role === 'driver' ? driverName : contactPerson;
      const { data: authResult, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: {
          role, full_name: fullName, phone, city: location, state: 'Karnataka',
          company_name: role === 'employer' ? companyName : undefined,
          industry: role === 'employer' ? industry : undefined,
          driver_category: role === 'driver' ? driverCategory : undefined,
          experience_years: role === 'driver' ? experienceYears : undefined,
          license_type: role === 'driver' ? licenseType || driverCategory : undefined
        } }
      });
      if (authError) throw authError;
      if (!authResult.user) throw new Error(lang === 'kn' ? 'ನೋಂದಣಿ ಪೂರ್ಣಗೊಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.' : 'Registration could not be completed. Please try again.');
      if (!authResult.session) {
        setSuccessMessage(lang === 'kn' ? 'ನಿಮ್ಮ ಖಾತೆ ರಚನೆಯಾಗಿದೆ! ನಿಮ್ಮ ಇಮೇಲ್ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಸೈನ್ ಇನ್ ಮಾಡಿ.' : 'Your account was created! If email confirmation is enabled, check your inbox to activate it, then click Sign In below.');
        setLoading(false);
        return;
      }

      const userId = authResult.user.id;
      const newUser: UserType = {
        id: userId,
        email: cleanEmail,
        phone,
        role,
        status: 'active',
        createdAt: new Date().toISOString().slice(0, 10),
      };

      DataStore.addUser(newUser);

      if (role === 'driver') {
        const newDriver: DriverProfile = {
          id: userId,
          fullName: driverName,
          phone,
          email: cleanEmail,
          location,
          city: location,
          state: 'Karnataka',
          driverCategory: driverCategory as DriverCategory,
          licenseNumber: '',
          licenseType: licenseType || driverCategory,
          licenseExpiry: '',
          experienceYears,
          skills: ['Safe Driving', 'Route Navigation'],
          availability: 'Immediate',
          status: 'active',
          experiences: [],
          documents: []
        };
        DataStore.updateDriverProfile(newDriver);

        DataStore.addNotification({
          id: 'notif-welcome-' + Date.now(),
          userId: userId,
          title: 'Welcome to Driver Hub! 🚗',
          message: `Welcome aboard, ${driverName}! Your ${driverCategory} driver profile is now active. Complete your verification to apply for premium high-pay jobs.`,
          type: 'system',
          read: false,
          createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          link: '/driver/profile'
        });
        SupabaseSync.registerUser(newUser, newDriver);
      } else {
        const newEmployer: EmployerProfile = {
          id: userId,
          companyName,
          contactPerson,
          email: cleanEmail,
          phone,
          industry,
          location,
          city: location,
          state: 'Karnataka',
          verified: false,
          status: 'active',
          createdAt: new Date().toISOString().slice(0, 10)
        };
        DataStore.updateEmployerProfile(newEmployer);

        DataStore.addNotification({
          id: 'notif-welcome-' + Date.now(),
          userId: userId,
          title: 'Welcome to Driver Hub Employer Portal! 🏢',
          message: `Welcome ${companyName}! You can now post driver job vacancies and review applications from drivers who apply to your listings.`,
          type: 'system',
          read: false,
          createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          link: '/employer/post-job'
        });

        SupabaseSync.registerUser(newUser, newEmployer);
      }

      DataStore.setCurrentUser(newUser);
      setLoading(false);

      navigate(getPostLoginPath(role, searchParams.get('redirect')), { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : (lang === 'kn' ? 'ನೋಂದಣಿ ವಿಫಲವಾಗಿದೆ.' : 'Registration failed. Please try again.');
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-0 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        
        {/* Left Column: Banner */}
        <div className="lg:col-span-5 xl:col-span-6 bg-[#072038] p-4 sm:p-6 flex flex-col justify-center items-center">
          <div className="w-full h-full min-h-[320px] sm:min-h-[420px] lg:min-h-[560px] flex items-center justify-center rounded-2xl overflow-hidden">
            <img 
              src="/auth-banner.jpg" 
              alt="Find Driver Jobs Near You - Driver Hub" 
              className="w-full h-full object-contain object-center"
            />
          </div>
        </div>

        {/* Right Column: Registration Form */}
        <div className="lg:col-span-7 xl:col-span-6 p-6 sm:p-8 lg:p-10 space-y-5">
          {/* Header */}
          <div className="space-y-1">
            <Logo size="md" />
            <h1 className="text-2xl sm:text-3xl font-black text-[#08233F] font-display tracking-tight pt-2">
              {t('Create an Account')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              {lang === 'kn' ? 'ಪರಿಶೀಲಿಸಿದ ಚಾಲಕ ಉದ್ಯೋಗಗಳಿಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಅಥವಾ ಚಾಲಕರನ್ನು ನೇಮಿಸಲು DriverHub ಗೆ ಸೇರಿ.' : 'Join Driver Hub to apply for verified driver jobs or hire commercial pilots.'}
            </p>
          </div>

          {/* Role Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => { setRole('driver'); setError(null); setSuccessMessage(null); }}
              className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                role === 'driver'
                  ? 'bg-white text-[#08233F] shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <Truck className="w-4 h-4 text-amber-500" /> {t('Continue as Driver')}
            </button>
            <button
              type="button"
              onClick={() => { setRole('employer'); setError(null); setSuccessMessage(null); }}
              className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                role === 'employer'
                  ? 'bg-white text-[#08233F] shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <Building2 className="w-4 h-4 text-blue-600" /> {t('Continue as Employer')}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3.5 bg-red-50 text-red-800 text-xs rounded-xl border border-red-200 animate-in fade-in">
              <span className="font-bold">⚠️</span>
              <span className="font-medium">{error}</span>
            </div>
          )}

          {successMessage && (
            <div role="status" className="p-3.5 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
              {successMessage}
              <Link to={getLoginPathForRole(role, searchParams.get('redirect') || undefined)} className="ml-2 font-bold underline">
                {t('Sign In')}
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5" autoComplete="on">
            {role === 'driver' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Full Name')}</label>
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="e.g. Ramesh Gowda"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Driver License / Vehicle Category')}</label>
                    <select
                      value={driverCategory}
                      onChange={(e) => setDriverCategory(e.target.value as DriverCategory)}
                      required
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                    >
                      <option value="" disabled>{lang === 'kn' ? 'ನಿಮ್ಮ ಲೈಸೆನ್ಸ್ ವಿಭಾಗ ಆಯ್ಕೆಮಾಡಿ' : 'Select your license category'}</option>
                      <option value="HMV">{t('Heavy Truck (HMV)')}</option>
                      <option value="LMV">{t('LMV Chauffeur')}</option>
                      <option value="Cab Driver">{t('Cab Driver')}</option>
                      <option value="Delivery Driver">{t('Delivery Driver')}</option>
                      <option value="Bus Driver">{t('School & Staff Bus Driver')}</option>
                      <option value="Trailer Driver">{t('40ft Container Trailer Driver')}</option>
                      <option value="Tempo Driver">{t('Tempo / Ace')}</option>
                      <option value="Personal Driver">{t('Personal & Sedan Chauffeur')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Years')} ({t('Experience')})</label>
                    <input
                      type="number"
                      min="0"
                      max="40"
                      value={experienceYears || ''}
                      onChange={(e) => setExperienceYears(Number(e.target.value))}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{lang === 'kn' ? 'ಕಂಪನಿ / ಫ್ಲೀಟ್ ಹೆಸರು' : 'Company / Fleet Name'}</label>
                  <input
                    type="text"
                    name="organization"
                    autoComplete="organization"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Apex Express Logistics"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{lang === 'kn' ? 'ಸಂಪರ್ಕ ವ್ಯಕ್ತಿ' : 'Contact Person'}</label>
                    <input
                      type="text"
                      name="name"
                      autoComplete="name"
                      required
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{lang === 'kn' ? 'ಉದ್ಯಮದ ಕ್ಷೇತ್ರ' : 'Industry Sector'}</label>
                    <input
                      type="text"
                      name="industry"
                      required
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g. E-commerce Logistics"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Email Address')}</label>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Phone Number')}</label>
                <input
                  type="tel"
                  name="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 00000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Password')}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="new-password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{lang === 'kn' ? 'ನಗರ' : 'City'}</label>
                <input
                  type="text"
                  name="address-level2"
                  autoComplete="address-level2"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Bengaluru"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#08233F] hover:bg-[#051626] text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
            >
              {loading ? (lang === 'kn' ? 'ಪ್ರೊಫೈಲ್ ರಚಿಸಲಾಗುತ್ತಿದೆ...' : 'Creating Profile...') : t('Register as {role}', { role: role === 'driver' ? t('Driver') : t('Employer') })}
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
            {t('Already have an account?')}{' '}
            <Link 
              to={getLoginPathForRole(role, searchParams.get('redirect') || undefined)}
              className="text-blue-700 font-bold hover:underline"
            >
              {t('Sign In')}
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
