import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Users, ArrowLeft, ArrowRight, Download, FileText, CheckCircle2, 
  BarChart3, Unlock, Phone
} from 'lucide-react';
import { DataStore } from '../../services/store';

export const EmployerReports: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = DataStore.getCurrentUser();
  const employerId = currentUser?.id || 'usr-employer-1';

  const isDownloadView =
    location.pathname.includes('download-applications') ||
    location.search.includes('view=download');

  const [daysRange, setDaysRange] = useState<'7' | '30' | 'all'>('7');
  const [downloadedMsg, setDownloadedMsg] = useState<string | null>(null);

  const applications = DataStore.getApplications();
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
      `"${app.companyName || 'Bharat Logistics Pvt Ltd'}"`,
      `"${app.driverName || 'Driver Candidate'}"`,
      `"${app.driverCategory || 'HMV'}"`,
      `"${app.driverExperienceYears || 3} Years"`,
      `"${app.driverPhone || '+91 98765 43210'}"`,
      `"${app.driverLocation || 'Bengaluru'}"`,
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
    // Exact Match to Screenshot 3 (`employer.apna.co/download-applications`)
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
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>

        <h1 className="text-xl font-extrabold text-slate-900 font-display">Download applications</h1>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-10 sm:p-16 text-center max-w-4xl">
          <div className="max-w-md mx-auto space-y-5">
            {/* Illustration Icon matching Screenshot 3 */}
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto relative">
              <FileText className="w-10 h-10 text-slate-700" />
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center absolute -bottom-1 -right-1 shadow-md">
                <Download className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-extrabold text-slate-900">
                Download applications from last {daysRange === 'all' ? 'all time' : `${daysRange} days`}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                You can download all driver applications received across all your active and closed jobs in a single Excel-ready report ({applications.length} records ready).
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
                  {rng === 'all' ? 'All Time' : `Last ${rng} Days`}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={handleDownloadApplicationsCSV}
                className="px-6 py-2.5 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-lg text-xs shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Exact Match to Screenshot 2 (`employer.apna.co/reports-dashboard`)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 font-display">Reports</h1>
        <p className="text-xs text-slate-500 mt-1">
          Export candidate pipelines, unlocked driver contact logs, and fleet hiring reports
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Applications Report (Exact blue-bordered card from Screenshot 2) */}
        <div
          onClick={() => navigate('/employer/download-applications')}
          className="bg-white rounded-xl p-6 border-2 border-blue-600 shadow-subtle hover:shadow-card transition-all cursor-pointer flex flex-col justify-between space-y-6 group"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Applications</h2>
              <p className="text-xs text-slate-500 mt-1">
                Get all applications received in a single report ({applications.length} applications)
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
            <span>View Report</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: Unlocked Database Candidates Report */}
        <div
          onClick={() => navigate('/employer/candidates?tab=unlocked')}
          className="bg-white rounded-xl p-6 border border-slate-200 hover:border-emerald-500 shadow-subtle hover:shadow-card transition-all cursor-pointer flex flex-col justify-between space-y-6 group"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Unlock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Unlocked Database Drivers</h2>
              <p className="text-xs text-slate-500 mt-1">
                View and export all driver phone numbers unlocked from DriverHub Database ({unlocks.length} unlocked)
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
            <span>View Unlocked Drivers</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-600 pt-2">
        Can't find the data you need?{' '}
        <Link to="/contact" className="text-blue-600 font-semibold underline hover:text-blue-800">
          Contact sales team
        </Link>
      </p>
    </div>
  );
};
