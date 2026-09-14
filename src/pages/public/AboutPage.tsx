import React from 'react';
import { 
  ShieldCheck, Award, HeartHandshake, Users, Truck, CheckCircle2, 
  MapPin, Clock, Target, Sparkles, PhoneCall, Building2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-surface border border-slate-200 text-brand-navy text-xs font-bold uppercase tracking-wider shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-brand-amber" /> India's Most Trusted Driver Ecosystem
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-brand-navy font-display tracking-tight leading-tight">
          Empowering Commercial Drivers & Connecting Fleet Leaders
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Driver Hub organizes commercial transport hiring across India. We eliminate exploitative middlemen, verify RTO commercial credentials, and ensure timely, transparent wages with zero broker commissions.
        </p>
      </div>

      {/* 3 Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-card hover:shadow-elevated transition-all duration-300 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-brand-amber flex items-center justify-center text-xl font-bold border border-amber-200/60">
            <ShieldCheck className="w-6 h-6 text-brand-amber" />
          </div>
          <h3 className="text-lg font-bold text-brand-navy font-display">100% Commercial Verification</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Every candidate’s driving license, vehicle endorsement, Aadhar, and background records are validated through automated and manual checks, giving fleet employers total confidence.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-card hover:shadow-elevated transition-all duration-300 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xl font-bold border border-emerald-200/60">
            <Award className="w-6 h-6 text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-brand-navy font-display">Zero Broker Commission</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Drivers never pay any recruitment fees or intermediary cuts. 100% of the agreed salary, allowances, and trip bonuses go straight to the driver’s bank account.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-card hover:shadow-elevated transition-all duration-300 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center text-xl font-bold border border-brand-blue/20">
            <Truck className="w-6 h-6 text-brand-blue" />
          </div>
          <h3 className="text-lg font-bold text-brand-navy font-display">Fast Real-Time Matching</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Intelligent location and license matching instantly pairs multi-axle HMV drivers, delivery pilots, and private chauffeurs with verified enterprise openings across 50+ logistics hubs.
          </p>
        </div>
      </div>

      {/* Safety & Driver Welfare Standards Banner */}
      <div className="bg-brand-navy rounded-2xl p-8 sm:p-12 text-white shadow-elevated space-y-8 relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-brand-blue/10 blur-2xl pointer-events-none" />
        
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-brand-amber text-xs font-bold uppercase tracking-wider">
            Safety & Ethics Charter
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display">
            Our Commitment to Driver Welfare & Highway Safety
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            We partner exclusively with fleets and companies that uphold strict safety, dignity, and insurance standards for commercial drivers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs sm:text-sm text-slate-300">
          <div className="flex items-start gap-3.5 bg-white/5 p-4 rounded-xl border border-white/10">
            <CheckCircle2 className="w-5 h-5 text-brand-amber shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">Fatigue Prevention</span>
              <span>Enforced shift caps and mandatory highway rest intervals to minimize driver exhaustion.</span>
            </div>
          </div>
          <div className="flex items-start gap-3.5 bg-white/5 p-4 rounded-xl border border-white/10">
            <CheckCircle2 className="w-5 h-5 text-brand-amber shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">Accident Insurance</span>
              <span>Mandatory medical coverage and accidental disability support provided by verified employers.</span>
            </div>
          </div>
          <div className="flex items-start gap-3.5 bg-white/5 p-4 rounded-xl border border-white/10">
            <CheckCircle2 className="w-5 h-5 text-brand-amber shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">Multilingual Driver Helpline</span>
              <span>24/7 dedicated support in Hindi, Kannada, Tamil, Telugu, and Marathi.</span>
            </div>
          </div>
          <div className="flex items-start gap-3.5 bg-white/5 p-4 rounded-xl border border-white/10">
            <CheckCircle2 className="w-5 h-5 text-brand-amber shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">Guaranteed Wage Records</span>
              <span>Digital salary terms logged on Driver Hub to eliminate payout deductions or withheld dues.</span>
            </div>
          </div>
        </div>

        <div className="pt-4 flex flex-wrap items-center gap-4">
          <Link
            to="/jobs"
            className="px-6 py-3 bg-brand-amber hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all inline-flex items-center gap-2"
          >
            Explore Verified Vacancies
          </Link>
          <Link
            to="/contact"
            className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl text-xs sm:text-sm border border-white/20 transition-all"
          >
            Contact Fleet Support Desk
          </Link>
        </div>
      </div>
    </div>
  );
};
