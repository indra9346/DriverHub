import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Search, FileText, Heart, User, FileCheck, 
  Settings, LogOut, PlusCircle, Briefcase, Users, Building2, 
  ShieldCheck, ChevronRight, Sparkles, X 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { UserRole } from '../../types';

export interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  highlight?: boolean;
}

export const getNavLinks = (role: UserRole, unreadCount: number = 0): NavItem[] => {
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

  const handleLogout = () => {
    DataStore.setCurrentUser(null);
    if (onCloseMobile) onCloseMobile();
    navigate('/login');
  };

  const links = getNavLinks(role, unreadCount);

  const roleTitle = role === 'admin' ? 'Admin Control' : role === 'employer' ? 'Employer Desk' : 'Driver Portal';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white">
      {/* Portal Role Badge & Mobile Close */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl flex-1 mr-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 truncate">
            {roleTitle}
          </span>
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
                    ? 'bg-[#08233F] text-white shadow-subtle'
                    : link.highlight
                    ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  link.highlight ? 'text-amber-600' : ''
                }`} />
                <span className="truncate">{link.label}</span>
              </div>
              
              {link.badge ? (
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

      {/* Footer Sign out */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
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
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />
          {/* Slide-out Drawer */}
          <div className="fixed inset-y-0 left-0 max-w-[280px] w-full z-50 shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

