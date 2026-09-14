import React, { useState } from 'react';
import { Settings, Lock, Bell, Shield, Save, CheckCircle2, RotateCcw } from 'lucide-react';
import { DataStore } from '../../services/store';

export const DriverSettings: React.FC = () => {
  const [saved, setSaved] = useState(false);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy font-display">Account Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Manage notification alerts and account preferences</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Preferences saved successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Notification Alerts */}
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
                className="w-4 h-4 accent-brand-amber rounded"
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
                className="w-4 h-4 accent-brand-amber rounded"
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
                className="w-4 h-4 accent-brand-amber rounded"
              />
            </label>
          </div>
        </div>

        {/* Password Security */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-card space-y-4">
          <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-blue" /> Password & Security
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Demo reset option */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-900">Reset Demo Database State</p>
            <p className="text-[11px] text-slate-500">Reverts all jobs, applications, and drivers to default seed</p>
          </div>
          <button
            type="button"
            onClick={() => DataStore.resetDemoData()}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Demo Data
          </button>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-brand-navy hover:bg-brand-navy-light text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4 text-brand-amber" /> Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
};
