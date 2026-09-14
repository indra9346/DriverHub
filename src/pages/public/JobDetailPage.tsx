import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  MapPin, IndianRupee, Clock, Briefcase, Building2, ShieldCheck, 
  FileText, CheckCircle2, ArrowLeft, Heart, Share2, Users, AlertCircle, 
  Send, Sparkles, Phone, Mail 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DataStore } from '../../services/store';
import { Job, Application, DriverProfile } from '../../types';
import { JobCard } from '../../components/common/JobCard';
import { StatusBadge } from '../../components/common/StatusBadge';

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [currentUser, setCurrentUser] = useState(DataStore.getCurrentUser());
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [similarJobs, setSimilarJobs] = useState<Job[]>([]);

  // Apply Modal state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [coverMessage, setCoverMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    const found = DataStore.getJobById(id);
    if (found) {
      setJob(found);

      // Check if driver has applied
      if (currentUser && currentUser.role === 'driver') {
        const apps = DataStore.getApplications();
        const existing = apps.some(a => a.jobId === id && a.driverId === currentUser.id);
        setHasApplied(existing);

        const favs = DataStore.getFavorites(currentUser.id);
        setIsSaved(favs.includes(id));

        const profile = DataStore.getDriverById(currentUser.id);
        setDriverProfile(profile || null);
      }

      // Similar jobs
      const all = DataStore.getJobs().filter(j => j.id !== id && j.status === 'active' && (j.category === found.category || j.city === found.city));
      setSimilarJobs(all.slice(0, 3));
    }
  }, [id, currentUser]);

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Job vacancy not found</h2>
        <p className="text-xs text-slate-500">This job may have been closed or removed by the employer.</p>
        <Link to="/jobs" className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A2540] text-white text-xs font-semibold rounded-xl">
          <ArrowLeft className="w-4 h-4" /> Back to Job Search
        </Link>
      </div>
    );
  }

  const handleToggleSave = () => {
    if (!currentUser || currentUser.role !== 'driver') {
      alert('Please log in as a candidate to save jobs.');
      return;
    }
    const saved = DataStore.toggleFavorite(currentUser.id, job.id);
    setIsSaved(saved);
  };

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'driver') {
      navigate('/login?redirect=/jobs/' + job.id);
      return;
    }

    setSubmitting(true);

    setTimeout(() => {
      const newApp: Application = {
        id: 'app-' + Date.now(),
        jobId: job.id,
        jobTitle: job.title,
        companyName: job.companyName,
        driverId: currentUser.id,
        driverName: driverProfile?.fullName || 'Driver Candidate',
        driverPhone: driverProfile?.phone || currentUser.phone || '',
        driverEmail: currentUser.email,
        driverCategory: driverProfile?.driverCategory || job.category,
        driverExperienceYears: driverProfile?.experienceYears || 2,
        driverLocation: driverProfile?.location || 'Bengaluru',
        resumeUrl: driverProfile?.resumeUrl,
        coverMessage: coverMessage.trim(),
        status: 'applied',
        appliedDate: new Date().toISOString().slice(0, 10),
        updatedDate: new Date().toISOString().slice(0, 10),
      };

      DataStore.addApplication(newApp);
      setSubmitting(false);
      setHasApplied(true);
      setApplySuccess(true);

      // Trigger Confetti Celebration
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }, 700);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <Link
        to="/jobs"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#08233F] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Search Results
      </Link>

      {/* Main Job Hero Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-subtle space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-subtle">
              {job.companyLogo ? (
                <img src={job.companyLogo} alt={job.companyName} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/jobs?category=${encodeURIComponent(job.category)}`}
                  className="badge-category text-xs bg-blue-50 text-blue-800 font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  {job.category}
                </Link>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {job.employmentType}
                </span>
                <StatusBadge status={job.status} size="sm" />
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#08233F] font-display">
                {job.title}
              </h1>

              <Link
                to={`/jobs?q=${encodeURIComponent(job.companyName)}`}
                className="text-sm font-semibold text-slate-600 hover:text-blue-700 flex items-center gap-1.5 transition-colors"
              >
                {job.companyName}
                <span title="Verified Fleet Operator">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                </span>
              </Link>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 shrink-0">
            {currentUser?.role === 'driver' && (
              <button
                onClick={handleToggleSave}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSaved
                    ? 'bg-amber-50 border-amber-300 text-amber-600'
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700'
                }`}
                title="Save Job"
              >
                <Heart className={`w-5 h-5 ${isSaved ? 'fill-amber-500' : ''}`} />
              </button>
            )}

            {currentUser?.role === 'employer' ? (
              (currentUser.id === job.employerId || job.companyName.toLowerCase().includes('bharat')) ? (
                <div className="flex items-center gap-2">
                  <Link
                    to="/employer/jobs"
                    className="px-5 py-3 bg-[#08233F] hover:bg-[#051626] text-white font-bold rounded-xl text-xs sm:text-sm shadow-subtle transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Briefcase className="w-4 h-4 text-amber-400" /> Manage Vacancy
                  </Link>
                  <Link
                    to="/employer/applications"
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs sm:text-sm transition-all"
                  >
                    View Pipeline
                  </Link>
                </div>
              ) : (
                <div className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <span>Employer Account (Candidates Only)</span>
                </div>
              )
            ) : currentUser?.role === 'admin' ? (
              <Link
                to="/admin/jobs"
                className="px-5 py-3 bg-[#08233F] hover:bg-[#051626] text-white font-bold rounded-xl text-xs sm:text-sm shadow-subtle transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" /> Review in Admin Queue
              </Link>
            ) : hasApplied ? (
              <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50 text-emerald-900 font-bold rounded-xl border border-emerald-200 text-xs sm:text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Application Submitted</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (!currentUser) {
                    navigate(`/login?redirect=/jobs/${job.id}`);
                  } else {
                    setIsApplyModalOpen(true);
                  }
                }}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-subtle transition-all hover:scale-[1.02] cursor-pointer"
              >
                Apply Now for this Vacancy
              </button>
            )}
          </div>
        </div>

        {/* Highlight Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100 text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-400 font-semibold block">Monthly Compensation</span>
            <span className="text-sm font-bold text-[#08233F] flex items-center gap-1">
              <IndianRupee className="w-4 h-4 text-emerald-600" />
              ₹{job.salaryMin.toLocaleString('en-IN')} - ₹{job.salaryMax.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 font-semibold block">Job Location</span>
            <span className="text-sm font-bold text-[#08233F] flex items-center gap-1 truncate">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              {job.location}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 font-semibold block">Experience Required</span>
            <span className="text-sm font-bold text-[#08233F] flex items-center gap-1">
              <Briefcase className="w-4 h-4 text-slate-400" />
              {job.experienceRequired}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 font-semibold block">Working Shifts</span>
            <span className="text-sm font-bold text-[#08233F] flex items-center gap-1 truncate">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              {job.workingHours}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Job Details */}
        <div className="lg:col-span-2 space-y-6">
          {job.status === 'pending' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-900">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">Pending Admin Approval:</span> This vacancy was submitted by {job.companyName} and is undergoing administrative safety review before public distribution.
              </div>
            </div>
          )}

          {/* Detailed Description */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-subtle space-y-4">
            <h2 className="text-lg font-bold text-[#08233F] font-display">
              Job Description & Duties
            </h2>
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line space-y-2">
              {job.description}
            </div>
          </div>

          {/* Required Driver Skills */}
          {job.requiredSkills && job.requiredSkills.length > 0 && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-subtle space-y-4">
              <h2 className="text-lg font-bold text-[#08233F] font-display">
                Required Skills & Qualifications
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {job.requiredSkills.map((skill, index) => (
                  <div key={index} className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{skill}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Required Documents */}
          {job.requiredDocs && job.requiredDocs.length > 0 && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-subtle space-y-4">
              <h2 className="text-lg font-bold text-[#08233F] font-display">
                Mandatory Verification Documents
              </h2>
              <p className="text-xs text-slate-500">
                Candidates must carry original copies during the final interview / driving test:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {job.requiredDocs.map((doc, index) => (
                  <div key={index} className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs font-semibold text-amber-900">
                    <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{doc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Company & Safety Box */}
        <div className="space-y-6">
          {/* Company Snapshot */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-subtle space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              About the Employer
            </h3>
            <Link
              to={`/jobs?q=${encodeURIComponent(job.companyName)}`}
              className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-50 overflow-hidden border border-slate-200 flex items-center justify-center shrink-0 group-hover:border-amber-400 transition-colors">
                {job.companyLogo ? (
                  <img src={job.companyLogo} alt={job.companyName} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#08233F] group-hover:text-blue-700 transition-colors">{job.companyName}</h4>
                <p className="text-xs text-slate-500">{job.city}, {job.state}</p>
              </div>
            </Link>

            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verified Employer on Driver Hub</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Actively Hiring {job.vacancies} Positions</span>
              </div>
            </div>
          </div>

          {/* Safety & Welfare Notice */}
          <div className="bg-blue-50/70 rounded-2xl p-6 border border-blue-200/80 space-y-3 shadow-subtle">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
              <Sparkles className="w-4 h-4 text-amber-500" /> Driver Safety & Welfare Standard
            </div>
            <p className="text-xs text-blue-900/80 leading-relaxed">
              Driver Hub strictly audits employers to guarantee timely monthly salary deposits, vehicle roadworthiness, and accident insurance coverage.
            </p>
          </div>

          {/* Similar Jobs */}
          {similarJobs.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#08233F]">Similar Driver Openings</h3>
              <div className="space-y-3">
                {similarJobs.map((simJob) => (
                  <Link
                    key={simJob.id}
                    to={`/jobs/${simJob.id}`}
                    className="block p-4 bg-white rounded-2xl border border-slate-200/90 shadow-subtle hover:border-amber-400 hover:shadow-card transition-all space-y-1.5"
                  >
                    <h4 className="text-xs font-bold text-[#08233F] line-clamp-1">{simJob.title}</h4>
                    <p className="text-[11px] text-slate-500">{simJob.companyName} • {simJob.city}</p>
                    <p className="text-xs font-bold text-emerald-700">₹{simJob.salaryMin.toLocaleString('en-IN')} - ₹{simJob.salaryMax.toLocaleString('en-IN')}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Application Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-modal border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-5">
            {!applySuccess ? (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Candidate Application</span>
                    <h3 className="text-lg font-bold text-[#08233F] mt-0.5">{job.title}</h3>
                    <p className="text-xs text-slate-500">{job.companyName}</p>
                  </div>
                  <button onClick={() => setIsApplyModalOpen(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                    ✕
                  </button>
                </div>

                {!currentUser || currentUser.role !== 'driver' ? (
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-3">
                    <p className="font-semibold">You must be logged in as a candidate to apply.</p>
                    <Link
                      to={`/login?redirect=/jobs/${job.id}`}
                      className="inline-block px-4 py-2 bg-[#08233F] text-white rounded-xl font-bold cursor-pointer"
                    >
                      Login / Sign Up as Driver
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleApplySubmit} className="space-y-4">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 text-xs space-y-1">
                      <p className="font-bold text-[#08233F]">Applying as: {driverProfile?.fullName || currentUser.email}</p>
                      <p className="text-slate-600">License: {driverProfile?.licenseType || 'Verified License'}</p>
                      <p className="text-slate-600">Experience: {driverProfile?.experienceYears || 2} Years</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Optional Message to Employer (Cover Note)
                      </label>
                      <textarea
                        rows={3}
                        value={coverMessage}
                        onChange={(e) => setCoverMessage(e.target.value)}
                        placeholder="Mention specific vehicle models you have driven, highway route familiarity, or availability..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none focus:bg-white"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsApplyModalOpen(false)}
                        className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-subtle flex items-center gap-2 cursor-pointer"
                      >
                        {submitting ? 'Submitting Application...' : 'Confirm & Apply'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                  🎉
                </div>
                <h3 className="text-xl font-bold text-[#08233F]">Application Submitted!</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  {job.companyName} has received your profile. You can track your status in your Applications dashboard.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Link
                    to="/driver/applications"
                    onClick={() => setIsApplyModalOpen(false)}
                    className="px-5 py-2.5 bg-[#08233F] text-white font-bold rounded-xl text-xs shadow-subtle"
                  >
                    View My Applications
                  </Link>
                  <button
                    onClick={() => setIsApplyModalOpen(false)}
                    className="px-5 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
