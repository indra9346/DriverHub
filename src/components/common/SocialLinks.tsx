import React from 'react';
import { Facebook, Instagram, Youtube } from 'lucide-react';
import { useLanguage } from '../../services/i18n';

// Driver Hub's official social media pages. The same links are listed as
// "sameAs" in the LocalBusiness structured data in index.html; keep both in sync.
export const SOCIAL_LINKS = [
  { name: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61595727698682', Icon: Facebook },
  { name: 'YouTube', href: 'https://www.youtube.com/@driverhub123', Icon: Youtube },
  { name: 'Instagram', href: 'https://www.instagram.com/info.driver_hub/', Icon: Instagram },
] as const;

// Round icon links to the social pages, for dark backgrounds (footer, contact card).
export const SocialLinks: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useLanguage();

  return (
    <ul className={`flex flex-wrap items-center gap-2.5 ${className}`} aria-label={t('Driver Hub on social media')}>
      {SOCIAL_LINKS.map(({ name, href, Icon }) => (
        <li key={name}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Driver Hub on ${name} (opens in a new tab)`}
            title={`Driver Hub on ${name}`}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-slate-700/90 text-slate-300 hover:text-amber-400 hover:border-amber-400/60 hover:bg-amber-400/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
};
