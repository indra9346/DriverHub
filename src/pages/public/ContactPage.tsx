import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, ShieldAlert, Copy } from 'lucide-react';
import { useLanguage } from '../../services/i18n';
import { SocialLinks } from '../../components/common/SocialLinks';

// The support address shown on this page. The form does not send anything
// itself: it opens the visitor's email app with this address and their message.
const SUPPORT_EMAIL = 'support@driverhub.in';
// mailto: links longer than ~2000 characters are cut off by some email apps.
const MAX_MAILTO_BODY = 1500;

export const ContactPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [composedMailto, setComposedMailto] = useState<string | null>(null);
  const [composedText, setComposedText] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'Driver Support Query',
    message: ''
  });

  const buildMessage = () => [
    formData.message.trim(),
    '',
    '---',
    `Name: ${formData.name.trim()}`,
    `Phone: ${formData.phone.trim()}`,
    `Email: ${formData.email.trim()}`,
    `Topic: ${formData.subject}`
  ].join('\n');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = `[${formData.subject}] ${formData.name.trim()}`.trim();
    const fullText = buildMessage();
    // Email apps cut long mailto: links, and the limit applies to the encoded
    // text. Shorten by whole characters (Array.from keeps emoji intact).
    let body = fullText;
    if (encodeURIComponent(body).length > MAX_MAILTO_BODY) {
      const chars = Array.from(fullText);
      const note = '\n\n(Message shortened. Please paste the rest here.)';
      let keep = chars.length;
      while (keep > 0 && encodeURIComponent(chars.slice(0, keep).join('') + note).length > MAX_MAILTO_BODY) {
        keep = Math.floor(keep * 0.9);
      }
      body = chars.slice(0, keep).join('') + note;
    }
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setComposedText(`Subject: ${subject}\n\n${fullText}`);
    setComposedMailto(mailto);
    setCopyStatus('idle');
    // Hand the message to the visitor's email app. Nothing is sent from this site.
    window.location.href = mailto;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(composedText);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  };

  const inputClass = 'w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">{t('Get in Touch')}</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#08233F] font-display tracking-tight">
          {t("We're Here to Help Drivers & Fleets")}
        </h1>
        <p className="text-sm text-slate-600">
          {t('Have questions about job listings, RTO verification, or enterprise fleet hiring? Reach out to our dedicated support desk.')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact Info Col */}
        <div className="lg:col-span-5 bg-[#08233F] text-white p-6 sm:p-8 rounded-2xl space-y-6 shadow-elevated relative overflow-hidden min-w-0">
          <div className="space-y-2">
            <h3 className="text-lg font-bold font-display text-white">{t('Central Operations & Helpdesk')}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t('Our national dispatch & verification desk is based in Bengaluru with regional support coordinators across South and Western India.')}
            </p>
          </div>

          <div className="space-y-4 text-xs text-slate-200">
            <div className="flex items-start gap-3 min-w-0">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span className="break-words min-w-0">DriverHub HQ, 2nd Floor, Phase 1, Electronic City, Bengaluru - 560100</span>
            </div>
            <div className="flex items-center gap-3 min-w-0">
              <Phone className="w-4 h-4 text-amber-400 shrink-0" />
              <a href="tel:+918022008899" className="inline-flex items-center min-h-[40px] hover:text-white font-semibold break-words">
                +91 80 2200 8899
              </a>
            </div>
            <div className="flex items-center gap-3 min-w-0">
              <Mail className="w-4 h-4 text-amber-400 shrink-0" />
              <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex items-center min-h-[40px] hover:text-white break-all">
                {SUPPORT_EMAIL}
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{lang === 'kn' ? 'ಸೋಮವಾರ - ಶನಿವಾರ (ಬೆಳಿಗ್ಗೆ 9:00 - ಸಂಜೆ 7:00 IST)' : 'Monday - Saturday (9:00 AM - 7:00 PM IST)'}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">{t('Follow Us')}</h4>
            <SocialLinks />
          </div>

          <div className="pt-4 border-t border-white/10 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
              <ShieldAlert className="w-4 h-4" /> Emergency on the road?
            </div>
            <p className="text-[11px] text-slate-300">
              For an accident, medical emergency or threat to your safety, call India&apos;s national emergency number{' '}
              <a href="tel:112" className="font-bold text-white underline">112</a>. This support desk cannot dispatch help.
            </p>
          </div>
        </div>

        {/* Form Col */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-8 rounded-2xl border border-slate-200 shadow-card min-w-0">
          {composedMailto ? (
            <div className="text-center py-8 space-y-4" role="status" aria-live="polite">
              <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#08233F] font-display">Your email app will open</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                We filled in a message to <strong className="break-all">{SUPPORT_EMAIL}</strong>. It is only sent when you
                press Send in your email app. If no email app opened, copy the message below and email it to us.
              </p>
              <pre className="text-left text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-48 overflow-auto whitespace-pre-wrap break-words">
                {composedText}
              </pre>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href={composedMailto}
                  className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 bg-[#08233F] hover:bg-[#051626] text-white text-xs font-bold rounded-xl transition-all"
                >
                  <Send className="w-4 h-4 text-amber-400" /> Open email again
                </a>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  <Copy className="w-4 h-4" /> {copyStatus === 'copied' ? 'Copied' : 'Copy message'}
                </button>
                <button
                  type="button"
                  onClick={() => setComposedMailto(null)}
                  className="inline-flex items-center min-h-[44px] px-4 text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                >
                  Edit message
                </button>
              </div>
              {copyStatus === 'failed' && (
                <p role="alert" className="text-[11px] text-rose-700">
                  Could not copy automatically. Select the text above and copy it.
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                This form opens your email app with your message addressed to <span className="break-all">{SUPPORT_EMAIL}</span>.
                Nothing is sent until you press Send there.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-semibold text-slate-700 mb-1.5">{t('Full Name')}</label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    autoComplete="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your full name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="contact-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">{t('Phone Number')}</label>
                  <input
                    id="contact-phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-email" className="block text-xs font-semibold text-slate-700 mb-1.5">{t('Email Address')}</label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@example.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="contact-subject" className="block text-xs font-semibold text-slate-700 mb-1.5">{t('Inquiry Subject')}</label>
                  <select
                    id="contact-subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option value="Driver Support Query">{t('Driver Support Query')}</option>
                    <option value="Employer Fleet Hiring">{t('Employer Fleet Hiring')}</option>
                    <option value="Document Verification Help">{t('Document Verification Help')}</option>
                    <option value="Report Listing Issue">{t('Report Listing Issue')}</option>
                    <option value="Other">{t('Other Query')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs font-semibold text-slate-700 mb-1.5">{t('Message')}</label>
                <textarea
                  id="contact-message"
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder={lang === 'kn' ? 'ನಮ್ಮ ನೇಮಕಾತಿ ತಂಡವು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?' : 'How can our recruitment team assist you today?'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[44px] py-3 bg-[#08233F] hover:bg-[#051626] text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4 text-amber-400" /> Write email to support
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
