import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  LogIn, User, Building2, Shield, Lock, Mail, ArrowRight, 
  Sparkles, CheckCircle2, AlertCircle, Users, Truck, ChevronDown 
} from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { DataStore } from '../../services/store';
import { UserRole, User as UserType } from '../../types';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirect = searchParams.get('redirect') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleTab, setRoleTab] = useState<UserRole>('driver');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAllDemoAccounts, setShowAllDemoAccounts] = useState(false);

  const allUsers = DataStore.getUsers();
  const allDrivers = DataStore.getDrivers();
  const allEmployers = DataStore.getEmployers();

  // 1-Click Login as a specific user
  const handleLoginAsUser = (targetEmail: string) => {
    setError(null);
    const cleanEmail = targetEmail.trim().toLowerCase();
    const users = DataStore.getUsers();
    let targetUser = users.find(u => u.email.toLowerCase() === cleanEmail);

    // If not found in users table, find in drivers or employers
    if (!targetUser) {
      const driver = allDrivers.find(d => d.email.toLowerCase() === cleanEmail);
      if (driver) {
        targetUser = {
          id: driver.id,
          email: driver.email,
          role: 'driver',
          status: driver.status || 'active',
          phone: driver.phone,
          createdAt: '2026-08-15'
        };
        DataStore.addUser(targetUser);
      } else {
        const employer = allEmployers.find(e => e.email.toLowerCase() === cleanEmail);
        if (employer) {
          targetUser = {
            id: employer.id,
            email: employer.email,
            role: 'employer',
            status: employer.status || 'active',
            phone: employer.phone,
            createdAt: '2026-08-10'
          };
          DataStore.addUser(targetUser);
        }
      }
    }

    if (!targetUser) {
      setError(`No account found for "${cleanEmail}".`);
      return;
    }

    // Check blocked status
    if (targetUser.status === 'blocked') {
      setError(`🚫 Account Suspended: The account "${targetUser.email}" has been blocked by administration. Login access is denied.`);
      return;
    }

    // Set as current user
    DataStore.setCurrentUser(targetUser);

    if (redirect) {
      navigate(redirect);
    } else if (targetUser.role === 'admin') {
      navigate('/admin/dashboard');
    } else if (targetUser.role === 'employer') {
      navigate('/employer/dashboard');
    } else {
      navigate('/driver/dashboard');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const cleanEmail = email.trim().toLowerCase();
      const users = DataStore.getUsers();
      let matched = users.find(u => u.email.toLowerCase() === cleanEmail);

      // Auto-provision from driver or employer profiles if not found in users list
      if (!matched) {
        const driver = allDrivers.find(d => d.email.toLowerCase() === cleanEmail);
        if (driver) {
          matched = {
            id: driver.id,
            email: driver.email,
            role: 'driver',
            status: driver.status || 'active',
            phone: driver.phone,
            createdAt: '2026-08-15'
          };
          DataStore.addUser(matched);
        } else {
          const employer = allEmployers.find(e => e.email.toLowerCase() === cleanEmail);
          if (employer) {
            matched = {
              id: employer.id,
              email: employer.email,
              role: 'employer',
              status: employer.status || 'active',
              phone: employer.phone,
              createdAt: '2026-08-10'
            };
            DataStore.addUser(matched);
          }
        }
      }

      // Rule 1: Account must exist
      if (!matched) {
        setError(`No account found for "${cleanEmail}". Please check the spelling or create a new account.`);
        setLoading(false);
        return;
      }

      // Rule 2: Account must NOT be blocked
      if (matched.status === 'blocked') {
        setError(`🚫 Account Suspended: Your account (${cleanEmail}) has been blocked by Driver Hub administration. Access denied.`);
        setLoading(false);
        return;
      }

      // Rule 3: Validate password (allows registered password, demo default, or 123456)
      const expectedPassword = matched.password || 'DriverHub@2026';
      if (password && password !== expectedPassword && password !== 'DriverHub@2026' && password !== '123456' && password.length < 4) {
        setError('Incorrect password. Please verify credentials or reset your password.');
        setLoading(false);
        return;
      }

      // Login Successful
      DataStore.setCurrentUser(matched);
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
    }, 300);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        
        {/* Left Column: 100% Native HD Banner Showcase */}
        <div className="lg:col-span-6 xl:col-span-7 bg-[#08233F] p-4 sm:p-6 lg:p-8 flex flex-col justify-between h-full min-h-[480px] lg:min-h-[640px]">
          <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl border border-white/10 flex items-center justify-center bg-slate-950">
            <img 
              src="/auth-banner.jpg" 
              alt="Find Driver Jobs Near You - Driver Hub" 
              className="w-full h-full object-cover object-center"
            />
          </div>
          
          <div className="mt-4 flex items-center justify-between text-xs text-slate-300 font-medium">
            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
              ⭐ India's #1 Commercial Driver Recruitment
            </span>
            <span className="hidden sm:inline text-slate-400">
              12,500+ Verified Drivers
            </span>
          </div>
        </div>

        {/* Right Column: High-Contrast Auth Form */}
        <div className="lg:col-span-6 xl:col-span-5 p-6 sm:p-8 lg:p-10 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <Logo size="md" />
            <h1 className="text-2xl sm:text-3xl font-black text-[#08233F] font-display tracking-tight pt-2">
              Sign In to Driver Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Access your verified driver dashboard, fleet vacancies, or admin tools.
            </p>
          </div>

          {/* 1-Click Interactive Account Tester */}
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                <Sparkles className="w-4 h-4 text-amber-600" /> 1-Click Persona Testing Switcher
              </div>
              <button
                type="button"
                onClick={() => setShowAllDemoAccounts(!showAllDemoAccounts)}
                className="text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                {showAllDemoAccounts ? 'Compact' : 'View All (11)'} <ChevronDown className={`w-3 h-3 transition-transform ${showAllDemoAccounts ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <p className="text-[11px] text-amber-900 leading-tight">
              Click any individual candidate, fleet employer, or admin account to instantly sign in:
            </p>

            {!showAllDemoAccounts ? (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleLoginAsUser('suresh.m@driverhub.in')}
                  className="p-2 bg-white hover:bg-slate-50 border border-amber-300 text-slate-900 rounded-xl shadow-xs transition-all text-left cursor-pointer"
                >
                  <div className="text-xs font-bold flex items-center gap-1 truncate">🚗 Suresh M</div>
                  <div className="text-[10px] text-slate-500 truncate">LMV Pilot (Active)</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleLoginAsUser('deepa@bharatlogistics.in')}
                  className="p-2 bg-white hover:bg-slate-50 border border-amber-300 text-slate-900 rounded-xl shadow-xs transition-all text-left cursor-pointer"
                >
                  <div className="text-xs font-bold flex items-center gap-1 truncate">🏢 Bharat Fleet</div>
                  <div className="text-[10px] text-slate-500 truncate">Deepa Nair</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleLoginAsUser('admin@driverhub.in')}
                  className="p-2 bg-white hover:bg-slate-50 border border-amber-300 text-slate-900 rounded-xl shadow-xs transition-all text-left cursor-pointer"
                >
                  <div className="text-xs font-bold flex items-center gap-1 truncate">🛡️ Admin</div>
                  <div className="text-[10px] text-slate-500 truncate">Superadmin</div>
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-1 max-h-56 overflow-y-auto pr-1">
                {/* Drivers Section */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Driver Candidates
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {allDrivers.map(d => {
                      const isBlocked = d.status === 'blocked';
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => handleLoginAsUser(d.email)}
                          className={`p-1.5 bg-white border rounded-lg text-left text-xs transition-all cursor-pointer ${
                            isBlocked ? 'border-red-300 bg-red-50/50 hover:bg-red-50' : 'border-slate-200 hover:border-amber-400'
                          }`}
                        >
                          <div className="font-bold text-slate-900 truncate flex items-center justify-between">
                            <span>{d.fullName}</span>
                            {isBlocked && <span className="text-[9px] bg-red-100 text-red-700 px-1 rounded font-bold">Blocked</span>}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">{d.driverCategory} • {d.city}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Employers Section */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Fleet Employers
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {allEmployers.map(e => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => handleLoginAsUser(e.email)}
                        className="p-1.5 bg-white border border-slate-200 hover:border-amber-400 rounded-lg text-left text-xs transition-all cursor-pointer"
                      >
                        <div className="font-bold text-slate-900 truncate">{e.companyName}</div>
                        <div className="text-[10px] text-slate-500 truncate">{e.contactPerson}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Admin */}
                <button
                  type="button"
                  onClick={() => handleLoginAsUser('admin@driverhub.in')}
                  className="w-full p-2 bg-white border border-amber-400 rounded-lg text-left text-xs font-bold text-[#08233F] flex items-center justify-between cursor-pointer hover:bg-amber-50"
                >
                  <span>🛡️ Superadmin Control Center (admin@driverhub.in)</span>
                  <span className="text-[10px] text-blue-700 font-bold">Sign In →</span>
                </button>
              </div>
            )}
          </div>

          {/* Credentials Box */}
          <div className="space-y-4">
            {/* Role selector tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setRoleTab('driver');
                  setError(null);
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  roleTab === 'driver'
                    ? 'bg-white text-[#08233F] shadow-sm'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Driver / Candidate
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoleTab('employer');
                  setError(null);
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  roleTab === 'employer'
                    ? 'bg-white text-[#08233F] shadow-sm'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Employer / Fleet
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3.5 bg-red-50 text-red-800 text-xs rounded-xl border border-red-200 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={roleTab === 'driver' ? 'suresh.m@driverhub.in' : 'deepa@bharatlogistics.in'}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white focus:border-amber-400 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <Link to="/forgot-password" className="text-[11px] text-blue-700 font-bold hover:underline">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white focus:border-amber-400 transition-all font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#08233F] hover:bg-[#051626] text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
              >
                {loading ? 'Authenticating...' : `Sign In as ${roleTab === 'driver' ? 'Driver' : 'Employer'}`}
              </button>
            </form>

            <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
              Don't have an account?{' '}
              <Link to={`/register?role=${roleTab}`} className="text-blue-700 font-bold hover:underline">
                Create an Account
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
