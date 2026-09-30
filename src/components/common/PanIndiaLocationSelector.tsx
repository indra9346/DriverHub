import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Compass,
  RotateCcw,
  Search,
  ChevronDown,
  X,
  Loader2
} from 'lucide-react';
import {
  getAllStatesAndUTs,
  getDistrictsForState,
  getAllDistrictsWithState,
  fetchDistrictTownsAndPinsLive,
  fetchPinsForTownLive,
  verifyPinCodeLive,
  searchPanIndiaPlacesLive,
  formatStructuredLocation,
  TownLocalityOption,
  PinOption,
  PanIndiaAutocompleteSuggestion
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

interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  meta?: any;
}

interface SearchableComboboxProps {
  id: string;
  label: React.ReactNode;
  value: string;
  placeholder: string;
  options: ComboboxOption[];
  onSelect: (option: ComboboxOption) => void;
  onFreeTextChange?: (text: string) => void;
  onClear: () => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  allowFreeText?: boolean;
  required?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
  inputMode?: 'text' | 'numeric';
  maxLength?: number;
}

const SearchableLocationCombobox: React.FC<SearchableComboboxProps> = ({
  id,
  label,
  value,
  placeholder,
  options,
  onSelect,
  onFreeTextChange,
  onClear,
  loading = false,
  error = null,
  onRetry,
  allowFreeText = false,
  required = false,
  disabled = false,
  emptyMessage = 'No matching locations found.',
  inputMode = 'text',
  maxLength
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync input display text when external value changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Close menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
        // If free text is not allowed, revert to the committed value if user typed a non-matching query without selecting
        if (!allowFreeText) {
          setQuery(value || '');
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [allowFreeText, value]);

  const filteredOptions = useMemo(() => {
    const clean = query.trim().toLowerCase();
    // If query exactly matches current committed value and user just opened dropdown, show all options for easy scanning
    if (!clean || (clean === (value || '').trim().toLowerCase() && !allowFreeText)) {
      return options.slice(0, 120);
    }
    return options
      .filter(
        opt =>
          opt.label.toLowerCase().includes(clean) ||
          opt.value.toLowerCase().includes(clean) ||
          (opt.sublabel && opt.sublabel.toLowerCase().includes(clean))
      )
      .slice(0, 80);
  }, [options, query, value, allowFreeText]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextText = e.target.value;
    setQuery(nextText);
    setIsOpen(true);
    setActiveIndex(0);
    if (allowFreeText && onFreeTextChange) {
      onFreeTextChange(nextText);
    } else if (nextText.trim() === '') {
      onClear();
    }
  };

  const handleOptionClick = (opt: ComboboxOption) => {
    setQuery(opt.value);
    setIsOpen(false);
    setActiveIndex(-1);
    onSelect(opt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
      if (!allowFreeText) setQuery(value || '');
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(0);
      } else {
        setActiveIndex(prev => (filteredOptions.length > 0 ? (prev + 1) % filteredOptions.length : -1));
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(filteredOptions.length - 1);
      } else {
        setActiveIndex(prev =>
          filteredOptions.length > 0 ? (prev <= 0 ? filteredOptions.length - 1 : prev - 1) : -1
        );
      }
      return;
    }

    if (e.key === 'Enter' && isOpen) {
      if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
        e.preventDefault();
        handleOptionClick(filteredOptions[activeIndex]);
      } else if (filteredOptions.length === 1) {
        e.preventDefault();
        handleOptionClick(filteredOptions[0]);
      } else if (allowFreeText) {
        setIsOpen(false);
      }
    }
  };

  // Scroll active item into view on keyboard navigation
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
      const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex, isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={id}
        className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
      >
        {label}
      </label>

      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
          aria-activedescendant={
            isOpen && activeIndex >= 0 && filteredOptions[activeIndex]
              ? `${id}-opt-${activeIndex}`
              : undefined
          }
          disabled={disabled}
          required={required}
          inputMode={inputMode}
          maxLength={maxLength}
          value={query}
          onFocus={() => {
            setIsOpen(true);
          }}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pl-8 pr-14 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 transition-all disabled:bg-slate-100 disabled:text-slate-400"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />}
          {query && !disabled && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                onClear();
                setIsOpen(true);
              }}
              title="Clear field"
              aria-label="Clear selection"
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => setIsOpen(prev => !prev)}
            aria-label="Toggle suggestions"
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                isOpen ? 'rotate-180 text-amber-600' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {isOpen && !disabled && (
        <ul
          id={`${id}-listbox`}
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-64 overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-xl shadow-slate-900/10 py-1.5 divide-y divide-slate-100"
        >
          {loading && filteredOptions.length === 0 ? (
            <li className="px-3.5 py-3 text-xs text-slate-500 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />
              <span>Searching India Post & Pan-India directory…</span>
            </li>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => {
              const isSelected = value && opt.value.toLowerCase() === value.toLowerCase();
              const isHighlighted = idx === activeIndex;
              return (
                <li
                  key={`${opt.value}-${opt.sublabel || idx}`}
                  id={`${id}-opt-${idx}`}
                  role="option"
                  aria-selected={Boolean(isSelected)}
                  onMouseDown={e => {
                    // Prevent input blur before click registers
                    e.preventDefault();
                    handleOptionClick(opt);
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`px-3.5 py-2.5 cursor-pointer transition-colors flex items-start justify-between gap-2 text-left ${
                    isHighlighted
                      ? 'bg-amber-50 text-slate-950'
                      : isSelected
                      ? 'bg-slate-50 text-slate-900 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                      {opt.label}
                    </div>
                    {opt.sublabel && (
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">{opt.sublabel}</div>
                    )}
                  </div>
                  {opt.badge && (
                    <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100/80 text-amber-800">
                      {opt.badge}
                    </span>
                  )}
                </li>
              );
            })
          ) : (
            <li className="px-3.5 py-3 text-xs text-slate-600 space-y-1.5">
              <div className="font-medium text-slate-700">{emptyMessage}</div>
              {allowFreeText && query.trim() && (
                <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200/70 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2">
                  <span>
                    Keeping typed value: <strong>&ldquo;{query.trim()}&rdquo;</strong>
                  </span>
                  <button
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault();
                      setIsOpen(false);
                    }}
                    className="text-[11px] font-bold text-emerald-800 underline"
                  >
                    Use this
                  </button>
                </div>
              )}
              {error && onRetry && (
                <button
                  type="button"
                  onMouseDown={e => {
                    e.preventDefault();
                    onRetry();
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 underline"
                >
                  <RefreshCw className="w-3 h-3" /> Retry live lookup
                </button>
              )}
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

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
  const statesList = useMemo(() => getAllStatesAndUTs(), []);
  const allDistrictsWithState = useMemo(() => getAllDistrictsWithState(), []);
  const districtsList = useMemo(() => getDistrictsForState(value.state), [value.state]);

  const [townOptions, setTownOptions] = useState<TownLocalityOption[]>([]);
  const [livePlaceSuggestions, setLivePlaceSuggestions] = useState<PanIndiaAutocompleteSuggestion[]>([]);
  const [extraPins, setExtraPins] = useState<PinOption[]>([]);
  const [loadingTowns, setLoadingTowns] = useState(false);
  const [loadingLivePlaces, setLoadingLivePlaces] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLiveVerified, setIsLiveVerified] = useState(false);
  const [pinLookupStatus, setPinLookupStatus] = useState<{
    checking: boolean;
    message?: string;
    isValid?: boolean;
  }>({ checking: false });

  const requestVersionRef = useRef(0);
  const liveSearchVersionRef = useRef(0);
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

  // Debounced live India Post & Pan-India search when user types in Town / City / Locality
  useEffect(() => {
    const cleanCity = (value.city || '').trim();
    const version = ++liveSearchVersionRef.current;
    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setLoadingLivePlaces(true);
      try {
        const res = await searchPanIndiaPlacesLive(
          cleanCity,
          value.state || undefined,
          value.district || undefined,
          controller.signal
        );
        if (version !== liveSearchVersionRef.current) return;
        setLivePlaceSuggestions(res.suggestions);
      } catch {
        // Ignore aborted requests
      } finally {
        if (version === liveSearchVersionRef.current) {
          setLoadingLivePlaces(false);
        }
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value.city, value.state, value.district]);

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

    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const pins = await fetchPinsForTownLive(
          value.state,
          value.district || '',
          value.city,
          controller.signal
        );
        if (!cancelled) {
          setExtraPins(pins);
          if (pins.length === 1 && !value.pincode) {
            emitChange({
              state: value.state,
              district: value.district || '',
              city: value.city,
              pincode: pins[0].code,
              addressLine: value.addressLine
            });
          }
        }
      } catch {
        // Ignore abort
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value.state, value.district, value.city, selectedTownOption]);

  const availablePins: PinOption[] = useMemo(() => {
    if (selectedTownOption && selectedTownOption.pins.length > 0) {
      return selectedTownOption.pins;
    }
    if (extraPins.length > 0) {
      return extraPins;
    }
    // Collect all known PINs across the selected District
    const districtPins: PinOption[] = [];
    for (const t of townOptions) {
      for (const p of t.pins) {
        if (!districtPins.some(existing => existing.code === p.code)) {
          districtPins.push(p);
        }
      }
    }
    return districtPins;
  }, [selectedTownOption, extraPins, townOptions]);

  const emitChange = (next: {
    state: string;
    district: string;
    city: string;
    pincode: string;
    addressLine?: string;
  }) => {
    const formattedLocation = formatStructuredLocation(next);
    onChange({
      ...next,
      formattedLocation
    });
  };

  // Build combobox options for Field 1: State / Union Territory
  const stateComboboxOptions: ComboboxOption[] = useMemo(() => {
    const base: ComboboxOption[] =
      mode === 'filter'
        ? [{ value: '', label: 'All India (All 36 States & UTs)', sublabel: 'Show results across every State & Union Territory' }]
        : [];
    return [
      ...base,
      ...statesList.map(st => ({
        value: st,
        label: st,
        sublabel: `${getDistrictsForState(st).length} official districts`
      }))
    ];
  }, [statesList, mode]);

  // Build combobox options for Field 2: District
  const districtComboboxOptions: ComboboxOption[] = useMemo(() => {
    if (value.state) {
      return districtsList.map(dist => ({
        value: dist,
        label: dist,
        sublabel: `${value.state}`,
        meta: { state: value.state, district: dist }
      }));
    }
    // When State is not selected yet, allow searching across all ~780 districts in India!
    return allDistrictsWithState.map(item => ({
      value: item.district,
      label: item.district,
      sublabel: `${item.state} • PIN prefix ${item.prefix}`,
      badge: item.state,
      meta: { state: item.state, district: item.district }
    }));
  }, [value.state, districtsList, allDistrictsWithState]);

  // Build combobox options for Field 3: Town / City / Locality
  const townComboboxOptions: ComboboxOption[] = useMemo(() => {
    const map = new Map<string, ComboboxOption>();

    for (const t of townOptions) {
      const primaryPin = t.pins[0]?.code || '';
      const key = `${t.name.toLowerCase()}|${t.district.toLowerCase()}|${t.state.toLowerCase()}`;
      map.set(key, {
        value: t.name,
        label: t.name,
        sublabel: `${t.district}, ${t.state}${primaryPin ? ` • PIN ${primaryPin}${t.pins.length > 1 ? ` (+${t.pins.length - 1} more)` : ''}` : ''}`,
        badge: primaryPin || undefined,
        meta: {
          city: t.name,
          district: t.district,
          state: t.state,
          pincode: primaryPin,
          pins: t.pins
        }
      });
    }

    for (const s of livePlaceSuggestions) {
      const key = `${s.city.toLowerCase()}|${s.district.toLowerCase()}|${s.state.toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, {
          value: s.city,
          label: s.label,
          sublabel: s.sublabel,
          badge: s.pincode || undefined,
          meta: {
            city: s.city,
            district: s.district,
            state: s.state,
            pincode: s.pincode,
            pins: s.pins
          }
        });
      }
    }

    return Array.from(map.values());
  }, [townOptions, livePlaceSuggestions]);

  // Build combobox options for Field 4: PIN Code
  const pinComboboxOptions: ComboboxOption[] = useMemo(() => {
    return availablePins.map(p => ({
      value: p.code,
      label: `${p.code} — ${p.officeName}`,
      sublabel: `${value.district || ''}${value.state ? `, ${value.state}` : ''}${p.deliveryStatus ? ` • ${p.deliveryStatus}` : ''}`,
      badge: '6-Digit PIN',
      meta: p
    }));
  }, [availablePins, value.district, value.state]);

  // Verify or reverse-resolve when user types a 6-digit PIN code
  const handlePincodeInput = async (rawPin: string) => {
    const digitsOnly = rawPin.replace(/\D/g, '').slice(0, 6);
    emitChange({
      state: value.state,
      district: value.district || '',
      city: value.city,
      pincode: digitsOnly,
      addressLine: value.addressLine
    });

    if (digitsOnly.length < 6) {
      setPinLookupStatus({ checking: false });
      return;
    }

    // Check if it's already in availablePins
    const existingPin = availablePins.find(p => p.code === digitsOnly);
    if (existingPin) {
      setPinLookupStatus({
        checking: false,
        isValid: true,
        message: `Verified Post Office: ${existingPin.officeName}`
      });
      return;
    }

    const version = ++pinRequestVersionRef.current;
    setPinLookupStatus({ checking: true, message: 'Verifying PIN with India Post…' });
    try {
      const res = await verifyPinCodeLive(digitsOnly);
      if (version !== pinRequestVersionRef.current) return;
      if (res.valid) {
        const matchedState =
          statesList.find(s => s.toLowerCase() === (res.state || '').toLowerCase()) ||
          value.state ||
          res.state ||
          '';
        const stateDistricts = matchedState ? getDistrictsForState(matchedState) : [];
        const matchedDistrict =
          stateDistricts.find(
            d =>
              d.toLowerCase().includes((res.district || '').toLowerCase()) ||
              (res.district || '').toLowerCase().includes(d.split('(')[0].trim().toLowerCase())
          ) ||
          value.district ||
          res.district ||
          '';
        const matchedCity = value.city || res.towns[0] || '';

        if (res.offices.length > 0) {
          setExtraPins(res.offices);
        }

        emitChange({
          state: matchedState,
          district: matchedDistrict,
          city: matchedCity,
          pincode: digitsOnly,
          addressLine: value.addressLine
        });

        setPinLookupStatus({
          checking: false,
          isValid: true,
          message: `Verified: ${res.offices[0]?.officeName || matchedCity} (${matchedDistrict}, ${matchedState})`
        });
      } else {
        setPinLookupStatus({
          checking: false,
          isValid: false,
          message: res.error || 'Could not verify PIN code.'
        });
      }
    } catch {
      if (version === pinRequestVersionRef.current) {
        setPinLookupStatus({ checking: false });
      }
    }
  };

  const handleResetAll = () => {
    setPinLookupStatus({ checking: false });
    emitChange({
      state: '',
      district: '',
      city: '',
      pincode: '',
      addressLine: ''
    });
  };

  const gridClass =
    layout === 'stacked' || layout === 'vertical'
      ? 'grid grid-cols-1 gap-3.5'
      : layout === 'grid-2'
      ? 'grid grid-cols-1 sm:grid-cols-2 gap-3.5'
      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5';

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Compass className="w-3.5 h-3.5 text-amber-500" />
          <span>
            {mode === 'filter'
              ? 'Pan-India Location Filter (Type to Search or Select)'
              : 'Pan-India Location Hierarchy (Type to Search or Select)'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isLiveVerified && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> India Post PIN Directory Active
            </span>
          )}
          {(value.state || value.district || value.city || value.pincode) && (
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Clear Location
            </button>
          )}
        </div>
      </div>

      {/* Legacy free-text preservation notice */}
      {value.legacyLocation && !value.state && !value.district && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900">
          <span>
            Saved location: <strong>{value.legacyLocation}</strong>. Type below to search or select State, District &amp; PIN.
          </span>
        </div>
      )}

      <div className={gridClass}>
        {/* 1. State / Union Territory (Searchable Type-and-Select Combobox) */}
        <SearchableLocationCombobox
          id={`${idPrefix}-state`}
          label={
            <>
              1. State / Union Territory {required && <span className="text-rose-500">*</span>}
            </>
          }
          value={value.state}
          placeholder={
            mode === 'filter'
              ? 'Type or select State / UT (All 36)…'
              : 'Type or select State / UT…'
          }
          options={stateComboboxOptions}
          required={required && mode === 'form'}
          onSelect={opt => {
            setPinLookupStatus({ checking: false });
            emitChange({
              state: opt.value,
              district: '',
              city: '',
              pincode: '',
              addressLine: value.addressLine
            });
          }}
          onClear={() => {
            setPinLookupStatus({ checking: false });
            emitChange({
              state: '',
              district: '',
              city: '',
              pincode: '',
              addressLine: value.addressLine
            });
          }}
          emptyMessage="No matching Indian State or Union Territory."
        />

        {/* 2. District (Searchable Type-and-Select Combobox across selected State or all ~780 India Districts) */}
        <SearchableLocationCombobox
          id={`${idPrefix}-district`}
          label={
            <>
              2. District {required && <span className="text-rose-500">*</span>}
            </>
          }
          value={value.district || ''}
          placeholder={
            value.state
              ? `Type or select District in ${value.state}…`
              : 'Type any District across India…'
          }
          options={districtComboboxOptions}
          required={required && mode === 'form'}
          onSelect={opt => {
            const nextState = opt.meta?.state || value.state;
            const nextDistrict = opt.meta?.district || opt.value;
            setPinLookupStatus({ checking: false });
            emitChange({
              state: nextState,
              district: nextDistrict,
              city: '',
              pincode: '',
              addressLine: value.addressLine
            });
          }}
          onClear={() => {
            setPinLookupStatus({ checking: false });
            emitChange({
              state: value.state,
              district: '',
              city: '',
              pincode: '',
              addressLine: value.addressLine
            });
          }}
          emptyMessage="No matching district found."
        />

        {/* 3. Town / City / Locality (Searchable Type-and-Select Combobox + Free Text + Live India Post API) */}
        <SearchableLocationCombobox
          id={`${idPrefix}-city`}
          label={
            <>
              3. Town / City / Locality {required && <span className="text-rose-500">*</span>}
            </>
          }
          value={value.city}
          placeholder="Type town, city, hub or post office…"
          options={townComboboxOptions}
          loading={loadingTowns || loadingLivePlaces}
          error={lookupError}
          onRetry={() => void loadDistrictData(value.state, value.district || '')}
          allowFreeText={true}
          required={required && mode === 'form'}
          onSelect={opt => {
            const meta = opt.meta || {};
            const nextState = meta.state || value.state;
            const nextDistrict = meta.district || value.district || '';
            const nextCity = meta.city || opt.value;
            const pins: PinOption[] = Array.isArray(meta.pins) ? meta.pins : [];
            const nextPin = pins.length === 1 ? pins[0].code : meta.pincode || value.pincode || '';

            if (pins.length > 0) {
              setExtraPins(pins);
            }

            setPinLookupStatus({
              checking: false,
              isValid: Boolean(nextPin),
              message:
                pins.length > 1
                  ? `${pins.length} PIN codes available for ${nextCity}`
                  : nextPin
                  ? `Verified PIN: ${nextPin}`
                  : undefined
            });

            emitChange({
              state: nextState,
              district: nextDistrict,
              city: nextCity,
              pincode: nextPin,
              addressLine: value.addressLine
            });
          }}
          onFreeTextChange={text => {
            emitChange({
              state: value.state,
              district: value.district || '',
              city: text,
              pincode: value.pincode || '',
              addressLine: value.addressLine
            });
          }}
          onClear={() => {
            setPinLookupStatus({ checking: false });
            emitChange({
              state: value.state,
              district: value.district || '',
              city: '',
              pincode: '',
              addressLine: value.addressLine
            });
          }}
          emptyMessage="No matching locality in directory — your typed city/locality will be kept."
        />

        {/* 4. 6-Digit PIN Code (Searchable Type-and-Select Combobox + Live 6-Digit Reverse Lookup) */}
        <div>
          <SearchableLocationCombobox
            id={`${idPrefix}-pincode`}
            label={
              <span className="flex items-center justify-between">
                <span>4. PIN Code {required && <span className="text-rose-500">*</span>}</span>
                {availablePins.length > 1 && (
                  <span className="text-[10px] font-semibold text-amber-600">
                    {availablePins.length} PINs available
                  </span>
                )}
              </span>
            }
            value={value.pincode || ''}
            placeholder="Type 6-digit PIN or select…"
            options={pinComboboxOptions}
            loading={pinLookupStatus.checking}
            allowFreeText={true}
            inputMode="numeric"
            maxLength={6}
            onSelect={opt => {
              const pinCode = opt.value.replace(/\D/g, '').slice(0, 6);
              const poName = opt.meta?.officeName;
              setPinLookupStatus({
                checking: false,
                isValid: true,
                message: poName ? `Verified Post Office: ${poName}` : `PIN ${pinCode} selected`
              });
              emitChange({
                state: value.state,
                district: value.district || '',
                city: value.city || poName || '',
                pincode: pinCode,
                addressLine: value.addressLine
              });
            }}
            onFreeTextChange={text => {
              void handlePincodeInput(text);
            }}
            onClear={() => {
              setPinLookupStatus({ checking: false });
              emitChange({
                state: value.state,
                district: value.district || '',
                city: value.city,
                pincode: '',
                addressLine: value.addressLine
              });
            }}
            emptyMessage="Type any 6-digit Indian PIN code (e.g. 560001) to auto-verify with India Post."
          />

          {/* Status message under PIN code */}
          {pinLookupStatus.message && (
            <p
              className={`mt-1 text-[11px] flex items-center gap-1 ${
                pinLookupStatus.isValid === false
                  ? 'text-rose-600'
                  : pinLookupStatus.isValid === true
                  ? 'text-emerald-700'
                  : 'text-slate-500'
              }`}
            >
              {pinLookupStatus.isValid === false ? (
                <AlertCircle className="w-3 h-3 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3 h-3 shrink-0" />
              )}
              <span className="truncate">{pinLookupStatus.message}</span>
            </p>
          )}
        </div>
      </div>

      {/* Optional Street / Depot / Landmark Line */}
      {showAddressLine && (
        <div className="pt-1">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            {addressLineLabel}
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={value.addressLine || ''}
              onChange={e =>
                emitChange({
                  state: value.state,
                  district: value.district || '',
                  city: value.city,
                  pincode: value.pincode || '',
                  addressLine: e.target.value
                })
              }
              placeholder={addressLinePlaceholder}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};
