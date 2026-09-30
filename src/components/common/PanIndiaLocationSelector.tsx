import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapPin, RefreshCw, CheckCircle2, AlertCircle, Compass, RotateCcw } from 'lucide-react';
import {
  getAllStatesAndUTs,
  getDistrictsForState,
  fetchDistrictTownsAndPinsLive,
  fetchPinsForTownLive,
  verifyPinCodeLive,
  formatStructuredLocation,
  TownLocalityOption,
  PinOption
} from '../../services/indiaLocationService';

export interface PanIndiaLocationValue {
  state: string;
  district: string;
  city: string;
  pincode: string;
  addressLine?: string;
  formattedLocation: string;
}

interface PanIndiaLocationSelectorProps {
  mode?: 'form' | 'filter';
  layout?: 'grid' | 'stacked' | 'grid-2' | 'grid-4' | 'vertical';
  idPrefix?: string;
  value: {
    state: string;
    district?: string;
    city: string;
    pincode?: string;
    addressLine?: string;
    legacyLocation?: string;
  };
  onChange: (next: PanIndiaLocationValue) => void;
  required?: boolean;
  showAddressLine?: boolean;
  addressLineLabel?: string;
  addressLinePlaceholder?: string;
  className?: string;
}

export const PanIndiaLocationSelector: React.FC<PanIndiaLocationSelectorProps> = ({
  mode = 'form',
  layout = 'grid',
  idPrefix = 'pan-india-loc',
  value,
  onChange,
  required = false,
  showAddressLine = false,
  addressLineLabel = 'Depot / Hub / Street Landmark (Optional)',
  addressLinePlaceholder = 'e.g. Electronic City Phase 1, Transport Nagar, NH-48',
  className = ''
}) => {
  void idPrefix;
  const statesList = useMemo(() => getAllStatesAndUTs(), []);
  const districtsList = useMemo(() => getDistrictsForState(value.state), [value.state]);

  const [townOptions, setTownOptions] = useState<TownLocalityOption[]>([]);
  const [extraPins, setExtraPins] = useState<PinOption[]>([]);
  const [loadingTowns, setLoadingTowns] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLiveVerified, setIsLiveVerified] = useState(false);
  const [customTownMode, setCustomTownMode] = useState(false);
  const [pinLookupStatus, setPinLookupStatus] = useState<{
    checking: boolean;
    message?: string;
    isValid?: boolean;
  }>({ checking: false });

  const requestVersionRef = useRef(0);
  const pinRequestVersionRef = useRef(0);

  // Load towns & PINs whenever State + District change
  const loadDistrictData = async (targetState: string, targetDistrict: string) => {
    if (!targetState || !targetDistrict) {
      setTownOptions([]);
      setExtraPins([]);
      setLoadingTowns(false);
      setLookupError(null);
      setIsLiveVerified(false);
      return;
    }

    const currentVersion = ++requestVersionRef.current;
    const controller = new AbortController();
    setLoadingTowns(true);
    setLookupError(null);

    try {
      const res = await fetchDistrictTownsAndPinsLive(targetState, targetDistrict, controller.signal);
      if (currentVersion !== requestVersionRef.current) return;
      setTownOptions(res.towns);
      setIsLiveVerified(res.isLiveVerified);
      if (res.error && res.towns.every(t => t.pins.length === 0)) {
        setLookupError(res.error);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || currentVersion !== requestVersionRef.current) return;
      setLookupError('Live India Post lookup timed out. Showing district directory.');
    } finally {
      if (currentVersion === requestVersionRef.current) {
        setLoadingTowns(false);
      }
    }
  };

  useEffect(() => {
    void loadDistrictData(value.state, value.district || '');
  }, [value.state, value.district]);

  // Resolve valid PINs for the currently selected Town/City
  const selectedTownOption = useMemo(() => {
    if (!value.city) return undefined;
    return townOptions.find(t => t.name.toLowerCase() === value.city.trim().toLowerCase());
  }, [townOptions, value.city]);

  useEffect(() => {
    if (!value.state || !value.district || !value.city) {
      setExtraPins([]);
      return;
    }
    if (selectedTownOption && selectedTownOption.pins.length > 0) {
      setExtraPins([]);
      return;
    }

    const version = ++pinRequestVersionRef.current;
    const controller = new AbortController();
    void (async () => {
      try {
        const resolved = await fetchPinsForTownLive(value.state, value.district || '', value.city, controller.signal);
        if (version !== pinRequestVersionRef.current) return;
        setExtraPins(resolved);
      } catch {
        // Ignore abort
      }
    })();

    return () => controller.abort();
  }, [value.state, value.district, value.city, selectedTownOption]);

  const availablePinsForCity: PinOption[] = useMemo(() => {
    const basePins = selectedTownOption?.pins || [];
    const combined = [...basePins, ...extraPins];
    const seen = new Set<string>();
    return combined.filter(p => {
      const key = `${p.code}|${p.officeName}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [selectedTownOption, extraPins]);

  // Distinct 6-digit PIN codes for this locality
  const distinctPinCodes = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of availablePinsForCity) {
      const list = map.get(p.code) || [];
      if (!list.includes(p.officeName)) list.push(p.officeName);
      map.set(p.code, list);
    }
    return Array.from(map.entries()).map(([code, offices]) => ({
      code,
      label: `${code} — ${offices.slice(0, 2).join(', ')}${offices.length > 2 ? ` (+${offices.length - 2} more)` : ''}`
    }));
  }, [availablePinsForCity]);

  // Auto-select single PIN ONLY when a locality has exactly 1 verified PIN and pincode is currently empty
  useEffect(() => {
    if (mode === 'form' && value.city && !value.pincode && distinctPinCodes.length === 1) {
      const singlePin = distinctPinCodes[0].code;
      const nextFormatted = formatStructuredLocation({
        addressLine: value.addressLine,
        city: value.city,
        district: value.district,
        state: value.state,
        pincode: singlePin
      });
      onChange({
        state: value.state,
        district: value.district || '',
        city: value.city,
        pincode: singlePin,
        addressLine: value.addressLine,
        formattedLocation: nextFormatted
      });
    }
  }, [distinctPinCodes, value.city, value.pincode, mode]);

  // Upstream change handlers that strictly clear invalid downstream selections
  const handleStateChange = (newState: string) => {
    setCustomTownMode(false);
    setPinLookupStatus({ checking: false });
    const nextFormatted = formatStructuredLocation({
      addressLine: value.addressLine,
      city: '',
      district: '',
      state: newState,
      pincode: ''
    });
    onChange({
      state: newState,
      district: '',
      city: '',
      pincode: '',
      addressLine: value.addressLine,
      formattedLocation: nextFormatted
    });
  };

  const handleDistrictChange = (newDistrict: string) => {
    setCustomTownMode(false);
    setPinLookupStatus({ checking: false });
    const nextFormatted = formatStructuredLocation({
      addressLine: value.addressLine,
      city: '',
      district: newDistrict,
      state: value.state,
      pincode: ''
    });
    onChange({
      state: value.state,
      district: newDistrict,
      city: '',
      pincode: '',
      addressLine: value.addressLine,
      formattedLocation: nextFormatted
    });
  };

  const handleCityChange = (newCity: string) => {
    setPinLookupStatus({ checking: false });
    // Check if the chosen city has exactly 1 verified PIN or multiple PINs
    const matchedTown = townOptions.find(t => t.name.toLowerCase() === newCity.trim().toLowerCase());
    const uniqueCodes = Array.from(new Set((matchedTown?.pins || []).map(p => p.code)));
    // Only auto-assign if there is strictly 1 verified PIN; if multiple, force explicit selection
    const autoPin = uniqueCodes.length === 1 ? uniqueCodes[0] : '';

    const nextFormatted = formatStructuredLocation({
      addressLine: value.addressLine,
      city: newCity,
      district: value.district,
      state: value.state,
      pincode: autoPin
    });
    onChange({
      state: value.state,
      district: value.district || '',
      city: newCity,
      pincode: autoPin,
      addressLine: value.addressLine,
      formattedLocation: nextFormatted
    });
  };

  const handlePinChange = async (newPin: string) => {
    const clean = newPin.replace(/[^0-9]/g, '').slice(0, 6);
    const nextFormatted = formatStructuredLocation({
      addressLine: value.addressLine,
      city: value.city,
      district: value.district,
      state: value.state,
      pincode: clean
    });
    onChange({
      state: value.state,
      district: value.district || '',
      city: value.city,
      pincode: clean,
      addressLine: value.addressLine,
      formattedLocation: nextFormatted
    });

    if (clean.length === 6) {
      setPinLookupStatus({ checking: true });
      const result = await verifyPinCodeLive(clean);
      if (result.valid) {
        setPinLookupStatus({
          checking: false,
          isValid: true,
          message: `Verified India Post PIN: ${result.offices[0]?.officeName || result.district || clean} (${result.district}, ${result.state})`
        });
      } else {
        setPinLookupStatus({
          checking: false,
          isValid: false,
          message: result.error || 'Could not verify PIN in India Post directory.'
        });
      }
    } else {
      setPinLookupStatus({ checking: false });
    }
  };

  const handleAddressLineChange = (newAddress: string) => {
    const nextFormatted = formatStructuredLocation({
      addressLine: newAddress,
      city: value.city,
      district: value.district,
      state: value.state,
      pincode: value.pincode
    });
    onChange({
      state: value.state,
      district: value.district || '',
      city: value.city,
      pincode: value.pincode || '',
      addressLine: newAddress,
      formattedLocation: nextFormatted
    });
  };

  const handleClearAll = () => {
    setCustomTownMode(false);
    setPinLookupStatus({ checking: false });
    onChange({
      state: '',
      district: '',
      city: '',
      pincode: '',
      addressLine: '',
      formattedLocation: ''
    });
  };

  const hasActiveSelection = Boolean(value.state || value.district || value.city || value.pincode);
  const gridColsClass =
    layout === 'stacked' || layout === 'vertical'
      ? 'grid-cols-1 gap-3'
      : layout === 'grid-2'
      ? 'grid-cols-1 sm:grid-cols-2 gap-3.5'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5';

  // Keep existing city visible in dropdown even if it came from a legacy record
  const cityListWithCurrent = useMemo(() => {
    const names = townOptions.map(t => t.name);
    if (value.city && !names.some(n => n.toLowerCase() === value.city.toLowerCase())) {
      return [value.city, ...names];
    }
    return names;
  }, [townOptions, value.city]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Compass className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            {mode === 'filter'
              ? 'Pan-India Location Filter (State/UT → District → Town/City → PIN)'
              : 'Pan-India Location (State/UT → District → Town/City → PIN Code)'}
          </span>
          {loadingTowns && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              <RefreshCw className="w-3 h-3 animate-spin" /> Loading India Post localities...
            </span>
          )}
          {!loadingTowns && isLiveVerified && value.district && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> India Post PINs Ready
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {lookupError && value.district && (
            <button
              type="button"
              onClick={() => void loadDistrictData(value.state, value.district || '')}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Retry Live PIN Lookup
            </button>
          )}
          {hasActiveSelection && (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-red-700 bg-slate-100 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Clear Location
            </button>
          )}
        </div>
      </div>

      {/* Legacy free-text location preservation notice */}
      {value.legacyLocation && !value.state && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>
              Current saved location: <strong className="font-bold">{value.legacyLocation}</strong>
            </span>
          </span>
          <span className="text-[11px] text-amber-800">Select State &amp; District below to update with PIN</span>
        </div>
      )}

      <div className={`grid ${gridColsClass}`}>
        {/* 1. State / Union Territory */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            1. State / Union Territory {required && <span className="text-red-500">*</span>}
          </label>
          <select
            aria-label="State or Union Territory"
            required={required}
            value={value.state || ''}
            onChange={(e) => handleStateChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-none transition-all cursor-pointer"
          >
            <option value="">{mode === 'filter' ? 'All 36 States & UTs' : 'Select State / UT...'}</option>
            {statesList.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* 2. District (Dependent on State/UT) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            2. District {required && <span className="text-red-500">*</span>}
          </label>
          <select
            aria-label="District"
            required={required && Boolean(value.state)}
            disabled={!value.state}
            value={value.district || ''}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <option value="">
              {!value.state
                ? 'Select State / UT first'
                : mode === 'filter'
                ? `All Districts in ${value.state} (${districtsList.length})`
                : `Select District (${districtsList.length})...`}
            </option>
            {districtsList.map((dist) => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Town / City / Locality (Dependent on District) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-bold text-slate-700">
              3. Town / City / Locality {required && <span className="text-red-500">*</span>}
            </label>
            {value.district && (
              <button
                type="button"
                onClick={() => setCustomTownMode((prev) => !prev)}
                className="text-[10px] font-bold text-blue-700 hover:underline cursor-pointer"
              >
                {customTownMode ? 'Choose from list' : 'Type town name'}
              </button>
            )}
          </div>
          {customTownMode ? (
            <input
              type="text"
              aria-label="Town or City"
              required={required && Boolean(value.district)}
              disabled={!value.district}
              value={value.city || ''}
              onChange={(e) => handleCityChange(e.target.value)}
              placeholder="Enter Town / City / Post Office..."
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
            />
          ) : (
            <select
              aria-label="Town or City"
              required={required && Boolean(value.district)}
              disabled={!value.district}
              value={value.city || ''}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setCustomTownMode(true);
                  return;
                }
                handleCityChange(e.target.value);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <option value="">
                {!value.district
                  ? 'Select District first'
                  : loadingTowns
                  ? 'Loading towns & post offices...'
                  : mode === 'filter'
                  ? `All Towns / Cities (${cityListWithCurrent.length})`
                  : `Select Town / City (${cityListWithCurrent.length})...`}
              </option>
              {cityListWithCurrent.map((town) => {
                const opt = townOptions.find((t) => t.name === town);
                const pinCount = opt ? new Set(opt.pins.map((p) => p.code)).size : 0;
                return (
                  <option key={town} value={town}>
                    {town} {pinCount === 1 ? `(${opt?.pins[0].code})` : pinCount > 1 ? `(${pinCount} PINs)` : ''}
                  </option>
                );
              })}
              {value.district && <option value="__custom__">+ Enter another town / locality...</option>}
            </select>
          )}
        </div>

        {/* 4. PIN Code (Dependent on Town / City) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            4. PIN Code {distinctPinCodes.length > 1 ? `(${distinctPinCodes.length} valid PINs)` : ''}
          </label>
          {distinctPinCodes.length > 0 ? (
            <div className="space-y-1.5">
              <select
                aria-label="PIN Code"
                disabled={!value.city}
                value={value.pincode || ''}
                onChange={(e) => void handlePinChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 transition-all cursor-pointer"
              >
                <option value="">
                  {distinctPinCodes.length > 1
                    ? `Select valid PIN for ${value.city} (${distinctPinCodes.length} options)...`
                    : `Select PIN Code...`}
                </option>
                {distinctPinCodes.map((pin) => (
                  <option key={pin.code} value={pin.code}>
                    {pin.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              aria-label="PIN Code"
              disabled={!value.city && mode === 'form'}
              value={value.pincode || ''}
              onChange={(e) => void handlePinChange(e.target.value)}
              placeholder={!value.city && mode === 'form' ? 'Select Town/City first' : '6-digit PIN (e.g. 560100)'}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all"
            />
          )}
        </div>
      </div>

      {/* Multi-PIN guidance or live PIN verification status */}
      {value.city && distinctPinCodes.length > 1 && !value.pincode && (
        <p className="text-[11px] text-amber-800 bg-amber-50/90 border border-amber-200/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            <strong>{value.city}</strong> spans <strong>{distinctPinCodes.length}</strong> official India Post PIN codes. Please select the exact locality PIN code above.
          </span>
        </p>
      )}

      {pinLookupStatus.message && (
        <p
          className={`text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
            pinLookupStatus.isValid
              ? 'text-emerald-800 bg-emerald-50 border border-emerald-200'
              : 'text-amber-800 bg-amber-50 border border-amber-200'
          }`}
        >
          {pinLookupStatus.isValid ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          )}
          <span>{pinLookupStatus.message}</span>
        </p>
      )}

      {showAddressLine && (
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">{addressLineLabel}</label>
          <input
            type="text"
            value={value.addressLine || ''}
            onChange={(e) => handleAddressLineChange(e.target.value)}
            placeholder={addressLinePlaceholder}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-none transition-all"
          />
        </div>
      )}
    </div>
  );
};
