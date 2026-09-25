import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mail, ArrowLeft, Send, CheckCircle2, Lock, Eye, EyeOff, 
  KeyRound, ShieldCheck, AlertCircle, RefreshCw, ArrowRight 
} from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { supabase } from '../../services/supabaseClient';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'sent' | 'reset' | 'success'>('email');
  
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (window.location.pathname !== '/reset-password') return;
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStep('reset');
      else setError('This password reset link is invalid or expired. Request a new one.');
    });
  }, []);

  // Step 1: Lookup Account & Dispatch Verification Code
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (resetError) throw resetError;
      setSuccessMessage('If an account exists for that email, a password reset link has been sent.');
      setStep('sent');
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Failed to dispatch verification code. Please try again.');
    }
  };

  // Step 2: Validate Verification Code from Email and Save New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('The password reset link has expired. Request a new link.');
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setLoading(false);
      setStep('success');
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Failed to update password. Please try again.');
    }
  };

  // Return to normal sign-in once the recovery flow completes.
  const handleAutoLogin = () => {
    void supabase.auth.signOut();
    navigate('/login');
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

        {/* Right Column: Password Recovery Form */}
        <div className="lg:col-span-7 xl:col-span-6 p-6 sm:p-8 lg:p-10 space-y-6">
          {/* Header Branding */}
          <div className="space-y-1">
            <Logo size="md" />
            <h1 className="text-2xl sm:text-3xl font-black text-[#08233F] font-display tracking-tight pt-2">
              {step === 'email' && 'Reset Your Password'}
              {step === 'sent' && 'Check Your Email'}
              {step === 'reset' && 'Choose a New Password'}
              {step === 'success' && 'Password Updated!'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              {step === 'email' && 'Enter your email address and we’ll send a secure password reset link.'}
              {step === 'sent' && successMessage}
              {step === 'reset' && 'Set a new password for your DriverHub account.'}
              {step === 'success' && 'Your password has been successfully reset in the database.'}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2">
            <div className={`h-1.5 rounded-full transition-all duration-300 ${
              step === 'email' ? 'w-8 bg-amber-500' : 'w-4 bg-emerald-500'
            }`} />
            <div className={`h-1.5 rounded-full transition-all duration-300 ${
              step === 'reset' ? 'w-8 bg-amber-500' : step === 'success' ? 'w-4 bg-emerald-500' : 'w-4 bg-slate-200'
            }`} />
            <div className={`h-1.5 rounded-full transition-all duration-300 ${
              step === 'success' ? 'w-8 bg-emerald-500' : 'w-4 bg-slate-200'
            }`} />
          </div>

          {/* Form Card */}
          <div className="space-y-4">
            
            {/* Error Alert */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* STEP 1: Enter Email */}
            {step === 'email' && (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. suresh.m@driverhub.in or deepa@bharatlogistics.in"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#08233F] hover:bg-[#051626] text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 hover:scale-[1.01]"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-amber-400" />
                      Send Password Reset Link
                    </>
                  )}
                </button>
              </form>
            )}

            {step === 'sent' && <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">{successMessage}<button type="button" onClick={() => setStep('email')} className="block mt-3 font-bold underline">Send another reset link</button></div>}

            {/* STEP 2: Set a password using the Supabase recovery session */}
            {step === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#08233F] hover:bg-[#051626] text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 hover:scale-[1.01]"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      Update Password
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 3: Success Confirmation */}
            {step === 'success' && (
              <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#08233F]">Password Reset Complete!</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Your new password has been verified and updated in the database for <strong className="text-slate-900">{email}</strong>.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleAutoLogin}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
                  >
                    Sign In to Dashboard <ArrowRight className="w-4 h-4" />
                  </button>

                  <Link
                    to="/login"
                    className="w-full py-2.5 text-xs text-slate-600 font-semibold hover:text-slate-900 block rounded-xl text-center"
                  >
                    Return to Sign In Page
                  </Link>
                </div>
              </div>
            )}

            {/* Footer Back Link */}
            <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
              <Link to="/login" className="text-slate-600 font-semibold hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
