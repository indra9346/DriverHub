import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const configDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Ensures direct navigation and browser refresh work on any hosting environment
 * (Apache/LiteSpeed/cPanel, Nginx, Vercel, Cloudflare, or plain static file servers)
 * by emitting dist/404.html and physical route entrypoints (e.g., dist/jobs/index.html).
 */
function spaStaticFallbackPlugin(): Plugin {
  const staticRoutes = [
    'jobs',
    'search',
    'companies',
    'about',
    'privacy',
    'terms',
    'safety',
    'help',
    'contact',
    'login',
    'register',
    'register/driver',
    'register/employer',
    'forgot-password',
    'reset-password',
    'post-job',
    'driver',
    'driver/dashboard',
    'driver/jobs',
    'driver/applications',
    'driver/saved',
    'driver/messages',
    'driver/profile',
    'driver/documents',
    'driver/notifications',
    'driver/settings',
    'employer',
    'employer/dashboard',
    'employer/post-job',
    'employer/jobs',
    'employer/jobs/new',
    'employer/applications',
    'employer/candidates',
    'employer/database',
    'employer/reports',
    'employer/download-applications',
    'employer/billing',
    'employer/credits',
    'employer/plans',
    'employer/messages',
    'employer/company',
    'employer/notifications',
    'employer/settings',
    'admin',
    'admin/dashboard',
    'admin/jobs',
    'admin/moderation',
    'admin/candidates',
    'admin/drivers',
    'admin/employers',
    'admin/applications',
    'admin/documents',
    'admin/reports',
    'admin/settings',
  ];

  return {
    name: 'driverhub-spa-static-fallback',
    closeBundle() {
      const distDir = path.resolve(configDir, 'dist');
      const indexHtmlPath = path.join(distDir, 'index.html');
      if (!fs.existsSync(indexHtmlPath)) return;

      const htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');

      // 1. Write 404.html fallback for hosts that serve 404.html on unknown routes
      fs.writeFileSync(path.join(distDir, '404.html'), htmlContent, 'utf-8');

      // 2. Write physical route directories (e.g. /jobs/index.html) so any static host
      // serves HTTP 200 OK on refresh even if .htaccess or server rewrites are disabled
      for (const route of staticRoutes) {
        const routeDir = path.join(distDir, route);
        fs.mkdirSync(routeDir, { recursive: true });
        fs.writeFileSync(path.join(routeDir, 'index.html'), htmlContent, 'utf-8');
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), spaStaticFallbackPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(configDir, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
