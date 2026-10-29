import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { useLanguage } from '../../services/i18n';

export interface BottomNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Other paths whose pages (and sub-pages) also mark this tab active. */
  match?: string[];
}

interface MobileBottomNavProps {
  /** Four tabs: two left of the raised centre button, two right of it. */
  items: [BottomNavItem, BottomNavItem, BottomNavItem, BottomNavItem];
  /** The raised round action in the middle. */
  center: BottomNavItem;
}

const isOnPath = (pathname: string, path: string) =>
  path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);

const isItemActive = (pathname: string, item: BottomNavItem) =>
  [item.to, ...(item.match || [])].some(path => isOnPath(pathname, path));

/**
 * Phone-only floating tab bar: a rounded white bar resting above the bottom
 * edge, with a raised round button in the middle. Pages that show it need
 * about 6rem of bottom padding on phones so it never covers their content.
 */
export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ items, center }) => {
  const { pathname } = useLocation();
  const { lang } = useLanguage();
  // Kannada words run wider, so they get a slightly smaller size to fit.
  const labelSize = lang === 'kn' ? 'text-[10px]' : 'text-[11px]';
  const CenterIcon = center.icon;
  const centerActive = isItemActive(pathname, center);

  const renderTab = (item: BottomNavItem) => {
    const Icon = item.icon;
    const active = isItemActive(pathname, item);
    return (
      <Link
        key={item.to}
        to={item.to}
        aria-current={active ? 'page' : undefined}
        className={`flex min-w-0 flex-col items-center justify-end gap-1.5 rounded-[1.25rem] px-0.5 pb-2.5 ${labelSize} leading-none transition-colors ${
          active ? 'font-extrabold text-[#08233F]' : 'font-semibold text-slate-500 hover:text-slate-800'
        }`}
      >
        <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={active ? 2.2 : 1.7} />
        <span className="max-w-full truncate pb-px">{item.label}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label="Quick navigation"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-2 pb-[calc(0.625rem+env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="pointer-events-auto relative mx-auto grid h-16 max-w-lg grid-cols-5 rounded-[1.75rem] border border-slate-200/80 bg-white/95 shadow-[0_14px_34px_-14px_rgba(8,35,63,0.32),0_2px_8px_rgba(8,35,63,0.06)] backdrop-blur-xl">
        {items.slice(0, 2).map(renderTab)}

        <Link
          to={center.to}
          aria-current={centerActive ? 'page' : undefined}
          className={`group relative flex min-w-0 flex-col items-center justify-end px-0.5 pb-2.5 ${labelSize} font-extrabold leading-none text-slate-800`}
        >
          {/* White ring around the button, lifted above the bar's top edge. */}
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full bg-white p-[5px] shadow-[0_10px_22px_-8px_rgba(8,35,63,0.45)]">
            <span className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-gradient-to-br from-[#17497D] via-[#0D3460] to-[#08233F] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-transform duration-150 group-active:scale-95">
              <CenterIcon className="h-[22px] w-[22px]" strokeWidth={2} />
            </span>
          </span>
          <span className="max-w-full truncate pb-px">{center.label}</span>
        </Link>

        {items.slice(2).map(renderTab)}
      </div>
    </nav>
  );
};
