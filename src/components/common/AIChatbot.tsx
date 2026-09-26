import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, PhoneCall, RefreshCw } from 'lucide-react';
import { AIMessage } from '../../types';
import { getBotWelcome, getSupportResponse } from '../../services/aiSupport';
import { useLanguage } from '../../services/i18n';
import { Link } from 'react-router-dom';

export const AIChatbot: React.FC = () => {
  const { lang, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>(() => [getBotWelcome(lang)]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

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
      id: 'user-' + Date.now(),
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

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
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
        <div className="w-[calc(100vw-2rem)] sm:w-[390px] max-w-[390px] h-[520px] max-h-[78vh] bg-white rounded-2xl shadow-modal border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-[#08233F] text-white px-4 py-3.5 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
                <Bot className="w-4 h-4 text-amber-400" />
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 border-2 border-[#08233F] rounded-full" />
              </div>
              <div>
                <h3 className="text-xs font-bold flex items-center gap-1.5">
                  {t('DriverHub Assistant')}
                  <span className="bg-amber-400/20 text-amber-300 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    {t('Online')}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-300">{t('Recruitment & License Specialist')}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                title={t('Reset Chat')}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title={t('Close')}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

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
                  <div className="whitespace-pre-line font-sans">{msg.text}</div>

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
                            onClick={() => handleSend(opt)}
                            className="text-left bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border border-slate-200 cursor-pointer"
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

          {/* Quick FAQ footer strip */}
          <div className="px-3 py-2 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
            <span className="flex items-center gap-1 font-medium">
              <PhoneCall className="w-3 h-3 text-amber-600" /> {t('Need live support?')}
            </span>
            <Link
              to="/contact"
              onClick={() => setIsOpen(false)}
              className="text-blue-600 font-semibold hover:underline"
            >
              +91 80 2200 8899
            </Link>
          </div>

          {/* Input Box */}
          <div className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('Ask about driver jobs, licenses, salary...')}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              aria-label={t('Send')}
              className="bg-[#08233F] hover:bg-[#051626] disabled:opacity-40 text-amber-400 p-2.5 rounded-xl transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
