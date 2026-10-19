import React, { useState, useEffect, useRef } from 'react';
import { Building2, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { DataStore } from '../../services/store';
import { EmployerProfile } from '../../types';
import { useLanguage } from '../../services/i18n';
import { PanIndiaLocationSelector } from '../../components/common/PanIndiaLocationSelector';
import { parseStructuredLocation, formatStructuredLocation, StructuredPanIndiaLocation } from '../../services/indiaLocationService';
import { clearLastError, normalizeHttpUrl } from '../../services/employerApi';

const inputClass = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all';

export const EmployerCompanyProfile: React.FC = () => {
  const { t } = useLanguage();
  const currentUser = DataStore.getCurrentUser();
  const userId = currentUser?.id || '';
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [locationSelection, setLocationSelection] = useState<StructuredPanIndiaLocation>({
    state: '',
    district: '',
    city: '',
    pincode: '',
    formattedLocation: ''
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Once the employer starts typing, cache refreshes must never overwrite the form.
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    dirtyRef.current = false;
    const load = () => {
      if (dirtyRef.current) return;
      const user = DataStore.getCurrentUser();
      const c = DataStore.getEmployerById(userId) || {
        id: userId, companyName: '', contactPerson: '',
        email: user?.email || '', phone: user?.phone || '', industry: '', location: '',
        city: '', state: '', address: '', website: '', logoUrl: '', description: '',
        verified: false, status: 'pending' as const, createdAt: new Date().toISOString().slice(0, 10)
      };
      setProfile(c);
      setLocationSelection(parseStructuredLocation(c.location, c.state, c.district, c.city, c.pincode));
    };
    load();
    // The company row may arrive after the first render; pick it up until the user edits.
    window.addEventListener('driverhub_storage_updated', load);
    return () => window.removeEventListener('driverhub_storage_updated', load);
  }, [userId]);

  if (!profile) return null;

  const update = (patch: Partial<EmployerProfile>) => {
    dirtyRef.current = true;
    setError('');
    setProfile(prev => (prev ? { ...prev, ...patch } : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError('');

    const website = normalizeHttpUrl(profile.website || '', 'website');
    if (website.ok === false) { setError(website.error); return; }
    const logo = normalizeHttpUrl(profile.logoUrl || '', 'logo');
    if (logo.ok === false) { setError(logo.error); return; }

    const formattedLoc = formatStructuredLocation(locationSelection) || profile.location || profile.city || '';
    const updatedProfile: EmployerProfile = {
      ...profile,
      companyName: profile.companyName.trim(),
      contactPerson: profile.contactPerson.trim(),
      email: (profile.email || '').trim(),
      phone: (profile.phone || '').trim(),
      industry: profile.industry.trim(),
      website: website.value,
      logoUrl: logo.value,
      address: (profile.address || '').trim(),
      description: (profile.description || '').trim(),
      state: locationSelection.state || profile.state,
      district: locationSelection.district || profile.district,
      city: locationSelection.city || locationSelection.district || profile.city,
      pincode: locationSelection.pincode || profile.pincode,
      location: formattedLoc
    };

    setSaving(true);
    clearLastError();
    const ok = await DataStore.updateEmployerProfile(updatedProfile);
    setSaving(false);
    if (!ok) {
      setError(DataStore.getLastError('Your company profile could not be saved. Please try again.'));
      return;
    }
    dirtyRef.current = false;
    setProfile(DataStore.getEmployerById(updatedProfile.id) || updatedProfile);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-brand-navy font-display">{t('companyProfile')}</h1>
          <p className="text-xs text-slate-500 mt-1">{t('companyProfileDesc')}</p>
        </div>

        {saved && (
          <div role="status" className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {t('profileSaved')}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-4 sm:p-8 rounded-2xl border border-slate-200 shadow-card space-y-5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-navy uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-brand-blue" /> {t('companyDetails')}
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${profile.verified ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
              {profile.verified ? 'Verified company' : 'Verification pending'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('companyName')}</label>
              <input
                type="text"
                required
                value={profile.companyName}
                onChange={(e) => update({ companyName: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('industrySector')}</label>
              <input
                type="text"
                required
                value={profile.industry}
                onChange={(e) => update({ industry: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('contactPerson')}</label>
              <input
                type="text"
                required
                value={profile.contactPerson}
                onChange={(e) => update({ contactPerson: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('phone')}</label>
              <input
                type="tel"
                required
                value={profile.phone}
                onChange={(e) => update({ phone: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company email</label>
              <input
                type="email"
                value={profile.email || ''}
                onChange={(e) => update({ email: e.target.value })}
                placeholder="hr@yourcompany.com"
                className={inputClass}
              />
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('website')}</label>
              <input
                type="text"
                inputMode="url"
                autoCapitalize="off"
                value={profile.website || ''}
                onChange={(e) => update({ website: e.target.value })}
                placeholder="https://yourcompany.com"
                className={inputClass}
              />
            </div>

            <div className="min-w-0 sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('companyLogoUrl')}</label>
              <input
                type="text"
                inputMode="url"
                autoCapitalize="off"
                value={profile.logoUrl || ''}
                onChange={(e) => update({ logoUrl: e.target.value })}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <PanIndiaLocationSelector
              value={locationSelection}
              onChange={(next) => {
                setLocationSelection(next);
                update({
                  state: next.state,
                  district: next.district,
                  city: next.city || next.district,
                  pincode: next.pincode,
                  location: next.formattedLocation
                });
              }}
              mode="form"
              layout="grid-2"
              required
              idPrefix="employer-company-loc"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Office / depot address</label>
            <textarea
              rows={2}
              value={profile.address || ''}
              onChange={(e) => update({ address: e.target.value })}
              placeholder="Building, street, area"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('aboutCompany')}</label>
            <textarea
              rows={4}
              value={profile.description || ''}
              onChange={(e) => update({ description: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-2 text-xs font-semibold text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 break-words">
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" /> <span className="min-w-0">{error}</span>
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto justify-center flex items-center gap-2 px-8 py-3.5 bg-brand-navy hover:bg-brand-navy-light disabled:opacity-60 disabled:cursor-wait text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin text-brand-amber" /> : <Save className="w-4 h-4 text-brand-amber" />}
            {saving ? 'Saving…' : t('saveChanges')}
          </button>
        </div>
      </form>
    </div>
  );
};
