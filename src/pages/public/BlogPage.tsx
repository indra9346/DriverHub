import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock } from 'lucide-react';
import { useLanguage } from '../../services/i18n';
import { usePageMeta } from '../../lib/pageMeta';
import {
  BLOG_INDEX_DESCRIPTION, BLOG_INDEX_TITLE, BLOG_INDEX_URL, BlogAudience, BlogPost,
  blogIndexJsonLd, getReadingMinutes, getSortedBlogPosts
} from '../../data/blogPosts';
import { AdminBlog, fetchPublishedBlogs } from '../../services/blogApi';
import { readingMinutesFromHtml, summaryFromHtml } from '../../lib/blogHtml';
import { BlogHelpBox } from './BlogHelpBox';
import { BlogCover } from './BlogCover';

export const AUDIENCE_LABELS: Record<BlogAudience, string> = {
  Drivers: 'For drivers',
  Employers: 'For employers',
  Everyone: 'For everyone'
};

export const AUDIENCE_STYLES: Record<BlogAudience, string> = {
  Drivers: 'bg-amber-50 text-amber-800 border-amber-200',
  Employers: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Everyone: 'bg-blue-50 text-blue-800 border-blue-200'
};

/** Badge colours for a category typed in the admin. */
export const categoryStyle = (category: string): string => {
  const value = category.toLowerCase();
  if (/driver/.test(value)) return AUDIENCE_STYLES.Drivers;
  if (/employer|business|company/.test(value)) return AUDIENCE_STYLES.Employers;
  return AUDIENCE_STYLES.Everyone;
};

export const formatBlogDate = (isoDate: string, lang: string): string =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString(lang === 'kn' ? 'kn-IN' : 'en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

/** Date of an admin blog (stored as a moment in time). */
export const formatBlogDateTime = (iso: string, lang: string): string =>
  new Date(iso).toLocaleDateString(lang === 'kn' ? 'kn-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** One card on the Blogs page: a built-in guide or a blog written in the admin. */
export interface BlogListItem {
  key: string;
  slug: string;
  title: string;
  summary: string;
  /** ISO text, newest first. */
  sortDate: string;
  dateIso: string;
  dateLabel: string;
  badge: string;
  badgeStyle: string;
  minutes: number;
  /** Built-in guides keep their cover component; admin blogs have a picture address. */
  guide?: BlogPost;
  coverUrl?: string;
  coverAlt?: string;
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

export const guideToItem = (post: BlogPost, t: Translate, lang: string): BlogListItem => ({
  key: `guide-${post.slug}`,
  slug: post.slug,
  title: post.title,
  summary: post.description,
  sortDate: new Date(`${post.published}T00:00:00`).toISOString(),
  dateIso: post.published,
  dateLabel: formatBlogDate(post.published, lang),
  badge: t(AUDIENCE_LABELS[post.audience]),
  badgeStyle: AUDIENCE_STYLES[post.audience],
  minutes: getReadingMinutes(post),
  guide: post
});

export const adminBlogToItem = (blog: AdminBlog, t: Translate, lang: string): BlogListItem => ({
  key: `blog-${blog.id}`,
  slug: blog.slug,
  title: blog.title,
  summary: blog.summary || summaryFromHtml(blog.contentHtml),
  sortDate: new Date(blog.publishedAt).toISOString(),
  dateIso: blog.publishedAt,
  dateLabel: formatBlogDateTime(blog.publishedAt, lang),
  badge: blog.category || t('Blog'),
  badgeStyle: categoryStyle(blog.category),
  minutes: readingMinutesFromHtml(blog.contentHtml),
  coverUrl: blog.coverUrl,
  coverAlt: blog.coverAlt || blog.title
});

/** Built-in guides and published admin blogs together, newest first. */
export function useBlogListItems(): { items: BlogListItem[]; loading: boolean } {
  const { t, lang } = useLanguage();
  const [blogs, setBlogs] = useState<AdminBlog[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    void fetchPublishedBlogs().then(list => {
      if (!live) return;
      setBlogs(list);
      setLoading(false);
    });
    return () => { live = false; };
  }, []);
  const items = [
    ...blogs.map(blog => adminBlogToItem(blog, t, lang)),
    ...getSortedBlogPosts().map(post => guideToItem(post, t, lang))
  ].sort((a, b) => b.sortDate.localeCompare(a.sortDate));
  return { items, loading };
}

export const BlogItemCover: React.FC<{ item: BlogListItem; className?: string; lazy?: boolean }> = ({ item, className = '', lazy = false }) => {
  if (item.guide) return <BlogCover post={item.guide} className={className} lazy={lazy} />;
  if (item.coverUrl) {
    return (
      <img
        src={item.coverUrl}
        alt={item.coverAlt || ''}
        width={1600}
        height={900}
        loading={lazy ? 'lazy' : undefined}
        decoding="async"
        className={`w-full aspect-video object-cover bg-slate-100 ${className}`}
      />
    );
  }
  return (
    <div aria-hidden="true" className={`w-full aspect-video bg-gradient-to-br from-slate-100 via-blue-50 to-amber-50 flex items-center justify-center ${className}`}>
      <BookOpen className="w-10 h-10 text-[#08233F]" strokeWidth={1.75} />
    </div>
  );
};

const BlogCard: React.FC<{ item: BlogListItem }> = ({ item }) => {
  const { t } = useLanguage();
  const href = `/blogs/${item.slug}`;
  const readLabel = item.guide ? t('Read guide') : t('Read blog');
  return (
    <article className="group bg-white rounded-2xl border border-slate-200 shadow-card hover:shadow-elevated hover:border-amber-300 transition-all duration-300 overflow-hidden flex flex-col min-w-0">
      <Link to={href} className="block" tabIndex={-1} aria-hidden="true">
        <BlogItemCover item={item} lazy />
      </Link>
      <div className="p-5 sm:p-6 flex flex-col gap-3 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-semibold text-slate-500">
          <span className={`px-2.5 py-0.5 rounded-full border font-bold ${item.badgeStyle}`}>
            {item.badge}
          </span>
          <time dateTime={item.dateIso}>{item.dateLabel}</time>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            {t('{count} min read', { count: item.minutes })}
          </span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-[#08233F] font-display leading-snug break-words">
          <Link to={href} className="hover:text-blue-800 focus-visible:outline-none focus-visible:underline">
            {item.title}
          </Link>
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-words flex-1">{item.summary}</p>
        <Link
          to={href}
          aria-label={`${readLabel}: ${item.title}`}
          className="inline-flex items-center gap-1.5 min-h-[44px] self-start text-xs sm:text-sm font-bold text-blue-700 hover:text-blue-900"
        >
          {readLabel} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
};

export const BlogPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const { items } = useBlogListItems();

  usePageMeta({
    title: BLOG_INDEX_TITLE,
    description: BLOG_INDEX_DESCRIPTION,
    canonical: BLOG_INDEX_URL,
    jsonLd: blogIndexJsonLd()
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <header className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[#08233F] text-xs font-bold uppercase tracking-wider shadow-xs">
          <BookOpen className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" /> {t('Driver Hub Blog')}
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#08233F] font-display tracking-tight leading-tight">
          {t('Guides for drivers and employers')}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          {t('Step-by-step help for using Driver Hub: finding work, uploading documents, posting vacancies and installing the app.')}
        </p>
        {lang === 'kn' && (
          <p className="text-xs font-semibold text-slate-500">{t('Guides are in English.')}</p>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map(item => <BlogCard key={item.key} item={item} />)}
      </div>

      <div className="max-w-3xl mx-auto">
        <BlogHelpBox />
      </div>
    </div>
  );
};
