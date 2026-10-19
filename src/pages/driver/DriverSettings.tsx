import React, { useEffect, useRef, useState } from 'react';
import { Lock, Bell, Shield, Save, CheckCircle2, RotateCcw, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { DataStore } from '../../services/store';
import { supabase } from '../../services/supabaseClient';
import { loadAlertPreferences, saveAlertPreferences } from '../../services/driverApi';
import { useLanguage } from '../../services/i18n';

// Mounted at /driver/settings and /employer/settings.
export const DriverSettings: React.FC = () => {
  const { t } = useLanguage();
  const currentUser = DataStore.getCurrentUser();
  const userId = currentUser?.id || '';
  const isDemo = DataStore.isDemoMode();
  const isEmployer = currentUser?.role === 'employer';
  const [prefsMessage, setPrefsMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [smsAlerts, setSmsAlerts] = useState(() => loadAlertPreferences(userId).sms);
  const [emailAlerts, setEmailAlerts] = useState(() => loadAlertPreferences(userId).email);
  const [whatsappAlerts, setWhatsappAlerts] = useState(() => loadAlertPreferences(userId).whatsapp);
  const prefsTimerRef = useRef<number | null>(null);
  const passwordTimerRef = useRef<number | null>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Reload the stored choices when the signed-in account changes.
  useEffect(() => {
    const prefs = loadAlertPreferences(userId);
    setSmsAlerts(prefs.sms);
    setEmailAlerts(prefs.email);
    setWhatsappAlerts(prefs.whatsapp);
  }, [userId]);

  useEffect(() => () => {
    if (prefsTimerRef.current) window.clearTimeout(prefsTimerRef.current);
    if (passwordTimerRef.current) window.clearTimeout(passwordTimerRef.current);
  }, []);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    // There is no account-level column for these yet, so they are kept in this
    // browser only, and the message says so.
    const saved = saveAlertPreferences(userId, { sms: smsAlerts, email: emailAlerts, whatsapp: whatsappAlerts });
    setPrefsMessage(saved
      ? { ok: true, text: 'Alert preferences saved on this device.' }
      : { ok: false, text: 'Alert preferences could not be saved in this browser (storage is blocked or full).' });
    if (prefsTimerRef.current) window.clearTimeout(prefsTimerRef.current);
    prefsTimerRef.current = window.setTimeout(() => setPrefsMessage(null), 4000);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordLoading) return;
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError(t('Minimum 6 characters'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('Passwords do not match. Please verify and try again.'));
      return;
    }

    setPasswordLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        // Passwords live only in Supabase Auth.
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      } else if (!isDemo) {
        throw new Error('Your session has expired. Please sign in again to change your password.');
      }
      // Demo accounts keep a local copy of the password (no-op outside demo mode).
      if (isDemo && currentUser?.email) DataStore.updateUserPassword(currentUser.email, newPassword);
      setPasswordSuccess('Your password has been updated.');
      setNewPassword('');
      setConfirmPassword('');
      if (passwordTimerRef.current) window.clearTimeout(passwordTimerRef.current);
      passwordTimerRef.current = window.setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const toggleRowClass = 'flex items-center justify-between gap-4 min-h-12 cursor-pointer';

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy font-display">{t('Account Settings')}</h1>
        <p className="text-xs text-slate-500 mt-1">{t('Manage notification alerts and account security credentials')}</p>
      </div>

      {prefsMessage && (
        <div
          role="status"
          className={`flex items-center gap-2 p-3.5 rounded-xl border text-xs font-bold animate-in fade-in shadow-xs ${
            prefsMessage.ok ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {prefsMessage.ok
            ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span className="min-w-0 break-words">{prefsMessage.text}</span>
        </div>
      )}

      {/* Notification Alerts Form */}
      <form onSubmit={handleSavePreferences} className="space-y-6">
        <div className="bg-white p-4 sm:p-8 rounded-2xl border border-slate-200 shadow-card space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-amber shrink-0" /> {isEmployer ? t('Hiring Alerts & Updates') : t('Job Alerts & Updates')}
            </h2>
            <p className="text-[11px] text-slate-500">These choices are stored in this browser only.</p>
          </div>

          <div className="space-y-3 divide-y divide-slate-100">
            <label className={`${toggleRowClass} pt-2 first:pt-0`}>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900">{t('WhatsApp Instant Alerts')}</p>
                <p className="text-[11px] text-slate-500">{isEmployer ? t('Get notified immediately when a driver applies to your job') : t('Get notified immediately when an employer shortlists you')}</p>
              </div>
              <input
                type="checkbox"
                checked={whatsappAlerts}
                onChange={(e) => setWhatsappAlerts(e.target.checked)}
                className="w-5 h-5 shrink-0 accent-brand-amber rounded cursor-pointer"
              />
            </label>

            <label className={`${toggleRowClass} pt-3`}>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900">{t('SMS Notifications')}</p>
                <p className="text-[11px] text-slate-500">{isEmployer ? t('Receive candidate replies and interview reminders via SMS') : t('Receive interview schedules and venue details via SMS')}</p>
              </div>
              <input
                type="checkbox"
                checked={smsAlerts}
                onChange={(e) => setSmsAlerts(e.target.checked)}
                className="w-5 h-5 shrink-0 accent-brand-amber rounded cursor-pointer"
              />
            </label>

            <label className={`${toggleRowClass} pt-3`}>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900">{t('Email Digest')}</p>
                <p className="text-[11px] text-slate-500">{isEmployer ? t('Weekly summary of applications and matching drivers') : t('Weekly digest of high-paying jobs in your city')}</p>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-5 h-5 shrink-0 accent-brand-amber rounded cursor-pointer"
              />
            </label>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto justify-center min-h-10 px-5 py-2.5 bg-brand-navy hover:bg-brand-navy-light text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-brand-amber" /> {t('Save Alert Preferences')}
            </button>
          </div>
        </div>
      </form>

      {/* Password & Security Card */}
      <div className="bg-white p-4 sm:p-8 rounded-2xl border border-slate-200 shadow-card space-y-4">
        <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wider flex items-center gap-2">
          <Lock className="w-4 h-4 text-brand-blue shrink-0" /> {t('Password & Security')}
        </h2>

        {passwordError && (
          <div role="alert" className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="min-w-0 break-words">{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div role="status" className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="min-w-0 break-words">{passwordSuccess}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label htmlFor="settings-new-password" className="block text-xs font-semibold text-slate-700 mb-1.5">{t('New Password')}</label>
              <div className="relative">
                <input
                  id="settings-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full min-h-10 pl-3.5 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 w-10 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer rounded-r-xl"
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="min-w-0">
              <label htmlFor="settings-confirm-password" className="block text-xs font-semibold text-slate-700 mb-1.5">{t('Confirm New Password')}</label>
              <div className="relative">
                <input
                  id="settings-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full min-h-10 pl-3.5 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 w-10 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer rounded-r-xl"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={passwordLoading || !newPassword}
              className="w-full sm:w-auto justify-center min-h-10 px-6 py-2.5 bg-brand-navy hover:bg-brand-navy-light disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              {passwordLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('Updating Password...')}
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5 text-brand-amber" /> {t('Update Password')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Demo reset option: development demo mode only */}
      {isDemo && (
        <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900">{t('Reset Demo Database State')}</p>
            <p className="text-[11px] text-slate-500">{t('Reverts all jobs, applications, and drivers to default seed')}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!confirm('Reset all demo data on this device? The page will reload.')) return;
              DataStore.resetDemoData();
            }}
            className="min-h-10 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" /> {t('Reset Demo Data')}
          </button>
        </div>
      )}
    </div>
  );
};
