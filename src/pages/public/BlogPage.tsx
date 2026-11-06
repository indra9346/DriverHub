import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock } from 'lucide-react';
import { useLanguage } from '../../services/i18n';
import { usePageMeta } from '../../lib/pageMeta';
import {
  BLOG_INDEX_DESCRIPTION, BLOG_INDEX_TITLE, BLOG_INDEX_URL, BlogAudience, BlogPost,
  blogIndexJsonLd, getReadingMinutes, getSortedBlogPosts
} from '../../data/blogPosts';
import { BlogHelpBox } from './BlogHelpBox';

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

export const formatBlogDate = (isoDate: string, lang: string): string =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString(lang === 'kn' ? 'kn-IN' : 'en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

const BlogCard: React.FC<{ post: BlogPost }> = ({ post }) => {
  const { t, lang } = useLanguage();
  return (
    <article className="group bg-white rounded-2xl border border-slate-200 shadow-card hover:shadow-elevated hover:border-amber-300 transition-all duration-300 overflow-hidden flex flex-col min-w-0">
      <Link to={`/blogs/${post.slug}`} className="block" tabIndex={-1} aria-hidden="true">
        <img
          src={post.cover}
          alt=""
          width={960}
          height={320}
          loading="lazy"
          className="w-full aspect-[3/1] object-cover bg-[#0A3157]"
        />
      </Link>
      <div className="p-5 sm:p-6 flex flex-col gap-3 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-semibold text-slate-500">
          <span className={`px-2.5 py-0.5 rounded-full border font-bold ${AUDIENCE_STYLES[post.audience]}`}>
            {t(AUDIENCE_LABELS[post.audience])}
          </span>
          <time dateTime={post.published}>{formatBlogDate(post.published, lang)}</time>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            {t('{count} min read', { count: getReadingMinutes(post) })}
          </span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-[#08233F] font-display leading-snug break-words">
          <Link to={`/blogs/${post.slug}`} className="hover:text-blue-800 focus-visible:outline-none focus-visible:underline">
            {post.title}
          </Link>
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-words flex-1">{post.description}</p>
        <Link
          to={`/blogs/${post.slug}`}
          aria-label={`${t('Read guide')}: ${post.title}`}
          className="inline-flex items-center gap-1.5 min-h-[44px] self-start text-xs sm:text-sm font-bold text-blue-700 hover:text-blue-900"
        >
          {t('Read guide')} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
};

export const BlogPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const posts = getSortedBlogPosts();

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
        {posts.map(post => <BlogCard key={post.slug} post={post} />)}
      </div>

      <div className="max-w-3xl mx-auto">
        <BlogHelpBox />
      </div>
    </div>
  );
};
