import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  UserPlus, Truck, Building2, Mail, Lock, Phone, User, 
  MapPin, Briefcase, Award, CheckCircle2, ShieldCheck, ArrowRight 
} from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { DataStore } from '../../services/store';
import { SupabaseSync } from '../../services/supabaseSync';
import { UserRole, DriverCategory, DriverProfile, EmployerProfile, User as UserType } from '../../types';

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialRole = (searchParams.get('role') as UserRole) || 'driver';

  const [role, setRole] = useState<UserRole>(initialRole === 'employer' ? 'employer' : 'driver');

  // Common fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('Bengaluru');

  // Driver fields
  const [driverName, setDriverName] = useState('');
  const [driverCategory, setDriverCategory] = useState<DriverCategory>('HMV');
  const [licenseType, setLicenseType] = useState('HMV Commercial Transport');
  const [experienceYears, setExperienceYears] = useState(3);

  // Employer fields
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [industry, setIndustry] = useState('Logistics & Freight');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanEmail = email.trim().toLowerCase();

    // Business Logic: Prevent duplicate registration
    const existingUsers = DataStore.getUsers();
    if (existingUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
      setError(`An account with email "${cleanEmail}" is already registered. Please Sign In instead.`);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const userId = 'usr-' + role + '-' + Date.now();
      const newUser: UserType = {
        id: userId,
        email: cleanEmail,
        phone,
        role,
        status: 'active',
        password: password,
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
          driverCategory,
          licenseNumber: 'KA01 ' + Math.floor(10000000 + Math.random() * 90000000),
          licenseType,
          licenseExpiry: '2034-01-01',
          experienceYears,
          skills: ['Safe Driving', 'Route Navigation'],
          availability: 'Immediate',
          status: 'active',
          experiences: [],
          documents: []
        };
        DataStore.updateDriverProfile(newDriver);

        // Add welcome notification for new driver
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
        // Sync new user & driver profile to Supabase in real-time
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
          verified: true,
          status: 'active',
          createdAt: new Date().toISOString().slice(0, 10)
        };
        DataStore.updateEmployerProfile(newEmployer);

        // Add welcome notification for new employer
        DataStore.addNotification({
          id: 'notif-welcome-' + Date.now(),
          userId: userId,
          title: 'Welcome to Driver Hub Employer Portal! 🏢',
          message: `Welcome ${companyName}! You can now post driver job vacancies and access 12,500+ verified commercial drivers across India.`,
          type: 'system',
          read: false,
          createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          link: '/employer/post-job'
        });

        // Sync new employer profile to Supabase in real-time
        SupabaseSync.registerUser(newUser, newEmployer);
      }

      DataStore.setCurrentUser(newUser);
      setLoading(false);

      const redirect = searchParams.get('redirect');
      if (redirect) {
        navigate(redirect);
      } else if (role === 'employer') {
        navigate('/employer/dashboard');
      } else {
        navigate('/driver/dashboard');
      }
    }, 500);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-0 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        
        {/* Left Column: 100% Full Uncropped HD Banner */}
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
              Create an Account
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Join Driver Hub to apply for verified driver jobs or hire commercial pilots.
            </p>
          </div>

          {/* Role Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setRole('driver')}
              className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                role === 'driver'
                  ? 'bg-white text-[#08233F] shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <Truck className="w-4 h-4 text-amber-500" /> Continue as Driver
            </button>
            <button
              type="button"
              onClick={() => setRole('employer')}
              className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                role === 'employer'
                  ? 'bg-white text-[#08233F] shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <Building2 className="w-4 h-4 text-blue-600" /> Continue as Employer
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3.5 bg-red-50 text-red-800 text-xs rounded-xl border border-red-200 animate-in fade-in">
              <span className="font-bold">⚠️</span>
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {role === 'driver' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="e.g. Ramesh Gowda"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Driver License Category</label>
                    <select
                      value={driverCategory}
                      onChange={(e) => setDriverCategory(e.target.value as DriverCategory)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                    >
                      <option value="HMV">Heavy Motor Vehicle (HMV)</option>
                      <option value="LMV">Light Motor Vehicle (LMV)</option>
                      <option value="Cab Driver">Cab / Taxi Driver</option>
                      <option value="Delivery Driver">Hyperlocal Delivery Pilot</option>
                      <option value="Bus Driver">School & Passenger Bus</option>
                      <option value="Trailer Driver">Trailer Truck Driver</option>
                      <option value="Tempo Driver">Tempo / Light Commercial</option>
                      <option value="Personal Driver">Private Family Chauffeur</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Experience (Years)</label>
                    <input
                      type="number"
                      min="0"
                      max="40"
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Fleet Name</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Apex Express Logistics"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      required
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Industry Sector</label>
                    <input
                      type="text"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
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
              {loading ? 'Creating Profile...' : `Register as ${role === 'driver' ? 'Driver' : 'Employer'}`}
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
            Already have an account?{' '}
            <Link 
              to={'/login' + (searchParams.get('redirect') ? `?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : '')} 
              className="text-blue-700 font-bold hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
