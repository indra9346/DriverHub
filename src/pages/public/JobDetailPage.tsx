import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  MapPin, IndianRupee, Clock, Briefcase, Building2, ShieldCheck, 
  FileText, CheckCircle2, ArrowLeft, ArrowRight, Heart, Users,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DataStore } from '../../services/store';
import { Job, Application, DriverProfile } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useLanguage, formatSalaryDisplay } from '../../services/i18n';

export const JobDetailPage: React.FC = () => {
  const { t, lang } = useLanguage();
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
  const [applyError, setApplyError] = useState('');

  const loadJob = () => {
    if (!id) return;
    const found = DataStore.getJobById(id);
    if (found) {
      setJob(found);

      if (currentUser && currentUser.role === 'driver') {
        const apps = DataStore.getApplications();
        const existing = apps.some(a => a.jobId === id && a.driverId === currentUser.id && a.status !== 'withdrawn');
        setHasApplied(existing);

        const favs = DataStore.getFavorites(currentUser.id);
        setIsSaved(favs.includes(id));

        const profile = DataStore.getDriverById(currentUser.id);
        setDriverProfile(profile || null);
      }

      const all = DataStore.getJobs().filter(j => j.id !== id && j.status === 'active' && (j.category === found.category || j.city === found.city));
      setSimilarJobs(all.slice(0, 3));
    }
  };

  useEffect(() => {
    loadJob();
    window.addEventListener('driverhub_storage_updated', loadJob);
    return () => window.removeEventListener('driverhub_storage_updated', loadJob);
  }, [id, currentUser]);

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">{t('Job vacancy not found')}</h2>
        <p className="text-xs text-slate-500">{t('This job may have been closed or removed by the employer.')}</p>
        <Link to="/jobs" className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A2540] text-white text-xs font-semibold rounded-xl">
          <ArrowLeft className="w-4 h-4" /> {t('Back to Job Search')}
        </Link>
      </div>
    );
  }

  const handleToggleSave = async () => {
    if (!currentUser || currentUser.role !== 'driver') {
      alert(t('Please log in as a driver to save jobs.'));
      return;
    }
    const saved = await DataStore.toggleFavorite(currentUser.id, job.id);
    if (saved === isSaved) {
      window.alert(t('Could not update saved jobs. Check your connection and try again.'));
      return;
    }
    setIsSaved(saved);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'driver') {
      navigate('/login?redirect=/jobs/' + job.id);
      return;
    }
    if (job.status !== 'active' || (job.applicationDeadline && new Date(job.applicationDeadline).getTime() < Date.now())) {
      setApplyError(lang === 'kn' ? 'ಈ ಉದ್ಯೋಗಕ್ಕೆ ಅರ್ಜಿ ಸ್ವೀಕರಿಸಲಾಗುತ್ತಿಲ್ಲ.' : 'This driver job is no longer accepting applications.');
      return;
    }
    if (hasApplied) {
      setApplyError(lang === 'kn' ? 'ನೀವು ಈಗಾಗಲೇ ಈ ಕೆಲಸಕ್ಕೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಿದ್ದೀರಿ.' : 'You have already applied for this job.');
      return;
    }

    setSubmitting(true);

    const newApp: Application = {
      id: crypto.randomUUID(),
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

    const created = await DataStore.addApplication(newApp);
    setSubmitting(false);
    if (!created) {
      setApplyError(lang === 'kn' ? 'ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಪುನಃ ಪ್ರಯತ್ನಿಸಿ.' : 'We could not submit this application. The job may have closed, you may already have applied, or the service is temporarily unavailable.');
      return;
    }
    setHasApplied(true);
    setApplySuccess(true);

    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <Link
        to="/jobs"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#08233F] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> {t('Back to Search Results')}
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
                  {t(job.category)}
                </Link>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {t(job.employmentType)}
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
                <span title={t('Verified Employer')}>
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
                title={isSaved ? t('Saved Jobs') : t('Save')}
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
                    <Briefcase className="w-4 h-4 text-amber-400" /> {t('Manage Vacancy')}
                  </Link>
                  <Link
                    to="/employer/applications"
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
                  >
                    {t('View Pipeline')}
                  </Link>
                </div>
              ) : (
                <div className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <span>{lang === 'kn' ? 'ಉದ್ಯೋಗದಾತರ ಖಾತೆ (ಅಭ್ಯರ್ಥಿಗಳಿಗೆ ಮಾತ್ರ)' : 'Employer Account (Candidates Only)'}</span>
                </div>
              )
            ) : currentUser?.role === 'admin' ? (
              <Link
                to="/admin/jobs"
                className="px-5 py-3 bg-[#08233F] hover:bg-[#051626] text-white font-bold rounded-xl text-xs sm:text-sm shadow-subtle transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" /> {t('Job Moderation Queue')}
              </Link>
            ) : hasApplied ? (
              <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50 text-emerald-900 font-bold rounded-xl border border-emerald-200 text-xs sm:text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{t('Application Submitted')}</span>
              </div>
            ) : !currentUser ? (
              <button
                onClick={() => navigate(`/login?role=driver&redirect=${encodeURIComponent(`/jobs/${job.id}`)}`)}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-subtle transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-1.5"
              >
                <span>{t('Sign In')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsApplyModalOpen(true)}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-subtle transition-all hover:scale-[1.02] cursor-pointer"
              >
                {t('Apply Now')}
              </button>
            )}
          </div>
        </div>

        {/* Highlight Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100 text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-400 font-semibold block">{lang === 'kn' ? 'ಮಾಸಿಕ ವೇತನ' : 'Monthly Compensation'}</span>
            <span className="text-sm font-bold text-[#08233F] flex items-center gap-1">
              <IndianRupee className="w-4 h-4 text-emerald-600" />
              {formatSalaryDisplay(job.salaryMin, job.salaryMax, lang)}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 font-semibold block">{lang === 'kn' ? 'ಕೆಲಸದ ಸ್ಥಳ' : 'Job Location'}</span>
            <span className="text-sm font-bold text-[#08233F] flex items-center gap-1 truncate">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              {job.location}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 font-semibold block">{lang === 'kn' ? 'ಅಗತ್ಯವಿರುವ ಅನುಭವ' : 'Experience Required'}</span>
            <span className="text-sm font-bold text-[#08233F] flex items-center gap-1">
              <Briefcase className="w-4 h-4 text-slate-400" />
              {job.experienceRequired}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 font-semibold block">{lang === 'kn' ? 'ಕೆಲಸದ ಪಾಳಿ' : 'Working Shifts'}</span>
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
          {/* Detailed Description */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-subtle space-y-4">
            <h2 className="text-lg font-bold text-[#08233F] font-display">
              {lang === 'kn' ? 'ಉದ್ಯೋಗದ ವಿವರಣೆ ಮತ್ತು ಜವಾಬ್ದಾರಿಗಳು' : 'Job Description & Duties'}
            </h2>
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line space-y-2">
              {job.description}
            </div>
          </div>

          {/* Required Driver Skills */}
          {job.requiredSkills && job.requiredSkills.length > 0 && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-subtle space-y-4">
              <h2 className="text-lg font-bold text-[#08233F] font-display">
                {lang === 'kn' ? 'ಅಗತ್ಯ ಕೌಶಲ್ಯಗಳು ಮತ್ತು ಅರ್ಹತೆಗಳು' : 'Required Skills & Qualifications'}
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
                {lang === 'kn' ? 'ಕಡ್ಡಾಯ ಪರಿಶೀಲನಾ ದಾಖಲೆಗಳು' : 'Mandatory Verification Documents'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'kn' ? 'ಅಭ್ಯರ್ಥಿಗಳು ಸಂದರ್ಶನ / ಟ್ರಯಲ್ ಸಮಯದಲ್ಲಿ ಮೂಲ ಪ್ರತಿಗಳನ್ನು ಹೊಂದಿರಬೇಕು:' : 'Candidates must carry original copies during the final interview / driving test:'}
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
              {lang === 'kn' ? 'ಉದ್ಯೋಗದಾತರ ವಿವರ' : 'About the Employer'}
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
                <span>{t('Verified Employer')}</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <Users className="w-4 h-4 text-blue-600" />
                <span>{t('{count} Vacancies', { count: job.vacancies })}</span>
              </div>
            </div>
          </div>

          {/* Safety & Welfare Notice */}
          <div className="bg-blue-50/70 rounded-2xl p-6 border border-blue-200/80 space-y-3 shadow-subtle">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
              <Sparkles className="w-4 h-4 text-amber-500" /> {lang === 'kn' ? 'ಚಾಲಕರ ಸುರಕ್ಷತೆ & ಕಲ್ಯಾಣ ಮಾನದಂಡ' : 'Driver Safety & Welfare Standard'}
            </div>
            <p className="text-xs text-blue-900/80 leading-relaxed">
              {lang === 'kn'
                ? 'ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ಮಾಸಿಕ ವೇತನ ಜಮೆ ಮತ್ತು ಅಪಘಾತ ವಿಮೆ ರಕ್ಷಣೆಯನ್ನು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಲು DriverHub ಉದ್ಯೋಗದಾತರನ್ನು ಆಡಿಟ್ ಮಾಡುತ್ತದೆ.'
                : 'Driver Hub strictly audits employers to guarantee timely monthly salary deposits, vehicle roadworthiness, and accident insurance coverage.'}
            </p>
          </div>

          {/* Similar Jobs */}
          {similarJobs.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#08233F]">{lang === 'kn' ? 'ಇದೇ ರೀತಿಯ ಉದ್ಯೋಗಾವಕಾಶಗಳು' : 'Similar Driver Openings'}</h3>
              <div className="space-y-3">
                {similarJobs.map((simJob) => (
                  <Link
                    key={simJob.id}
                    to={`/jobs/${simJob.id}`}
                    className="block p-4 bg-white rounded-2xl border border-slate-200/90 shadow-subtle hover:border-amber-400 hover:shadow-card transition-all space-y-1.5 cursor-pointer"
                  >
                    <h4 className="text-xs font-bold text-[#08233F] line-clamp-1">{simJob.title}</h4>
                    <p className="text-[11px] text-slate-500">{simJob.companyName} • {simJob.city}</p>
                    <p className="text-xs font-bold text-emerald-700">{formatSalaryDisplay(simJob.salaryMin, simJob.salaryMax, lang)}</p>
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
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">{lang === 'kn' ? 'ಉದ್ಯೋಗ ಅರ್ಜಿ' : 'Candidate Application'}</span>
                    <h3 className="text-lg font-bold text-[#08233F] mt-0.5">{job.title}</h3>
                    <p className="text-xs text-slate-500">{job.companyName}</p>
                  </div>
                  <button onClick={() => setIsApplyModalOpen(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                    ✕
                  </button>
                </div>

                {!currentUser || currentUser.role !== 'driver' ? (
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-3">
                    <p className="font-semibold">{t('Please log in as a driver to save jobs.')}</p>
                    <Link
                      to={`/login?redirect=/jobs/${job.id}`}
                      className="inline-block px-4 py-2 bg-[#08233F] text-white rounded-xl font-bold cursor-pointer"
                    >
                      {t('Sign In')}
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleApplySubmit} className="space-y-4">
                    {applyError && <p role="alert" className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs">{applyError}</p>}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 text-xs space-y-1">
                      <p className="font-bold text-[#08233F]">
                        {lang === 'kn' ? 'ಅರ್ಜಿದಾರ:' : 'Applying as:'} {driverProfile?.fullName || currentUser.email}
                      </p>
                      <p className="text-slate-600">
                        {lang === 'kn' ? 'ಲೈಸೆನ್ಸ್:' : 'License:'} {driverProfile?.licenseType || t('100% License Verified')}
                      </p>
                      <p className="text-slate-600">
                        {lang === 'kn' ? 'ಅನುಭವ:' : 'Experience:'} {t('{count} Years Exp', { count: driverProfile?.experienceYears || 2 })}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {lang === 'kn' ? 'ಉದ್ಯೋಗದಾತರಿಗೆ ಸಂದೇಶ (ಐಚ್ಛಿಕ ಕವರ್ ನೋಟ್)' : 'Optional Message to Employer (Cover Note)'}
                      </label>
                      <textarea
                        rows={3}
                        value={coverMessage}
                        onChange={(e) => setCoverMessage(e.target.value)}
                        placeholder={lang === 'kn' ? 'ನೀವು ಚಾಲನೆ ಮಾಡಿದ ನಿರ್ದಿಷ್ಟ ವಾಹನ ಮಾದರಿಗಳು, ಹೆದ್ದಾರಿ ಮಾರ್ಗಗಳ ಪರಿಚಯ...' : 'Mention specific vehicle models you have driven, highway route familiarity, or availability...'}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none focus:bg-white"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsApplyModalOpen(false)}
                        className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                      >
                        {lang === 'kn' ? 'ರದ್ದುಮಾಡಿ' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-subtle flex items-center gap-2 cursor-pointer"
                      >
                        {submitting ? (lang === 'kn' ? 'ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ...' : 'Submitting Application...') : (lang === 'kn' ? 'ಖಚಿತಪಡಿಸಿ ಮತ್ತು ಅರ್ಜಿ ಸಲ್ಲಿಸಿ' : 'Confirm & Apply')}
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
                <h3 className="text-xl font-bold text-[#08233F]">{t('Application Submitted')}</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  {lang === 'kn'
                    ? `${job.companyName} ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಸ್ವೀಕರಿಸಿದೆ. ನಿಮ್ಮ ಅರ್ಜಿಗಳ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ನಲ್ಲಿ ನೀವು ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಬಹುದು.`
                    : `${job.companyName} has received your profile. You can track your status in your Applications dashboard.`}
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Link
                    to="/driver/applications"
                    onClick={() => setIsApplyModalOpen(false)}
                    className="px-5 py-2.5 bg-[#08233F] text-white font-bold rounded-xl text-xs shadow-subtle"
                  >
                    {t('My Applications')}
                  </Link>
                  <button
                    onClick={() => setIsApplyModalOpen(false)}
                    className="px-5 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
                  >
                    {lang === 'kn' ? 'ಮುಚ್ಚಿ' : 'Close'}
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
