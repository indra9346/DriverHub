import React, { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Search, FileText, Heart, User, FileCheck, 
  Settings, LogOut, PlusCircle, Briefcase, Users, Building2, 
  ShieldCheck, ChevronRight, ChevronDown, Sparkles, X, BarChart3, 
  CreditCard, Receipt, Gift, HelpCircle, PhoneCall, MessageSquare, 
  Database, Coins
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { supabase } from '../../services/supabaseClient';
import { UserRole } from '../../types';
import { getLoginPathForRole } from '../../services/authRouting';

export interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  tag?: string;
  highlight?: boolean;
  subItems?: { to: string; label: string }[];
}

export const getNavLinks = (role: UserRole, unreadCount: number = 0): NavItem[] => {
  const driverLinks: NavItem[] = [
    { to: '/driver/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/jobs', label: 'Find Jobs', icon: Search },
    { to: '/driver/applications', label: 'My Applications', icon: FileText },
    { to: '/driver/saved', label: 'Saved Jobs', icon: Heart },
    { to: '/driver/messages', label: 'Messages', icon: MessageSquare },
    { to: '/driver/profile', label: 'My Profile', icon: User },
    { to: '/driver/documents', label: 'Documents & License', icon: FileCheck },
    { to: '/driver/notifications', label: 'Notifications', icon: Sparkles, badge: unreadCount },
    { to: '/driver/settings', label: 'Account Settings', icon: Settings },
  ];

  const employerLinks: NavItem[] = [
    { to: '/employer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/employer/jobs', label: 'Jobs', icon: Briefcase },
    {
      to: '/employer/candidates',
      label: 'Database',
      icon: Database,
      subItems: [
        { to: '/employer/candidates?tab=search', label: 'Search Candidates' },
        { to: '/employer/candidates?tab=saved', label: 'Saved Searches' },
        { to: '/employer/candidates?tab=unlocked', label: 'Unlocked Candidates' }
      ]
    },
    { to: '/employer/applications', label: 'Applications Pipeline', icon: FileText },
    { to: '/employer/reports', label: 'Reports', icon: BarChart3 },
    { to: '/employer/credits', label: 'Credits & Usage', icon: CreditCard },
    { to: '/employer/billing', label: 'Billing', icon: Receipt, tag: 'New' },
    { to: '/employer/messages', label: 'Messages', icon: MessageSquare },
    { to: '/employer/company', label: 'Company Profile', icon: Building2 },
    { to: '/employer/notifications', label: 'Notifications', icon: Sparkles, badge: unreadCount },
  ];

  const adminLinks: NavItem[] = [
    { to: '/admin/dashboard', label: 'Analytics Dashboard', icon: LayoutDashboard },
    { to: '/admin/jobs', label: 'Job Moderation Queue', icon: ShieldCheck },
    { to: '/admin/documents', label: 'Driver Document Reviews', icon: FileCheck },
    { to: '/admin/candidates', label: 'Candidate Management', icon: Users },
    { to: '/admin/employers', label: 'Employer Verification', icon: Building2 },
    { to: '/admin/applications', label: 'Global Applications', icon: FileText },
    { to: '/admin/settings', label: 'System Configuration', icon: Settings },
  ];

  return role === 'admin' ? adminLinks : role === 'employer' ? employerLinks : driverLinks;
};

interface SidebarProps {
  role: UserRole;
  unreadCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  role, 
  unreadCount = 0,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = DataStore.getCurrentUser();
  const employer = role === 'employer' ? DataStore.getEmployerById(currentUser?.id || 'usr-employer-1') : null;
  const subscription = role === 'employer' ? DataStore.getSubscription(currentUser?.id || 'usr-employer-1') : null;

  const [dbExpanded, setDbExpanded] = useState(true);

  const handleLogout = async () => {
    DataStore.setCurrentUser(null);
    if (onCloseMobile) onCloseMobile();
    if (!(import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true')) {
      try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* Always finish local logout navigation. */ }
    }
    navigate(getLoginPathForRole(role), { replace: true });
  };

  const links = getNavLinks(role, unreadCount);
  const roleTitle = role === 'admin' ? 'Admin Control' : role === 'employer' ? (employer?.companyName || 'Employer Desk') : 'Driver Portal';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white">
      {/* Portal Company / Role Header (Matches ApnaHire top-left `B` Company badge) */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
            {roleTitle.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-extrabold text-slate-900 block truncate">
              {roleTitle}
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {role === 'employer' ? 'Verified Employer' : role === 'admin' ? 'Superadmin' : 'Verified Driver'}
            </span>
          </div>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isDbSection = Boolean(link.subItems && link.subItems.length > 0);
          const isParentActive = location.pathname === link.to || (isDbSection && location.pathname.includes('/employer/candidates'));

          if (isDbSection && link.subItems) {
            return (
              <div key={link.to} className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setDbExpanded(!dbExpanded);
                    navigate(link.to);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isParentActive
                      ? 'bg-emerald-50 text-emerald-900'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isParentActive ? 'text-emerald-700' : 'text-slate-500'}`} />
                    <span>{link.label}</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dbExpanded ? 'rotate-180' : ''}`} />
                </button>

                {dbExpanded && (
                  <div className="pl-4 space-y-0.5 border-l-2 border-emerald-100 ml-4">
                    {link.subItems.map(sub => {
                      const fullCurrent = location.pathname + location.search;
                      const isSubActive =
                        fullCurrent === sub.to ||
                        (sub.to.includes('tab=search') && location.pathname === '/employer/candidates' && !location.search);
                      return (
                        <Link
                          key={sub.to}
                          to={sub.to}
                          onClick={() => {
                            if (onCloseMobile) onCloseMobile();
                          }}
                          className={`block px-3 py-2 rounded-lg text-xs transition-all ${
                            isSubActive
                              ? 'bg-[#E6F6F2] text-emerald-900 font-bold'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                          }`}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
              }}
              end={link.to === '/driver/dashboard' || link.to === '/employer/dashboard' || link.to === '/admin/dashboard'}
              className={({ isActive }) => `
                flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group
                ${
                  isActive
                    ? 'bg-[#E6F6F2] text-emerald-900 font-bold border-l-3 border-emerald-600'
                    : link.highlight
                    ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{link.label}</span>
              </div>
              
              {link.tag ? (
                <span className="bg-blue-50 text-blue-700 border border-blue-200 font-bold px-2 py-0.5 rounded-full text-[10px] shrink-0 ml-1">
                  {link.tag}
                </span>
              ) : link.badge ? (
                <span className="bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-full text-[10px] shrink-0 ml-1">
                  {link.badge}
                </span>
              ) : (
                <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 shrink-0" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Employer ApnaHire Bottom Widget: Help & Support, Contact Sales, Credits Alert, View Plans */}
      {role === 'employer' && subscription && (
        <div className="p-3 border-t border-slate-100 space-y-2.5 bg-slate-50/40">
          <div className="space-y-1">
            <Link
              to="/contact"
              className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span>Help & Support</span>
            </Link>
            <Link
              to="/contact"
              className="flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <div className="flex items-center gap-2.5">
                <PhoneCall className="w-4 h-4 text-slate-400" />
                <span>Contact Sales</span>
              </div>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-[10px] font-bold">
                Offers
              </span>
            </Link>
          </div>

          {/* Credits Box */}
          <div className="p-3 rounded-xl bg-[#FEF9E7] border border-amber-200/90 text-xs space-y-1">
            <p className="font-bold text-slate-800">
              {subscription.jobCredits > 0
                ? `${subscription.jobCredits} Job Credits • ${subscription.dbUnlockCredits} Unlocks`
                : "Oh no! You've run out of credits."}
            </p>
            <Link to="/employer/billing" className="text-emerald-700 font-bold inline-flex items-center gap-0.5 hover:underline">
              View & Recharge <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* View Plans Button */}
          <Link
            to="/employer/billing"
            className="w-full py-2.5 bg-[#1F192E] hover:bg-slate-900 text-white rounded-full text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>View plans</span>
          </Link>
        </div>
      )}

      {/* Footer Sign out */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-slate-200/90 flex-col shrink-0 min-h-[calc(100vh-4rem)]">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 max-w-[280px] w-full z-50 shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
