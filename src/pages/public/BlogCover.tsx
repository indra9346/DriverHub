import React from 'react';
import { Building2, IdCard, Smartphone, Truck } from 'lucide-react';
import { BlogPost } from '../../data/blogPosts';

/*
 * Cover photos are picked up from src/assets/blog/<slug>.jpg (.jpeg/.png/.webp)
 * at build time. A post without a photo shows a neutral placeholder, so a
 * missing file never shows as a broken image.
 */
const coverFiles = import.meta.glob('../../assets/blog/*.{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const coverBySlug: Record<string, string> = Object.fromEntries(
  Object.entries(coverFiles).map(([file, url]) => [file.split('/').pop()!.replace(/\.[^.]+$/, ''), url])
);

export const getBlogCoverUrl = (slug: string): string | undefined => coverBySlug[slug];

const ICONS: Record<BlogPost['coverIcon'], React.ElementType> = {
  truck: Truck,
  licence: IdCard,
  office: Building2,
  phone: Smartphone,
};

export const BlogCover: React.FC<{ post: BlogPost; className?: string; lazy?: boolean }> = ({ post, className = '', lazy = false }) => {
  const url = getBlogCoverUrl(post.slug);
  if (url) {
    return (
      <img
        src={url}
        alt={post.coverAlt}
        width={1600}
        height={900}
        loading={lazy ? 'lazy' : undefined}
        decoding="async"
        className={`w-full aspect-video object-cover bg-slate-100 ${className}`}
      />
    );
  }

  const Icon = ICONS[post.coverIcon];
  return (
    <div
      aria-hidden="true"
      className={`relative w-full aspect-video overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-amber-50 flex items-center justify-center ${className}`}
    >
      <div className="absolute -right-10 -top-12 w-48 h-48 rounded-full bg-white/60" />
      <div className="absolute -left-8 -bottom-16 w-44 h-44 rounded-full bg-amber-100/60" />
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-slate-200 shadow-subtle flex items-center justify-center">
        <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-[#08233F]" strokeWidth={1.75} />
      </div>
    </div>
  );
};
