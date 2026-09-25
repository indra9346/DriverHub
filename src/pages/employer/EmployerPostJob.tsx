import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  Briefcase, Plus, CheckCircle2, ArrowLeft, MapPin, IndianRupee, 
  ShieldCheck, Sparkles, FileText, Info, Check, X, Truck, Wallet
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { DriverCategory, Job } from '../../types';

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
    salaryMax: 28000,
    experienceRequired: '3-5 Years',
    experienceMinYears: 3,
    vehicleType: 'Toyota Innova Hycross / Mercedes-Benz / Automatic SUV',
    perks: ['Overtime Pay', 'Food/Meals', 'PF', 'Weekly Off', 'Mobile Allowance'],
    skills: 'Automatic Luxury Cars, VIP Protocol, City Navigation, Defensive Driving, Punctual',
    description: 'Looking for a well-groomed, polite, and verified Personal Chauffeur experienced with automatic luxury sedans and SUVs for daily office commute, airport transfers, and family travel.'
  },
  {
    id: 'tpl-trailer',
    name: '40ft Container Trailer Operator',
    badge: 'Long Haul',
    title: '40ft Container & Flatbed Trailer Driver (Port & Highway)',
    category: 'Trailer Driver',
    employmentType: 'Full-time',
    nightShift: true,
    workLocationType: 'Interstate / Field Route',
    payType: 'Fixed + Incentive',
    salaryMin: 34000,
    salaryMax: 45000,
    experienceRequired: '5+ Years',
    experienceMinYears: 5,
    vehicleType: '40ft Container Trailer / Volvo FM / Prima',
    perks: ['Joining Bonus', 'Overtime Pay', 'Food/Meals', 'Accommodation', 'Health Insurance', 'PF'],
    skills: '40ft Container Trailer, Ghat Road Driving, Air Brake System, Port Documentation, Night Shift',
    description: 'Immediate hiring for 40ft Container Trailer Drivers for Bengaluru–Chennai–Mumbai–Mangaluru port corridors. High trip incentives plus free hub dormitory and meals.'
  },
  {
    id: 'tpl-bus',
    name: 'School & Corporate Staff Bus Driver (PSV)',
    badge: 'Day Shift',
    title: 'School & Staff Transit Bus Driver (PSV Badge)',
    category: 'Bus Driver',
    employmentType: 'Full-time',
    nightShift: false,
    workLocationType: 'Work From Depot / Office',
    payType: 'Fixed Only',
    salaryMin: 21000,
    salaryMax: 27000,
    experienceRequired: '3-5 Years',
    experienceMinYears: 4,
    vehicleType: '50-Seater Staff / School Bus & Force Traveller',
    perks: ['PF', 'ESI (ESIC)', '5 Working Days', 'Health Insurance', 'Annual Bonus'],
    skills: 'PSV Badge, Passenger Safety, Fixed Route Punctuality, First Aid Certified',
    description: 'Hiring PSV-badged Bus Drivers for morning and evening pickup/drop routes. Police verification and clean driving record mandatory.'
  },
  {
    id: 'tpl-delivery',
    name: 'E-Commerce / LCV Tempo Delivery Driver',
    badge: 'Fast Hiring',
    title: 'LCV Tempo & EV Delivery Van Driver (Tata Ace / Bolero)',
    category: 'Tempo Driver',
    employmentType: 'Full-time',
    nightShift: false,
    workLocationType: 'Interstate / Field Route',
    payType: 'Fixed + Incentive',
    salaryMin: 19000,
    salaryMax: 25000,
    experienceRequired: '1-3 Years',
    experienceMinYears: 1,
    vehicleType: 'Tata Ace Gold / Mahindra Bolero Pik-Up / EV Van',
    perks: ['Weekly Payout', 'Overtime Pay', 'Petrol Allowance', 'Mobile Allowance', 'ESI (ESIC)'],
    skills: 'City Route Delivery, Hub Loading, GPS App Usage, Customer Handover',
    description: 'Hiring LMV-Goods & Tempo Drivers for daily warehouse-to-hub and hyperlocal retail deliveries across Bengaluru.'
  }
];

const ALL_PERKS = [
  'Flexible Working Hours',
  'Weekly Payout',
  'Overtime Pay',
  'Joining Bonus',
  'Annual Bonus',
  'PF',
  'Travel Allowance (TA)',
  'Petrol Allowance',
  'Mobile Allowance',
  'Internet Allowance',
  'Health Insurance',
  'ESI (ESIC)',
  'Food/Meals',
  'Accommodation',
  '5 Working Days',
  'One-Way Cab',
  'Two-Way Cab'
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

  // Form State (Matches ApnaHire Screenshot 6 `employer.apna.co/post-job#basic`)
  const [hiringForCompany, setHiringForCompany] = useState(employer?.companyName || '');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DriverCategory>('HMV');
  const [jobTypePill, setJobTypePill] = useState<'Full Time' | 'Part Time' | 'Both (Full-Time And Part-Time)'>('Full Time');
  const [nightShift, setNightShift] = useState(false);

  // Location
  const [workLocationType, setWorkLocationType] = useState<'Work From Depot / Office' | 'Client / Household Site' | 'Interstate / Field Route'>('Work From Depot / Office');
  const [city, setCity] = useState(employer?.city || '');
  const [location, setLocation] = useState(employer?.location || '');
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
  const [workingHours, setWorkingHours] = useState('Full-time, Regular Roster');
  const [skillsText, setSkillsText] = useState('');
  const [description, setDescription] = useState('');
  const [docsSelected, setDocsSelected] = useState<string[]>([
    'Commercial Driving License',
    'Aadhaar Card',
    'Police Verification'
  ]);
  const [screeningQuestions, setScreeningQuestions] = useState<string[]>([
    'How many years of verified driving experience do you have?',
    'Do you hold a valid Commercial / Transport Driving License?',
    'Are you comfortable with outstation or night shifts if required?'
  ]);

  const [submitted, setSubmitted] = useState(false);
  const [publishedLive, setPublishedLive] = useState(false);
  const [entitlementError, setEntitlementError] = useState('');
  const [submittingJob, setSubmittingJob] = useState(false);

  useEffect(() => {
    if (searchParams.get('template') === 'open') {
      setShowTemplateModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!employerId) return;
    if (!employer?.companyName) {
      navigate('/employer/company', { replace: true });
      return;
    }
    const sub = DataStore.getSubscription(employerId);
    const expiry = new Date(sub.expiresAt).getTime();
    const occupied = DataStore.getJobs().filter(job => job.employerId === employerId && (job.status === 'active' || job.status === 'pending')).length;
    if (sub.status !== 'active' || !Number.isFinite(expiry) || expiry <= Date.now() || (sub.jobCredits <= 0 && (sub.activeJobSlots || 0) <= occupied)) {
      navigate('/employer/plans', { replace: true });
    }
  }, [employerId, employer?.companyName, navigate]);

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

  const handlePublishJob = async (useInstantCredit: boolean) => {
    setEntitlementError('');
    if (!hiringForCompany.trim() || !title.trim() || !description.trim() || !city.trim() || !location.trim() || !experienceRequired.trim() || !vehicleType.trim() || salaryMin <= 0 || salaryMax < salaryMin || vacancies <= 0) {
      setEntitlementError('Complete the job title, description, location and valid salary/opening details before publishing.');
      return;
    }
    const entitlement = DataStore.consumeJobCredit(employerId);
    if (!entitlement.success) {
      setEntitlementError(entitlement.message);
      navigate('/employer/plans');
      return;
    }
    const canPublishInstant = useInstantCredit && employer?.verified === true;
    const finalStatus = canPublishInstant ? 'active' : 'pending';

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
      state: employer?.state || '',
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
      screeningQuestions,
      workingHours: `${jobTypePill}${nightShift ? ' • Night Shift' : ' • Day Shift'}`,
      employmentType: jobTypePill === 'Part Time' ? 'Part-time' : 'Full-time',
      description,
      requiredSkills: skillsText.split(',').map(s => s.trim()).filter(Boolean),
      requiredDocs: docsSelected,
      vacancies,
      status: finalStatus,
      postedDate: new Date().toISOString().slice(0, 10),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      creditConsumed: entitlement.creditUsed === true,
      slotConsumed: entitlement.slotUsed === true,
      applicationsCount: 0
    };

    setSubmittingJob(true);
    const saved = await DataStore.addJob(newJob);
    setSubmittingJob(false);
    if (!saved) {
      if (entitlement.creditUsed) DataStore.refundJobCredit(employerId);
      setEntitlementError('The job could not be saved. No job credit was used. Check your connection or contact support.');
      return;
    }
    setPublishedLive(canPublishInstant);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center shadow-card space-y-5 my-8">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-[#08233F] font-display">
            {publishedLive ? 'Driver job is live' : 'Driver job submitted for admin review'}
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            {publishedLive
              ? `Your driver vacancy "${title}" is live in ${city}. One job credit or subscription slot was used.`
              : `Your driver vacancy "${title}" is waiting for admin review. The required hiring entitlement has been reserved.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
          <Link
            to="/employer/jobs"
            className="px-5 py-2.5 bg-[#08233F] hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all"
          >
            Go to All Jobs
          </Link>
          <Link
            to={`/employer/candidates?category=${encodeURIComponent(category)}&city=${encodeURIComponent(city)}`}
            className="px-5 py-2.5 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-xl text-xs transition-all"
          >
            View Matching Drivers in Database →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Bar matching ApnaHire Screenshot 6 (`← Post job` ... `Use Templates`) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/employer/jobs')}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-[#08233F] font-display">Post a new job</h1>
            <p className="text-xs text-slate-500">
              DriverHub driver job posting • Available job credits: <strong className="text-emerald-700">{subscription.jobCredits}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowTemplateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <FileText className="w-4 h-4 text-purple-700" />
          <span>Use Templates</span>
          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-extrabold">
            Fast
          </span>
        </button>
      </div>

      {/* Horizontal 4-Step Progress Bar (Matches Screenshot 6: 1 Job details — 2 — 3 — 4) */}
      <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-subtle">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: 'Job details & Pay' },
            { num: 2, label: 'Driver & Vehicle Specs' },
            { num: 3, label: 'Description & Screening' },
            { num: 4, label: 'Preview & Publish' }
          ].map((s, idx) => {
            const isCurrent = step === s.num;
            const isDone = step > s.num;
            return (
              <React.Fragment key={s.num}>
                <button
                  type="button"
                  onClick={() => setStep(s.num)}
                  className="flex items-center gap-2.5 text-left cursor-pointer group"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold transition-all ${
                      isCurrent
                        ? 'bg-[#08233F] text-white ring-4 ring-slate-200'
                        : isDone
                        ? 'bg-emerald-600 text-white'
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

      {/* STEP 1: JOB DETAILS, LOCATION & COMPENSATION (Exact UI of Screenshot 6) */}
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
                <strong className="text-slate-900">{employer?.companyName || 'Add your company profile'}</strong>
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
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
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
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Senior Heavy Truck Driver / Executive Chauffeur"
                  className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
                <span className="inline-flex items-center gap-1.5 text-[11px] text-blue-600 font-medium">
                  <Info className="w-3.5 h-3.5 shrink-0" /> Only similar job title edits are allowed after publishing
                </span>
              </div>
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

          {/* Card 2: Location */}
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">City *</label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Depot / Area Locality *</label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Number of Openings *</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={vacancies}
                  onChange={e => setVacancies(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Compensation & Additional Perks (Exact Match to Screenshot 6) */}
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
                <label className="block text-xs font-bold text-slate-800 mb-1">Minimum Monthly Salary (₹) *</label>
                <input
                  type="number"
                  step={1000}
                  value={salaryMin}
                  onChange={e => setSalaryMin(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Maximum Monthly Salary (₹) *</label>
                <input
                  type="number"
                  step={1000}
                  value={salaryMax}
                  onChange={e => setSalaryMax(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
            </div>

            {/* Selectable Perks Chips (`Do you offer any additional perks?`) */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-800">
                Do you offer any additional perks?
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_PERKS.map(perk => {
                  const active = selectedPerks.includes(perk);
                  return (
                    <button
                      key={perk}
                      type="button"
                      onClick={() => togglePerk(perk)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                        active
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-500 font-bold'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span>{perk}</span>
                      {active ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Joining Fee / Deposit Question */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-800">
                Is there any joining fee or deposit required from the candidate? <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setJoiningFeeRequired(true)}
                  className={`px-5 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${
                    joiningFeeRequired ? 'bg-blue-50 text-blue-800 border-blue-500' : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setJoiningFeeRequired(false)}
                  className={`px-5 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${
                    !joiningFeeRequired ? 'bg-blue-50 text-blue-800 border-blue-500' : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-center">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-12 py-3 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: DRIVER EXPERIENCE, LICENSE & VEHICLE SPECS */}
      {step === 2 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-subtle space-y-5">
          <h2 className="text-base font-extrabold text-slate-900">Step 2: Driver License, Vehicle & Experience Requirements</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Minimum Driving Experience</label>
              <select
                value={experienceRequired}
                onChange={e => {
                  setExperienceRequired(e.target.value);
                  const yrs = parseInt(e.target.value) || 1;
                  setExperienceMinYears(yrs);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs"
              >
                <option value="0-1 Years">Fresher / 0-1 Years</option>
                <option value="1-3 Years">1-3 Years</option>
                <option value="2-5 Years">2-5 Years</option>
                <option value="5+ Years">5+ Years Senior Driver</option>
                <option value="10+ Years">10+ Years Master Operator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Vehicle Type to Operate</label>
              <input
                type="text"
                value={vehicleType}
                onChange={e => setVehicleType(e.target.value)}
                placeholder="e.g. BharatBenz 14-Wheel Truck / Toyota Innova Hycross"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Required Skills (comma-separated)</label>
            <input
              type="text"
              value={skillsText}
              onChange={e => setSkillsText(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">Mandatory Driver Documents</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                'Commercial Driving License',
                'Heavy Motor Vehicle (HMV) Badge',
                'Aadhaar Card',
                'PAN Card',
                'Police Verification',
                'Medical Fitness Certificate'
              ].map(doc => {
                const checked = docsSelected.includes(doc);
                return (
                  <label
                    key={doc}
                    onClick={() =>
                      setDocsSelected(checked ? docsSelected.filter(d => d !== doc) : [...docsSelected, doc])
                    }
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer ${
                      checked ? 'bg-emerald-50 border-emerald-400 font-bold text-slate-900' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <input type="checkbox" checked={checked} onChange={() => {}} className="w-4 h-4 accent-emerald-600" />
                    <span>{doc}</span>
                  </label>
                );
              })}
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
              onClick={() => setStep(3)}
              className="px-10 py-2.5 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DESCRIPTION & SCREENING QUESTIONS */}
      {step === 3 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-subtle space-y-5">
          <h2 className="text-base font-extrabold text-slate-900">Step 3: Job Description & Candidate Screening</h2>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Detailed Job Responsibilities & Route Info</label>
            <textarea
              rows={5}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs leading-relaxed"
            />
          </div>

          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-800">Screening Questions for Drivers</label>
            {screeningQuestions.map((q, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={q}
                  onChange={e => {
                    const next = [...screeningQuestions];
                    next[idx] = e.target.value;
                    setScreeningQuestions(next);
                  }}
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            ))}
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
              onClick={() => setStep(4)}
              className="px-10 py-2.5 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Preview Job →
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: LIVE PREVIEW & PUBLISH */}
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

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-base font-extrabold text-slate-900">
              {title || `Senior ${category} Vacancy`}
            </h3>
            <p className="text-xs text-slate-600">
              <strong>{hiringForCompany}</strong> • 📍 {location}, {city} • 💰 ₹{salaryMin.toLocaleString('en-IN')} – ₹{salaryMax.toLocaleString('en-IN')}/month ({payType})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedPerks.map(p => (
                <span key={p} className="px-2.5 py-0.5 bg-white border border-slate-200 rounded-full text-[11px] font-semibold text-slate-700">
                  ✓ {p}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-700 leading-relaxed pt-2 border-t border-slate-200/80">
              {description}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              ← Edit Details
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={submittingJob}
                onClick={() => handlePublishJob(false)}
                className="px-5 py-3 border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
              >
                Submit for Standard Admin Review
              </button>

              <button
                type="button"
                disabled={submittingJob}
                onClick={() => handlePublishJob(true)}
                className="px-6 py-3 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                <span>Publish Instant Live (Use 1 Job Credit)</span>
              </button>
            </div>
            {entitlementError && <p role="alert" className="text-xs font-semibold text-rose-700">{entitlementError}</p>}
          </div>
        </div>
      )}

      {/* JOB TEMPLATES MODAL (Matches Screenshot 5 & 6 "Use Templates") */}
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
                      Pay: ₹{tpl.salaryMin.toLocaleString('en-IN')} – ₹{tpl.salaryMax.toLocaleString('en-IN')}/mo • Exp: {tpl.experienceRequired} • {tpl.vehicleType}
                    </p>
                  </div>
                  <span className="px-3.5 py-1.5 bg-[#08233F] group-hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0">
                    Use Template →
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
