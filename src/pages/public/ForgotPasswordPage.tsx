import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail, ArrowLeft, Send, CheckCircle2, Lock, Eye, EyeOff,
  KeyRound, ShieldCheck, AlertCircle, RefreshCw, ArrowRight
} from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { supabase } from '../../services/supabaseClient';
import { DataStore } from '../../services/store';
import { UserRole } from '../../types';
import { useLanguage } from '../../services/i18n';
import { getLoginPathForRole } from '../../services/authRouting';
import {
  endPasswordRecovery,
  getInitialRecoveryError,
  isPasswordRecoveryActive,
  markPasswordRecoveryStarted,
  subscribePasswordRecovery
} from '../../services/publicApi';

type RecoveryStep = 'email' | 'verify' | 'checking' | 'reset' | 'success';

/** Same minimum as registration. */
const MIN_PASSWORD_LENGTH = 6;
/** How long to wait for Supabase to finish processing a reset link. */
const RECOVERY_LINK_TIMEOUT_MS = 8000;

const getAuthErrorMessage = (error: unknown, fallback: string): string => {
  const authError = error as { message?: string; code?: string; status?: number } | null;
  const message = authError?.message?.trim() || '';
  const normalized = `${authError?.code || ''} ${message}`.toLowerCase();

  if (authError?.status === 429 || normalized.includes('rate limit') || normalized.includes('too many')) {
    return 'Too many reset requests were made. Wait a while before requesting another email, then use the newest one.';
  }
  if (normalized.includes('expired') || normalized.includes('otp_expired') || normalized.includes('invalid token')) {
    return 'That code or reset link is invalid or has expired. Request a new reset email and use the newest one.';
  }
  if (normalized.includes('fetch') || normalized.includes('network') || normalized.includes('failed to fetch')) {
    return 'Could not reach the authentication service. Check your internet connection and try again.';
  }

  return message || fallback;
};

/** The URL still carries Supabase callback data that is being processed. */
const urlLooksLikeAuthCallback = (): boolean => {
  if (typeof window === 'undefined') return false;
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return query.has('code') || hash.has('access_token');
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
  const loginPath = useMemo(() => getLoginPathForRole(role, redirect || undefined), [role, redirect]);
  const roleLabel = role === 'admin' ? t('Admin') : role === 'employer' ? t('Employer') : t('Driver');
  const isResetPath = location.pathname === '/reset-password';

  const [step, setStep] = useState<RecoveryStep>(() => (isResetPath ? 'checking' : 'email'));
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // /reset-password: continue only with a real password-recovery session (from
  // the emailed link). An ordinary signed-in session must never get this form.
  useEffect(() => {
    if (!isResetPath) return;

    let active = true;
    let timeout: number | undefined;

    const enterResetIfSessionExists = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        if (data.session) {
          setError(null);
          setEmail(current => current || data.session?.user.email?.toLowerCase() || '');
          setStep('reset');
        } else {
          endPasswordRecovery();
          setStep('email');
          setError('Your reset session has expired. Enter your email to get a new reset email.');
        }
      } catch {
        if (!active) return;
        setStep('email');
        setError('Could not check the reset link. Request a new reset email and try again.');
      }
    };

    const linkError = getInitialRecoveryError();
    if (linkError) {
      setStep('email');
      setError('The reset link is invalid or has expired. Request a new reset email.');
      return () => { active = false; };
    }

    if (isPasswordRecoveryActive()) {
      void enterResetIfSessionExists();
    } else if (urlLooksLikeAuthCallback()) {
      // Supabase is still exchanging the link; wait for its PASSWORD_RECOVERY event.
      setStep('checking');
      timeout = window.setTimeout(() => {
        if (!active || isPasswordRecoveryActive()) return;
        setStep('email');
        setError('We could not confirm this reset link. Request a new reset email and open the newest one.');
      }, RECOVERY_LINK_TIMEOUT_MS);
    } else {
      setStep('email');
      setError('This reset link is missing or has expired. Enter your email to get a new reset email.');
    }

    const unsubscribe = subscribePasswordRecovery(isActive => {
      if (!active || !isActive) return;
      if (timeout !== undefined) window.clearTimeout(timeout);
      void enterResetIfSessionExists();
    });

    return () => {
      active = false;
      if (timeout !== undefined) window.clearTimeout(timeout);
      unsubscribe();
    };
  }, [isResetPath]);

  const getRecoveryRedirect = () => {
    // Keep this exact path stable for Supabase projects that allow-list only the
    // existing /reset-password URL.
    return `${window.location.origin}/reset-password`;
  };

  const sendRecoveryEmail = async (requestedEmail: string) => {
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
      await sendRecoveryEmail(cleanEmail);
      setEmail(cleanEmail);
      setVerificationCode('');
      // Keep this response generic to avoid revealing whether an email is registered.
      setNotice('If an account exists for that email, we have sent a password reset email. Check your inbox and spam folder.');
      setStep('verify');
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, 'Could not send the reset email. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await sendRecoveryEmail(email.trim().toLowerCase());
      setVerificationCode('');
      setNotice('If an account exists for that email, a new reset email has been sent. Use the newest one; earlier links and codes may stop working.');
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, 'Could not resend the reset email. Try again later.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = verificationCode.replace(/\D/g, '');

    if (!cleanEmail) {
      setStep('email');
      setError('Enter the email address that received the reset email.');
      return;
    }
    if (!/^\d{6,10}$/.test(cleanCode)) {
      setError('Enter the complete code from the latest reset email, or open the link in that email instead.');
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
        throw new Error('The code was accepted but no reset session was created. Request a new reset email and try again.');
      }

      markPasswordRecoveryStarted();
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

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Choose a password with at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The passwords do not match. Re-enter the confirmation.');
      return;
    }
    if (!isPasswordRecoveryActive()) {
      setStep('email');
      setError('Your reset session has ended. Request a new reset email and open the newest link.');
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        endPasswordRecovery();
        setStep('email');
        setNewPassword('');
        setConfirmPassword('');
        throw new Error('Your reset session expired. Request a new reset email and try again.');
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

  /**
   * Leave the recovery flow for the sign-in page. A recovery session is ended
   * first (it must not stay signed in), together with any cached account.
   */
  const leaveToSignIn = async () => {
    const hadRecoverySession = isPasswordRecoveryActive() || step === 'reset' || step === 'success';
    if (!hadRecoverySession) {
      navigate(loginPath, { replace: true });
      return;
    }
    setLoading(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
      if (signOutError) await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Still take the user to sign-in if the global session revocation is unavailable.
      try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* no action */ }
    } finally {
      endPasswordRecovery();
      DataStore.setCurrentUser(null);
      setLoading(false);
      navigate(loginPath, { replace: true });
    }
  };

  const progressIndex = step === 'email' ? 0 : step === 'verify' || step === 'checking' ? 1 : 2;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-0 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        {/* Banner (large screens only, so the form is first on phones) */}
        <div className="hidden lg:flex lg:col-span-5 xl:col-span-6 bg-[#072038] p-4 sm:p-6 flex-col justify-center items-center">
          <div className="w-full h-full min-h-[320px] sm:min-h-[420px] lg:min-h-[560px] flex items-center justify-center rounded-2xl overflow-hidden">
            <img src="/auth-banner.jpg" alt="Find Driver Jobs Near You - Driver Hub" className="w-full h-full object-contain object-center" />
          </div>
        </div>

        <div className="lg:col-span-7 xl:col-span-6 p-5 sm:p-8 lg:p-10 space-y-6 min-w-0">
          <div className="space-y-1">
            <Logo size="md" />
            <h1 className="text-2xl sm:text-3xl font-black text-[#08233F] font-display tracking-tight pt-2">
              {step === 'email' && t('Reset Your Password')}
              {(step === 'verify' || step === 'checking') && 'Check Your Email'}
              {step === 'reset' && t('Choose a New Password')}
              {step === 'success' && t('Password Updated')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 break-words [overflow-wrap:anywhere]">
              {step === 'email' && 'Enter the email for your account. We will email you a link to reset your password.'}
              {step === 'verify' && `Open the reset link in the email we sent to ${email}. If the email shows a code instead, enter it below.`}
              {step === 'checking' && 'Checking your reset link…'}
              {step === 'reset' && 'Your reset link is confirmed. Choose a new password for your account.'}
              {step === 'success' && `${t('Your password has been reset. Sign in again as')} ${roleLabel}.`}
            </p>
          </div>

          <div className="flex items-center gap-2" aria-label="Password reset progress">
            {[0, 1, 2].map(index => (
              <div key={index} className={`h-1.5 rounded-full transition-all duration-300 ${
                step !== 'success' && index === progressIndex
                  ? 'w-8 bg-amber-500'
                  : step === 'success' || index < progressIndex
                    ? 'w-4 bg-emerald-500'
                    : 'w-4 bg-slate-200'
              }`} />
            ))}
          </div>

          <div className="space-y-4">
            {error && (
              <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="font-medium break-words min-w-0">{error}</span>
              </div>
            )}
            {notice && (
              <div role="status" className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium break-words min-w-0">{notice}</span>
              </div>
            )}

            {step === 'checking' && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600" role="status" aria-live="polite">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                <span>Confirming your reset link with the sign-in service…</span>
              </div>
            )}

            {step === 'email' && (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div>
                  <label htmlFor="recovery-email" className="block text-xs font-semibold text-slate-700 mb-1">{t('Email Address')}</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="recovery-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      placeholder="name@example.com"
                      className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full min-h-[44px] py-3 bg-[#08233F] hover:bg-[#051626] text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> : <><Send className="w-4 h-4 text-amber-400" /> Send reset email</>}
                </button>
              </form>
            )}

            {step === 'verify' && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed">
                  Open the email on this device and tap its reset link. The link brings you back here to choose a new password.
                </div>
                <div>
                  <label htmlFor="recovery-code" className="block text-xs font-semibold text-slate-700 mb-1">Code from the email (only if it has one)</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="recovery-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6,10}"
                      maxLength={10}
                      value={verificationCode}
                      onChange={event => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Enter code from email"
                      aria-describedby="recovery-code-help"
                      className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm tracking-[0.35em] text-slate-900 placeholder:tracking-normal placeholder:text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all font-semibold"
                    />
                  </div>
                  <p id="recovery-code-help" className="mt-1.5 text-[11px] leading-relaxed text-slate-500">Use the newest email. Links and codes expire and work only once.</p>
                </div>
                <button type="submit" disabled={loading || verificationCode.length < 6} className="w-full min-h-[44px] py-3 bg-[#08233F] hover:bg-[#051626] text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> : <><ShieldCheck className="w-4 h-4 text-amber-400" /> {t('Verify Code')}</>}
                </button>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <button type="button" onClick={handleResendEmail} disabled={loading} className="inline-flex items-center gap-1.5 min-h-[40px] text-blue-700 font-semibold hover:underline disabled:opacity-50">
                    <RefreshCw className="w-3.5 h-3.5" /> Send a new reset email
                  </button>
                  <button type="button" onClick={() => { setError(null); setNotice(null); setVerificationCode(''); setStep('email'); }} className="min-h-[40px] text-slate-600 font-semibold hover:underline">Change email</button>
                </div>
              </form>
            )}

            {step === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="new-password" className="block text-xs font-semibold text-slate-700 mb-1">{t('New Password')}</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input id="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} className="w-full min-h-[44px] pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white font-medium" />
                      <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-0.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:text-slate-600" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-700 mb-1">{t('Confirm New Password')}</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Re-enter new password" className="w-full min-h-[44px] pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white font-medium" />
                      <button type="button" onClick={() => setShowConfirmPassword(value => !value)} className="absolute right-0.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:text-slate-600" aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}>
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full min-h-[44px] py-3 bg-[#08233F] hover:bg-[#051626] text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> : <><ShieldCheck className="w-4 h-4 text-amber-400" /> {t('Update Password')}</>}
                </button>
              </form>
            )}

            {step === 'success' && (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner"><CheckCircle2 className="w-8 h-8" /></div>
                <div>
                  <h3 className="text-base font-bold text-[#08233F]">{t('Password Updated')}</h3>
                  <p className="text-xs text-slate-600 mt-1 break-words [overflow-wrap:anywhere]">
                    The password{email ? <> for <strong className="text-slate-900">{email}</strong></> : null} has been updated.
                  </p>
                </div>
                <button type="button" onClick={() => void leaveToSignIn()} disabled={loading} className="w-full min-h-[44px] py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <>{t('Sign In as')} {roleLabel} <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            )}

            <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
              <button
                type="button"
                onClick={() => void leaveToSignIn()}
                disabled={loading}
                className="inline-flex items-center gap-1 min-h-[40px] text-slate-600 font-semibold hover:underline disabled:opacity-60"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> {t('Back to Sign In')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
