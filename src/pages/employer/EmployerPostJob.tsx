import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  Briefcase, Plus, CheckCircle2, ArrowLeft, MapPin, IndianRupee, 
  ShieldCheck, Sparkles, FileText, Info, Check, X, Truck, Wallet,
  HelpCircle, Trash2, Edit3, Send, Clock
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { DriverCategory, Job } from '../../types';
import { ALL_INDIAN_STATES, getCitiesForState, getAreasForCity, searchIndianLocations, CITY_AREAS_MAP } from '../../data/indiaLocations';

interface JobTemplate {
  id: string;
  name: string;
  badge: string;
  title: string;
  category: DriverCategory;
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Temporary';
  nightShift: boolean;
  workLocationType: 'Work From Depot / Office' | 'Client / Household Site' | 'Interstate / Field Route';
  payType: 'Fixed Only' | 'Fixed + Incentive' | 'Incentive Only';
  salaryMin: number;
  salaryMax: number;
  experienceRequired: string;
  experienceMinYears: number;
  vehicleType: string;
  perks: string[];
  skills: string;
  description: string;
}

const DRIVER_TEMPLATES: JobTemplate[] = [
  {
    id: 'tpl-hmv',
    name: 'Heavy Truck / Multi-Axle Driver (HMV)',
    badge: 'Most Popular',
    title: 'Senior Heavy Truck Driver (Multi-Axle Interstate)',
    category: 'HMV',
    employmentType: 'Full-time',
    nightShift: true,
    workLocationType: 'Interstate / Field Route',
    payType: 'Fixed + Incentive',
    salaryMin: 28000,
    salaryMax: 38000,
    experienceRequired: '3-5 Years',
    experienceMinYears: 3,
    vehicleType: 'BharatBenz / Ashok Leyland 14-Wheel & 16-Wheel Truck',
    perks: ['Overtime Pay', 'Travel Allowance (TA)', 'Food/Meals', 'Accommodation', 'Health Insurance', 'Annual Bonus'],
    skills: 'Interstate Freight, Highway Driving, Night Driving, Pre-Trip Inspection, FASTag Handling',
    description: 'Hiring experienced Heavy Motor Vehicle (HMV) drivers for interstate express highway routes from Bengaluru hub. Must hold a valid HMV Transport license, maintain trip logs, and follow strict fleet safety protocols.'
  },
  {
    id: 'tpl-chauffeur',
    name: 'Executive / Family Personal Chauffeur (LMV)',
    badge: 'High Response',
    title: 'Executive Corporate & Family Chauffeur (Automatic SUV/Sedan)',
    category: 'Personal Driver',
    employmentType: 'Full-time',
    nightShift: false,
    workLocationType: 'Client / Household Site',
    payType: 'Fixed Only',
    salaryMin: 22000,
    salaryMax: 29000,
    experienceRequired: '2-4 Years',
    experienceMinYears: 2,
    vehicleType: 'Innova Crysta, Fortuner, Honda City, Mercedes/BMW Automatic',
    perks: ['Overtime Pay', 'Mobile Allowance', 'Uniform Provided', 'Health Insurance'],
    skills: 'Automatic Transmission Mastery, VIP Etiquette, City Traffic Navigation, Clean Driving Record',
    description: 'Seeking a polite, punctual, and well-groomed chauffeur for family and executive city transit. Must know automatic transmission vehicles, keep the car spotless, and have clean police background.'
  },
  {
    id: 'tpl-delivery',
    name: 'Hyperlocal & E-Commerce Delivery Pilot (Tempo / LCV)',
    badge: 'Urgent Hiring',
    title: 'LCV Tempo & EV Delivery Van Driver (Tata Ace / Bolero)',
    category: 'Tempo Driver',
    employmentType: 'Full-time',
    nightShift: false,
    workLocationType: 'Work From Depot / Office',
    payType: 'Fixed + Incentive',
    salaryMin: 19000,
    salaryMax: 25000,
    experienceRequired: '1-3 Years',
    experienceMinYears: 1,
    vehicleType: 'Tata Ace Gold, Mahindra Bolero Maxitruck, EV Cargo',
    perks: ['Weekly Payout', 'Overtime Pay', 'Petrol Allowance', 'Mobile Allowance', 'ESI (ESIC)'],
    skills: 'Quick Route Navigation, Smartphone App Scanning, Careful Cargo Loading, Fuel Efficiency',
    description: 'Hiring LMV-Goods & Tempo Drivers for daily warehouse-to-hub and hyperlocal retail deliveries across Bengaluru. Fixed salary plus daily trip milestone bonuses.'
  },
  {
    id: 'tpl-trailer',
    name: 'Port & Container 40ft Trailer Pilot (Heavy Haulage)',
    badge: 'High Salary',
    title: 'Container Trailer Truck Driver (40ft Semi-Trailer)',
    category: 'Trailer Driver',
    employmentType: 'Full-time',
    nightShift: true,
    workLocationType: 'Interstate / Field Route',
    payType: 'Fixed + Incentive',
    salaryMin: 32000,
    salaryMax: 45000,
    experienceRequired: '5+ Years',
    experienceMinYears: 5,
    vehicleType: '40ft Container Semi-Trailer / 18-Wheeler Prime Mover',
    perks: ['Trip Allowance', 'Night Stay Allowance', 'Toll FASTag Reimbursed', 'PF / PF Benefit', 'Medical Cover'],
    skills: 'Trailer Reversing & Docking, Container Port Terminal Gate Clearance, Highway Long Haul',
    description: 'Opportunity for veteran 40ft container trailer pilots operating between seaport terminals, ICD inland dry ports, and manufacturing corridors.'
  },
  {
    id: 'tpl-bus',
    name: 'School / Corporate Staff Bus Driver (Passenger HPV)',
    badge: 'Fixed Hours',
    title: 'School Bus & Corporate Employee Shuttle Driver',
    category: 'Bus Driver',
    employmentType: 'Full-time',
    nightShift: false,
    workLocationType: 'Work From Depot / Office',
    payType: 'Fixed Only',
    salaryMin: 20000,
    salaryMax: 26000,
    experienceRequired: '3-6 Years',
    experienceMinYears: 3,
    vehicleType: '32-Seater / 52-Seater Ashok Leyland / Eicher Passenger Bus',
    perks: ['Fixed Timing', 'Sunday Holiday', 'School Term Holidays', 'Gratuity / PF', 'Uniform Allowance'],
    skills: 'Passenger Transit Safety, Calm & Patient Driving, School RTO Guidelines, Defensive Driving',
    description: 'Looking for a disciplined, calm, and safety-minded Heavy Passenger Vehicle (HPV) driver for morning and evening student bus runs. Zero tolerance for reckless driving.'
  },
  {
    id: 'tpl-cab',
    name: 'Airport Transfer & Ride-Hailing Cab Chauffeur',
    badge: 'Flexible Shifts',
    title: 'Airport Transfer & Outstation Rental Cab Driver',
    category: 'Cab Driver',
    employmentType: 'Full-time',
    nightShift: true,
    workLocationType: 'Work From Depot / Office',
    payType: 'Fixed + Incentive',
    salaryMin: 22000,
    salaryMax: 30000,
    experienceRequired: '2+ Years',
    experienceMinYears: 2,
    vehicleType: 'Maruti Dzire, Toyota Etios, Ertiga Yellow-Plate Sedans/SUVs',
    perks: ['Airport Tolls Reimbursed', 'Daily Trip Bonus', 'Night Shift Premium', 'Vehicle Provided by Company'],
    skills: 'GPS Navigation, Polite Customer Etiquette, Airport Parking Protocols, Basic English/Hindi',
    description: 'Join our premium airport and inter-city corporate transfer cab fleet. Company provides maintained yellow-board vehicle and direct passenger assignments.'
  }
];

const PREDEFINED_SCREENING_QUESTIONS = [
  'How many years of verified driving experience do you have?',
  'Do you hold a valid Commercial / Transport Driving License?',
  'Are you comfortable with outstation or night shifts if required?',
  'Do you have an active FASTag & GPS smartphone route navigation literacy?',
  'Can you join immediately (within 7 to 15 days) with police verification?',
  'Do you have experience driving automatic transmission & luxury/heavy vehicles?'
];

const JOB_TITLE_SUGGESTIONS = [
  { title: 'Heavy Truck Driver (Multi-Axle / 16-Wheel)', category: 'HMV' as DriverCategory, vehicleType: 'BharatBenz 16-Wheel / Ashok Leyland 4220' },
  { title: 'Interstate Long-Haul Freight Pilot', category: 'HMV' as DriverCategory, vehicleType: 'Multi-Axle Heavy Commercial Vehicle' },
  { title: 'Executive Corporate & Family Chauffeur', category: 'Personal Driver' as DriverCategory, vehicleType: 'Innova Crysta / Fortuner / Mercedes Sedan' },
  { title: 'LCV Tempo & EV Delivery Van Driver', category: 'Tempo Driver' as DriverCategory, vehicleType: 'Tata Ace Gold / Mahindra Bolero / EV Cargo' },
  { title: 'Container Trailer Truck Driver (40ft Semi-Trailer)', category: 'Trailer Driver' as DriverCategory, vehicleType: '40ft Semi-Trailer / Prime Mover' },
  { title: 'School Bus & Corporate Employee Shuttle Driver', category: 'Bus Driver' as DriverCategory, vehicleType: '32-52 Seater Ashok Leyland / Eicher Bus' },
  { title: 'Airport Transfer & Outstation Cab Chauffeur', category: 'Cab Driver' as DriverCategory, vehicleType: 'Maruti Dzire / Toyota Etios Yellow-Board' },
  { title: 'Hyperlocal E-Commerce Delivery Rider / Pilot', category: 'Delivery Driver' as DriverCategory, vehicleType: 'Tata Ace / 3-Wheeler EV Cargo' },
  { title: 'Tipper & Dump Truck Mining/Infra Driver', category: 'HMV' as DriverCategory, vehicleType: 'Tata Signa 2823 Tipper' },
  { title: 'Hazardous Chemical / Fuel Tanker Driver', category: 'HMV-Transport' as DriverCategory, vehicleType: 'Petroleum Tanker Truck' },
  { title: 'Private Luxury Automatic Car Chauffeur', category: 'Personal Driver' as DriverCategory, vehicleType: 'Automatic SUV / Luxury Sedan' }
];

const VEHICLE_SUGGESTIONS = [
  'BharatBenz 1617R / 2823R (16-Wheel Multi-Axle)',
  'Ashok Leyland 4220 / 4825 Heavy Commercial Truck',
  'Tata Signa 4825.TK Tipper / 5530.S Trailer',
  '40ft High-Cube Container Semi-Trailer Prime Mover',
  'Tata Ace Gold / EV / Super Ace Mini Truck',
  'Mahindra Bolero Maxi Truck Plus / Pickup',
  'Toyota Innova Crysta / Hycross (Automatic 7-Seater)',
  'Toyota Fortuner / Land Cruiser (4x4 Automatic)',
  'Maruti Suzuki Dzire / Tour S (Sedan CNG/Petrol)',
  '32-Seater / 52-Seater Ashok Leyland School Bus',
  'Eicher Pro 2049 / Pro 3015 LCV Goods Truck',
  'Force Traveller 12-26 Seater Corporate Shuttle'
];

const SKILLS_SUGGESTIONS = [
  'Interstate Highway Freight, Night Driving, FASTag Handling',
  'VIP Etiquette, Automatic Transmission, City Traffic Navigation',
  'Heavy Axle Reversing & Docking, Container Port Clearance, Pre-Trip Inspection',
  'Cold Storage Reefer Temperature Monitoring, Safe Cargo Loading',
  'Defensive Driving, GPS & Smartphone App Route Navigation, Clean Record',
  'Hazchem / Hazardous Cargo Transport Safety Clearance'
];

export const EmployerPostJob: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentUser = DataStore.getCurrentUser();
  const employerId = currentUser?.id || '';
  const employer = DataStore.getEmployerById(employerId);
  const subscription = DataStore.getSubscription(employerId);

  const [step, setStep] = useState<number>(1);
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(searchParams.get('template') === 'open');

  // Form State
  const [hiringForCompany, setHiringForCompany] = useState(employer?.companyName || '');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DriverCategory>('HMV');
  const [jobTypePill, setJobTypePill] = useState<'Full Time' | 'Part Time' | 'Both (Full-Time And Part-Time)'>('Full Time');
  const [nightShift, setNightShift] = useState(false);

  // Suggestions state
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
  const [showVehicleSuggestions, setShowVehicleSuggestions] = useState(false);
  const [showSkillsSuggestions, setShowSkillsSuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  const titleSuggestionsRef = useRef<HTMLDivElement>(null);
  const vehicleSuggestionsRef = useRef<HTMLDivElement>(null);
  const skillsSuggestionsRef = useRef<HTMLDivElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const suggestionsBoxRef = useRef<HTMLDivElement>(null);

  // Location
  const [workLocationType, setWorkLocationType] = useState<'Work From Depot / Office' | 'Client / Household Site' | 'Interstate / Field Route'>('Work From Depot / Office');
  const [state, setState] = useState(employer?.state || 'Karnataka');
  const [city, setCity] = useState(employer?.city || 'Bengaluru');
  const [location, setLocation] = useState(employer?.location || 'Electronic City Phase 1');
  const [vacancies, setVacancies] = useState<number>(1);

  // Compensation & Perks
  const [payType, setPayType] = useState<'Fixed Only' | 'Fixed + Incentive' | 'Incentive Only'>('Fixed + Incentive');
  const [salaryMin, setSalaryMin] = useState<number>(0);
  const [salaryMax, setSalaryMax] = useState<number>(0);
  const [selectedPerks, setSelectedPerks] = useState<string[]>([]);
  const [joiningFeeRequired, setJoiningFeeRequired] = useState<boolean>(false);

  // Step 2 & 3: Experience, Vehicle, Docs, Screening
  const [experienceRequired, setExperienceRequired] = useState('');
  const [experienceMinYears, setExperienceMinYears] = useState(0);
  const [vehicleType, setVehicleType] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [description, setDescription] = useState('');
  const [docsSelected, setDocsSelected] = useState<string[]>([
    'Commercial Driving License',
    'Aadhaar Card',
    'Police Verification'
  ]);

  // Screening questions builder
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([
    'How many years of verified driving experience do you have?',
    'Do you hold a valid Commercial / Transport Driving License?',
    'Are you comfortable with outstation or night shifts if required?'
  ]);
  const [customQuestionInput, setCustomQuestionInput] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [submissionType, setSubmissionType] = useState<'draft' | 'pending' | 'active'>('active');
  const [entitlementError, setEntitlementError] = useState('');
  const [submittingJob, setSubmittingJob] = useState(false);

  useEffect(() => {
    if (searchParams.get('template') === 'open') {
      setShowTemplateModal(true);
    }
  }, [searchParams]);

  // Click outside to dismiss suggestion popups
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsBoxRef.current && 
        !suggestionsBoxRef.current.contains(e.target as Node) &&
        locationInputRef.current &&
        !locationInputRef.current.contains(e.target as Node)
      ) {
        setShowLocationSuggestions(false);
      }
      if (
        titleSuggestionsRef.current &&
        !titleSuggestionsRef.current.contains(e.target as Node)
      ) {
        setShowTitleSuggestions(false);
      }
      if (
        vehicleSuggestionsRef.current &&
        !vehicleSuggestionsRef.current.contains(e.target as Node)
      ) {
        setShowVehicleSuggestions(false);
      }
      if (
        skillsSuggestionsRef.current &&
        !skillsSuggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSkillsSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableCities = useMemo(() => getCitiesForState(state), [state]);
  const availableAreas = useMemo(() => getAreasForCity(city), [city]);

  // Real-time title suggestions computed as user types
  const titleSuggestions = useMemo(() => {
    if (!title.trim()) return JOB_TITLE_SUGGESTIONS;
    const q = title.toLowerCase().trim();
    return JOB_TITLE_SUGGESTIONS.filter(t => 
      t.title.toLowerCase().includes(q) || 
      t.category.toLowerCase().includes(q) || 
      (t.vehicleType && t.vehicleType.toLowerCase().includes(q))
    );
  }, [title]);

  // Real-time vehicle suggestions
  const vehicleSuggestionsList = useMemo(() => {
    if (!vehicleType.trim()) return VEHICLE_SUGGESTIONS;
    const q = vehicleType.toLowerCase().trim();
    return VEHICLE_SUGGESTIONS.filter(v => v.toLowerCase().includes(q));
  }, [vehicleType]);

  // Real-time skills suggestions
  const skillsSuggestionsList = useMemo(() => {
    if (!skillsText.trim()) return SKILLS_SUGGESTIONS;
    const q = skillsText.toLowerCase().trim();
    return SKILLS_SUGGESTIONS.filter(s => s.toLowerCase().includes(q));
  }, [skillsText]);

  // Real-time location suggestions computed as user types
  const locationSuggestions = useMemo(() => {
    if (!location.trim()) {
      return availableAreas.slice(0, 8);
    }
    const q = location.toLowerCase().trim();
    const matchedCityAreas = availableAreas.filter(a => a.toLowerCase().includes(q));
    
    const allIndiaMatches: string[] = [];
    for (const [c, areas] of Object.entries(CITY_AREAS_MAP)) {
      for (const area of areas) {
        if (area.toLowerCase().includes(q) && !matchedCityAreas.includes(area)) {
          allIndiaMatches.push(`${area} (${c})`);
        }
      }
    }
    return [...matchedCityAreas, ...allIndiaMatches].slice(0, 8);
  }, [location, availableAreas]);

  const applyTemplate = (tpl: JobTemplate) => {
    setTitle(tpl.title);
    setCategory(tpl.category);
    setJobTypePill(tpl.employmentType === 'Part-time' ? 'Part Time' : 'Full Time');
    setNightShift(tpl.nightShift);
    setWorkLocationType(tpl.workLocationType);
    setPayType(tpl.payType);
    setSalaryMin(tpl.salaryMin);
    setSalaryMax(tpl.salaryMax);
    setExperienceRequired(tpl.experienceRequired);
    setExperienceMinYears(tpl.experienceMinYears);
    setVehicleType(tpl.vehicleType);
    setSelectedPerks(tpl.perks);
    setSkillsText(tpl.skills);
    setDescription(tpl.description);
    setShowTemplateModal(false);
  };

  const togglePerk = (perk: string) => {
    if (selectedPerks.includes(perk)) {
      setSelectedPerks(selectedPerks.filter(p => p !== perk));
    } else {
      setSelectedPerks([...selectedPerks, perk]);
    }
  };

  // Screening questions helper methods
  const toggleQuestion = (question: string) => {
    if (selectedQuestions.includes(question)) {
      setSelectedQuestions(selectedQuestions.filter(q => q !== question));
    } else {
      setSelectedQuestions([...selectedQuestions, question]);
    }
  };

  const handleAddCustomQuestion = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = customQuestionInput.trim();
    if (!q) return;
    if (!selectedQuestions.includes(q)) {
      setSelectedQuestions([...selectedQuestions, q]);
    }
    setCustomQuestionInput('');
  };

  const handleRemoveQuestion = (question: string) => {
    setSelectedQuestions(selectedQuestions.filter(q => q !== question));
  };

  const handlePublishJob = async (targetStatus: 'draft' | 'pending' | 'active') => {
    setEntitlementError('');
    if (!hiringForCompany.trim() || !title.trim() || !description.trim() || !city.trim() || !location.trim() || !experienceRequired.trim() || !vehicleType.trim() || salaryMin <= 0 || salaryMax < salaryMin || vacancies <= 0) {
      setEntitlementError('Complete the job title, description, location and valid salary/opening details before publishing.');
      return;
    }

    let creditUsed = false;
    let slotUsed = false;

    if (targetStatus !== 'draft') {
      const entitlement = DataStore.consumeJobCredit(employerId);
      if (!entitlement.success) {
        setEntitlementError(entitlement.message);
        navigate('/employer/plans');
        return;
      }
      creditUsed = entitlement.creditUsed === true;
      slotUsed = entitlement.slotUsed === true;
    }

    const newJob: Job = {
      id: crypto.randomUUID(),
      employerId,
      companyName: hiringForCompany.trim(),
      companyLogo: employer?.logoUrl,
      postedBy: employer?.contactPerson || '',
      title: title.trim(),
      category,
      location: `${location}, ${city}`,
      city,
      state,
      workLocationType,
      experienceRequired,
      experienceMinYears,
      salaryMin,
      salaryMax,
      salaryType: 'monthly',
      payType,
      perks: selectedPerks,
      nightShift,
      vehicleType,
      joiningFeeRequired,
      screeningQuestions: selectedQuestions,
      workingHours: `${jobTypePill}${nightShift ? ' • Night Shift' : ' • Day Shift'}`,
      employmentType: jobTypePill === 'Part Time' ? 'Part-time' : 'Full-time',
      description,
      requiredSkills: skillsText.split(',').map(s => s.trim()).filter(Boolean),
      requiredDocs: docsSelected,
      vacancies,
      status: targetStatus,
      postedDate: new Date().toISOString().slice(0, 10),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      creditConsumed: creditUsed,
      slotConsumed: slotUsed,
      applicationsCount: 0
    };

    setSubmittingJob(true);
    const saved = await DataStore.addJob(newJob);
    setSubmittingJob(false);

      if (!saved) {
        if (creditUsed) DataStore.refundJobCredit(employerId);
        setEntitlementError('The job could not be saved. Confirm your employer subscription and company verification, then try again.');
        return;
      }

      const savedStatus = DataStore.getJobById(newJob.id)?.status || targetStatus;
      setSubmissionType(savedStatus === 'draft' ? 'draft' : savedStatus === 'active' ? 'active' : 'pending');
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center shadow-card space-y-6 my-8 animate-in fade-in zoom-in-95">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
          submissionType === 'active' 
            ? 'bg-emerald-100 text-emerald-700' 
            : (submissionType === 'draft' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800')
        }`}>
          {submissionType === 'active' ? (
            <CheckCircle2 className="w-9 h-9" />
          ) : (submissionType === 'draft' ? (
            <FileText className="w-8 h-8" />
          ) : (
            <Clock className="w-8 h-8" />
          ))}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-[#08233F] font-display">
            {submissionType === 'active' 
              ? 'Driver Job is Live & Active! 🎉' 
              : (submissionType === 'draft' ? 'Organization Draft Saved! 📝' : 'Submitted for Standard Admin Review ⏳')}
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            {submissionType === 'active' && (
              `Your driver vacancy "${title}" is now immediately visible to all drivers in ${city}, ${state}. Drivers can start submitting applications right now.`
            )}
            {submissionType === 'draft' && (
              `Your vacancy "${title}" has been saved as an organization draft. You or any authorized hiring manager in your company can review, edit, and approve it to make it live whenever ready.`
            )}
            {submissionType === 'pending' && (
              `Your vacancy "${title}" is queued for platform compliance verification. Your hiring entitlement has been secured.`
            )}
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1 text-left max-w-md mx-auto">
          <p><strong>Company:</strong> {hiringForCompany}</p>
          <p><strong>Designation:</strong> {title} ({category})</p>
          <p><strong>Location:</strong> {location}, {city}, {state}</p>
          <p><strong>Salary Range:</strong> ₹{salaryMin.toLocaleString('en-IN')} – ₹{salaryMax.toLocaleString('en-IN')}/month</p>
          <p><strong>Status:</strong> <span className="capitalize font-bold text-emerald-800">{submissionType}</span></p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
          <Link
            to="/employer/jobs"
            className="px-6 py-3 bg-[#08233F] hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all shadow"
          >
            Manage All Jobs ({submissionType === 'draft' ? 'View Drafts' : 'View Pipeline'})
          </Link>
          <Link
            to={`/employer/candidates?category=${encodeURIComponent(category)}&city=${encodeURIComponent(city)}`}
            className="px-6 py-3 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-xl text-xs transition-all shadow"
          >
            Unlock Drivers for this Role →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/employer/jobs')}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-extrabold text-[#08233F]">Post a New Driver Vacancy</h1>
            <p className="text-xs text-slate-500">Reach verified commercial & personal drivers across India</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowTemplateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Use Driver Templates</span>
          </button>

          <Link
            to="/employer/billing"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Credits: <strong>{subscription.jobCredits}</strong></span>
          </Link>
        </div>
      </div>

      {/* 4-Step Progress Indicator */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-subtle">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: 'Job details & Pay' },
            { num: 2, label: 'Driver & Vehicle Specs' },
            { num: 3, label: 'Description & Screening' },
            { num: 4, label: 'Preview & Publish' }
          ].map((s, idx) => {
            const isDone = step > s.num;
            const isCurrent = step === s.num;
            return (
              <React.Fragment key={s.num}>
                <button
                  type="button"
                  onClick={() => setStep(s.num)}
                  className="flex items-center gap-2 text-left cursor-pointer group"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <span
                    className={`text-xs hidden sm:inline ${
                      isCurrent ? 'font-extrabold text-slate-900' : 'font-medium text-slate-500'
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
                {idx < 3 && (
                  <div className={`flex-1 h-0.5 mx-3 ${step > s.num ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STEP 1: JOB DETAILS, LOCATION & COMPENSATION */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Card 1: Job details */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-subtle space-y-5">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Job details</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                We use this information to find the best matching drivers for the job. <span className="text-red-500">*Marked fields are mandatory</span>
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Company you belong to: </span>
                <strong className="text-slate-900">{employer?.companyName || 'Apex Fleet Logistics'}</strong>
                <span className="text-slate-400 block text-[11px] mt-0.5">(Verified Fleet & Transport Employer)</span>
              </div>
              <Link to="/employer/company" className="font-bold text-emerald-700 hover:underline">
                Change
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Company you're hiring for <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={hiringForCompany}
                  onChange={e => setHiringForCompany(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Driver Category / Specialization <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as DriverCategory)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none cursor-pointer"
                >
                  <option value="HMV">Heavy Motor Vehicle (HMV Truck)</option>
                  <option value="LMV">Light Motor Vehicle (LMV)</option>
                  <option value="Personal Driver">Personal / Family Chauffeur</option>
                  <option value="Trailer Driver">40ft Container Trailer Driver</option>
                  <option value="Bus Driver">School & Staff Bus Driver</option>
                  <option value="Cab Driver">Cab / Corporate Fleet Driver</option>
                  <option value="Tempo Driver">Tempo / LCV Goods Driver</option>
                  <option value="Delivery Driver">Hyperlocal Delivery Driver</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Job title / Designation <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="job-title-suggestions-list"
                  value={title}
                  onFocus={() => setShowTitleSuggestions(true)}
                  onChange={e => {
                    setTitle(e.target.value);
                    setShowTitleSuggestions(true);
                  }}
                  placeholder="e.g. Senior Heavy Truck Driver / Executive Chauffeur"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
                <datalist id="job-title-suggestions-list">
                  {JOB_TITLE_SUGGESTIONS.map(t => (
                    <option key={t.title} value={t.title} />
                  ))}
                </datalist>

                {/* Floating Autocomplete Dropdown for Job Title */}
                {showTitleSuggestions && titleSuggestions.length > 0 && (
                  <div
                    ref={titleSuggestionsRef}
                    className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 max-h-60 overflow-y-auto animate-in fade-in"
                  >
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <span>Matching Driver Designations</span>
                      <button 
                        type="button" 
                        onClick={() => setShowTitleSuggestions(false)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        ✕
                      </button>
                    </div>
                    {titleSuggestions.map(item => (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => {
                          setTitle(item.title);
                          if (item.category) setCategory(item.category);
                          if (item.vehicleType && !vehicleType) setVehicleType(item.vehicleType);
                          setShowTitleSuggestions(false);
                        }}
                        className="w-full px-3.5 py-2.5 text-left text-xs text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 flex items-center justify-between group transition-colors cursor-pointer border-b border-slate-50 last:border-0"
                      >
                        <div>
                          <span className="font-bold text-slate-900 group-hover:text-emerald-900 block">{item.title}</span>
                          <span className="text-[11px] text-slate-500">{item.category} • {item.vehicleType || 'Standard Fleet'}</span>
                        </div>
                        <span className="text-[10px] bg-slate-100 group-hover:bg-emerald-200 text-slate-700 group-hover:text-emerald-900 px-2 py-0.5 rounded font-bold">
                          Select ↵
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-blue-600 font-medium mt-1">
                <Info className="w-3.5 h-3.5 shrink-0" /> Real-time auto-suggestions enabled for all driver designations
              </span>
            </div>

            {/* Type of Job Pills + Night Shift Checkbox */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-800">
                Type of Job <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {(['Full Time', 'Part Time', 'Both (Full-Time And Part-Time)'] as const).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setJobTypePill(opt)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      jobTypePill === opt
                        ? 'bg-blue-50 text-blue-800 border-blue-500 font-bold'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-slate-700 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nightShift}
                  onChange={e => setNightShift(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span>This is a night shift job</span>
              </label>
            </div>
          </div>

          {/* Card 2: Location with Live Auto-Suggestions Dropdown (Pic 1 & 2 fix) */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-subtle space-y-5">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Location</h2>
              <p className="text-xs text-slate-500 mt-0.5">Let drivers know where they will be reporting or driving from</p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Work location type <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    'Work From Depot / Office',
                    'Client / Household Site',
                    'Interstate / Field Route'
                  ] as const
                ).map(locType => (
                  <button
                    key={locType}
                    type="button"
                    onClick={() => setWorkLocationType(locType)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      workLocationType === locType
                        ? 'bg-blue-50 text-blue-800 border-blue-500 font-bold'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {locType}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">State / UT *</label>
                <select
                  value={state}
                  onChange={e => {
                    const newState = e.target.value;
                    setState(newState);
                    const cities = getCitiesForState(newState);
                    if (cities.length > 0) {
                      setCity(cities[0]);
                      const areas = getAreasForCity(cities[0]);
                      setLocation(areas[0] || `${cities[0]} Central Hub`);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none cursor-pointer"
                >
                  {ALL_INDIAN_STATES.map(s => (
                    <option key={s.state} value={s.state}>
                      {s.state} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">City / District *</label>
                <select
                  value={city}
                  onChange={e => {
                    setCity(e.target.value);
                    const areas = getAreasForCity(e.target.value);
                    if (areas.length > 0) setLocation(areas[0]);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none cursor-pointer"
                >
                  {availableCities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Depot / Area Locality with Floating Auto-Suggestions Popup (Pic 1 & 2) */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-800 mb-1">Depot / Area Locality *</label>
                <div className="relative">
                  <input
                    ref={locationInputRef}
                    type="text"
                    list="locality-suggestions-list"
                    value={location}
                    onFocus={() => setShowLocationSuggestions(true)}
                    onChange={e => {
                      setLocation(e.target.value);
                      setShowLocationSuggestions(true);
                    }}
                    placeholder="Type area e.g. Kamala Nagar, Peenya..."
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
                <datalist id="locality-suggestions-list">
                  {availableAreas.map(a => (
                    <option key={a} value={a} />
                  ))}
                </datalist>

                {/* Floating Autocomplete Dropdown */}
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <div
                    ref={suggestionsBoxRef}
                    className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-1"
                  >
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <span>Suggested Areas & Corridors</span>
                      <button 
                        type="button" 
                        onClick={() => setShowLocationSuggestions(false)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        ✕
                      </button>
                    </div>
                    {locationSuggestions.map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => {
                          setLocation(area.replace(/\s\(.*\)$/, ''));
                          setShowLocationSuggestions(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 flex items-center justify-between group transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                          <span className="truncate">{area}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 group-hover:text-emerald-700 shrink-0">Select ↵</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Number of Openings *</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={vacancies}
                  onChange={e => setVacancies(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Live Location Preview */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-900 font-medium">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Formatted Live Location: </strong>
                {location ? `${location}, ` : ''}{city}, {state} (India)
              </span>
            </div>
          </div>

          {/* Card 3: Compensation */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-subtle space-y-5">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Compensation</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Job postings with clear monthly salary & driver incentives help you find the right candidates faster
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                What is the pay type? <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {(['Fixed Only', 'Fixed + Incentive', 'Incentive Only'] as const).map(pt => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => setPayType(pt)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      payType === pt
                        ? 'bg-blue-50 text-blue-800 border-blue-500 font-bold'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Minimum Monthly In-Hand Salary (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="number"
                    min={10000}
                    step={1000}
                    value={salaryMin || ''}
                    onChange={e => setSalaryMin(Number(e.target.value))}
                    placeholder="e.g. 25000"
                    className="w-full pl-8 pr-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Maximum Monthly Salary (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="number"
                    min={salaryMin || 10000}
                    step={1000}
                    value={salaryMax || ''}
                    onChange={e => setSalaryMax(Number(e.target.value))}
                    placeholder="e.g. 35000"
                    className="w-full pl-8 pr-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Additional Perks */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-800">Additional Perks Offered to Drivers</label>
              <div className="flex flex-wrap gap-2">
                {[
                  'Overtime Pay', 'Travel Allowance (TA)', 'Petrol Allowance',
                  'Food/Meals Provided', 'Accommodation / Room', 'Health Insurance',
                  'Annual / Festival Bonus', 'PF / ESIC Benefits', 'Mobile Recharge', 'Weekly Payout'
                ].map(perk => (
                  <button
                    key={perk}
                    type="button"
                    onClick={() => togglePerk(perk)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      selectedPerks.includes(perk)
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-500 font-bold'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {selectedPerks.includes(perk) ? '✓ ' : '+ '} {perk}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                if (!hiringForCompany || !title || !salaryMin || !salaryMax) {
                  alert('Please fill company name, job title, and salary range before proceeding.');
                  return;
                }
                setStep(2);
              }}
              className="px-8 py-3 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
            >
              Continue to Step 2 →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: DRIVER SPECS, VEHICLE & EXPERIENCE */}
      {step === 2 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-subtle space-y-5">
          <h2 className="text-base font-extrabold text-slate-900">Step 2: Driver & Vehicle Requirements</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Experience Required *</label>
              <select
                value={experienceRequired}
                onChange={e => {
                  setExperienceRequired(e.target.value);
                  setExperienceMinYears(e.target.value.includes('5+') ? 5 : (e.target.value.includes('3') ? 3 : 1));
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none cursor-pointer"
              >
                <option value="">Select Minimum Driving Experience</option>
                <option value="Fresher / 0-1 Year">Fresher / 0-1 Year</option>
                <option value="1-2 Years">1-2 Years</option>
                <option value="2-4 Years">2-4 Years</option>
                <option value="3-5 Years">3-5 Years</option>
                <option value="5+ Years">5+ Years</option>
                <option value="8+ Years (Heavy Multi-Axle)">8+ Years (Heavy Multi-Axle)</option>
              </select>
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Vehicle Type / Fleet Model *</label>
              <div className="relative">
                <input
                  type="text"
                  list="vehicle-suggestions-list"
                  value={vehicleType}
                  onFocus={() => setShowVehicleSuggestions(true)}
                  onChange={e => {
                    setVehicleType(e.target.value);
                    setShowVehicleSuggestions(true);
                  }}
                  placeholder="e.g. BharatBenz 16-Wheel, Innova Crysta, Tata Ace EV..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
                <Truck className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <datalist id="vehicle-suggestions-list">
                {VEHICLE_SUGGESTIONS.map(v => (
                  <option key={v} value={v} />
                ))}
              </datalist>

              {/* Floating Autocomplete Dropdown for Vehicle Type */}
              {showVehicleSuggestions && vehicleSuggestionsList.length > 0 && (
                <div
                  ref={vehicleSuggestionsRef}
                  className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 max-h-56 overflow-y-auto animate-in fade-in"
                >
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span>Popular Vehicle & Fleet Models</span>
                    <button 
                      type="button" 
                      onClick={() => setShowVehicleSuggestions(false)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  </div>
                  {vehicleSuggestionsList.map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setVehicleType(v);
                        setShowVehicleSuggestions(false);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 flex items-center justify-between group transition-colors cursor-pointer border-b border-slate-50 last:border-0"
                    >
                      <span className="flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                        <span className="truncate">{v}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 group-hover:text-emerald-700 shrink-0">Select ↵</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Required Skills (Comma separated)</label>
            <div className="relative">
              <input
                type="text"
                list="skills-suggestions-list"
                value={skillsText}
                onFocus={() => setShowSkillsSuggestions(true)}
                onChange={e => {
                  setSkillsText(e.target.value);
                  setShowSkillsSuggestions(true);
                }}
                placeholder="e.g. Interstate Highway Freight, Night Driving, FASTag, Pre-Trip Inspection"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
            <datalist id="skills-suggestions-list">
              {SKILLS_SUGGESTIONS.map(s => (
                <option key={s} value={s} />
              ))}
            </datalist>

            {/* Floating Autocomplete Dropdown for Skills */}
            {showSkillsSuggestions && skillsSuggestionsList.length > 0 && (
              <div
                ref={skillsSuggestionsRef}
                className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 max-h-56 overflow-y-auto animate-in fade-in"
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <span>Suggested Driver Skill Sets</span>
                  <button 
                    type="button" 
                    onClick={() => setShowSkillsSuggestions(false)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    ✕
                  </button>
                </div>
                {skillsSuggestionsList.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSkillsText(skillsText ? `${skillsText}, ${s}` : s);
                      setShowSkillsSuggestions(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 flex items-center justify-between group transition-colors cursor-pointer border-b border-slate-50 last:border-0"
                  >
                    <span className="truncate">{s}</span>
                    <span className="text-[10px] text-slate-400 group-hover:text-emerald-700 shrink-0">+ Add</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">Mandatory Verification Documents</label>
            <div className="flex flex-wrap gap-2">
              {[
                'Commercial Driving License', 'Aadhaar Card', 'PAN Card',
                'Police Verification Certificate', 'RTO Badge Certificate',
                'Medical Fitness Certificate', 'Previous Employer Experience Letter'
              ].map(doc => (
                <button
                  key={doc}
                  type="button"
                  onClick={() => {
                    if (docsSelected.includes(doc)) {
                      setDocsSelected(docsSelected.filter(d => d !== doc));
                    } else {
                      setDocsSelected([...docsSelected, doc]);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    docsSelected.includes(doc)
                      ? 'bg-blue-50 text-blue-800 border-blue-500 font-bold'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {docsSelected.includes(doc) ? '✓ ' : '+ '} {doc}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-6 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (!experienceRequired || !vehicleType) {
                  alert('Please provide experience required and vehicle type.');
                  return;
                }
                setStep(3);
              }}
              className="px-10 py-2.5 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Continue to Step 3 →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DESCRIPTION & INTERACTIVE MULTI-SELECT SCREENING QUESTIONS (Pic 2 & 3 fix) */}
      {step === 3 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-subtle space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Step 3: Job Description & Candidate Screening Questions</h2>
              <p className="text-xs text-slate-500">Configure questions to filter verified applicants automatically</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Detailed Job Responsibilities & Route Info *</label>
            <textarea
              rows={5}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe daily route, driving hours, rest breaks, cargo type, and expectations..."
              className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs leading-relaxed text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          {/* Screening Questions Multi-Select Manager */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-extrabold text-slate-900">
                  Screening Questions for Drivers ({selectedQuestions.length} Selected)
                </label>
                <p className="text-[11px] text-slate-500">
                  Select questions applicants must answer when applying for this position
                </p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[11px] font-bold">
                {selectedQuestions.length} Questions Active
              </span>
            </div>

            {/* Predefined Standard Questions with Checkboxes */}
            <div className="space-y-2">
              {PREDEFINED_SCREENING_QUESTIONS.map((q) => {
                const isChecked = selectedQuestions.includes(q);
                return (
                  <label
                    key={q}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-emerald-50/60 border-emerald-400 text-slate-900 font-semibold shadow-2xs'
                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleQuestion(q)}
                      className="w-4 h-4 accent-emerald-700 rounded cursor-pointer shrink-0"
                    />
                    <span className="text-xs flex-1">{q}</span>
                    {isChecked && (
                      <span className="text-[10px] uppercase font-bold text-emerald-700 shrink-0">
                        Included
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Custom Questions List */}
            {selectedQuestions.filter(q => !PREDEFINED_SCREENING_QUESTIONS.includes(q)).length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-800 block">Custom Questions Added:</span>
                {selectedQuestions.filter(q => !PREDEFINED_SCREENING_QUESTIONS.includes(q)).map((q) => (
                  <div
                    key={q}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-purple-50/50 border-purple-200 text-slate-900"
                  >
                    <div className="flex items-center gap-2.5">
                      <HelpCircle className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="text-xs font-medium">{q}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(q)}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      title="Remove question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Custom Question Input */}
            <form onSubmit={handleAddCustomQuestion} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customQuestionInput}
                onChange={e => setCustomQuestionInput(e.target.value)}
                placeholder="Type your own custom question (e.g. Do you know Kannada / Hindi?)..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddCustomQuestion()}
                disabled={!customQuestionInput.trim()}
                className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>
            </form>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (!description.trim()) {
                  alert('Please enter a brief job description.');
                  return;
                }
                setStep(4);
              }}
              className="px-10 py-2.5 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Preview Job →
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: LIVE PREVIEW & 3-WAY PUBLISHING FLOW (Pic 4 & 5 fix) */}
      {step === 4 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-subtle space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Step 4 of 4 • Ready to Publish</span>
              <h2 className="text-lg font-extrabold text-[#08233F]">Preview Your Driver Job Listing</h2>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
              {category} • {vacancies} Openings
            </span>
          </div>

          {/* Job Card Preview */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {title || `Senior ${category} Vacancy`}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  <strong>{hiringForCompany}</strong> • 📍 {location}, {city}, {state} • 💰 ₹{salaryMin.toLocaleString('en-IN')} – ₹{salaryMax.toLocaleString('en-IN')}/month ({payType})
                </p>
              </div>
              <span className="px-2.5 py-1 bg-blue-100 text-blue-900 rounded-lg text-xs font-bold shrink-0">
                {jobTypePill}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedPerks.map(p => (
                <span key={p} className="px-2.5 py-0.5 bg-white border border-slate-200 rounded-full text-[11px] font-semibold text-slate-700">
                  ✓ {p}
                </span>
              ))}
            </div>

            <p className="text-xs text-slate-700 leading-relaxed pt-2 border-t border-slate-200/80">
              {description}
            </p>

            {selectedQuestions.length > 0 && (
              <div className="pt-2 border-t border-slate-200/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-600 block">Screening Questions ({selectedQuestions.length}):</span>
                <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5">
                  {selectedQuestions.map(q => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 3-Action Publishing Bar: Draft vs Admin Review vs Instant Live */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                ← Edit Details
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* 1. Save as Organization Draft (0 Credits) */}
                <button
                  type="button"
                  disabled={submittingJob}
                  onClick={() => handlePublishJob('draft')}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs border border-slate-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Save draft for your company hiring team to review before making live"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  <span>Save as Org Draft</span>
                </button>

                {/* 2. Submit for Admin Review */}
                <button
                  type="button"
                  disabled={submittingJob}
                  onClick={() => handlePublishJob('pending')}
                  className="px-4 py-2.5 border border-blue-300 bg-blue-50/80 hover:bg-blue-100 text-blue-900 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Clock className="w-3.5 h-3.5 text-blue-700" />
                  <span>Submit for Review</span>
                </button>

                {/* 3. Publish Instant Live */}
                <button
                  type="button"
                  disabled={submittingJob}
                  onClick={() => handlePublishJob('active')}
                  className="px-6 py-2.5 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Publish Instant Live (1 Credit)</span>
                </button>
              </div>
            </div>

            {entitlementError && (
              <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-center">
                {entitlementError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* JOB TEMPLATES MODAL */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-[11px] font-extrabold">
                  Save 50% more time
                </span>
                <h3 className="text-lg font-extrabold text-[#08233F] mt-1">Select a Driver Job Template</h3>
                <p className="text-xs text-slate-500">Pre-configured industry-standard templates for hiring verified drivers</p>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {DRIVER_TEMPLATES.map(tpl => (
                <div
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl)}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all cursor-pointer flex items-center justify-between gap-4 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-800">
                        {tpl.name}
                      </span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-[10px] font-bold">
                        {tpl.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {tpl.category} • {tpl.vehicleType} • ₹{tpl.salaryMin.toLocaleString('en-IN')} - ₹{tpl.salaryMax.toLocaleString('en-IN')}/mo
                    </p>
                  </div>
                  <button className="px-3.5 py-1.5 bg-[#08233F] group-hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shrink-0">
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
