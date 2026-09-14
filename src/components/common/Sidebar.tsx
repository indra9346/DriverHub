import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Search, FileText, Heart, User, FileCheck, 
  Settings, LogOut, PlusCircle, Briefcase, Users, Building2, 
  ShieldCheck, CheckCircle2, ChevronRight, Sparkles 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { UserRole } from '../../types';

interface SidebarProps {
  role: UserRole;
  unreadCount?: number;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  highlight?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, unreadCount = 0 }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    DataStore.setCurrentUser(null);
    navigate('/login');
  };

  const driverLinks: NavItem[] = [
    { to: '/driver/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/jobs', label: 'Find Jobs', icon: Search },
    { to: '/driver/applications', label: 'My Applications', icon: FileText },
    { to: '/driver/saved', label: 'Saved Jobs', icon: Heart },
    { to: '/driver/profile', label: 'My Profile', icon: User },
    { to: '/driver/documents', label: 'Documents & License', icon: FileCheck },
    { to: '/driver/notifications', label: 'Notifications', icon: Sparkles, badge: unreadCount },
    { to: '/driver/settings', label: 'Account Settings', icon: Settings },
  ];

  const employerLinks: NavItem[] = [
    { to: '/employer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/employer/post-job', label: 'Post New Vacancy', icon: PlusCircle, highlight: true },
    { to: '/employer/jobs', label: 'Manage Jobs', icon: Briefcase },
    { to: '/employer/applications', label: 'Candidate Pipeline', icon: FileText },
    { to: '/employer/candidates', label: 'Driver Talent Pool', icon: Users },
    { to: '/employer/company', label: 'Company Profile', icon: Building2 },
    { to: '/employer/notifications', label: 'Notifications', icon: Sparkles, badge: unreadCount },
    { to: '/employer/settings', label: 'Account Settings', icon: Settings },
  ];

  const adminLinks: NavItem[] = [
    { to: '/admin/dashboard', label: 'Analytics Dashboard', icon: LayoutDashboard },
    { to: '/admin/jobs', label: 'Job Moderation Queue', icon: ShieldCheck },
    { to: '/admin/candidates', label: 'Candidate Management', icon: Users },
    { to: '/admin/employers', label: 'Employer Verification', icon: Building2 },
    { to: '/admin/applications', label: 'Global Applications', icon: FileText },
    { to: '/admin/settings', label: 'System Configuration', icon: Settings },
  ];

  const links = role === 'admin' ? adminLinks : role === 'employer' ? employerLinks : driverLinks;

  return (
    <aside className="w-64 bg-white border-r border-slate-200/90 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Portal Role Badge */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            {role === 'admin' ? 'Admin Control' : role === 'employer' ? 'Employer Desk' : 'Driver Portal'}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/driver/dashboard' || link.to === '/employer/dashboard' || link.to === '/admin/dashboard'}
              className={({ isActive }) => `
                flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group
                ${
                  isActive
                    ? 'bg-[#08233F] text-white shadow-subtle'
                    : link.highlight
                    ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                  link.highlight ? 'text-amber-600' : ''
                }`} />
                <span>{link.label}</span>
              </div>
              
              {link.badge ? (
                <span className="bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-full text-[10px]">
                  {link.badge}
                </span>
              ) : (
                <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Sign out */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
