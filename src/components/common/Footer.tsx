import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, Phone, Mail, MapPin, Truck, Award, Heart, 
  ArrowUpRight, Users, CheckCircle2 
} from 'lucide-react';
import { Logo } from './Logo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#051626] text-slate-300 border-t border-slate-800/90 pt-16 pb-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800/80">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Logo variant="dark" size="lg" showTagline={true} />
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
              India's premier driver recruitment ecosystem. Connecting verified commercial and personal drivers with leading logistics fleets, corporate transport, schools, and verified employers.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-full font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> 100% License Verified
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full font-semibold">
                <Award className="w-3.5 h-3.5" /> Direct Employer Hiring
              </div>
            </div>
          </div>

          {/* Category links */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 font-display">
              Driver Categories
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/jobs?category=HMV" className="hover:text-amber-400 transition-colors">
                  Heavy Truck (HMV)
                </Link>
              </li>
              <li>
                <Link to="/jobs?category=LMV" className="hover:text-amber-400 transition-colors">
                  Personal & Sedan Chauffeur
                </Link>
              </li>
              <li>
                <Link to="/jobs?category=Cab+Driver" className="hover:text-amber-400 transition-colors">
                  App-based Cab Driver
                </Link>
              </li>
              <li>
                <Link to="/jobs?category=Delivery+Driver" className="hover:text-amber-400 transition-colors">
                  Hyperlocal Delivery Pilot
                </Link>
              </li>
              <li>
                <Link to="/jobs?category=Bus+Driver" className="hover:text-amber-400 transition-colors">
                  School & Staff Bus Driver
                </Link>
              </li>
              <li>
                <Link to="/jobs?category=Trailer+Driver" className="hover:text-amber-400 transition-colors">
                  40ft Container Trailer Driver
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 font-display">
              Recruitment Portals
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/jobs" className="hover:text-amber-400 transition-colors">
                  Search All Vacancies
                </Link>
              </li>
              <li>
                <Link to="/companies" className="hover:text-amber-400 transition-colors">
                  Verified Companies
                </Link>
              </li>
              <li>
                <Link to="/employer/post-job" className="hover:text-amber-400 transition-colors">
                  Post Driver Vacancy
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-amber-400 transition-colors">
                  Join as a Candidate
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-amber-400 transition-colors">
                  Employer Sign In
                </Link>
              </li>
              <li>
                <Link to="/login?role=admin" className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Staff & Admin Portal
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-amber-400 transition-colors">
                  About Safety & Welfare
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Col */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 font-display">
              Support Desk
            </h4>
            <div className="space-y-3 text-xs text-slate-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Electronic City Phase 1, Bengaluru, Karnataka - 560100</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <a href="tel:+918022008899" className="hover:text-white transition-colors">
                  +91 80 2200 8899
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <a href="mailto:support@driverhub.in" className="hover:text-white transition-colors">
                  support@driverhub.in
                </a>
              </div>
              <div className="pt-2">
                <span className="text-[11px] text-slate-500 block">Mon - Sat: 9:00 AM - 7:00 PM IST</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright & attribution */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Driver Hub Inc. All rights reserved.</p>
          <div className="flex items-center gap-5 text-xs">
            <Link to="/about" className="hover:text-slate-400">Privacy Policy</Link>
            <Link to="/about" className="hover:text-slate-400">Terms of Service</Link>
            <Link to="/contact" className="hover:text-slate-400">Driver Welfare</Link>
            <Link to="/login?role=admin" className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Admin Login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
