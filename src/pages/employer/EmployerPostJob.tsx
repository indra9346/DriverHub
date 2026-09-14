import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Briefcase, PlusCircle, CheckCircle2, Clock, AlertCircle, 
  MapPin, IndianRupee, ShieldCheck, ArrowRight, Sparkles 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { DriverCategory, Job } from '../../types';

export const EmployerPostJob: React.FC = () => {
  const currentUser = DataStore.getCurrentUser();
  const employer = currentUser ? DataStore.getEmployerById(currentUser.id) : null;
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DriverCategory>('HMV');
  const [experienceRequired, setExperienceRequired] = useState('2-5 Years');
  const [experienceMinYears, setExperienceMinYears] = useState(2);
  const [location, setLocation] = useState(employer?.location || 'Bengaluru');
  const [city, setCity] = useState(employer?.city || 'Bengaluru');
  const [state, setState] = useState(employer?.state || 'Karnataka');
  const [salaryMin, setSalaryMin] = useState<number>(22000);
  const [salaryMax, setSalaryMax] = useState<number>(30000);
  const [workingHours, setWorkingHours] = useState('Full-time, Day Shift (8:00 AM - 6:00 PM)');
  const [employmentType, setEmploymentType] = useState<'Full-time' | 'Part-time' | 'Contract' | 'Temporary'>('Full-time');
  const [vacancies, setVacancies] = useState<number>(3);
  const [description, setDescription] = useState('');
  const [skillsText, setSkillsText] = useState('Clean License, GPS Navigation, Safe Driving');
  const [docsSelected, setDocsSelected] = useState<string[]>([
    'Commercial Driving License',
    'Aadhar Card',
    'Address Proof'
  ]);

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const availableDocs = [
    'Commercial Driving License',
    'Heavy Motor Vehicle (HMV) Badge',
    'Aadhar Card',
    'PAN Card',
    'Police Clearance Certificate',
    'Medical Fitness Certificate',
    'Previous Employer Reference'
  ];

  const handleDocToggle = (doc: string) => {
    if (docsSelected.includes(doc)) {
      setDocsSelected(docsSelected.filter(d => d !== doc));
    } else {
      setDocsSelected([...docsSelected, doc]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);

    setTimeout(() => {
      const newJob: Job = {
        id: 'job-' + Date.now(),
        employerId: currentUser.id,
        companyName: employer?.companyName || 'Verified Enterprise Logistics',
        companyLogo: employer?.logoUrl,
        title,
        category,
        location: `${location}, ${city}`,
        city,
        state,
        experienceRequired,
        experienceMinYears,
        salaryMin,
        salaryMax,
        salaryType: 'monthly',
        workingHours,
        employmentType,
        description,
        requiredSkills: skillsText.split(',').map(s => s.trim()).filter(Boolean),
        requiredDocs: docsSelected,
        vacancies,
        status: 'pending', // Starts in pending for admin approval
        postedDate: new Date().toISOString().slice(0, 10),
        applicationsCount: 0
      };

      DataStore.addJob(newJob);
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy font-display">Post a Driver Vacancy</h1>
        <p className="text-xs text-slate-500 mt-1">
          Create a vacancy for commercial or personal drivers. All postings undergo admin verification before going live.
        </p>
      </div>

      {submitted ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200 text-center shadow-card space-y-5">
          <div className="w-16 h-16 bg-amber-100 text-brand-amber rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
            ⏳
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-brand-navy font-display">Job Submitted for Admin Approval</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Your job vacancy <span className="font-bold text-brand-navy">"{title}"</span> has been submitted. Our moderation team will verify the fleet details shortly. Once approved, certified drivers will be notified automatically.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-3">
            <Link
              to="/employer/jobs"
              className="px-5 py-2.5 bg-brand-navy hover:bg-brand-navy-light text-white font-bold rounded-xl text-xs transition-all"
            >
              Manage My Jobs
            </Link>
            <button
              onClick={() => {
                setSubmitted(false);
                setTitle('');
                setDescription('');
              }}
              className="px-5 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-50 cursor-pointer"
            >
              Post Another Vacancy
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job Overview */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-card space-y-5">
            <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-brand-blue" /> Vacancy Overview
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Job Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Heavy Truck Driver (Multi-Axle Interstate)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Driver Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DriverCategory)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
                >
                  <option value="HMV">Heavy Motor Vehicle (HMV)</option>
                  <option value="LMV">Light Motor Vehicle (LMV)</option>
                  <option value="Cab Driver">Cab / Taxi Driver</option>
                  <option value="Delivery Driver">Hyperlocal Delivery Pilot</option>
                  <option value="Bus Driver">School & Passenger Bus</option>
                  <option value="Trailer Driver">40ft Trailer Truck</option>
                  <option value="Tempo Driver">Tempo / Light Commercial</option>
                  <option value="Personal Driver">Private Family Chauffeur</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Employment Type</label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract / Trip-based</option>
                  <option value="Temporary">Temporary</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Total Vacancies</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={vacancies}
                  onChange={(e) => setVacancies(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-amber focus:bg-white focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bengaluru"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Area / Depot Location</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Electronic City Phase 1"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Experience Required</label>
                <input
                  type="text"
                  required
                  value={experienceRequired}
                  onChange={(e) => setExperienceRequired(e.target.value)}
                  placeholder="e.g. 3-5 Years"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Salary & Shifts */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-5">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-600" /> Compensation & Shift Timings
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Min Salary (₹ / Month)</label>
                <input
                  type="number"
                  step="1000"
                  required
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Max Salary (₹ / Month)</label>
                <input
                  type="number"
                  step="1000"
                  required
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Working Hours / Shift</label>
                <input
                  type="text"
                  required
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  placeholder="e.g. Day Shift, 6 days/week"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Job Description & Responsibilities</label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail key routes, vehicle models, daily trip schedule, inspection rules, and perks..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Key Skills Needed (comma-separated)</label>
              <input
                type="text"
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                placeholder="e.g. Highway Navigation, Night Driving, Vehicle Maintenance"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            {/* Mandatory Verification Docs */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Required Candidate Documents</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableDocs.map((doc) => {
                  const isChecked = docsSelected.includes(doc);
                  return (
                    <label
                      key={doc}
                      onClick={() => handleDocToggle(doc)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 accent-amber-500 rounded"
                      />
                      <span>{doc}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-2xl text-xs shadow-md transition-all hover:scale-105"
            >
              <PlusCircle className="w-4 h-4" />
              {loading ? 'Submitting to Moderation...' : 'Submit Vacancy for Admin Approval'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
