import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  User, Award, Briefcase, CheckCircle2, Plus, Trash2, Save, Pencil, X, Loader2
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { SupabaseSync } from '../../services/supabaseSync';
import { newId } from '../../lib/ids';
import { fetchStoredAvailability } from '../../services/driverApi';
import { DriverProfile, DriverCategory, DriverExperience } from '../../types';
import { useLanguage } from '../../services/i18n';
import { PanIndiaLocationSelector } from '../../components/common/PanIndiaLocationSelector';
import {
  parseStructuredLocation,
  formatStructuredLocation,
  StructuredPanIndiaLocation,
  resolveLocationCoordinates,
  sanitizeLocalityName,
  CANONICAL_TOWN_DISTRICT_OVERRIDES,
  CANONICAL_DISTRICT_PIN_OVERRIDES
} from '../../services/indiaLocationService';

type Availability = DriverProfile['availability'];

const CATEGORY_OPTIONS: { value: DriverCategory; label: string }[] = [
  { value: 'HMV', label: 'Heavy Motor Vehicle (HMV)' },
  { value: 'LMV', label: 'Light Motor Vehicle (LMV)' },
  { value: 'HMV-Transport', label: 'HMV-Transport' },
  { value: 'LMV-Transport', label: 'LMV-Transport' },
  { value: 'Truck Driver', label: 'Truck Driver' },
  { value: 'Trailer Driver', label: 'Trailer Driver' },
  { value: 'Bus Driver', label: 'Bus Driver' },
  { value: 'Cab Driver', label: 'Cab Driver' },
  { value: 'Delivery Driver', label: 'Delivery Driver' },
  { value: 'Tempo Driver', label: 'Tempo Driver' },
  { value: 'Personal Driver', label: 'Personal Driver' },
  { value: 'Commercial Driver', label: 'Commercial Driver' },
  { value: 'MCWG', label: 'MCWG' },
];

// Must match DriverProfile['availability'].
const AVAILABILITY_VALUES: Availability[] = ['Immediate', '15 Days', '1 Month', 'Flexible'];

const normalizeAvailability = (value?: string | null): Availability | '' => {
  if (!value) return '';
  if (value === 'Within 15 Days') return '15 Days'; // legacy form value
  return (AVAILABILITY_VALUES as string[]).includes(value) ? (value as Availability) : '';
};

const salaryToText = (value?: number) => (Number(value) > 0 ? String(Math.round(Number(value))) : '');

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const toMonthValue = (date?: string) => (date && /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : '');
const currentMonthValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
const monthIndex = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return year * 12 + (monthNumber - 1);
};
const formatMonth = (date?: string) => {
  const month = toMonthValue(date);
  if (!month) return '';
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};
const formatDuration = (years: number) => {
  const totalMonths = Math.round((Number(years) || 0) * 12);
  if (totalMonths <= 0) return '';
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return [y ? `${y} yr${y > 1 ? 's' : ''}` : '', m ? `${m} mo${m > 1 ? 's' : ''}` : ''].filter(Boolean).join(' ');
};
const sortExperiences = (list: DriverExperience[]) =>
  [...list].sort((a, b) => toMonthValue(b.startDate).localeCompare(toMonthValue(a.startDate)));

/** Copy of a cached profile shaped for the form (dates trimmed, location parsed). */
const toFormProfile = (p: DriverProfile): DriverProfile => {
  const parsed = parseStructuredLocation(p.location, p.state, p.district, p.city, p.pincode);
  return {
    ...p,
    state: parsed.state || p.state,
    district: parsed.district || p.district,
    city: parsed.city || p.city,
    pincode: parsed.pincode || p.pincode,
    location: parsed.formattedLocation || p.location,
    licenseNumber: p.licenseNumber || '',
    licenseExpiry: p.licenseExpiry ? p.licenseExpiry.slice(0, 10) : '',
    experiences: sortExperiences(p.experiences || [])
  };
};

const toLocationSelection = (p: DriverProfile): StructuredPanIndiaLocation => ({
  ...parseStructuredLocation(p.location, p.state, p.district, p.city, p.pincode),
  latitude: p.latitude,
  longitude: p.longitude
});

interface ExperienceForm {
  companyName: string;
  roleTitle: string;
  vehicleType: string;
  startMonth: string;
  endMonth: string;
  current: boolean;
  description: string;
}

const EMPTY_EXPERIENCE: ExperienceForm = {
  companyName: '', roleTitle: '', vehicleType: '', startMonth: '', endMonth: '', current: false, description: ''
};

export const DriverProfilePage: React.FC = () => {
  const { t } = useLanguage();
  const currentUser = DataStore.getCurrentUser();
  const userId = currentUser?.id || '';

  const [profile, setProfile] = useState<DriverProfile>(() => toFormProfile(DataStore.getDriverById(userId)));
  const [locationSelection, setLocationSelection] = useState<StructuredPanIndiaLocation>(() => toLocationSelection(profile));
  const [skillsText, setSkillsText] = useState(() => profile.skills?.join(', ') || '');
  const [availability, setAvailability] = useState<Availability | ''>(() => normalizeAvailability(profile.availability));
  const [salaryText, setSalaryText] = useState(() => salaryToText(profile.expectedSalary));
  // False until this account's saved profile has been loaded, so an empty form
  // can never be saved over real data on a fresh tab.
  const [hydrated, setHydrated] = useState(() => DataStore.isDemoMode() || DataStore.getDrivers().some(d => d.id === userId));
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const successTimerRef = useRef<number | null>(null);
  // Set on the first edit; background refreshes then leave the form alone.
  const dirtyRef = useRef(false);
  // True when the database has no availability yet (the cache shows 'Flexible' for NULL).
  const availabilityUnsetRef = useRef(false);

  // Experience modal (add or edit)
  const [expModal, setExpModal] = useState<{ mode: 'add' } | { mode: 'edit'; id: string } | null>(null);
  const [expForm, setExpForm] = useState<ExperienceForm>(EMPTY_EXPERIENCE);
  const [expError, setExpError] = useState('');
  const [expSaving, setExpSaving] = useState(false);
  const expSavingRef = useRef(false);
  const [deletingExpId, setDeletingExpId] = useState<string | null>(null);

  const markDirty = () => { dirtyRef.current = true; };

  const applyFromCache = useCallback(() => {
    if (!userId) return;
    const next = toFormProfile(DataStore.getDriverById(userId));
    setProfile(next);
    setLocationSelection(toLocationSelection(next));
    setSkillsText(next.skills?.join(', ') || '');
    setAvailability(availabilityUnsetRef.current ? '' : normalizeAvailability(next.availability));
    setSalaryText(salaryToText(next.expectedSalary));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    dirtyRef.current = false;
    availabilityUnsetRef.current = false;
    applyFromCache();
    void fetchStoredAvailability(userId).then(stored => {
      if (!live || stored === undefined) return;
      availabilityUnsetRef.current = stored === null || stored === '';
      if (!dirtyRef.current) setAvailability(availabilityUnsetRef.current ? '' : normalizeAvailability(stored));
    });
    const handleStorage = () => {
      if (!dirtyRef.current) applyFromCache();
    };
    window.addEventListener('driverhub_storage_updated', handleStorage);
    if (DataStore.isDemoMode()) {
      setHydrated(true);
    } else {
      void SupabaseSync.fetchAndMergeRemoteData(DataStore).finally(() => {
        if (!live) return;
        setHydrated(true);
        if (!dirtyRef.current) applyFromCache();
      });
    }
    return () => {
      live = false;
      window.removeEventListener('driverhub_storage_updated', handleStorage);
    };
  }, [userId, applyFromCache]);

  useEffect(() => () => {
    if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
  }, []);

  // Escape closes the experience dialog.
  useEffect(() => {
    if (!expModal) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !expSavingRef.current) setExpModal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expModal]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current || !userId || !hydrated) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const saved = DataStore.getDriverById(userId);

      // Ensure fallback town/city if somehow left blank
      let resolvedDistrict = sanitizeLocalityName(locationSelection.district || profile.district || '');
      let resolvedCity = sanitizeLocalityName(
        locationSelection.city ||
        (resolvedDistrict ? resolvedDistrict.split('(')[0].trim() : '') ||
        profile.city ||
        ''
      );
      let resolvedState = locationSelection.state || profile.state || '';

      // Check canonical town overrides (e.g. Gudibanda -> Chikkaballapur, not Kolar)
      if (resolvedCity && CANONICAL_TOWN_DISTRICT_OVERRIDES[resolvedCity.toLowerCase()]) {
        const override = CANONICAL_TOWN_DISTRICT_OVERRIDES[resolvedCity.toLowerCase()];
        resolvedDistrict = override.district;
        resolvedState = override.state;
      }

      // Check canonical PIN overrides (e.g. 561209 -> Chikkaballapur)
      if (locationSelection.pincode && CANONICAL_DISTRICT_PIN_OVERRIDES[locationSelection.pincode.trim()]) {
        const pinOverride = CANONICAL_DISTRICT_PIN_OVERRIDES[locationSelection.pincode.trim()];
        resolvedDistrict = pinOverride.district;
        resolvedState = pinOverride.state;
        if (!resolvedCity || resolvedCity.toLowerCase().includes(pinOverride.town?.toLowerCase() || '')) {
          resolvedCity = pinOverride.town || resolvedCity;
        }
      }

      const resolvedLocationSelection = {
        ...locationSelection,
        state: resolvedState,
        district: resolvedDistrict,
        city: resolvedCity
      };

      let resolvedLat = locationSelection.latitude;
      let resolvedLng = locationSelection.longitude;

      // Compare with the last saved location, not the (already edited) form.
      const locationChanged =
        (Boolean(resolvedLocationSelection.state) && resolvedLocationSelection.state !== saved.state) ||
        (Boolean(resolvedLocationSelection.district) && resolvedLocationSelection.district !== saved.district) ||
        (Boolean(resolvedLocationSelection.city) && resolvedLocationSelection.city !== saved.city) ||
        (Boolean(resolvedLocationSelection.pincode) && resolvedLocationSelection.pincode !== saved.pincode);

      if (locationChanged || resolvedLat === undefined || resolvedLng === undefined) {
        try {
          const resolvedCoords = await resolveLocationCoordinates({
            city: resolvedCity,
            district: resolvedDistrict,
            state: resolvedLocationSelection.state,
            pincode: resolvedLocationSelection.pincode
          });
          if (resolvedCoords) {
            resolvedLat = resolvedCoords.lat;
            resolvedLng = resolvedCoords.lng;
          }
        } catch (err) {
          console.warn('Coordinate resolution notice:', err);
        }
      }

      const skills = skillsText.split(',').map(s => s.trim()).filter(Boolean);
      const formattedLoc = formatStructuredLocation(resolvedLocationSelection) || profile.location || resolvedCity || '';
      const salary = Math.round(Number(salaryText));

      // Start from the saved record so documents/experiences/status are never
      // replaced by the form's copy; overlay only the fields this form edits.
      const updated: DriverProfile = {
        ...saved,
        fullName: (profile.fullName || '').trim(),
        phone: (profile.phone || '').trim(),
        state: resolvedLocationSelection.state || profile.state,
        district: resolvedDistrict,
        city: resolvedCity,
        pincode: resolvedLocationSelection.pincode || profile.pincode,
        latitude: resolvedLat !== undefined ? resolvedLat : (locationChanged ? undefined : saved.latitude),
        longitude: resolvedLng !== undefined ? resolvedLng : (locationChanged ? undefined : saved.longitude),
        location: formattedLoc,
        preferredLocation: formattedLoc,
        driverCategory: profile.driverCategory || '',
        licenseNumber: (profile.licenseNumber || '').trim().toUpperCase(),
        licenseExpiry: profile.licenseExpiry ? profile.licenseExpiry.slice(0, 10) : '',
        experienceYears: Math.max(0, Math.round(Number(profile.experienceYears) || 0)),
        // 0 = not set (stored as empty in the database).
        expectedSalary: Number.isFinite(salary) && salary > 0 ? salary : 0,
        // An unset availability is left out of the save rather than sent as ''.
        availability: (availability || undefined) as Availability,
        skills,
        bio: profile.bio || ''
      };

      SupabaseSync.lastError = '';
      const ok = await DataStore.updateDriverProfile(updated);
      if (!ok) {
        setSaveError(DataStore.getLastError('Your profile could not be saved. Check your connection and try again.'));
        return;
      }
      dirtyRef.current = false;
      if (availability) availabilityUnsetRef.current = false;
      applyFromCache();
      setSaveSuccess(true);
      if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
      successTimerRef.current = window.setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.warn('Profile save error:', err);
      setSaveError('Your profile could not be saved. Check your connection and try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const openAddExperience = () => {
    setExpError('');
    setExpForm(EMPTY_EXPERIENCE);
    setExpModal({ mode: 'add' });
  };

  const openEditExperience = (exp: DriverExperience) => {
    setExpError('');
    setExpForm({
      companyName: exp.companyName || '',
      roleTitle: exp.roleTitle || '',
      vehicleType: exp.vehicleType || '',
      startMonth: toMonthValue(exp.startDate),
      endMonth: toMonthValue(exp.endDate),
      current: !exp.endDate,
      description: exp.description || ''
    });
    setExpModal({ mode: 'edit', id: exp.id });
  };

  const handleSaveExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expModal || expSavingRef.current || !userId) return;

    const thisMonth = currentMonthValue();
    const companyName = expForm.companyName.trim();
    const roleTitle = expForm.roleTitle.trim();
    if (!companyName || !roleTitle) {
      setExpError('Enter the company name and your role.');
      return;
    }
    if (!MONTH_PATTERN.test(expForm.startMonth)) {
      setExpError('Enter the start month as YYYY-MM (for example 2023-04).');
      return;
    }
    if (expForm.startMonth > thisMonth) {
      setExpError('The start month cannot be in the future.');
      return;
    }
    if (!expForm.current) {
      if (!MONTH_PATTERN.test(expForm.endMonth)) {
        setExpError('Enter the end month as YYYY-MM, or tick "I still work here".');
        return;
      }
      if (expForm.endMonth < expForm.startMonth) {
        setExpError('The end month must be after the start month.');
        return;
      }
      if (expForm.endMonth > thisMonth) {
        setExpError('The end month cannot be in the future.');
        return;
      }
    }
    const endForDuration = expForm.current ? thisMonth : expForm.endMonth;
    const months = monthIndex(endForDuration) - monthIndex(expForm.startMonth) + 1;
    const durationYears = Math.round((months / 12) * 10) / 10;

    expSavingRef.current = true;
    setExpSaving(true);
    setExpError('');
    try {
      // Save only this change: the last saved profile plus this one record,
      // never the unsaved edits in the main form.
      const saved = DataStore.getDriverById(userId);
      const existing = saved.experiences || [];
      const record: DriverExperience = {
        id: expModal.mode === 'edit' ? expModal.id : newId(),
        driverId: userId,
        companyName,
        roleTitle,
        vehicleType: expForm.vehicleType.trim(),
        durationYears,
        startDate: expForm.startMonth,
        endDate: expForm.current ? undefined : expForm.endMonth,
        description: expForm.description.trim()
      };
      const experiences = expModal.mode === 'edit'
        ? existing.map(exp => (exp.id === record.id ? record : exp))
        : [...existing, record];

      SupabaseSync.lastError = '';
      const ok = await DataStore.updateDriverProfile({
        ...saved,
        // Never turn an unset availability into the cache's 'Flexible' placeholder.
        availability: (availabilityUnsetRef.current ? undefined : saved.availability) as Availability,
        experiences
      });
      if (!ok) {
        setExpError(DataStore.getLastError('Experience could not be saved. Check your connection and try again.'));
        return;
      }
      const stored = DataStore.getDriverById(userId).experiences || experiences;
      setProfile(prev => ({ ...prev, experiences: sortExperiences(stored) }));
      setExpModal(null);
      setExpForm(EMPTY_EXPERIENCE);
    } catch (err) {
      console.warn('Experience save error:', err);
      setExpError('Experience could not be saved. Check your connection and try again.');
    } finally {
      expSavingRef.current = false;
      setExpSaving(false);
    }
  };

  const handleDeleteExperience = async (exp: DriverExperience) => {
    if (deletingExpId || !userId) return;
    if (!confirm(`Delete the experience record "${exp.roleTitle} — ${exp.companyName}"? This cannot be undone.`)) return;
    setDeletingExpId(exp.id);
    setSaveError('');
    try {
      const deleted = DataStore.isDemoMode() || await SupabaseSync.deleteDriverExperience(userId, exp.id);
      if (!deleted) {
        setSaveError('Experience could not be deleted. Check your connection and try again.');
        return;
      }
      const saved = DataStore.getDriverById(userId);
      DataStore.setDriverProfileLocal({ ...saved, experiences: (saved.experiences || []).filter(e => e.id !== exp.id) });
      setProfile(prev => ({ ...prev, experiences: (prev.experiences || []).filter(e => e.id !== exp.id) }));
    } finally {
      setDeletingExpId(null);
    }
  };

  const inputClass = 'w-full min-h-10 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:bg-white focus:outline-none';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy font-display">{t('Driver Profile & Credentials')}</h1>
          <p className="text-xs text-slate-500 mt-1">{t('Keep your profile and driving license details updated for verified fleet shortlists')}</p>
        </div>

        {saveSuccess && (
          <div role="status" className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 animate-in fade-in shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {t('Changes Saved Successfully!')}
          </div>
        )}
      </div>
      {!hydrated && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading your saved profile…
        </p>
      )}
      {saveError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 break-words">{saveError}</p>}

      <form onSubmit={handleSave} onChange={markDirty} className="space-y-6">
        {/* Personal & Contact Details */}
        <div className="bg-white p-4 sm:p-8 rounded-2xl border border-slate-200 shadow-card space-y-5">
          <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-brand-blue shrink-0" /> {t('Personal & Contact Info')}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label htmlFor="driver-full-name" className="block text-xs font-semibold text-slate-700 mb-1.5">{t('Full Legal Name')}</label>
              <input
                id="driver-full-name"
                type="text"
                required
                autoComplete="name"
                value={profile.fullName || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, fullName: e.target.value }))}
                className={`${inputClass} focus:ring-brand-amber transition-all`}
              />
            </div>

            <div className="min-w-0">
              <label htmlFor="driver-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">{t('Phone Number (Verified)')}</label>
              <input
                id="driver-phone"
                type="tel"
                required
                autoComplete="tel"
                value={profile.phone || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                className={`${inputClass} focus:ring-brand-amber transition-all`}
              />
            </div>

            <div className="min-w-0">
              <label htmlFor="driver-email" className="block text-xs font-semibold text-slate-700 mb-1.5">{t('Email Address')}</label>
              <input
                id="driver-email"
                type="email"
                disabled
                value={profile.email || ''}
                className="w-full min-h-10 px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed truncate"
              />
            </div>
          </div>

          {/* Pan-India Dependent Location Selection */}
          <div className="pt-2 border-t border-slate-100">
            <PanIndiaLocationSelector
              value={locationSelection}
              showCurrentLocation={true}
              onCurrentLocationSuccess={(coords) => {
                markDirty();
                setProfile(prev => ({
                  ...prev,
                  latitude: coords.lat,
                  longitude: coords.lng
                }));
              }}
              onChange={(next) => {
                markDirty();
                setLocationSelection(next);
                setProfile(prev => ({
                  ...prev,
                  state: next.state,
                  district: next.district,
                  city: next.city || next.district,
                  pincode: next.pincode,
                  location: next.formattedLocation,
                  latitude: next.latitude,
                  longitude: next.longitude
                }));
              }}
              mode="form"
              layout="grid-2"
              required
              idPrefix="driver-profile-loc"
            />
          </div>
        </div>

        {/* License & Vehicle Specialization */}
        <div className="bg-white p-4 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500 shrink-0" /> {t('Driving License & Specialization')}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label htmlFor="driver-category" className="block text-xs font-semibold text-slate-700 mb-1">{t('Primary Driver Category')}</label>
              <select
                id="driver-category"
                value={profile.driverCategory || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, driverCategory: e.target.value as DriverCategory | '' }))}
                className={`${inputClass} focus:ring-amber-400`}
              >
                <option value="">Select category…</option>
                {CATEGORY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{t(option.label)}</option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <label htmlFor="driver-licence-number" className="block text-xs font-semibold text-slate-700 mb-1">{t('Driving License Number')}</label>
              <input
                id="driver-licence-number"
                type="text"
                value={profile.licenseNumber || ''}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setProfile(prev => ({ ...prev, licenseNumber: val }));
                }}
                placeholder="KA-04-2021-0012345"
                className={`${inputClass} focus:ring-amber-400 uppercase font-mono font-medium`}
              />
            </div>

            <div className="min-w-0">
              <label htmlFor="driver-licence-expiry" className="block text-xs font-semibold text-slate-700 mb-1">{t('License Expiry Date')}</label>
              <input
                id="driver-licence-expiry"
                type="date"
                value={profile.licenseExpiry ? profile.licenseExpiry.slice(0, 10) : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setProfile(prev => ({ ...prev, licenseExpiry: val }));
                }}
                className={`${inputClass} focus:ring-amber-400`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label htmlFor="driver-experience-years" className="block text-xs font-semibold text-slate-700 mb-1">{t('Total Driving Experience (Years)')}</label>
              <input
                id="driver-experience-years"
                type="number"
                inputMode="numeric"
                min="0"
                max="60"
                value={profile.experienceYears ?? 0}
                onChange={(e) => setProfile(prev => ({ ...prev, experienceYears: Number(e.target.value) }))}
                className={`${inputClass} focus:ring-amber-400`}
              />
            </div>

            <div className="min-w-0">
              <label htmlFor="driver-salary" className="block text-xs font-semibold text-slate-700 mb-1">{t('Expected Monthly Salary (₹)')}</label>
              <input
                id="driver-salary"
                type="number"
                inputMode="numeric"
                min="0"
                step="500"
                value={salaryText}
                onChange={(e) => setSalaryText(e.target.value)}
                placeholder="Not set"
                className={`${inputClass} focus:ring-amber-400`}
              />
            </div>

            <div className="min-w-0">
              <label htmlFor="driver-availability" className="block text-xs font-semibold text-slate-700 mb-1">{t('Joining Availability')}</label>
              <select
                id="driver-availability"
                value={availability}
                onChange={(e) => setAvailability(normalizeAvailability(e.target.value))}
                className={`${inputClass} focus:ring-amber-400`}
              >
                {/* Placeholder only: an availability, once set, is changed rather than cleared. */}
                <option value="" disabled>Select availability…</option>
                <option value="Immediate">{t('Immediate')}</option>
                <option value="15 Days">Within 15 days</option>
                <option value="1 Month">Within 1 month</option>
                <option value="Flexible">{t('Flexible')}</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="driver-skills" className="block text-xs font-semibold text-slate-700 mb-1">
              {t('Skills & Capabilities (comma-separated)')}
            </label>
            <input
              id="driver-skills"
              type="text"
              value={skillsText || ''}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="e.g. Highway Navigation, Night Driving, Automatic Transmission, Fleet Maintenance"
              className={`${inputClass} focus:ring-amber-400`}
            />
          </div>

          <div>
            <label htmlFor="driver-bio" className="block text-xs font-semibold text-slate-700 mb-1">
              {t('Driver Bio / Summary')}
            </label>
            <textarea
              id="driver-bio"
              rows={3}
              value={profile.bio || ''}
              onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Brief overview of your driving career, preferred routes, accident-free milestones..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Driving Experience History (saved on its own, outside the main form) */}
        <div className="bg-white p-4 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-600 shrink-0" /> {t('Past Driving Experience Records')}
            </h2>
            <button
              type="button"
              onClick={openAddExperience}
              disabled={!hydrated}
              className="min-h-10 px-2 flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> {t('Add Experience')}
            </button>
          </div>

          {profile.experiences && profile.experiences.length > 0 ? (
            <div className="space-y-3">
              {profile.experiences.map((exp) => {
                const start = formatMonth(exp.startDate);
                const end = exp.endDate ? formatMonth(exp.endDate) : 'Present';
                const duration = formatDuration(exp.durationYears);
                return (
                  <div key={exp.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 break-words">{exp.roleTitle} — {exp.companyName}</h4>
                      <p className="text-[11px] text-slate-500 break-words">
                        {[start ? `${start} – ${end}` : '', duration, exp.vehicleType ? `Vehicle: ${exp.vehicleType}` : ''].filter(Boolean).join(' • ')}
                      </p>
                      {exp.description && <p className="text-xs text-slate-600 mt-1 break-words">{exp.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditExperience(exp)}
                        disabled={!hydrated || deletingExpId !== null}
                        className="min-h-10 min-w-10 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-blue-700 hover:bg-white cursor-pointer disabled:opacity-50"
                        title="Edit record"
                        aria-label={`Edit ${exp.roleTitle} at ${exp.companyName}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { void handleDeleteExperience(exp); }}
                        disabled={deletingExpId !== null}
                        className="min-h-10 min-w-10 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-red-600 hover:bg-white cursor-pointer disabled:opacity-50"
                        title="Delete record"
                        aria-label={`Delete ${exp.roleTitle} at ${exp.companyName}`}
                      >
                        {deletingExpId === exp.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-3 text-center">{t('No past experience records added yet.')}</p>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !hydrated}
            className="w-full sm:w-auto justify-center flex items-center gap-2 px-8 py-3.5 bg-[#0A2540] hover:bg-[#06182B] text-white font-bold rounded-2xl text-xs shadow-md transition-all hover:scale-105 cursor-pointer disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 text-amber-400" /> {saving ? t('Saving Details...') : t('Save Profile Details')}
          </button>
        </div>
      </form>

      {/* Add / Edit Experience Modal */}
      {expModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="experience-dialog-title"
        >
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h3 id="experience-dialog-title" className="text-base font-bold text-slate-900">
                {expModal.mode === 'edit' ? 'Edit Driving Experience' : t('Add Driving Experience')}
              </h3>
              <button
                type="button"
                onClick={() => setExpModal(null)}
                disabled={expSaving}
                className="-mt-2 -mr-2 min-h-10 min-w-10 inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                aria-label={t('Close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveExperience} className="space-y-3 text-xs" noValidate>
              <div>
                <label htmlFor="exp-company" className="block font-semibold text-slate-700 mb-1">{t('Company / Fleet Name')}</label>
                <input
                  id="exp-company"
                  type="text"
                  required
                  value={expForm.companyName}
                  onChange={(e) => setExpForm(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="e.g. South Freight Lines"
                  className="w-full min-h-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label htmlFor="exp-role" className="block font-semibold text-slate-700 mb-1">{t('Role Title')}</label>
                <input
                  id="exp-role"
                  type="text"
                  required
                  value={expForm.roleTitle}
                  onChange={(e) => setExpForm(prev => ({ ...prev, roleTitle: e.target.value }))}
                  placeholder="e.g. Heavy Truck Pilot"
                  className="w-full min-h-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label htmlFor="exp-vehicle" className="block font-semibold text-slate-700 mb-1">{t('Vehicle Model / Type')}</label>
                <input
                  id="exp-vehicle"
                  type="text"
                  value={expForm.vehicleType}
                  onChange={(e) => setExpForm(prev => ({ ...prev, vehicleType: e.target.value }))}
                  placeholder="e.g. 14-Wheel Ashok Leyland"
                  className="w-full min-h-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label htmlFor="exp-start" className="block font-semibold text-slate-700 mb-1">Start month</label>
                  <input
                    id="exp-start"
                    type="month"
                    required
                    max={currentMonthValue()}
                    pattern="\d{4}-\d{2}"
                    placeholder="YYYY-MM"
                    value={expForm.startMonth}
                    onChange={(e) => setExpForm(prev => ({ ...prev, startMonth: e.target.value }))}
                    className="w-full min-h-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="min-w-0">
                  <label htmlFor="exp-end" className="block font-semibold text-slate-700 mb-1">End month</label>
                  <input
                    id="exp-end"
                    type="month"
                    max={currentMonthValue()}
                    min={expForm.startMonth || undefined}
                    pattern="\d{4}-\d{2}"
                    placeholder="YYYY-MM"
                    disabled={expForm.current}
                    value={expForm.current ? '' : expForm.endMonth}
                    onChange={(e) => setExpForm(prev => ({ ...prev, endMonth: e.target.value }))}
                    className="w-full min-h-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 min-h-10 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={expForm.current}
                  onChange={(e) => setExpForm(prev => ({ ...prev, current: e.target.checked }))}
                  className="w-4 h-4 accent-brand-amber"
                />
                <span className="font-semibold text-slate-700">I still work here</span>
              </label>
              <div>
                <label htmlFor="exp-description" className="block font-semibold text-slate-700 mb-1">{t('Key Responsibilities')}</label>
                <textarea
                  id="exp-description"
                  rows={2}
                  value={expForm.description}
                  onChange={(e) => setExpForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. Interstate highway transit on Bengaluru-Mumbai corridor."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              {expError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-red-700 break-words">{expError}</p>}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExpModal(null)}
                  disabled={expSaving}
                  className="min-h-10 px-4 py-2 border rounded-xl text-slate-600 cursor-pointer disabled:opacity-50"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={expSaving}
                  className="min-h-10 px-5 py-2 bg-[#0A2540] text-white font-bold rounded-xl cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
                >
                  {expSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {expSaving ? 'Saving…' : t('Save Experience')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
