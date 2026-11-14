import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sanitizeBlogHtml, summaryFromHtml } from '../lib/blogHtml';
import { BLOG_POSTS } from '../data/blogPosts';

/*
 * Blogs written in Admin -> Blog Management (table public.driverhub_blogs,
 * pictures in the public storage bucket "driverhub-blog-images"; see
 * supabase-blogs-admin-2026-11.sql). Visitors only receive Active blogs whose
 * date has come; the database enforces that, and only active administrators
 * can add, change or delete blogs and pictures.
 */

export const BLOG_TABLE = 'driverhub_blogs';
export const BLOG_IMAGE_BUCKET = 'driverhub-blog-images';
export const BLOG_IMAGE_MAX_BYTES = 6 * 1024 * 1024;
export const BLOG_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Web addresses of the built-in guides cannot be reused. */
export const RESERVED_BLOG_SLUGS = new Set(BLOG_POSTS.map(post => post.slug));

export type BlogStatus = 'active' | 'inactive';

export interface AdminBlog {
  id: string;
  slug: string;
  name: string;
  title: string;
  category: string;
  summary: string;
  contentHtml: string;
  coverUrl: string;
  coverPath: string;
  coverAlt: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  status: BlogStatus;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogInput {
  slug: string;
  name: string;
  title: string;
  category: string;
  summary: string;
  contentHtml: string;
  coverUrl: string;
  coverPath: string;
  coverAlt: string;
  status: BlogStatus;
  publishedAt: string;
}

export interface BlogSeoInput {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  slug: string;
}

type BlogRow = {
  id: string; slug: string; name: string; title: string; category: string | null; summary: string | null;
  content_html: string | null; cover_url: string | null; cover_path: string | null; cover_alt: string | null;
  meta_title: string | null; meta_description: string | null; meta_keywords: string | null; status: string;
  published_at: string; created_at: string; updated_at: string;
};

const COLUMNS = 'id,slug,name,title,category,summary,content_html,cover_url,cover_path,cover_alt,meta_title,meta_description,meta_keywords,status,published_at,created_at,updated_at';
const LIST_COLUMNS = 'id,slug,name,title,category,summary,cover_url,cover_alt,status,published_at,updated_at,content_html';

const fromRow = (row: BlogRow): AdminBlog => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  title: row.title,
  category: row.category || '',
  summary: row.summary || '',
  contentHtml: row.content_html || '',
  coverUrl: row.cover_url || '',
  coverPath: row.cover_path || '',
  coverAlt: row.cover_alt || '',
  metaTitle: row.meta_title || '',
  metaDescription: row.meta_description || '',
  metaKeywords: row.meta_keywords || '',
  status: row.status === 'inactive' ? 'inactive' : 'active',
  publishedAt: row.published_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

/** The blog table is not there yet (the setup SQL has not been run). */
export class BlogSetupMissingError extends Error {
  constructor() {
    super('Blog storage is not set up yet. Run supabase-blogs-admin-2026-11.sql in the Supabase SQL Editor once.');
    this.name = 'BlogSetupMissingError';
  }
}

const isMissingTable = (error: { code?: string; message?: string } | null) =>
  Boolean(error && (error.code === '42P01' || error.code === 'PGRST205'
    || /could not find the table|relation .* does not exist/i.test(error.message || '')));

const friendly = (error: { code?: string; message?: string; details?: string | null }): Error => {
  if (isMissingTable(error)) return new BlogSetupMissingError();
  if (error.code === '23505') return new Error('Another blog already uses this web address. Change the Blog Name or the address in SEO.');
  if (error.code === '23514') return new Error('Some details are not allowed (check the web address, picture and lengths).');
  if (error.code === '42501') return new Error('Only an active DriverHub administrator can change blogs. Sign in again as admin.');
  return new Error(error.message || 'The blog could not be saved.');
};

// ---------------------------------------------------------------------------
// Visitors
// ---------------------------------------------------------------------------

/** Published blogs, newest first. Never throws: the built-in guides still show if this fails. */
export async function fetchPublishedBlogs(): Promise<AdminBlog[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from(BLOG_TABLE)
      .select(LIST_COLUMNS)
      .eq('status', 'active')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(200);
    if (error) return [];
    return (data as unknown as BlogRow[]).map(fromRow);
  } catch {
    return [];
  }
}

/**
 * One blog by its address. Visitors get it only when published; a signed-in
 * admin also gets hidden and scheduled ones (the database decides).
 * Returns undefined when there is no such blog, null when it could not be checked.
 */
export async function fetchBlogBySlug(slug: string): Promise<AdminBlog | undefined | null> {
  if (!isSupabaseConfigured || !slug) return undefined;
  try {
    const { data, error } = await supabase.from(BLOG_TABLE).select(COLUMNS).eq('slug', slug).maybeSingle();
    if (error) return isMissingTable(error) ? undefined : null;
    return data ? fromRow(data as unknown as BlogRow) : undefined;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function fetchAllBlogsForAdmin(): Promise<AdminBlog[]> {
  const { data, error } = await supabase
    .from(BLOG_TABLE)
    .select(COLUMNS)
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw friendly(error);
  return (data as unknown as BlogRow[]).map(fromRow);
}

const toRow = (input: BlogInput) => {
  const contentHtml = sanitizeBlogHtml(input.contentHtml);
  return {
    slug: input.slug,
    name: input.name.trim(),
    title: (input.title.trim() || input.name.trim()),
    category: input.category.trim(),
    summary: (input.summary.trim() || summaryFromHtml(contentHtml, 200)).slice(0, 320),
    content_html: contentHtml,
    cover_url: input.coverUrl,
    cover_path: input.coverPath,
    cover_alt: input.coverAlt.trim(),
    status: input.status,
    published_at: new Date(input.publishedAt).toISOString()
  };
};

export async function createBlog(input: BlogInput): Promise<AdminBlog> {
  const { data, error } = await supabase.from(BLOG_TABLE).insert(toRow(input)).select(COLUMNS).single();
  if (error) throw friendly(error);
  return fromRow(data as unknown as BlogRow);
}

export async function updateBlog(id: string, input: BlogInput): Promise<AdminBlog> {
  const { data, error } = await supabase.from(BLOG_TABLE).update(toRow(input)).eq('id', id).select(COLUMNS).single();
  if (error) throw friendly(error);
  return fromRow(data as unknown as BlogRow);
}

export async function updateBlogSeo(id: string, seo: BlogSeoInput): Promise<AdminBlog> {
  const { data, error } = await supabase.from(BLOG_TABLE).update({
    meta_title: seo.metaTitle.trim().slice(0, 200),
    meta_description: seo.metaDescription.trim().slice(0, 320),
    meta_keywords: seo.metaKeywords.trim().slice(0, 300),
    slug: seo.slug
  }).eq('id', id).select(COLUMNS).single();
  if (error) throw friendly(error);
  return fromRow(data as unknown as BlogRow);
}

export async function setBlogStatus(id: string, status: BlogStatus): Promise<void> {
  const { error } = await supabase.from(BLOG_TABLE).update({ status }).eq('id', id);
  if (error) throw friendly(error);
}

export async function deleteBlog(blog: AdminBlog): Promise<void> {
  const { error } = await supabase.from(BLOG_TABLE).delete().eq('id', blog.id);
  if (error) throw friendly(error);
  if (blog.coverPath) await removeBlogImage(blog.coverPath);
}

/** Is this web address free? (Built-in guide addresses never are.) */
export async function isBlogSlugFree(slug: string, ignoreId?: string): Promise<boolean> {
  if (RESERVED_BLOG_SLUGS.has(slug)) return false;
  let query = supabase.from(BLOG_TABLE).select('id').eq('slug', slug).limit(1);
  if (ignoreId) query = query.neq('id', ignoreId);
  const { data, error } = await query;
  if (error) throw friendly(error);
  return !data || data.length === 0;
}

/** A free address made from the wanted one (adds -2, -3 ... when taken). */
export async function uniqueBlogSlug(wanted: string, ignoreId?: string): Promise<string> {
  const base = wanted || `blog-${Date.now()}`;
  let candidate = base;
  for (let n = 2; n < 60; n += 1) {
    if (await isBlogSlugFree(candidate, ignoreId)) return candidate;
    candidate = `${base}-${n}`.slice(0, 120);
  }
  return `${base}-${Date.now()}`;
}

const extensionFor = (type: string) => (type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg');

export function checkBlogImage(file: File): string | null {
  if (!BLOG_IMAGE_TYPES.includes(file.type)) return 'Please choose a JPG, JPEG, PNG or WEBP picture.';
  if (file.size > BLOG_IMAGE_MAX_BYTES) return 'This picture is larger than 6 MB. Please choose a smaller one.';
  return null;
}

/** Uploads a picture and returns its public address and storage path. */
export async function uploadBlogImage(file: File, folder: 'covers' | 'content'): Promise<{ url: string; path: string }> {
  const problem = checkBlogImage(file);
  if (problem) throw new Error(problem);
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
  const path = `${folder}/${new Date().toISOString().slice(0, 10)}-${random}.${extensionFor(file.type)}`;
  const { error } = await supabase.storage.from(BLOG_IMAGE_BUCKET).upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false
  });
  if (error) {
    if (/bucket not found/i.test(error.message)) throw new BlogSetupMissingError();
    if (/row-level security|unauthori[sz]ed|403/i.test(error.message)) {
      throw new Error('Only an active DriverHub administrator can upload blog pictures. Sign in again as admin.');
    }
    throw new Error(error.message || 'The picture could not be uploaded.');
  }
  const { data } = supabase.storage.from(BLOG_IMAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function removeBlogImage(path: string): Promise<void> {
  if (!path) return;
  try {
    await supabase.storage.from(BLOG_IMAGE_BUCKET).remove([path]);
  } catch {
    // A picture that cannot be removed only takes a little storage.
  }
}
