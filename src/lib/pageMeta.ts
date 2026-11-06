import { useEffect } from 'react';

/*
 * Page title, description, canonical link, Open Graph tags and JSON-LD for
 * pages that need their own (the blog). The build writes the same tags into
 * the static HTML of those routes (vite.config.ts); this hook keeps them right
 * while visitors move around inside the app.
 *
 * Tags this hook owns carry data-page-meta, so the site-wide LocalBusiness
 * JSON-LD in index.html is never touched.
 */

// Same text as <title> and the description meta tag in index.html.
export const DEFAULT_PAGE_TITLE = 'Driver Hub — Driver Recruitment & Job Portal';
export const DEFAULT_PAGE_DESCRIPTION =
  'Driver Hub connects certified drivers with verified employers. Find driver jobs or hire experienced commercial and personal drivers today.';

export const DEFAULT_SHARE_IMAGE = 'https://driverhub.in/logo-icon-1024.png';

export interface PageMeta {
  title: string;
  description: string;
  /** Absolute URL. */
  canonical?: string;
  ogType?: 'website' | 'article';
  /** Structured data for search engines. */
  jsonLd?: Record<string, unknown>;
  /** For pages that should stay out of search results (e.g. a missing post). */
  noindex?: boolean;
  /** Absolute URL of the picture shown when the page is shared. */
  image?: string;
}

const MARK = 'data-page-meta';

const setDescription = (content: string) => {
  let tag = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = 'description';
    document.head.appendChild(tag);
  }
  tag.content = content;
};

const removeOwnedTags = () => {
  document.head.querySelectorAll(`[${MARK}]`).forEach(node => node.remove());
};

const addTag = (tagName: 'meta' | 'link' | 'script', attributes: Record<string, string>, text?: string) => {
  const node = document.createElement(tagName);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  node.setAttribute(MARK, '');
  if (text !== undefined) node.textContent = text;
  document.head.appendChild(node);
};

export function usePageMeta(meta: PageMeta): void {
  const { title, description, canonical, ogType = 'website', jsonLd, noindex, image = DEFAULT_SHARE_IMAGE } = meta;
  const jsonLdText = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    document.title = title;
    setDescription(description);

    // Replace the tags written into the static HTML (or by the previous page).
    removeOwnedTags();
    if (canonical) addTag('link', { rel: 'canonical', href: canonical });
    if (noindex) addTag('meta', { name: 'robots', content: 'noindex' });
    addTag('meta', { property: 'og:type', content: ogType });
    addTag('meta', { property: 'og:site_name', content: 'Driver Hub' });
    addTag('meta', { property: 'og:title', content: title });
    addTag('meta', { property: 'og:description', content: description });
    if (canonical) addTag('meta', { property: 'og:url', content: canonical });
    addTag('meta', { property: 'og:image', content: image });
    if (jsonLdText) addTag('script', { type: 'application/ld+json' }, jsonLdText);

    return () => {
      removeOwnedTags();
      document.title = DEFAULT_PAGE_TITLE;
      setDescription(DEFAULT_PAGE_DESCRIPTION);
    };
  }, [title, description, canonical, ogType, jsonLdText, noindex, image]);
}
