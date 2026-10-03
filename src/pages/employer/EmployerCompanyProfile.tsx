import React, { useState, useEffect } from 'react';
import { Building2, Save, CheckCircle2 } from 'lucide-react';
import { DataStore } from '../../services/store';
import { SupabaseSync } from '../../services/supabaseSync';
import { EmployerProfile } from '../../types';
import { useLanguage } from '../../services/i18n';
import { PanIndiaLocationSelector } from '../../components/common/PanIndiaLocationSelector';
import { parseStructuredLocation, formatStructuredLocation, StructuredPanIndiaLocation } from '../../services/indiaLocationService';

export const EmployerCompanyProfile: React.FC = () => {
  const { t } = useLanguage();
  const currentUser = DataStore.getCurrentUser();
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [locationSelection, setLocationSelection] = useState<StructuredPanIndiaLocation>({
    state: '',
    district: '',
    city: '',
    pincode: '',
    formattedLocation: ''
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const c = DataStore.getEmployerById(currentUser.id) || {
      id: currentUser.id, companyName: '', contactPerson: '',
      email: currentUser.email, phone: currentUser.phone || '', industry: '', location: '',
      city: '', state: '', address: '', website: '', logoUrl: '', description: '',
      verified: false, status: 'pending' as const, createdAt: new Date().toISOString().slice(0, 10)
    };
    setProfile(c);
    setLocationSelection(
      parseStructuredLocation(c.location, c.state, c.district, c.city, c.pincode)
    );
  }, [currentUser]);

  if (!profile) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedLoc = formatStructuredLocation(locationSelection) || profile.location || profile.city || '';
    const updatedProfile: EmployerProfile = {
      ...profile,
      state: locationSelection.state || profile.state,
      district: locationSelection.district || profile.district,
      city: locationSelection.city || locationSelection.district || profile.city,
      pincode: locationSelection.pincode || profile.pincode,
      location: formattedLoc
    };
    DataStore.updateEmployerProfile(updatedProfile);
    if (currentUser) {
      await SupabaseSync.registerUser(currentUser, updatedProfile);
    }
    setProfile(updatedProfile);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy font-display">{t('companyProfile')}</h1>
          <p className="text-xs text-slate-500 mt-1">{t('companyProfileDesc')}</p>
        </div>

        {saved && (
          <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {t('profileSaved')}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-card space-y-5">
          <div className="flex items-center gap-2 text-xs font-bold text-brand-navy uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-brand-blue" /> {t('companyDetails')}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('companyName')}</label>
              <input
                type="text"
                required
                value={profile.companyName}
                onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('industrySector')}</label>
              <input
                type="text"
                required
                value={profile.industry}
                onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('contactPerson')}</label>
              <input
                type="text"
                required
                value={profile.contactPerson}
                onChange={(e) => setProfile({ ...profile, contactPerson: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('phone')}</label>
              <input
                type="tel"
                required
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('website')}</label>
              <input
                type="url"
                value={profile.website || ''}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                placeholder="https://yourcompany.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('companyLogoUrl')}</label>
              <input
                type="url"
                value={profile.logoUrl || ''}
                onChange={(e) => setProfile({ ...profile, logoUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <PanIndiaLocationSelector
              value={locationSelection}
              onChange={(next) => {
                setLocationSelection(next);
                setProfile({
                  ...profile,
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('aboutCompany')}</label>
            <textarea
              rows={4}
              value={profile.description || ''}
              onChange={(e) => setProfile({ ...profile, description: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-3.5 bg-brand-navy hover:bg-brand-navy-light text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 text-brand-amber" /> {t('saveChanges')}
          </button>
        </div>
      </form>
    </div>
  );
};
