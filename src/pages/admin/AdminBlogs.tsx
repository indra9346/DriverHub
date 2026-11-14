import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen, ExternalLink, ImageIcon, LoaderCircle, Pencil, Plus, RotateCw, Search, Trash2, X
} from 'lucide-react';
import { useLanguage } from '../../services/i18n';
import { formatAdminDate } from '../../services/adminApi';
import {
  AdminBlog, BlogInput, BlogSetupMissingError, BlogStatus, checkBlogImage, createBlog, deleteBlog,
  fetchAllBlogsForAdmin, isBlogSlugFree, removeBlogImage, RESERVED_BLOG_SLUGS, setBlogStatus, uniqueBlogSlug,
  updateBlog, updateBlogSeo, uploadBlogImage
} from '../../services/blogApi';
import { blogSlugFromName, slugifyBlog } from '../../lib/blogHtml';
import { getSortedBlogPosts } from '../../data/blogPosts';
import { AdminModal, ConfirmDialog } from './AdminUi';
import { BlogRichEditor } from './BlogRichEditor';

/*
 * Admin -> Blog Management. Same format as the Hosting Baba / JobHunterr
 * admin panels: a table of blogs with SEO, View, Edit and Delete, and an
 * "Add New Blog" form (Blog Name, Thumbnail, Title, Category, Description).
 */

const CATEGORY_SUGGESTIONS = ['Drivers', 'Employers', 'Everyone', 'Driving tips', 'Safety', 'Careers', 'News'];
const PAGE_SIZES = [10, 25, 50, 100];

/** "2026-11-14T10:30" in the admin's own time zone, for a datetime-local box. */
const toLocalInput = (iso?: string) => {
  const date = iso ? new Date(iso) : new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

type FormState = {
  name: string;
  title: string;
  category: string;
  summary: string;
  coverAlt: string;
  status: BlogStatus;
  publishedAt: string;
  contentHtml: string;
};

const emptyForm = (): FormState => ({
  name: '', title: '', category: '', summary: '', coverAlt: '', status: 'active', publishedAt: toLocalInput(), contentHtml: ''
});

const fieldClass = 'block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15';
const labelClass = 'mb-1.5 block text-sm font-bold text-slate-700';
const helpClass = 'mt-1.5 text-xs text-slate-500';

export const AdminBlogs: React.FC = () => {
  const { t, lang } = useLanguage();
  const [blogs, setBlogs] = useState<AdminBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupMissing, setSetupMissing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [workingId, setWorkingId] = useState('');

  // Add / edit
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBlog | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editorKey, setEditorKey] = useState(0);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // SEO
  const [seoBlog, setSeoBlog] = useState<AdminBlog | null>(null);
  const [seo, setSeo] = useState({ metaTitle: '', metaDescription: '', metaKeywords: '', slug: '' });
  const [seoSaving, setSeoSaving] = useState(false);
  const [seoError, setSeoError] = useState('');

  // Delete
  const [deleting, setDeleting] = useState<AdminBlog | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadSeq = useRef(0);
  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const list = await fetchAllBlogsForAdmin();
      if (seq !== loadSeq.current) return;
      setBlogs(list);
      setSetupMissing(false);
      setError('');
    } catch (e) {
      if (seq !== loadSeq.current) return;
      if (e instanceof BlogSetupMissingError) setSetupMissing(true);
      else setError(e instanceof Error ? e.message : 'Blogs could not be loaded.');
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => () => { if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview); }, [coverPreview]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return blogs;
    return blogs.filter(blog => `${blog.name} ${blog.title} ${blog.category} ${blog.slug}`.toLowerCase().includes(needle));
  }, [blogs, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const shown = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const now = Date.now();

  const newSlugPreview = editing ? editing.slug : (form.name.trim() ? blogSlugFromName(form.name) : '…');

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setCoverFile(null);
    setCoverPreview('');
    setFormError('');
    setEditorKey(key => key + 1);
    setEditorOpen(true);
  };

  const openEdit = (blog: AdminBlog) => {
    setEditing(blog);
    setForm({
      name: blog.name, title: blog.title, category: blog.category, summary: blog.summary, coverAlt: blog.coverAlt,
      status: blog.status, publishedAt: toLocalInput(blog.publishedAt), contentHtml: blog.contentHtml
    });
    setCoverFile(null);
    setCoverPreview(blog.coverUrl);
    setFormError('');
    setEditorKey(key => key + 1);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditorOpen(false);
  };

  const chooseCover = (file: File | undefined) => {
    if (!file) return;
    const problem = checkBlogImage(file);
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError('');
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const problems: string[] = [];
    const contentText = form.contentHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!form.name.trim()) problems.push('Please enter the Blog Name.');
    if (!editing && !coverFile) problems.push('Please choose a Blog Thumbnail picture.');
    if (!contentText && !/<(img|iframe)\b/i.test(form.contentHtml)) problems.push('Please write the Blog Description.');
    if (!form.publishedAt || Number.isNaN(new Date(form.publishedAt).getTime())) problems.push('Please choose a valid Blog Date.');
    if (problems.length) {
      setFormError(problems.join(' '));
      return;
    }
    setSaving(true);
    setFormError('');
    let uploaded: { url: string; path: string } | null = null;
    try {
      if (coverFile) uploaded = await uploadBlogImage(coverFile, 'covers');
      const slug = editing ? editing.slug : await uniqueBlogSlug(blogSlugFromName(form.name));
      const input: BlogInput = {
        slug,
        name: form.name,
        title: form.title,
        category: form.category,
        summary: form.summary,
        contentHtml: form.contentHtml,
        coverUrl: uploaded ? uploaded.url : (editing?.coverUrl || ''),
        coverPath: uploaded ? uploaded.path : (editing?.coverPath || ''),
        coverAlt: form.coverAlt || form.title || form.name,
        status: form.status,
        publishedAt: new Date(form.publishedAt).toISOString()
      };
      const saved = editing ? await updateBlog(editing.id, input) : await createBlog(input);
      if (editing && uploaded && editing.coverPath && editing.coverPath !== uploaded.path) await removeBlogImage(editing.coverPath);
      setEditorOpen(false);
      setNotice(editing ? `Blog "${saved.name}" updated.` : `Blog "${saved.name}" added.${saved.status === 'active' ? ' It is on the website now.' : ''}`);
      await load();
    } catch (e) {
      if (uploaded) await removeBlogImage(uploaded.path);
      if (e instanceof BlogSetupMissingError) setSetupMissing(true);
      setFormError(e instanceof Error ? e.message : 'The blog could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (blog: AdminBlog) => {
    setWorkingId(blog.id);
    setError('');
    try {
      const next: BlogStatus = blog.status === 'active' ? 'inactive' : 'active';
      await setBlogStatus(blog.id, next);
      setNotice(next === 'active' ? `"${blog.name}" is Active (shown on the website).` : `"${blog.name}" is Inactive (hidden from the website).`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The status could not be changed.');
    } finally {
      setWorkingId('');
    }
  };

  const openSeo = (blog: AdminBlog) => {
    setSeoBlog(blog);
    setSeo({ metaTitle: blog.metaTitle, metaDescription: blog.metaDescription, metaKeywords: blog.metaKeywords, slug: blog.slug });
    setSeoError('');
  };

  const saveSeo = async () => {
    if (!seoBlog || seoSaving) return;
    const slug = slugifyBlog(seo.slug);
    if (slug.length < 3) {
      setSeoError('The web address needs at least 3 letters or numbers.');
      return;
    }
    if (RESERVED_BLOG_SLUGS.has(slug)) {
      setSeoError('This web address belongs to a built-in guide. Please choose another.');
      return;
    }
    setSeoSaving(true);
    setSeoError('');
    try {
      if (slug !== seoBlog.slug && !(await isBlogSlugFree(slug, seoBlog.id))) {
        setSeoError('Another blog already uses this web address.');
        return;
      }
      await updateBlogSeo(seoBlog.id, { ...seo, slug });
      setNotice(`SEO details saved for "${seoBlog.name}".${slug !== seoBlog.slug ? ` New address: /blogs/${slug}` : ''}`);
      setSeoBlog(null);
      await load();
    } catch (e) {
      setSeoError(e instanceof Error ? e.message : 'The SEO details could not be saved.');
    } finally {
      setSeoSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await deleteBlog(deleting);
      setNotice(`Blog "${deleting.name}" deleted.`);
      setDeleting(null);
      await load();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'The blog could not be deleted.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const builtIn = getSortedBlogPosts();

  return (
    <div className="mx-auto max-w-7xl space-y-6 min-w-0">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-[#08233F]">{t('Blog Management')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('Blogs marked Active show on the website Blogs page, newest date first.')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { void load(); }} disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer">
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {t('refresh')}
          </button>
          <button type="button" onClick={openAdd} disabled={setupMissing}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60 cursor-pointer">
            <Plus className="h-4 w-4" /> {t('Add New Blog')}
          </button>
        </div>
      </header>

      {setupMissing && (
        <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">{t('Blog storage is not set up in the database yet.')}</p>
          <p className="mt-1">{t('Run the file supabase-blogs-admin-2026-11.sql once in the Supabase SQL Editor, then press Refresh.')}</p>
        </div>
      )}
      {notice && (
        <p role="status" className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 break-words">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label={t('close')} className="shrink-0 cursor-pointer"><X className="h-4 w-4" /></button>
        </p>
      )}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 break-words">{error}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            {t('Show')}
            <select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm cursor-pointer">
              {PAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
            </select>
            {t('entries per page')}
          </label>
          <label className="relative block sm:w-72">
            <span className="sr-only">{t('Search blogs')}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }}
              placeholder={t('Search name, title or category')}
              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-600" />
          </label>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-3 w-12">#</th>
                <th className="px-3 py-3 w-24">{t('Thumbnail')}</th>
                <th className="px-3 py-3">{t('Blog Name')}</th>
                <th className="px-3 py-3">{t('Blog Title')}</th>
                <th className="px-3 py-3">{t('Category')}</th>
                <th className="px-3 py-3 w-32">{t('Blog Date')}</th>
                <th className="px-3 py-3 w-28">{t('Status')}</th>
                <th className="px-3 py-3 w-64">{t('Action')}</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 ${loading && blogs.length ? 'opacity-60' : ''}`}>
              {loading && blogs.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center text-slate-500"><LoaderCircle className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center text-slate-500">
                  {blogs.length === 0 ? t('No blogs yet. Click Add New Blog to write the first one.') : t('No blogs match your search.')}
                </td></tr>
              ) : shown.map((blog, index) => {
                const scheduled = blog.status === 'active' && new Date(blog.publishedAt).getTime() > now;
                return (
                  <tr key={blog.id} className="align-top hover:bg-slate-50/60">
                    <td className="px-3 py-3 font-bold text-slate-400">{(currentPage - 1) * pageSize + index + 1}</td>
                    <td className="px-3 py-3">
                      {blog.coverUrl
                        ? <img src={blog.coverUrl} alt="" className="h-12 w-20 rounded-lg object-cover bg-slate-100" loading="lazy" />
                        : <span className="flex h-12 w-20 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><ImageIcon className="h-5 w-5" /></span>}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-bold text-slate-900 break-words">{blog.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500 break-all">/blogs/{blog.slug}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-700 break-words">{blog.title}</td>
                    <td className="px-3 py-3">
                      {blog.category
                        ? <span className="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-800">{blog.category}</span>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {formatAdminDate(blog.publishedAt, lang)}
                      {scheduled && <p className="mt-0.5 text-xs font-semibold text-amber-700">{t('Scheduled')}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <button type="button" onClick={() => { void toggleStatus(blog); }} disabled={workingId === blog.id}
                        title={blog.status === 'active' ? t('Click to hide from the website') : t('Click to show on the website')}
                        className={`inline-flex min-h-8 items-center rounded-lg px-3 text-xs font-extrabold cursor-pointer disabled:opacity-60 ${blog.status === 'active' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                        {workingId === blog.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : blog.status === 'active' ? t('Active') : t('Inactive')}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => openSeo(blog)}
                          className="inline-flex min-h-8 items-center rounded-lg bg-emerald-800 px-2.5 text-xs font-bold text-white hover:bg-emerald-900 cursor-pointer">SEO</button>
                        <a href={`/blogs/${blog.slug}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-sky-400 px-2.5 text-xs font-bold text-sky-950 hover:bg-sky-500">
                          {t('View')} <ExternalLink className="h-3 w-3" />
                        </a>
                        <button type="button" onClick={() => openEdit(blog)}
                          className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-amber-400 px-2.5 text-xs font-bold text-amber-950 hover:bg-amber-500 cursor-pointer">
                          <Pencil className="h-3 w-3" /> {t('Edit')}
                        </button>
                        <button type="button" onClick={() => { setDeleting(blog); setDeleteError(''); }}
                          className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-red-600 px-2.5 text-xs font-bold text-white hover:bg-red-700 cursor-pointer">
                          <Trash2 className="h-3 w-3" /> {t('Delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {filtered.length
              ? t('Showing {from} to {to} of {total} entries', {
                  from: (currentPage - 1) * pageSize + 1,
                  to: Math.min(currentPage * pageSize, filtered.length),
                  total: filtered.length
                })
              : ''}
          </span>
          {pages > 1 && (
            <div className="flex flex-wrap gap-1">
              <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 font-bold disabled:opacity-40 cursor-pointer">{t('Previous')}</button>
              {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
                <button key={n} type="button" onClick={() => setPage(n)} aria-current={n === currentPage ? 'page' : undefined}
                  className={`min-w-8 rounded-lg border px-2.5 py-1.5 font-bold cursor-pointer ${n === currentPage ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300'}`}>{n}</button>
              ))}
              <button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 font-bold disabled:opacity-40 cursor-pointer">{t('Next')}</button>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-[#08233F]"><BookOpen className="h-4 w-4 text-amber-500" /> {t('Built-in guides')}</h2>
        <p className="mt-1 text-xs text-slate-500">{t('These four step-by-step guides are part of the website itself and always show on the Blogs page.')}</p>
        <ul className="mt-3 divide-y divide-slate-100">
          {builtIn.map(post => (
            <li key={post.slug} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0 text-sm font-semibold text-slate-800 break-words">{post.title}</span>
              <a href={`/blogs/${post.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:underline">
                {t('View')} <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          ))}
        </ul>
      </section>

      {editorOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/60 p-0 backdrop-blur-xs sm:p-6"
          onKeyDown={event => { if (event.key === 'Escape' && !saving && !document.querySelector('.fixed.inset-0.z-\\[90\\]')) closeEditor(); }}>
          <form onSubmit={save} noValidate role="dialog" aria-modal="true" aria-labelledby="blog-editor-title"
            className="w-full max-w-4xl overflow-hidden bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between bg-emerald-700 px-5 py-4 text-white">
              <h2 id="blog-editor-title" className="text-lg font-extrabold">{editing ? t('Edit Blog') : t('Add New Blog')}</h2>
              <button type="button" onClick={closeEditor} disabled={saving} aria-label={t('close')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/15 disabled:opacity-50 cursor-pointer"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div>
                <label htmlFor="blog-name" className={labelClass}>{t('Blog Name')} <span className="text-red-600">*</span></label>
                <input id="blog-name" className={fieldClass} value={form.name} maxLength={160} placeholder={t('Blog Name')}
                  onChange={event => setForm(f => ({ ...f, name: event.target.value }))} autoFocus />
                <p className={helpClass}>
                  {editing ? t('Web address (change it in SEO):') : t('The web address is made from the Blog Name:')}{' '}
                  <span className="font-mono text-emerald-800 break-all">/blogs/{newSlugPreview}</span>
                </p>
              </div>

              <div>
                <label htmlFor="blog-cover" className={labelClass}>
                  {t('Blog Thumbnail (JPG, JPEG, PNG, WEBP)')} {!editing && <span className="text-red-600">*</span>}
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input id="blog-cover" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={event => chooseCover(event.target.files?.[0])}
                    className="block w-full rounded-xl border border-slate-300 bg-white text-sm file:mr-3 file:border-0 file:bg-slate-100 file:px-4 file:py-2.5 file:font-semibold file:text-slate-700 cursor-pointer" />
                  {coverPreview && <img src={coverPreview} alt={t('Thumbnail preview')} className="h-16 w-28 shrink-0 rounded-lg border border-slate-200 object-cover" />}
                </div>
                <p className={helpClass}>{t('Shown on the blog card and at the top of the blog. Wide pictures look best (about 1600 × 900). Up to 6 MB.')}</p>
              </div>

              <div>
                <label htmlFor="blog-title" className={labelClass}>{t('Blog Title')}</label>
                <input id="blog-title" className={fieldClass} value={form.title} maxLength={200} placeholder={t('Blog Title')}
                  onChange={event => setForm(f => ({ ...f, title: event.target.value }))} />
                <p className={helpClass}>{t('The heading readers see. Leave empty to use the Blog Name.')}</p>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="blog-category" className={labelClass}>{t('Blog Category')}</label>
                  <input id="blog-category" className={fieldClass} value={form.category} maxLength={60} list="blog-category-options"
                    placeholder={t('Blog Category')} onChange={event => setForm(f => ({ ...f, category: event.target.value }))} />
                  <datalist id="blog-category-options">
                    {Array.from(new Set([...CATEGORY_SUGGESTIONS, ...blogs.map(b => b.category).filter(Boolean)])).map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label htmlFor="blog-date" className={labelClass}>{t('Blog Date')}</label>
                  <input id="blog-date" type="datetime-local" className={fieldClass} value={form.publishedAt}
                    onChange={event => setForm(f => ({ ...f, publishedAt: event.target.value }))} />
                  <p className={helpClass}>{t('A future date keeps the blog hidden until that day.')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="blog-status" className={labelClass}>{t('Status')}</label>
                  <select id="blog-status" className={`${fieldClass} cursor-pointer`} value={form.status}
                    onChange={event => setForm(f => ({ ...f, status: event.target.value as BlogStatus }))}>
                    <option value="active">{t('Active (show on website)')}</option>
                    <option value="inactive">{t('Inactive (hidden)')}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="blog-alt" className={labelClass}>{t('Thumbnail description')} <span className="font-normal text-slate-400">{t('(optional)')}</span></label>
                  <input id="blog-alt" className={fieldClass} value={form.coverAlt} maxLength={200} placeholder={t('What the picture shows')}
                    onChange={event => setForm(f => ({ ...f, coverAlt: event.target.value }))} />
                </div>
              </div>

              <div>
                <label htmlFor="blog-summary" className={labelClass}>{t('Short summary')} <span className="font-normal text-slate-400">{t('(optional)')}</span></label>
                <textarea id="blog-summary" className={fieldClass} rows={2} maxLength={300} value={form.summary}
                  placeholder={t('One or two sentences shown on the blog card. Empty = the first lines of the blog.')}
                  onChange={event => setForm(f => ({ ...f, summary: event.target.value }))} />
              </div>

              <div>
                <span className={labelClass}>{t('Blog Description')} <span className="text-red-600">*</span></span>
                <BlogRichEditor
                  key={editorKey}
                  initialHtml={editing ? editing.contentHtml : ''}
                  onChange={html => setForm(f => ({ ...f, contentHtml: html }))}
                  onError={message => setFormError(message)}
                  placeholder={t('Write blog content here...')}
                />
                <p className={helpClass}>{t('Use the style menu for headings: each Heading also appears in the blog\'s "On this page" list.')}</p>
              </div>

              {formError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 break-words">{formError}</p>}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeEditor} disabled={saving}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-500 px-5 text-sm font-bold text-white hover:bg-slate-600 disabled:opacity-60 cursor-pointer">{t('close')}</button>
              <button type="submit" disabled={saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60 cursor-pointer">
                {saving && <LoaderCircle className="h-4 w-4 animate-spin" />} {editing ? t('Update Blog') : t('Save Blog')}
              </button>
            </div>
          </form>
        </div>
      )}

      <AdminModal
        open={Boolean(seoBlog)}
        onClose={() => setSeoBlog(null)}
        locked={seoSaving}
        eyebrow="SEO"
        title={seoBlog?.name || ''}
        subtitle={t('How this blog appears in Google and when shared.')}
        footer={(
          <>
            <button type="button" onClick={() => setSeoBlog(null)} disabled={seoSaving}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">{t('Cancel')}</button>
            <button type="button" onClick={() => { void saveSeo(); }} disabled={seoSaving}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60 cursor-pointer">
              {seoSaving && <LoaderCircle className="h-4 w-4 animate-spin" />} {t('Save SEO')}
            </button>
          </>
        )}
      >
        <div>
          <label htmlFor="seo-title" className={labelClass}>{t('Meta Title')}</label>
          <input id="seo-title" className={fieldClass} value={seo.metaTitle} maxLength={200}
            onChange={event => setSeo(s => ({ ...s, metaTitle: event.target.value }))} placeholder={seoBlog?.title} />
          <p className={helpClass}>{seo.metaTitle.length}/60 · {t('Empty = the Blog Title.')}</p>
        </div>
        <div>
          <label htmlFor="seo-description" className={labelClass}>{t('Meta Description')}</label>
          <textarea id="seo-description" className={fieldClass} rows={3} value={seo.metaDescription} maxLength={320}
            onChange={event => setSeo(s => ({ ...s, metaDescription: event.target.value }))} placeholder={seoBlog?.summary} />
          <p className={helpClass}>{seo.metaDescription.length}/160 · {t('Empty = the short summary.')}</p>
        </div>
        <div>
          <label htmlFor="seo-keywords" className={labelClass}>{t('Meta Keywords')}</label>
          <input id="seo-keywords" className={fieldClass} value={seo.metaKeywords} maxLength={300}
            onChange={event => setSeo(s => ({ ...s, metaKeywords: event.target.value }))} placeholder="driver jobs bangalore, truck driver" />
        </div>
        <div>
          <label htmlFor="seo-slug" className={labelClass}>{t('Web address')}</label>
          <div className="flex items-stretch">
            <span className="flex items-center rounded-l-xl border border-r-0 border-slate-300 bg-slate-100 px-3 font-mono text-xs text-slate-500">/blogs/</span>
            <input id="seo-slug" className={`${fieldClass} rounded-l-none font-mono`} value={seo.slug} maxLength={120}
              onChange={event => setSeo(s => ({ ...s, slug: event.target.value }))} />
          </div>
          <p className={helpClass}>{t('Changing the address breaks links that were already shared.')}</p>
        </div>
        {seoError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 break-words">{seoError}</p>}
      </AdminModal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('Delete this blog?')}
        body={deleting ? `"${deleting.name}" ${t('will be removed from the website and cannot be restored.')}` : ''}
        confirmLabel={t('Delete')}
        busy={deleteBusy}
        error={deleteError}
        onConfirm={() => { void confirmDelete(); }}
        onCancel={() => { if (!deleteBusy) setDeleting(null); }}
      />
    </div>
  );
};
