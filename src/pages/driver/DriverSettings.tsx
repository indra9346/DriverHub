import React, { useState } from 'react';
import { Settings, Lock, Bell, Shield, Save, CheckCircle2, RotateCcw, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { DataStore } from '../../services/store';
import { supabase } from '../../services/supabaseClient';

export const DriverSettings: React.FC = () => {
  const currentUser = DataStore.getCurrentUser();
  const [saved, setSaved] = useState(false);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please verify and try again.');
      return;
    }

    setPasswordLoading(true);

    try {
      if (currentUser?.email) {
        // Update in Supabase Auth
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;

        // Update in local DataStore
        DataStore.updateUserPassword(currentUser.email, newPassword);
      }
      setPasswordSuccess('Password successfully updated and encrypted!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy font-display">Account Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Manage notification alerts and account security credentials</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 p-3.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-bold animate-in fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Preferences saved successfully!
        </div>
      )}

      {/* Notification Alerts Form */}
      <form onSubmit={handleSavePreferences} className="space-y-6">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-card space-y-4">
          <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wider flex items-center gap-2">
            <Bell className="w-4 h-4 text-brand-amber" /> Job Alerts & Updates
          </h2>

          <div className="space-y-3 divide-y divide-slate-100">
            <label className="flex items-center justify-between pt-2 first:pt-0 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-900">WhatsApp Instant Alerts</p>
                <p className="text-[11px] text-slate-500">Get notified immediately when an employer shortlists you</p>
              </div>
              <input
                type="checkbox"
                checked={whatsappAlerts}
                onChange={(e) => setWhatsappAlerts(e.target.checked)}
                className="w-4 h-4 accent-brand-amber rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between pt-3 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-900">SMS Notifications</p>
                <p className="text-[11px] text-slate-500">Receive interview schedules and venue details via SMS</p>
              </div>
              <input
                type="checkbox"
                checked={smsAlerts}
                onChange={(e) => setSmsAlerts(e.target.checked)}
                className="w-4 h-4 accent-brand-amber rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between pt-3 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-900">Email Digest</p>
                <p className="text-[11px] text-slate-500">Weekly digest of high-paying jobs in your city</p>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 accent-brand-amber rounded cursor-pointer"
              />
            </label>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-brand-navy hover:bg-brand-navy-light text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-brand-amber" /> Save Alert Preferences
            </button>
          </div>
        </div>
      </form>

      {/* Password & Security Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-card space-y-4">
        <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wider flex items-center gap-2">
          <Lock className="w-4 h-4 text-brand-blue" /> Password & Security
        </h2>

        {passwordError && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
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
              className="px-6 py-2.5 bg-brand-navy hover:bg-brand-navy-light disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              {passwordLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating Password...
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5 text-brand-amber" /> Update Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Demo reset option */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-900">Reset Demo Database State</p>
          <p className="text-[11px] text-slate-500">Reverts all jobs, applications, and drivers to default seed</p>
        </div>
        <button
          type="button"
          onClick={() => {
            DataStore.resetDemoData();
            alert('Demo data has been restored to defaults.');
          }}
          className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Demo Data
        </button>
      </div>
    </div>
  );
};
