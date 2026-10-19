import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, EllipsisVertical, Share, Smartphone, SquarePlus, X } from 'lucide-react';
import { useLanguage } from '../../services/i18n';
import { useInstallApp } from '../../services/installApp';

// "Download App" card: installs Driver Hub on the phone's home screen. Where
// the browser cannot show its own install prompt (iPhone, or a link opened
// inside WhatsApp) it shows the steps instead. Hidden inside the installed app.
export const InstallAppButton: React.FC<{ variant?: 'light' | 'dark' }> = ({ variant = 'light' }) => {
  const { t } = useLanguage();
  const { isInstalled, canPrompt, isIos, promptInstall } = useInstallApp();
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    if (!showSteps) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowSteps(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showSteps]);

  if (isInstalled) return null;

  const handleDownload = async () => {
    if (canPrompt && (await promptInstall()) !== 'unavailable') return;
    setShowSteps(true);
  };

  const dark = variant === 'dark';
  const steps = isIos
    ? [
        { icon: Share, text: t('Tap the Share button at the bottom of Safari.') },
        { icon: SquarePlus, text: t('Choose "Add to Home Screen".') },
        { icon: Smartphone, text: t('Tap "Add". Driver Hub appears on your home screen.') }
      ]
    : [
        { icon: EllipsisVertical, text: t('Open the browser menu (⋮) at the top right.') },
        { icon: SquarePlus, text: t('Choose "Install app" or "Add to Home screen".') },
        { icon: Smartphone, text: t('Tap "Install". Driver Hub appears on your home screen.') }
      ];

  return (
    <>
      <div className={`p-3 rounded-2xl border ${
        dark ? 'bg-white/5 border-slate-700/80' : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-center gap-3">
          <img src="/logo-192.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>{t('Get the Driver Hub app')}</p>
            <p className={`text-[11px] leading-snug mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
              {t('Opens from your home screen like an app. Free, no Play Store needed.')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-xs transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{t('Download App')}</span>
        </button>
      </div>

      {showSteps && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setShowSteps(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-app-title"
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 text-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src="/logo-192.png" alt="" className="w-10 h-10 rounded-xl" />
                <h2 id="install-app-title" className="text-base font-extrabold text-[#08233F]">
                  {isIos ? t('Install on iPhone') : t('Install Driver Hub')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSteps(false)}
                aria-label={t('Close')}
                className="inline-flex items-center justify-center w-10 h-10 -mr-2 -mt-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ol className="mt-4 space-y-3">
              {steps.map(({ icon: Icon, text }, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-[#08233F] text-white text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="flex-1 pt-1 leading-snug">{text}</span>
                  <Icon className="shrink-0 w-5 h-5 mt-1 text-amber-600" aria-hidden="true" />
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-slate-500 leading-snug">
              {isIos
                ? t('Opened this link inside WhatsApp or another app? Open it in Safari first.')
                : t('Opened this link inside WhatsApp or another app? Open it in Chrome first.')}
            </p>
            <button
              type="button"
              onClick={() => setShowSteps(false)}
              className="mt-4 w-full min-h-[44px] rounded-xl bg-[#08233F] hover:bg-[#051626] text-white text-sm font-bold cursor-pointer"
            >
              {t('Close')}
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
