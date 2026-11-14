/*
 * Blog HTML written in the admin editor is cleaned with an allow-list before it
 * is saved and again before it is shown, so a blog can never carry scripts,
 * event handlers, page styles or forms. Only the tags and attributes below
 * survive; links may only point to web, mail or phone addresses.
 */

const DROP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'LINK', 'META', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON',
  'NOSCRIPT', 'TEMPLATE', 'SVG', 'MATH', 'VIDEO', 'AUDIO', 'CANVAS', 'TITLE', 'HEAD', 'BASE', 'FRAME', 'FRAMESET'
]);

const KEEP_TAGS = new Set([
  'P', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'A', 'IMG', 'BR', 'HR',
  'BLOCKQUOTE', 'FIGURE', 'FIGCAPTION', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'SUP', 'SUB',
  'PRE', 'CODE', 'IFRAME', 'SPAN'
]);

const KEEP_ATTRS: Record<string, string[]> = {
  A: ['href'],
  IMG: ['src', 'alt', 'width', 'height'],
  TH: ['colspan', 'rowspan'],
  TD: ['colspan', 'rowspan'],
  IFRAME: ['src']
};

const ALIGNABLE = new Set(['P', 'H2', 'H3', 'H4', 'LI', 'BLOCKQUOTE', 'FIGCAPTION']);
const ALIGNMENTS = new Set(['left', 'center', 'right', 'justify']);

/** YouTube embeds only (the editor's Video button makes these). */
export const VIDEO_EMBED = /^https:\/\/www\.youtube(-nocookie)?\.com\/embed\/[\w-]{6,20}(\?[\w=&;-]*)?$/;

function safeHref(href: string): string | null {
  const value = href.trim();
  if (!value) return null;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (value.startsWith('#')) return value;
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(value)) return `https://${value}`;
  return null;
}

function safeImageSrc(src: string): string | null {
  const value = src.trim();
  if (/^https:\/\//i.test(value)) return value;
  // Local development only (the Supabase stand-in serves pictures over http://127.0.0.1).
  if (import.meta.env.DEV && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(value)) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return null;
}

function unwrap(node: Element) {
  const parent = node.parentNode;
  if (!parent) return;
  while (node.firstChild) parent.insertBefore(node.firstChild, node);
  parent.removeChild(node);
}

function rename(node: Element, tag: string): Element {
  const replacement = node.ownerDocument.createElement(tag);
  while (node.firstChild) replacement.appendChild(node.firstChild);
  node.replaceWith(replacement);
  return replacement;
}

function cleanChildren(parent: Element) {
  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    let node = child as Element;
    const tag = node.tagName;
    if (DROP_TAGS.has(tag) || (tag === 'IFRAME' && !VIDEO_EMBED.test(node.getAttribute('src') || ''))) {
      node.remove();
      continue;
    }
    cleanChildren(node);
    // Read the alignment before a rename drops the attributes.
    const align = ((node as HTMLElement).style?.textAlign || node.getAttribute('align') || '').toLowerCase();
    if (tag === 'H1' || tag === 'H5' || tag === 'H6') {
      node = rename(node, tag === 'H1' ? 'h2' : 'h4');
    } else if (tag === 'DIV' && parent.tagName === 'BODY') {
      // The editor sometimes makes top-level <div>s for paragraphs.
      node = rename(node, 'p');
    } else if (!KEEP_TAGS.has(tag)) {
      unwrap(node);
      continue;
    }

    const finalTag = node.tagName;
    for (const attr of Array.from(node.attributes)) {
      if (!(KEEP_ATTRS[finalTag] || []).includes(attr.name.toLowerCase())) node.removeAttribute(attr.name);
    }
    if (ALIGNABLE.has(finalTag) && ALIGNMENTS.has(align) && align !== 'left') {
      node.setAttribute('style', `text-align: ${align}`);
    }

    if (finalTag === 'A') {
      const href = safeHref(node.getAttribute('href') || '');
      if (!href || !(node.textContent || '').trim() && !node.querySelector('img')) {
        unwrap(node);
        continue;
      }
      node.setAttribute('href', href);
      if (/^https?:/i.test(href) && !/^https?:\/\/(www\.)?driverhub\.in(\/|$)/i.test(href)) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
    if (finalTag === 'IMG') {
      const src = safeImageSrc(node.getAttribute('src') || '');
      if (!src) {
        node.remove();
        continue;
      }
      node.setAttribute('src', src);
      node.setAttribute('loading', 'lazy');
      node.setAttribute('decoding', 'async');
      if (!node.hasAttribute('alt')) node.setAttribute('alt', '');
    }
    if (finalTag === 'IFRAME') {
      node.setAttribute('loading', 'lazy');
      node.setAttribute('title', 'Video');
      node.setAttribute('allow', 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      node.setAttribute('allowfullscreen', '');
      node.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    }
    if (finalTag === 'SPAN' && node.attributes.length === 0) unwrap(node);
  }
}

function removeEmpty(body: HTMLElement) {
  const candidates = Array.from(body.querySelectorAll('p, li, h2, h3, h4, strong, b, em, i, u, s, ul, ol, blockquote'));
  for (const el of candidates.reverse()) {
    if (!el.isConnected) continue;
    if ((el.textContent || '').replace(/ /g, ' ').trim()) continue;
    if (el.querySelector('img, iframe, br, hr')) continue;
    el.remove();
  }
}

/** Cleans editor HTML (browser only). */
export function sanitizeBlogHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(`<!doctype html><html><body>${html || ''}</body></html>`, 'text/html');
  cleanChildren(doc.body);
  removeEmpty(doc.body);
  return doc.body.innerHTML.trim();
}

/** Plain text of blog HTML (for word counts and summaries). */
export function blogHtmlToText(html: string): string {
  if (typeof DOMParser === 'undefined') return html.replace(/<[^>]+>/g, ' ');
  const doc = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html');
  doc.body.querySelectorAll('p, li, h2, h3, h4, br, blockquote, td, th').forEach(node => node.append(' '));
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

/** Whole minutes at about 200 words a minute; at least 1 (same rule as the built-in guides). */
export function readingMinutesFromHtml(html: string): number {
  const words = blogHtmlToText(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** First sentences of the text (headings left out), up to about 160 characters. */
export function summaryFromHtml(html: string, max = 160): string {
  let source = html;
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html');
    doc.body.querySelectorAll('h1, h2, h3, h4, h5, h6, figcaption, table').forEach(node => node.remove());
    source = doc.body.innerHTML;
  }
  const text = blogHtmlToText(source);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

/** Lower-case words joined by hyphens, for the web address. */
export function slugifyBlog(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/₹/g, ' rs ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
    .replace(/-+$/, '');
}

/** Adds ids to the h2 headings so long posts can link to their sections. */
export function headingsFromHtml(html: string): { html: string; headings: Array<{ id: string; label: string }> } {
  if (typeof DOMParser === 'undefined') return { html, headings: [] };
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const headings: Array<{ id: string; label: string }> = [];
  doc.body.querySelectorAll('h2').forEach((h2, index) => {
    const label = (h2.textContent || '').replace(/\s+/g, ' ').trim();
    if (!label) return;
    const id = `section-${index + 1}`;
    h2.id = id;
    headings.push({ id, label });
  });
  return { html: doc.body.innerHTML, headings };
}
