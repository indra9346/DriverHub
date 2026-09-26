import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Phone, Mail, MapPin, Award, Briefcase, IndianRupee, 
  CheckCircle2, Plus, Trash2, Save, Sparkles, ShieldCheck, Calendar
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { SupabaseSync } from '../../services/supabaseSync';
import { DriverProfile, DriverCategory, DriverExperience } from '../../types';
import { useLanguage } from '../../services/i18n';

export const DriverProfilePage: React.FC = () => {
  const { t } = useLanguage();
  const currentUser = DataStore.getCurrentUser();
  const [profile, setProfile] = useState<DriverProfile>(() => {
    if (currentUser) {
      const p = DataStore.getDriverById(currentUser.id);
      return {
        ...p,
        licenseNumber: p.licenseNumber || '',
        licenseExpiry: p.licenseExpiry ? p.licenseExpiry.slice(0, 10) : ''
      };
    }
    const d = DataStore.getDrivers()[0] || {} as DriverProfile;
    return {
      ...d,
      licenseNumber: d.licenseNumber || '',
      licenseExpiry: d.licenseExpiry ? d.licenseExpiry.slice(0, 10) : ''
    };
  });
  const [skillsText, setSkillsText] = useState(() => profile.skills?.join(', ') || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  // New experience record modal
  const [showExpModal, setShowExpModal] = useState(false);
  const [newExp, setNewExp] = useState<Partial<DriverExperience>>({
    companyName: '',
    roleTitle: '',
    vehicleType: '',
    durationYears: 2,
    description: ''
  });

  const loadedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    if (loadedIdRef.current !== currentUser.id) {
      loadedIdRef.current = currentUser.id;
      const p = DataStore.getDriverById(currentUser.id);
      if (p) {
        setProfile({
          ...p,
          licenseNumber: p.licenseNumber || '',
          licenseExpiry: p.licenseExpiry ? p.licenseExpiry.slice(0, 10) : ''
        });
        setSkillsText(p.skills?.join(', ') || '');
      }
    }
  }, [currentUser?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const skills = skillsText.split(',').map(s => s.trim()).filter(Boolean);
    const updated: DriverProfile = { 
      ...profile, 
      skills,
      licenseNumber: (profile.licenseNumber || '').trim().toUpperCase(),
      licenseExpiry: profile.licenseExpiry ? profile.licenseExpiry.slice(0, 10) : ''
    };
    setSaveError('');
    const saved = currentUser ? await SupabaseSync.registerUser(currentUser, updated) : false;
    if (!saved) {
      setSaveError('Your profile could not be saved. Check your connection and try again.');
      setSaving(false);
      return;
    }
    DataStore.setDriverProfileLocal(updated);
    setProfile(updated);
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    const exp: DriverExperience = {
      id: 'exp-' + Date.now(),
      driverId: profile.id,
      companyName: newExp.companyName || 'Transport Fleet',
      roleTitle: newExp.roleTitle || 'Commercial Driver',
      vehicleType: newExp.vehicleType || 'Truck / Van',
      durationYears: newExp.durationYears || 1,
      startDate: '2023-01',
      description: newExp.description || ''
    };

    const exps = profile.experiences ? [...profile.experiences, exp] : [exp];
    const updated = { ...profile, experiences: exps };
    setSaveError('');
    if (!currentUser || !(await SupabaseSync.registerUser(currentUser, updated))) {
      setSaveError('Experience could not be saved. Check your connection and try again.');
      return;
    }
    DataStore.setDriverProfileLocal(updated);
    setProfile(updated);
    setShowExpModal(false);
    setNewExp({ companyName: '', roleTitle: '', vehicleType: '', durationYears: 2, description: '' });
  };

  const handleDeleteExperience = async (expId: string) => {
    setSaveError('');
    if (!currentUser || !(await SupabaseSync.deleteDriverExperience(currentUser.id, expId))) {
      setSaveError('Experience could not be deleted. Check your connection and try again.');
      return;
    }
    const exps = profile.experiences?.filter(e => e.id !== expId) || [];
    const updated = { ...profile, experiences: exps };
    DataStore.setDriverProfileLocal(updated);
    setProfile(updated);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy font-display">{t('Driver Profile & Credentials')}</h1>
          <p className="text-xs text-slate-500 mt-1">{t('Keep your profile and driving license details updated for verified fleet shortlists')}</p>
        </div>

        {saveSuccess && (
          <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 animate-in fade-in shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {t('Changes Saved Successfully!')}
          </div>
        )}
      </div>
      {saveError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{saveError}</p>}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal & Contact Details */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-card space-y-5">
          <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-brand-blue" /> {t('Personal & Contact Info')}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('Full Legal Name')}</label>
              <input
                type="text"
                required
                value={profile.fullName || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, fullName: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('Phone Number (Verified)')}</label>
              <input
                type="tel"
                required
                value={profile.phone || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('Email Address')}</label>
              <input
                type="email"
                disabled
                value={profile.email || ''}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('City / Residential Area')}</label>
              <input
                type="text"
                required
                value={profile.location || profile.city || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value, city: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* License & Vehicle Specialization */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" /> {t('Driving License & Specialization')}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Primary Driver Category')}</label>
              <select
                value={profile.driverCategory || 'HMV'}
                onChange={(e) => setProfile(prev => ({ ...prev, driverCategory: e.target.value as DriverCategory }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
              >
                <option value="HMV">{t('Heavy Motor Vehicle (HMV)')}</option>
                <option value="LMV">{t('Light Motor Vehicle (LMV)')}</option>
                <option value="Cab Driver">{t('Cab Driver')}</option>
                <option value="Delivery Driver">{t('Delivery Driver')}</option>
                <option value="Bus Driver">{t('Bus Driver')}</option>
                <option value="Trailer Driver">{t('Trailer Driver')}</option>
                <option value="Tempo Driver">{t('Tempo Driver')}</option>
                <option value="Personal Driver">{t('Personal Driver')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Driving License Number')}</label>
              <input
                type="text"
                value={profile.licenseNumber || ''}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setProfile(prev => ({ ...prev, licenseNumber: val }));
                }}
                placeholder="KA-04-2021-0012345"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-none uppercase font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('License Expiry Date')}</label>
              <div className="relative">
                <input
                  type="date"
                  value={profile.licenseExpiry ? profile.licenseExpiry.slice(0, 10) : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProfile(prev => ({ ...prev, licenseExpiry: val }));
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Total Driving Experience (Years)')}</label>
              <input
                type="number"
                min="0"
                max="40"
                value={profile.experienceYears ?? 0}
                onChange={(e) => setProfile(prev => ({ ...prev, experienceYears: Number(e.target.value) }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Expected Monthly Salary (₹)')}</label>
              <input
                type="number"
                step="1000"
                value={profile.expectedSalary || 25000}
                onChange={(e) => setProfile(prev => ({ ...prev, expectedSalary: Number(e.target.value) }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Joining Availability')}</label>
              <select
                value={profile.availability || 'Immediate'}
                onChange={(e) => setProfile(prev => ({ ...prev, availability: e.target.value as any }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
              >
                <option value="Immediate">{t('Immediate')}</option>
                <option value="Within 15 Days">Within 15 Days</option>
                <option value="1 Month">1 Month</option>
                <option value="Flexible">{t('Flexible')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('Skills & Capabilities (comma-separated)')}
            </label>
            <input
              type="text"
              value={skillsText || ''}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="e.g. Highway Navigation, Night Driving, Automatic Transmission, Fleet Maintenance"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('Driver Bio / Summary')}
            </label>
            <textarea
              rows={3}
              value={profile.bio || ''}
              onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Brief overview of your driving career, preferred routes, accident-free milestones..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Driving Experience History */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-600" /> {t('Past Driving Experience Records')}
            </h2>
            <button
              type="button"
              onClick={() => setShowExpModal(true)}
              className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
            >
              <Plus className="w-4 h-4" /> {t('Add Experience')}
            </button>
          </div>

          {profile.experiences && profile.experiences.length > 0 ? (
            <div className="space-y-3">
              {profile.experiences.map((exp) => (
                <div key={exp.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-900">{exp.roleTitle} — {exp.companyName}</h4>
                    <p className="text-[11px] text-slate-500">Vehicle: {exp.vehicleType} • {exp.durationYears} Years</p>
                    {exp.description && <p className="text-xs text-slate-600 mt-1">{exp.description}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => { void handleDeleteExperience(exp.id); }}
                    className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-3 text-center">{t('No past experience records added yet.')}</p>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3.5 bg-[#0A2540] hover:bg-[#06182B] text-white font-bold rounded-2xl text-xs shadow-md transition-all hover:scale-105 cursor-pointer disabled:opacity-70"
          >
            <Save className="w-4 h-4 text-amber-400" /> {saving ? t('Saving Details...') : t('Save Profile Details')}
          </button>
        </div>
      </form>

      {/* Add Experience Modal */}
      {showExpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">{t('Add Driving Experience')}</h3>
            <form onSubmit={handleAddExperience} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('Company / Fleet Name')}</label>
                <input
                  type="text"
                  required
                  value={newExp.companyName}
                  onChange={(e) => setNewExp({ ...newExp, companyName: e.target.value })}
                  placeholder="e.g. South Freight Lines"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('Role Title')}</label>
                <input
                  type="text"
                  required
                  value={newExp.roleTitle}
                  onChange={(e) => setNewExp({ ...newExp, roleTitle: e.target.value })}
                  placeholder="e.g. Heavy Truck Pilot"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('Vehicle Model / Type')}</label>
                <input
                  type="text"
                  required
                  value={newExp.vehicleType}
                  onChange={(e) => setNewExp({ ...newExp, vehicleType: e.target.value })}
                  placeholder="e.g. 14-Wheel Ashok Leyland"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('Duration (Years)')}</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={newExp.durationYears}
                  onChange={(e) => setNewExp({ ...newExp, durationYears: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('Key Responsibilities')}</label>
                <textarea
                  rows={2}
                  value={newExp.description}
                  onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
                  placeholder="e.g. Interstate highway transit on Bengaluru-Mumbai corridor."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpModal(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 cursor-pointer"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0A2540] text-white font-bold rounded-xl cursor-pointer"
                >
                  {t('Save Experience')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
