import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail, ArrowLeft, Send, CheckCircle2, Lock, Eye, EyeOff,
  KeyRound, ShieldCheck, AlertCircle, RefreshCw, ArrowRight
} from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { supabase } from '../../services/supabaseClient';
import { UserRole } from '../../types';
import { useLanguage } from '../../services/i18n';

type RecoveryStep = 'email' | 'verify' | 'reset' | 'success';

const getAuthErrorMessage = (error: unknown, fallback: string): string => {
  const authError = error as { message?: string; code?: string; status?: number } | null;
  const message = authError?.message?.trim() || '';
  const normalized = `${authError?.code || ''} ${message}`.toLowerCase();

  if (authError?.status === 429 || normalized.includes('rate limit') || normalized.includes('too many')) {
    return 'Too many recovery attempts were made. Wait a while before requesting another code, then use the newest email.';
  }
  if (normalized.includes('expired') || normalized.includes('otp_expired') || normalized.includes('invalid token')) {
    return 'That code or reset link is invalid or expired. Request a new code and use the newest email.';
  }
  if (normalized.includes('fetch') || normalized.includes('network') || normalized.includes('failed to fetch')) {
    return 'Could not reach the authentication service. Check your internet connection and try again.';
  }

  return message || fallback;
};

export const ForgotPasswordPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get('role');
  const role: UserRole = requestedRole === 'admin' || requestedRole === 'employer' || requestedRole === 'driver'
    ? requestedRole
    : 'driver';
  // Only preserve an in-app destination. Never send recovery users to an external URL.
  const requestedRedirect = searchParams.get('redirect') || '';
  const redirect = requestedRedirect.startsWith('/') && !requestedRedirect.startsWith('//')
    ? requestedRedirect
    : '';
  const loginPath = useMemo(() => {
    const params = new URLSearchParams({ role });
    if (redirect) params.set('redirect', redirect);
    return `/login?${params.toString()}`;
  }, [role, redirect]);
  const roleLabel = role === 'admin' ? t('Admin') : role === 'employer' ? t('Employer') : t('Driver');

  const [step, setStep] = useState<RecoveryStep>('email');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Continue to work with email templates that send a clickable recovery link.
  // OTP emails use the explicit verification step below.
  useEffect(() => {
    if (location.pathname !== '/reset-password') return;

    let active = true;
    let recoveryEventSeen = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && event === 'PASSWORD_RECOVERY' && session) {
        recoveryEventSeen = true;
        setError(null);
        setStep('reset');
      }
    });

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const callbackError = params.get('error_description') || hashParams.get('error_description');

      if (callbackError) {
        setError('The reset link is invalid or expired. Request a new recovery code.');
        setStep('email');
        return;
      }
      if ((!sessionError && data.session) || recoveryEventSeen) {
        setError(null);
        setStep('reset');
        return;
      }

      setStep('email');
      setError('This reset link is missing or expired. Enter your email to request a fresh recovery code.');
    }).catch(() => {
      if (!active) return;
      setStep('email');
      setError('Could not check the reset session. Request a fresh recovery code and try again.');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [location.pathname]);

  const getRecoveryRedirect = () => {
    // Keep this exact path stable for Supabase projects that allow-list only the
    // existing /reset-password URL. OTP verification itself stays on this page.
    return `${window.location.origin}/reset-password`;
  };

  const sendRecoveryCode = async (requestedEmail: string) => {
    const { error: requestError } = await supabase.auth.resetPasswordForEmail(requestedEmail, {
      redirectTo: getRecoveryRedirect()
    });
    if (requestError) throw requestError;
  };

  const handleRequestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await sendRecoveryCode(cleanEmail);
      setEmail(cleanEmail);
      setVerificationCode('');
      // Keep this response generic to avoid revealing whether an email is registered.
      setNotice('If an account exists for that email, a recovery code has been sent. Check your inbox and spam folder, then enter the newest code below.');
      setStep('verify');
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, 'Could not send a recovery code. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await sendRecoveryCode(email.trim().toLowerCase());
      setVerificationCode('');
      setNotice('If an account exists for that email, a new recovery code has been sent. Use this newest email; earlier codes may no longer work.');
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, 'Could not resend the recovery code. Try again later.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = verificationCode.replace(/\D/g, '').slice(0, 6);

    if (!cleanEmail) {
      setStep('email');
      setError('Enter the email address that received the recovery code.');
      return;
    }
    if (!/^\d{6}$/.test(cleanCode)) {
      setError('Enter the complete 6-digit code from the latest recovery email.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: 'recovery'
      });
      if (verifyError) throw verifyError;
      if (!data.session || !data.user) {
        throw new Error('The code was accepted but no recovery session was created. Request a new code and try again.');
      }

      setEmail(data.user.email?.trim().toLowerCase() || cleanEmail);
      setVerificationCode('');
      setStep('reset');
    } catch (verifyError) {
      setError(getAuthErrorMessage(verifyError, 'Could not verify that code. Check it and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (newPassword.length < 8) {
      setError('Choose a password with at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The passwords do not match. Re-enter the confirmation.');
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        setStep('email');
        setNewPassword('');
        setConfirmPassword('');
        throw new Error('Your recovery session expired. Request a new code and verify it again.');
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setNewPassword('');
      setConfirmPassword('');
      setStep('success');
    } catch (updateError) {
      setError(getAuthErrorMessage(updateError, 'Could not update the password. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = async () => {
    setLoading(true);
    try {
      // End the recovery session before returning to the requested role's sign-in page.
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
      if (signOutError) await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Still take the user to sign-in if the global session revocation is unavailable.
      try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* no action */ }
    } finally {
      navigate(loginPath, { replace: true });
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-0 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="lg:col-span-5 xl:col-span-6 bg-[#072038] p-4 sm:p-6 flex flex-col justify-center items-center">
          <div className="w-full h-full min-h-[320px] sm:min-h-[420px] lg:min-h-[560px] flex items-center justify-center rounded-2xl overflow-hidden">
            <img src="/auth-banner.jpg" alt="Find Driver Jobs Near You - Driver Hub" className="w-full h-full object-contain object-center" />
          </div>
        </div>

        <div className="lg:col-span-7 xl:col-span-6 p-6 sm:p-8 lg:p-10 space-y-6">
          <div className="space-y-1">
            <Logo size="md" />
            <h1 className="text-2xl sm:text-3xl font-black text-[#08233F] font-display tracking-tight pt-2">
              {step === 'email' && t('Reset Your Password')}
              {step === 'verify' && t('Verify Your Email')}
              {step === 'reset' && t('Choose a New Password')}
              {step === 'success' && t('Password Updated')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              {step === 'email' && t(`Enter the email for your account. We’ll send a secure recovery code.`)}
              {step === 'verify' && `${t('Enter the 6-digit code sent to')} ${email}.`}
              {step === 'reset' && t(`The code is verified. Choose a new password for your account.`)}
              {step === 'success' && `${t('Your password has been reset. Sign in again as')} ${roleLabel}.`}
            </p>
          </div>

          <div className="flex items-center gap-2" aria-label="Password reset progress">
            {[0, 1, 2].map(index => (
              <div key={index} className={`h-1.5 rounded-full transition-all duration-300 ${
                (step === 'email' && index === 0) || (step === 'verify' && index === 1) || (step === 'reset' && index === 2)
                  ? 'w-8 bg-amber-500'
                  : (step === 'success' || (step === 'reset' && index < 2) || (step === 'verify' && index === 0))
                    ? 'w-4 bg-emerald-500'
                    : 'w-4 bg-slate-200'
              }`} />
            ))}
          </div>

          <div className="space-y-4">
            {error && (
              <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}
            {notice && (
              <div role="status" className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium">{notice}</span>
              </div>
            )}

            {step === 'email' && (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div>
                  <label htmlFor="recovery-email" className="block text-xs font-semibold text-slate-700 mb-1">{t('Email Address')}</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="recovery-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-[#08233F] hover:bg-[#051626] text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> : <><Send className="w-4 h-4 text-amber-400" /> {t('Send Recovery Code')}</>}
                </button>
              </form>
            )}

            {step === 'verify' && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label htmlFor="recovery-code" className="block text-xs font-semibold text-slate-700 mb-1">{t('Verify Code')}</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="recovery-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      required
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={verificationCode}
                      onChange={event => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter code from email"
                      aria-describedby="recovery-code-help"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm tracking-[0.35em] text-slate-900 placeholder:tracking-normal placeholder:text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all font-semibold"
                    />
                  </div>
                  <p id="recovery-code-help" className="mt-1.5 text-[11px] leading-relaxed text-slate-500">Use the newest email. Codes expire and can only be used once.</p>
                </div>
                <button type="submit" disabled={loading || verificationCode.length !== 6} className="w-full py-3 bg-[#08233F] hover:bg-[#051626] text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> : <><ShieldCheck className="w-4 h-4 text-amber-400" /> {t('Verify Code')}</>}
                </button>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <button type="button" onClick={handleResendCode} disabled={loading} className="inline-flex items-center gap-1.5 text-blue-700 font-semibold hover:underline disabled:opacity-50">
                    <RefreshCw className="w-3.5 h-3.5" /> Send a new code
                  </button>
                  <button type="button" onClick={() => { setError(null); setNotice(null); setVerificationCode(''); setStep('email'); }} className="text-slate-600 font-semibold hover:underline">Change email</button>
                </div>
              </form>
            )}

            {step === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="new-password" className="block text-xs font-semibold text-slate-700 mb-1">{t('New Password')}</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input id="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="At least 8 characters" className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white font-medium" />
                      <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-700 mb-1">{t('Confirm New Password')}</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Re-enter new password" className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white font-medium" />
                      <button type="button" onClick={() => setShowConfirmPassword(value => !value)} className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5" aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}>
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-[#08233F] hover:bg-[#051626] text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> : <><ShieldCheck className="w-4 h-4 text-amber-400" /> {t('Update Password')}</>}
                </button>
              </form>
            )}

            {step === 'success' && (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner"><CheckCircle2 className="w-8 h-8" /></div>
                <div>
                  <h3 className="text-base font-bold text-[#08233F]">{t('Password Updated')}</h3>
                  <p className="text-xs text-slate-600 mt-1">The password for <strong className="text-slate-900">{email}</strong> has been updated.</p>
                </div>
                <button type="button" onClick={() => void handleGoToLogin()} disabled={loading} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <>{t('Sign In as')} {roleLabel} <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            )}

            <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
              <Link to={loginPath} className="text-slate-600 font-semibold hover:underline inline-flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> {t('Back to Sign In')}</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
