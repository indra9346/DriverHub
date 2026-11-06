import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, Clock } from 'lucide-react';
import { useLanguage } from '../../services/i18n';
import { usePageMeta } from '../../lib/pageMeta';
import {
  BlogBlock, blogPostJsonLd, blogPostTitle, blogPostUrl, getBlogPost, getReadingMinutes,
  getSortedBlogPosts, SITE_URL
} from '../../data/blogPosts';
import { AUDIENCE_LABELS, AUDIENCE_STYLES, formatBlogDate } from './BlogPage';
import { BlogHelpBox } from './BlogHelpBox';
import { BlogCover, getBlogCoverUrl } from './BlogCover';
import { NotFoundPage } from './NotFoundPage';

const Block: React.FC<{ block: BlogBlock }> = ({ block }) => {
  switch (block.type) {
    case 'p':
      return <p className="text-sm sm:text-base text-slate-700 leading-relaxed break-words">{block.text}</p>;
    case 'steps':
      return (
        <ol className="space-y-3">
          {block.items.map((item, index) => (
            <li key={item} className="flex items-start gap-3 text-sm sm:text-base text-slate-700 leading-relaxed">
              <span className="shrink-0 w-7 h-7 mt-0.5 rounded-full bg-[#08233F] text-white text-xs font-bold flex items-center justify-center" aria-hidden="true">
                {index + 1}
              </span>
              <span className="min-w-0 break-words pt-0.5">{item}</span>
            </li>
          ))}
        </ol>
      );
    case 'list':
      return (
        <ul className="space-y-2.5">
          {block.items.map(item => (
            <li key={item} className="flex items-start gap-2.5 text-sm sm:text-base text-slate-700 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0 mt-1" aria-hidden="true" />
              <span className="min-w-0 break-words">{item}</span>
            </li>
          ))}
        </ul>
      );
    case 'note':
      return (
        <div role="note" className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 leading-relaxed">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
          <p className="min-w-0 break-words">{block.text}</p>
        </div>
      );
    case 'link':
      return (
        <Link
          to={block.to}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-400 text-xs sm:text-sm font-bold text-blue-700 hover:text-blue-900 transition-colors max-w-full"
        >
          <span className="min-w-0 break-words">{block.label}</span>
          <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
        </Link>
      );
  }
};

export const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, lang } = useLanguage();
  const post = getBlogPost(slug);

  usePageMeta(post
    ? {
        title: blogPostTitle(post),
        description: post.description,
        canonical: blogPostUrl(post.slug),
        ogType: 'article',
        jsonLd: blogPostJsonLd(post),
        image: getBlogCoverUrl(post.slug) ? new URL(getBlogCoverUrl(post.slug)!, SITE_URL).href : undefined
      }
    : {
        title: 'Guide not found | Driver Hub',
        description: 'This Driver Hub guide could not be found.',
        noindex: true
      });

  if (!post) return <NotFoundPage />;

  const otherPosts = getSortedBlogPosts().filter(other => other.slug !== post.slug);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs font-semibold text-slate-500 min-w-0">
        <Link to="/blogs" className="inline-flex items-center gap-1.5 min-h-[40px] text-slate-600 hover:text-[#08233F] shrink-0">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> {t('All blogs')}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        <span className="truncate" aria-current="page">{post.title}</span>
      </nav>

      <article className="space-y-8">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-slate-500">
            <span className={`px-2.5 py-0.5 rounded-full border font-bold ${AUDIENCE_STYLES[post.audience]}`}>
              {t(AUDIENCE_LABELS[post.audience])}
            </span>
            <time dateTime={post.published}>{formatBlogDate(post.published, lang)}</time>
            {post.updated && post.updated !== post.published && (
              <span>
                {t('Updated {date}', { date: formatBlogDate(post.updated, lang) })}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              {t('{count} min read', { count: getReadingMinutes(post) })}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#08233F] font-display tracking-tight leading-tight break-words">
            {post.title}
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed break-words">{post.intro}</p>
          {lang === 'kn' && (
            <p className="text-xs font-semibold text-slate-500">{t('Guides are in English.')}</p>
          )}
          <BlogCover post={post} className="rounded-2xl border border-slate-200" />
        </header>

        {post.sections.map(section => (
          <section key={section.heading} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-subtle space-y-4 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-[#08233F] font-display break-words">{section.heading}</h2>
            {section.blocks.map((block, index) => <Block key={index} block={block} />)}
          </section>
        ))}
      </article>

      <BlogHelpBox />

      {otherPosts.length > 0 && (
        <section aria-labelledby="more-guides" className="space-y-3">
          <h2 id="more-guides" className="text-sm font-bold text-[#08233F] uppercase tracking-wider">{t('More guides')}</h2>
          <ul className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-subtle overflow-hidden">
            {otherPosts.map(other => (
              <li key={other.slug}>
                <Link
                  to={`/blogs/${other.slug}`}
                  className="flex items-center justify-between gap-3 min-h-[56px] px-4 sm:px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[#08233F] break-words">{other.title}</span>
                    <span className="block text-[11px] font-semibold text-slate-500 mt-0.5">{t(AUDIENCE_LABELS[other.audience])}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
