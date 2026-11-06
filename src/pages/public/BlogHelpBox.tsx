import React from 'react';
import { Link } from 'react-router-dom';
import { LifeBuoy, Phone } from 'lucide-react';
import { useLanguage } from '../../services/i18n';
import { SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY } from '../../lib/supportContact';

/** "Need help?" box at the end of the blog pages. */
export const BlogHelpBox: React.FC = () => {
  const { t } = useLanguage();
  return (
    <aside className="bg-amber-50 border border-amber-200 rounded-2xl p-5 sm:p-7 shadow-subtle space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-white border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
          <LifeBuoy className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 space-y-1">
          <h2 className="text-base sm:text-lg font-bold font-display text-[#08233F]">{t('Need help?')}</h2>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {t('Call Driver Hub support, or open the support chat and tap "{button}" to ask for a call back.', { button: t('Drop a message') })}
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={`tel:${SUPPORT_PHONE}`}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl bg-[#08233F] hover:bg-[#051626] text-white text-xs sm:text-sm font-bold shadow-md transition-colors"
        >
          <Phone className="w-4 h-4 text-amber-400" aria-hidden="true" /> {SUPPORT_PHONE_DISPLAY}
        </a>
        <Link
          to="/contact"
          className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-[#08233F] text-xs sm:text-sm font-bold transition-colors"
        >
          {t('Contact')}
        </Link>
      </div>
    </aside>
  );
};
