import React, { useState, useEffect } from 'react';
import { Building2, Save, CheckCircle2, ShieldCheck, Globe, Phone, Mail, MapPin } from 'lucide-react';
import { DataStore } from '../../services/store';
import { EmployerProfile } from '../../types';

export const EmployerCompanyProfile: React.FC = () => {
  const currentUser = DataStore.getCurrentUser();
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const c = DataStore.getEmployerById(currentUser.id) || {
      id: currentUser.id,
      companyName: 'Bharat Logistics Pvt Ltd',
      contactPerson: 'Deepa Nair (Talent Head)',
      email: currentUser.email,
      phone: '+91 80 2200 0001',
      industry: 'Logistics & Interstate Freight',
      location: 'Electronic City, Bengaluru',
      city: 'Bengaluru',
      state: 'Karnataka',
      address: 'Plot 42, Phase 1, Electronic City, Bengaluru - 560100',
      website: 'https://bharatlogistics.example.com',
      logoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=150&auto=format&fit=crop&q=80',
      description: 'Leading heavy freight transportation fleet across South & Central India with 250+ GPS-tracked multi-axle trucks.',
      verified: true,
      status: 'active',
      createdAt: '2026-08-10'
    };
    setProfile(c);
  }, [currentUser]);

  if (!profile) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    DataStore.updateEmployerProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy font-display">Company Profile</h1>
          <p className="text-xs text-slate-500 mt-1">Manage your fleet employer branding and contact details for applicants</p>
        </div>

        {saved && (
          <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Profile Saved Successfully!
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-card space-y-5">
          <div className="flex items-center gap-2 text-xs font-bold text-brand-navy uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-brand-blue" /> Enterprise Company Details
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company / Fleet Name</label>
              <input
                type="text"
                required
                value={profile.companyName}
                onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Industry Sector</label>
              <input
                type="text"
                required
                value={profile.industry}
                onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contact Person</label>
              <input
                type="text"
                required
                value={profile.contactPerson}
                onChange={(e) => setProfile({ ...profile, contactPerson: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number</label>
              <input
                type="tel"
                required
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Website URL</label>
              <input
                type="url"
                value={profile.website || ''}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                placeholder="https://yourcompany.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company Logo URL</label>
              <input
                type="url"
                value={profile.logoUrl || ''}
                onChange={(e) => setProfile({ ...profile, logoUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">City</label>
              <input
                type="text"
                required
                value={profile.city}
                onChange={(e) => setProfile({ ...profile, city: e.target.value, location: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">State</label>
              <input
                type="text"
                required
                value={profile.state}
                onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company Description</label>
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
            <Save className="w-4 h-4 text-brand-amber" /> Save Company Profile
          </button>
        </div>
      </form>
    </div>
  );
};
