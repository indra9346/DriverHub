import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  BLOG_INDEX_DESCRIPTION, BLOG_INDEX_TITLE, BLOG_INDEX_URL, BLOG_POSTS, SITE_URL,
  blogIndexJsonLd, blogPostJsonLd, blogPostTitle, blogPostUrl
} from './src/data/blogPosts';

const configDir = path.dirname(fileURLToPath(import.meta.url));

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface StaticPageMeta {
  title: string;
  description: string;
  canonical: string;
  ogType: 'website' | 'article';
  jsonLd: Record<string, unknown>;
  /** Post slug, to find its cover photo among the built assets. */
  slug?: string;
}

/** Built cover photo of a post (src/assets/blog/<slug>.jpg -> dist/assets/<slug>-<hash>.jpg). */
function findBuiltCover(distDir: string, slug: string): string | undefined {
  const assetsDir = path.join(distDir, 'assets');
  if (!fs.existsSync(assetsDir)) return undefined;
  const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escaped}-[A-Za-z0-9_-]{8}\\.(jpe?g|png|webp)$`);
  const file = fs.readdirSync(assetsDir).find(name => pattern.test(name));
  return file ? `${SITE_URL}/assets/${file}` : undefined;
}

/** Blog pages get their own title, description, canonical, Open Graph and JSON-LD in the static HTML. */
const blogPageMeta: Record<string, StaticPageMeta> = {
  blogs: {
    title: BLOG_INDEX_TITLE,
    description: BLOG_INDEX_DESCRIPTION,
    canonical: BLOG_INDEX_URL,
    ogType: 'website',
    jsonLd: blogIndexJsonLd(),
  },
  ...Object.fromEntries(BLOG_POSTS.map(post => [`blogs/${post.slug}`, {
    title: blogPostTitle(post),
    description: post.description,
    canonical: blogPostUrl(post.slug),
    ogType: 'article' as const,
    jsonLd: blogPostJsonLd(post),
    slug: post.slug,
  }])),
};

/** Same tags as usePageMeta (src/lib/pageMeta.ts), marked data-page-meta so the app can replace them. */
function withPageMeta(html: string, meta: StaticPageMeta, shareImage: string): string {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const tags = [
    `<link rel="canonical" href="${escapeHtml(meta.canonical)}" data-page-meta>`,
    `<meta property="og:type" content="${meta.ogType}" data-page-meta>`,
    `<meta property="og:site_name" content="Driver Hub" data-page-meta>`,
    `<meta property="og:title" content="${title}" data-page-meta>`,
    `<meta property="og:description" content="${description}" data-page-meta>`,
    `<meta property="og:url" content="${escapeHtml(meta.canonical)}" data-page-meta>`,
    `<meta property="og:image" content="${escapeHtml(shareImage)}" data-page-meta>`,
    // "<" is escaped so the JSON can never close the script tag.
    `<script type="application/ld+json" data-page-meta>${JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c')}</script>`,
  ];
  const updated = html
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, () => `<meta name="description" content="${description}" />`)
    .replace('</head>', () => `    ${tags.join('\n    ')}\n  </head>`);
  if (!updated.includes(`<title>${title}</title>`) || !updated.includes(`content="${description}"`)) {
    throw new Error('driverhub-spa-static-fallback: could not set the blog page title/description in index.html');
  }
  return updated;
}

/** Public pages for search engines, at the addresses the host serves them (folders end in "/"). */
function buildSitemap(): string {
  const pages: Array<{ loc: string; lastmod?: string }> = [
    { loc: `${SITE_URL}/` },
    { loc: `${SITE_URL}/jobs/` },
    { loc: `${SITE_URL}/companies/` },
    { loc: `${SITE_URL}/about/` },
    { loc: `${SITE_URL}/contact/` },
    { loc: `${SITE_URL}/safety/` },
    { loc: `${SITE_URL}/privacy/` },
    { loc: `${SITE_URL}/terms/` },
    {
      loc: BLOG_INDEX_URL,
      lastmod: BLOG_POSTS.map(post => post.updated || post.published).sort().at(-1),
    },
    ...BLOG_POSTS.map(post => ({ loc: blogPostUrl(post.slug), lastmod: post.updated || post.published })),
  ];
  const urls = pages.map(page =>
    `  <url>\n    <loc>${escapeHtml(page.loc)}</loc>${page.lastmod ? `\n    <lastmod>${page.lastmod}</lastmod>` : ''}\n  </url>`
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

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
    'blog',
    ...Object.keys(blogPageMeta), // blogs + blogs/<slug>
    'login',
    'dh-admin-access', // ADMIN_LOGIN_PATH in src/services/authRouting.ts
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
    'admin/blogs',
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
        const meta = blogPageMeta[route];
        const shareImage = (meta?.slug && findBuiltCover(distDir, meta.slug)) || `${SITE_URL}/logo-icon-1024.png`;
        fs.writeFileSync(path.join(routeDir, 'index.html'), meta ? withPageMeta(htmlContent, meta, shareImage) : htmlContent, 'utf-8');
      }

      // 3. Sitemap of the public pages and blog posts (robots.txt in public/ points to it)
      fs.writeFileSync(path.join(distDir, 'sitemap.xml'), buildSitemap(), 'utf-8');
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
  build: {
    rollupOptions: {
      output: {
        // Libraries change rarely: in their own files they stay cached in the
        // browser when only the app code changes in a new deploy.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
