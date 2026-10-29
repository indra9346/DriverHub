import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Sparkles, PhoneCall, RefreshCw, ArrowLeft, CheckCircle2, LoaderCircle } from 'lucide-react';
import { AIMessage } from '../../types';
import { getBotWelcome, getSupportResponse } from '../../services/aiSupport';
import { useLanguage } from '../../services/i18n';
import { Link, useLocation } from 'react-router-dom';
import { newId } from '../../lib/ids';
import { DataStore } from '../../services/store';
import { normaliseIndianMobile, requestCallback } from '../../services/callbackApi';

// Full-screen chat pages where the floating launcher would cover the composer.
const HIDDEN_ON_PATHS = ['/driver/messages', '/employer/messages'];

/** Render **bold** and *italic* markers from the support answers as real emphasis. */
const renderRichText = (text: string): React.ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g).map((part, index) => {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });

/** Name and number from the signed-in account's profile, to prefill the call-back form. */
const getSavedContact = (): { name: string; phone: string } => {
  const user = DataStore.getCurrentUser();
  if (!user) return { name: '', phone: '' };
  const driver = user.role === 'driver' ? DataStore.getDriverById(user.id) : undefined;
  const employer = user.role === 'employer' ? DataStore.getEmployerById(user.id) : undefined;
  const name = driver?.fullName || employer?.contactPerson || '';
  return { name: name.trim(), phone: (driver?.phone || employer?.phone || user.phone || '').trim() };
};

export const AIChatbot: React.FC = () => {
  const { lang, t } = useLanguage();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>(() => [getBotWelcome(lang)]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  // "Drop a message": the visitor leaves a number and the team calls back.
  const [view, setView] = useState<'chat' | 'callback'>('chat');
  const [callbackForm, setCallbackForm] = useState({ name: '', phone: '', message: '' });
  const [callbackError, setCallbackError] = useState('');
  const [callbackSending, setCallbackSending] = useState(false);
  const [callbackSentTo, setCallbackSentTo] = useState('');

  // When language changes: cancel any pending response and reset messages to current language
  useEffect(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setIsTyping(false);
    setMessages([getBotWelcome(lang)]);
  }, [lang]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
    }
  }, [messages, isOpen]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    const userMsg: AIMessage = {
      id: newId(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString(lang === 'kn' ? 'kn-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      const reply = getSupportResponse(text, lang);
      setMessages(prev => [...prev, reply]);
      setIsTyping(false);
      typingTimeoutRef.current = null;
    }, 450);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleResetChat = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setIsTyping(false);
    setMessages([getBotWelcome(lang)]);
  };

  const openCallback = () => {
    const saved = getSavedContact();
    setCallbackForm(current => ({
      name: current.name || saved.name,
      phone: current.phone || saved.phone,
      message: current.message,
    }));
    setCallbackError('');
    setCallbackSentTo('');
    setView('callback');
  };

  const closeCallback = () => {
    if (callbackSending) return;
    setView('chat');
    setCallbackError('');
    setCallbackSentTo('');
  };

  const submitCallback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (callbackSending) return;
    const name = callbackForm.name.trim();
    const mobile = normaliseIndianMobile(callbackForm.phone);
    if (!name) {
      setCallbackError(t('Please enter your name.'));
      return;
    }
    if (!mobile) {
      setCallbackError(t('Please enter a valid 10-digit mobile number.'));
      return;
    }
    setCallbackError('');
    setCallbackSending(true);
    const result = await requestCallback({
      name,
      phone: mobile,
      message: callbackForm.message.trim(),
      page: location.pathname,
    });
    setCallbackSending(false);
    if (result === 'sent') {
      setCallbackSentTo(`+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`);
      setCallbackForm(current => ({ ...current, message: '' }));
    } else {
      setCallbackError(result === 'duplicate'
        ? t('We already have your request. Our team will call you soon.')
        : t('Could not send your request. Please try again.'));
    }
  };

  if (HIDDEN_ON_PATHS.some(path => location.pathname.startsWith(path))) return null;

  return (
    // z-40: below modals, drawers and dropdowns (z-50), so it never covers their buttons.
    <div className="fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] right-4 lg:bottom-6 lg:right-6 z-40">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={t('Support Assistant')}
          className="group relative flex items-center gap-2.5 bg-[#08233F] hover:bg-[#051626] text-white p-3 sm:px-4 sm:py-3 rounded-full shadow-elevated border border-slate-700/60 transition-all duration-200 hover:scale-[1.03] cursor-pointer"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-amber-400 group-hover:rotate-6 transition-transform" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
            )}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-bold leading-tight flex items-center gap-1">
              {t('Support Assistant')} <Sparkles className="w-3 h-3 text-amber-400" />
            </p>
            <p className="text-[10px] text-slate-300">{t('Instant Driver & Job Help')}</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse hidden sm:inline-block ml-1" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[calc(100vw-2rem)] sm:w-[390px] max-w-[390px] h-[520px] max-h-[calc(100vh-10.5rem)] supports-[height:100dvh]:max-h-[calc(100dvh-10.5rem-env(safe-area-inset-bottom))] lg:max-h-[78vh] lg:supports-[height:100dvh]:max-h-[78vh] bg-white rounded-2xl shadow-modal border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-[#08233F] text-white pl-4 pr-2 py-2 flex items-center justify-between gap-2 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-8 h-8 shrink-0 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
                <Bot className="w-4 h-4 text-amber-400" />
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 border-2 border-[#08233F] rounded-full" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  {t('DriverHub Assistant')}
                  <span className="bg-amber-400/20 text-amber-300 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    {t('Online')}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-300">{t('Recruitment & License Specialist')}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleResetChat}
                title={t('Reset Chat')}
                aria-label={t('Reset Chat')}
                className="min-h-10 min-w-10 inline-flex items-center justify-center text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title={t('Close')}
                aria-label={t('Close')}
                className="min-h-10 min-w-10 inline-flex items-center justify-center text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {view === 'callback' ? (
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/70">
              {callbackSentTo ? (
                <div role="status" className="flex flex-col items-center gap-3 py-8 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  <p className="text-sm font-bold text-slate-900">{t('Thank you! We will call you soon.')}</p>
                  <p className="text-xs text-slate-600">{t('callbackSentDetail', { phone: callbackSentTo })}</p>
                  <button
                    type="button"
                    onClick={closeCallback}
                    className="mt-1 min-h-10 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> {t('Back to chat')}
                  </button>
                </div>
              ) : (
                <form onSubmit={submitCallback} noValidate className="space-y-3">
                  <button
                    type="button"
                    onClick={closeCallback}
                    className="-ml-1 min-h-8 inline-flex items-center gap-1 px-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> {t('Back to chat')}
                  </button>
                  <div>
                    <h4 className="text-sm font-bold">{t('Request a call back')}</h4>
                    <p className="mt-0.5 text-xs text-slate-600">{t('Leave your number and a short message. Our team will call you back.')}</p>
                  </div>
                  <div>
                    <label htmlFor="callback-name" className="block text-[11px] font-semibold text-slate-700 mb-1">{t('Your name')}</label>
                    <input
                      id="callback-name"
                      type="text"
                      autoComplete="name"
                      maxLength={80}
                      value={callbackForm.name}
                      onChange={(e) => setCallbackForm({ ...callbackForm, name: e.target.value })}
                      className="w-full min-h-10 bg-white border border-slate-200 rounded-xl px-3 py-2 text-base sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="callback-phone" className="block text-[11px] font-semibold text-slate-700 mb-1">{t('Mobile number')}</label>
                    <div className="flex items-stretch rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-amber-400">
                      <span className="flex items-center pl-3 pr-1 text-base sm:text-xs font-semibold text-slate-500">+91</span>
                      <input
                        id="callback-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        maxLength={16}
                        placeholder="98765 43210"
                        value={callbackForm.phone}
                        onChange={(e) => setCallbackForm({ ...callbackForm, phone: e.target.value })}
                        className="flex-1 min-w-0 min-h-10 bg-transparent rounded-xl px-2 py-2 text-base sm:text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="callback-message" className="block text-[11px] font-semibold text-slate-700 mb-1">{t('Message (optional)')}</label>
                    <textarea
                      id="callback-message"
                      rows={3}
                      maxLength={500}
                      value={callbackForm.message}
                      onChange={(e) => setCallbackForm({ ...callbackForm, message: e.target.value })}
                      placeholder={t('How can we help you?')}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-base sm:text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  {callbackError && (
                    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{callbackError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={callbackSending}
                    className="w-full min-h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-[#08233F] hover:bg-[#051626] disabled:opacity-60 px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer"
                  >
                    {callbackSending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5 text-amber-400" />}
                    {t('Send request')}
                  </button>
                </form>
              )}
            </div>
          ) : (
          <>
          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-[#08233F] text-amber-400 flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-xs">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-[#08233F] text-white rounded-br-none'
                    : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-none'
                }`}>
                  <div className="whitespace-pre-line font-sans break-words [overflow-wrap:anywhere]">{renderRichText(msg.text)}</div>

                  {msg.actionLink && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                      <Link
                        to={msg.actionLink.url}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {msg.actionLink.text} →
                      </Link>
                    </div>
                  )}

                  {msg.options && msg.options.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t('Quick suggestions')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.options.map((opt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSend(opt)}
                            className="min-h-8 text-left bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border border-slate-200 cursor-pointer"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={`text-[9px] mt-1 text-right ${msg.sender === 'user' ? 'text-slate-300' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold shadow-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-slate-500 text-xs pl-2">
                <div className="w-5 h-5 rounded-full bg-[#08233F] text-amber-400 flex items-center justify-center text-xs">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-xs">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Call-back strip: leave a message and the team calls back */}
          <div className="px-3 py-1 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2 text-[11px] text-slate-600 shrink-0">
            <span className="flex items-center gap-1 font-medium min-w-0">
              <PhoneCall className="w-3 h-3 text-amber-600 shrink-0" /> <span className="truncate">{t('Want us to call you?')}</span>
            </span>
            <button
              type="button"
              onClick={openCallback}
              className="min-h-8 inline-flex items-center shrink-0 text-blue-600 font-semibold hover:underline cursor-pointer"
            >
              {t('Drop a message')}
            </button>
          </div>

          {/* Input Box */}
          <div className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('Ask about driver jobs, licenses, salary...')}
              className="flex-1 min-w-0 min-h-10 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-base sm:text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim()}
              aria-label={t('Send')}
              className="min-h-10 min-w-10 inline-flex items-center justify-center bg-[#08233F] hover:bg-[#051626] disabled:opacity-40 text-amber-400 p-2.5 rounded-xl transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          </>
          )}
        </div>
      )}
    </div>
  );
};
