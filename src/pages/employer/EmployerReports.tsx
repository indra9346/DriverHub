import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Users, ArrowLeft, ArrowRight, Download, FileText, CheckCircle2, Unlock 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { useLanguage } from '../../services/i18n';

export const EmployerReports: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = DataStore.getCurrentUser();
  const employerId = currentUser?.role === 'employer' ? currentUser.id : '';

  const isDownloadView =
    location.pathname.includes('download-applications') ||
    location.search.includes('view=download');

  const [daysRange, setDaysRange] = useState<'7' | '30' | 'all'>('7');
  const [downloadedMsg, setDownloadedMsg] = useState<string | null>(null);

  const ownJobIds = new Set(DataStore.getJobs().filter(job => job.employerId === employerId).map(job => job.id));
  const allApplications = DataStore.getApplications().filter(app => ownJobIds.has(app.jobId));
  const cutoff = daysRange === 'all' ? null : Date.now() - Number(daysRange) * 24 * 60 * 60 * 1000;
  const applications = allApplications.filter(app => {
    if (cutoff === null) return true;
    const appliedAt = Date.parse(app.appliedDate);
    return Number.isFinite(appliedAt) && appliedAt >= cutoff;
  });
  const unlocks = DataStore.getCandidateUnlocks(employerId);

  const handleDownloadApplicationsCSV = () => {
    const headers = [
      'Application ID',
      'Job Title',
      'Company Name',
      'Candidate Name',
      'Driver Category',
      'Experience (Years)',
      'Phone Number',
      'Location',
      'Current Status',
      'Applied Date'
    ];

    const rows = applications.map(app => [
      `"${app.id}"`,
      `"${app.jobTitle || 'Commercial Driver'}"`,
      `"${app.companyName || ''}"`,
      `"${app.driverName || 'Driver Candidate'}"`,
      `"${app.driverCategory || ''}"`,
      `"${app.driverExperienceYears ?? ''}${app.driverExperienceYears == null ? '' : ' Years'}"`,
      `"${app.driverPhone || ''}"`,
      `"${app.driverLocation || ''}"`,
      `"${app.status.toUpperCase()}"`,
      `"${app.appliedDate}"`
    ].join(','));

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `DriverHub_Applications_Report_Last_${daysRange}_Days.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadedMsg(`Downloaded ${applications.length} driver applications report (.csv) successfully!`);
    setTimeout(() => setDownloadedMsg(null), 4000);
  };

  if (isDownloadView) {
    return (
      <div className="space-y-6">
        {downloadedMsg && (
          <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-[#08233F] text-white rounded-2xl shadow-xl text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{downloadedMsg}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/employer/reports')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {t('back')}
          </button>
        </div>

        <h1 className="text-xl font-extrabold text-slate-900 font-display">{t('downloadApplications')}</h1>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-10 sm:p-16 text-center max-w-4xl">
          <div className="max-w-md mx-auto space-y-5">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto relative">
              <FileText className="w-10 h-10 text-slate-700" />
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center absolute -bottom-1 -right-1 shadow-md">
                <Download className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-extrabold text-slate-900">
                {t('downloadAppsFromLast', { range: daysRange === 'all' ? t('allTime') : `${daysRange} ${t('days')}` })}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t('downloadAppsDesc', { count: applications.length })}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2">
              {(['7', '30', 'all'] as const).map(rng => (
                <button
                  key={rng}
                  onClick={() => setDaysRange(rng)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer ${
                    daysRange === rng
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-500 font-bold'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {rng === 'all' ? t('allTime') : `${t('lastDays')} ${rng} ${t('days')}`}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={handleDownloadApplicationsCSV}
                className="px-6 py-2.5 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-lg text-xs shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> {t('downloadNow')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 font-display">{t('reports')}</h1>
        <p className="text-xs text-slate-500 mt-1">
          {t('reportsDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          onClick={() => navigate('/employer/download-applications')}
          className="bg-white rounded-xl p-6 border-2 border-blue-600 shadow-subtle hover:shadow-card transition-all cursor-pointer flex flex-col justify-between space-y-6 group"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">{t('applications')}</h2>
              <p className="text-xs text-slate-500 mt-1">
                {t('applicationsReportDesc', { count: applications.length })}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
            <span>{t('viewReport')}</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        <div
          onClick={() => navigate('/employer/candidates?tab=unlocked')}
          className="bg-white rounded-xl p-6 border border-slate-200 hover:border-emerald-500 shadow-subtle hover:shadow-card transition-all cursor-pointer flex flex-col justify-between space-y-6 group"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Unlock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">{t('unlockedDrivers')}</h2>
              <p className="text-xs text-slate-500 mt-1">
                {t('unlockedDriversDesc', { count: unlocks.length })}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
            <span>{t('viewUnlockedDrivers')}</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-600 pt-2">
        {t('cantFindData')}{' '}
        <Link to="/contact" className="text-blue-600 font-semibold underline hover:text-blue-800">
          {t('contactSalesTeam')}
        </Link>
      </p>
    </div>
  );
};
