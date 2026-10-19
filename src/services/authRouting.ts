import type { UserRole } from '../types';

const ROLES: UserRole[] = ['driver', 'employer', 'admin'];
const REDIRECT_BASE = 'https://driverhub.invalid';

/**
 * Admins sign in only on this page. Nothing in the app links to it, and the
 * public sign-in page does not accept admin accounts: give the full link to
 * admins directly. Keep in sync with the static routes in vite.config.ts.
 */
export const ADMIN_LOGIN_PATH = '/dh-admin-access';

export const isUserRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && ROLES.includes(value as UserRole);

/** Roles that sign in and register on the public pages. */
export const isPublicRole = (value: unknown): value is Exclude<UserRole, 'admin'> =>
  value === 'driver' || value === 'employer';

export const inferRoleFromPath = (path: string): UserRole | null => {
  for (const role of ROLES) {
    if (path === `/${role}` || path.startsWith(`/${role}/`)) return role;
  }
  return null;
};

export const getDashboardPathForRole = (role: UserRole): string => {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'employer') return '/employer/dashboard';
  return '/driver/dashboard';
};

export const getLoginPathForRole = (role: UserRole, redirect?: string): string => {
  if (role === 'admin') {
    return redirect ? `${ADMIN_LOGIN_PATH}?${new URLSearchParams({ redirect }).toString()}` : ADMIN_LOGIN_PATH;
  }
  const params = new URLSearchParams({ role });
  if (redirect) params.set('redirect', redirect);
  return `/login?${params.toString()}`;
};

const isPublicPostLoginPath = (path: string): boolean =>
  path === '/' ||
  path === '/jobs' || path.startsWith('/jobs/') ||
  path === '/search' ||
  path === '/companies' || path.startsWith('/companies/') ||
  ['/about', '/contact', '/privacy', '/terms', '/safety', '/help'].includes(path);

/**
 * Keep safe same-role and public return paths. A stale redirect into another
 * portal must never send a successfully authenticated user to that portal.
 */
export const getPostLoginPath = (role: UserRole, requestedPath?: string | null): string => {
  const fallback = getDashboardPathForRole(role);
  if (!requestedPath || !requestedPath.startsWith('/') || requestedPath.startsWith('//')) return fallback;

  let destination: URL;
  try {
    destination = new URL(requestedPath, REDIRECT_BASE);
  } catch {
    return fallback;
  }

  if (destination.origin !== REDIRECT_BASE) return fallback;
  const roleBase = `/${role}`;
  const belongsToRole = destination.pathname === roleBase || destination.pathname.startsWith(`${roleBase}/`);
  const isEmployerPostJobAlias = role === 'employer' && destination.pathname === '/post-job';
  if (!belongsToRole && !isEmployerPostJobAlias && !isPublicPostLoginPath(destination.pathname)) return fallback;

  return `${destination.pathname}${destination.search}${destination.hash}`;
};
