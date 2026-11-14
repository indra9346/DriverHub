import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, Clock, EyeOff, LoaderCircle } from 'lucide-react';
import { useLanguage } from '../../services/i18n';
import { usePageMeta } from '../../lib/pageMeta';
import {
  BlogBlock, BlogPost, blogPostJsonLd, blogPostTitle, blogPostUrl, getBlogPost, getReadingMinutes, SITE_URL
} from '../../data/blogPosts';
import { AdminBlog, fetchBlogBySlug } from '../../services/blogApi';
import { headingsFromHtml, readingMinutesFromHtml, sanitizeBlogHtml, summaryFromHtml } from '../../lib/blogHtml';
import {
  AUDIENCE_LABELS, AUDIENCE_STYLES, BlogItemCover, adminBlogToItem, categoryStyle, formatBlogDate, formatBlogDateTime,
  useBlogListItems
} from './BlogPage';
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

/** "More guides": every other blog and guide, newest first. */
const MoreBlogs: React.FC<{ currentSlug: string }> = ({ currentSlug }) => {
  const { t } = useLanguage();
  const { items } = useBlogListItems();
  const others = items.filter(item => item.slug !== currentSlug).slice(0, 8);
  if (others.length === 0) return null;
  return (
    <section aria-labelledby="more-guides" className="space-y-3">
      <h2 id="more-guides" className="text-sm font-bold text-[#08233F] uppercase tracking-wider">{t('More guides')}</h2>
      <ul className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-subtle overflow-hidden">
        {others.map(other => (
          <li key={other.key}>
            <Link
              to={`/blogs/${other.slug}`}
              className="flex items-center justify-between gap-3 min-h-[56px] px-4 sm:px-5 py-3 hover:bg-slate-50 transition-colors"
            >
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#08233F] break-words">{other.title}</span>
                <span className="block text-[11px] font-semibold text-slate-500 mt-0.5">{other.badge}</span>
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const guide = getBlogPost(slug);
  if (guide) return <GuidePost post={guide} />;
  return <AdminBlogPost slug={slug || ''} />;
};

/** A built-in guide (src/data/blogPosts.ts). */
const GuidePost: React.FC<{ post: BlogPost }> = ({ post }) => {
  const { t, lang } = useLanguage();

  usePageMeta({
    title: blogPostTitle(post),
    description: post.description,
    canonical: blogPostUrl(post.slug),
    ogType: 'article',
    jsonLd: blogPostJsonLd(post),
    image: getBlogCoverUrl(post.slug) ? new URL(getBlogCoverUrl(post.slug)!, SITE_URL).href : undefined
  });

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

      <MoreBlogs currentSlug={post.slug} />
    </div>
  );
};

/** A blog written in Admin -> Blog Management. */
const AdminBlogPost: React.FC<{ slug: string }> = ({ slug }) => {
  const { t, lang } = useLanguage();
  const [blog, setBlog] = useState<AdminBlog | undefined | null>(undefined);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setState('loading');
    void fetchBlogBySlug(slug).then(result => {
      if (!live) return;
      setBlog(result);
      setState(result === null ? 'error' : result ? 'ready' : 'missing');
    });
    return () => { live = false; };
  }, [slug, attempt]);

  const prepared = useMemo(
    () => (blog ? headingsFromHtml(sanitizeBlogHtml(blog.contentHtml)) : { html: '', headings: [] }),
    [blog]
  );

  const hidden = Boolean(blog && (blog.status !== 'active' || new Date(blog.publishedAt).getTime() > Date.now()));
  const url = `${SITE_URL}/blogs/${slug}/`;
  const description = blog ? (blog.metaDescription || blog.summary || summaryFromHtml(blog.contentHtml)) : '';
  usePageMeta(state === 'ready' && blog
    ? {
        title: blog.metaTitle || (blog.title.includes('Driver Hub') ? blog.title : `${blog.title} | Driver Hub`),
        description,
        canonical: url,
        ogType: 'article',
        noindex: hidden,
        image: blog.coverUrl || undefined,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: blog.title,
          description,
          datePublished: blog.publishedAt,
          dateModified: blog.updatedAt,
          url,
          mainEntityOfPage: url,
          image: blog.coverUrl ? [blog.coverUrl] : undefined,
          keywords: blog.metaKeywords || undefined,
          articleSection: blog.category || undefined,
          author: { '@type': 'Organization', name: 'Driver Hub', url: `${SITE_URL}/` },
          publisher: {
            '@type': 'Organization',
            name: 'Driver Hub',
            url: `${SITE_URL}/`,
            logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo-icon-1024.png` }
          }
        }
      }
    : {
        title: state === 'missing' ? 'Blog not found | Driver Hub' : 'Blog | Driver Hub',
        description: 'Driver Hub blog.',
        noindex: state !== 'loading'
      });

  if (state === 'missing') return <NotFoundPage />;

  if (state === 'loading') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center gap-3 text-sm text-slate-500" role="status">
        <LoaderCircle className="w-6 h-6 animate-spin text-[#08233F]" aria-hidden="true" />
        {t('Loading blog…')}
      </div>
    );
  }

  if (state === 'error' || !blog) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4" role="alert">
        <p className="text-base font-bold text-[#08233F]">{t('This blog could not be loaded.')}</p>
        <p className="text-sm text-slate-600">{t('Please check your internet connection and try again.')}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => setAttempt(n => n + 1)}
            className="inline-flex min-h-[44px] items-center rounded-xl bg-[#08233F] px-5 text-sm font-bold text-white cursor-pointer">{t('Try again')}</button>
          <Link to="/blogs" className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-200 px-5 text-sm font-bold text-[#08233F]">{t('All blogs')}</Link>
        </div>
      </div>
    );
  }

  const item = adminBlogToItem(blog, t, lang);
  const toc = prepared.headings.length >= 2 ? prepared.headings : [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {hidden && (
        <p role="status" className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          <EyeOff className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          {t('Preview: this blog is hidden from visitors (Inactive or a future date). Only admins can see it.')}
        </p>
      )}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs font-semibold text-slate-500 min-w-0">
        <Link to="/blogs" className="inline-flex items-center gap-1.5 min-h-[40px] text-slate-600 hover:text-[#08233F] shrink-0">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> {t('All blogs')}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        <span className="truncate" aria-current="page">{blog.title}</span>
      </nav>

      <article className="space-y-8">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-slate-500">
            <span className={`px-2.5 py-0.5 rounded-full border font-bold ${categoryStyle(blog.category)}`}>{item.badge}</span>
            <time dateTime={blog.publishedAt}>{formatBlogDateTime(blog.publishedAt, lang)}</time>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              {t('{count} min read', { count: readingMinutesFromHtml(blog.contentHtml) })}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#08233F] font-display tracking-tight leading-tight break-words">
            {blog.title}
          </h1>
          {blog.summary && <p className="text-base sm:text-lg text-slate-600 leading-relaxed break-words">{blog.summary}</p>}
          {blog.coverUrl && <BlogItemCover item={item} className="rounded-2xl border border-slate-200" />}
        </header>

        {toc.length > 0 && (
          <nav aria-label={t('On this page')} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#08233F]">{t('On this page')}</p>
            <ol className="mt-2 space-y-1.5 list-decimal pl-5 text-sm">
              {toc.map(heading => (
                <li key={heading.id}>
                  <a href={`#${heading.id}`} className="font-semibold text-blue-700 hover:text-blue-900 break-words"
                    onClick={event => {
                      event.preventDefault();
                      document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}>
                    {heading.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-subtle min-w-0">
          <div className="dh-blog-content" dangerouslySetInnerHTML={{ __html: prepared.html }} />
        </section>
      </article>

      <BlogHelpBox />

      <MoreBlogs currentSlug={blog.slug} />
    </div>
  );
};
