import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Send, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import { DataStore } from '../../services/store';
import { SupabaseSync } from '../../services/supabaseSync';
import { newId } from '../../lib/ids';
import { formatDateTime, formatShortDateTime, markConversationRead, parseTimestamp } from '../../services/driverApi';
import { DirectMessage } from '../../types';
import { useLanguage } from '../../services/i18n';

interface Thread {
  /** The conversation partner's user id. */
  id: string;
  name: string;
  lastMessage?: DirectMessage;
  /** Chronological position of the newest message (higher = newer). */
  lastRank: number;
  unread: number;
  jobId?: string;
  jobTitle?: string;
}

/** Conversation opened from a link (?driverId= / ?employerId= with optional ?jobId=). */
interface LinkedConversation {
  partnerId: string;
  name: string;
  jobId?: string;
  jobTitle?: string;
}

const DESKTOP_QUERY = '(min-width: 768px)';

/** True at the md breakpoint and up, where the list and the chat sit side by side. */
const useIsDesktop = () => {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(DESKTOP_QUERY).matches : true
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setMatches(mql.matches);
    onChange();
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);
  return matches;
};

export const MessagesPage: React.FC = () => {
  const { t } = useLanguage();
  const currentUser = DataStore.getCurrentUser();
  const userId = currentUser?.id || '';
  const userRole = currentUser?.role || 'driver';
  const isDesktop = useIsDesktop();

  const [searchParams] = useSearchParams();
  const paramPartnerId = (userRole === 'employer'
    ? searchParams.get('driverId')
    : userRole === 'driver'
    ? searchParams.get('employerId')
    : null) || '';
  const paramJobId = searchParams.get('jobId') || '';

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(paramPartnerId);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>(paramPartnerId ? 'chat' : 'list');
  const [linked, setLinked] = useState<LinkedConversation | null>(null);
  const [locallyRead, setLocallyRead] = useState<Set<string>>(() => new Set());
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const feedRef = useRef<HTMLDivElement>(null);
  const markAttemptRef = useRef('');

  const loadMessages = useCallback(() => {
    if (!userId) return;
    setMessages(DataStore.getMessages(userId));
  }, [userId]);

  useEffect(() => {
    loadMessages();
    window.addEventListener('driverhub_storage_updated', loadMessages);
    return () => window.removeEventListener('driverhub_storage_updated', loadMessages);
  }, [loadMessages]);

  // Open (or start) the conversation named in the link.
  useEffect(() => {
    if (!paramPartnerId || paramPartnerId === userId) return;
    setSelectedPartnerId(paramPartnerId);
    setMobileView('chat');
    const job = paramJobId ? DataStore.getJobById(paramJobId) : undefined;
    const applications = DataStore.getApplications();
    if (userRole === 'employer') {
      const application = applications.find(app =>
        app.driverId === paramPartnerId && (!paramJobId || app.jobId === paramJobId));
      setLinked({
        partnerId: paramPartnerId,
        name: application?.driverName || DataStore.getDriverById(paramPartnerId).fullName || 'Driver',
        jobId: paramJobId || application?.jobId || undefined,
        jobTitle: job?.title || application?.jobTitle
      });
    } else {
      const application = paramJobId
        ? applications.find(app => app.jobId === paramJobId && app.driverId === userId)
        : undefined;
      setLinked({
        partnerId: paramPartnerId,
        name: DataStore.getEmployerById(paramPartnerId)?.companyName || job?.companyName || application?.companyName || 'Employer',
        jobId: paramJobId || undefined,
        jobTitle: job?.title || application?.jobTitle
      });
    }
  }, [paramPartnerId, paramJobId, userId, userRole]);

  // Chronological order. Timestamps decide when both parse; otherwise the
  // cache order (oldest first) is kept.
  const ordered = useMemo(() => messages
    .map((message, index) => ({ message, index, time: parseTimestamp(message.timestamp) }))
    .sort((a, b) => (a.time !== null && b.time !== null && a.time !== b.time ? a.time - b.time : a.index - b.index))
    .map(entry => entry.message), [messages]);

  const threads = useMemo(() => {
    const map = new Map<string, Thread>();
    ordered.forEach((message, rank) => {
      const mine = message.senderId === userId;
      const partnerId = mine ? message.receiverId : message.senderId;
      if (!partnerId) return;
      const thread: Thread = map.get(partnerId) || { id: partnerId, name: '', lastRank: -1, unread: 0 };
      // The name a partner sends under is the most accurate; fall back to the
      // name we addressed them by.
      if (!mine && message.senderName) thread.name = message.senderName;
      else if (!thread.name) thread.name = (mine ? message.receiverName : message.senderName) || '';
      thread.lastMessage = message;
      thread.lastRank = rank;
      if (message.jobId) {
        thread.jobId = message.jobId;
        thread.jobTitle = message.jobTitle || thread.jobTitle;
      } else if (message.jobTitle && !thread.jobId) {
        thread.jobTitle = message.jobTitle;
      }
      if (!mine && !message.read && !locallyRead.has(message.id)) thread.unread += 1;
      map.set(partnerId, thread);
    });
    return [...map.values()]
      .map(thread => ({ ...thread, name: thread.name || 'DriverHub user' }))
      .sort((a, b) => b.lastRank - a.lastRank);
  }, [ordered, userId, locallyRead]);

  // A linked conversation with no messages yet is listed first.
  const draftThread: Thread | null = linked && !threads.some(thread => thread.id === linked.partnerId)
    ? { id: linked.partnerId, name: linked.name, lastRank: Number.MAX_SAFE_INTEGER, unread: 0, jobId: linked.jobId, jobTitle: linked.jobTitle }
    : null;
  const listThreads = draftThread ? [draftThread, ...threads] : threads;

  // Default to the newest conversation.
  useEffect(() => {
    if (selectedPartnerId || paramPartnerId) return;
    if (threads.length > 0) setSelectedPartnerId(threads[0].id);
  }, [threads, selectedPartnerId, paramPartnerId]);

  const activeThread = listThreads.find(thread => thread.id === selectedPartnerId);
  const linkedForActive = linked && activeThread && linked.partnerId === activeThread.id ? linked : null;
  const sendJobId = linkedForActive?.jobId || activeThread?.jobId;
  const sendJobTitle = linkedForActive?.jobTitle || activeThread?.jobTitle;
  const activeConversation = useMemo(() => (activeThread
    ? ordered.filter(m =>
        (m.senderId === userId && m.receiverId === activeThread.id) ||
        (m.receiverId === userId && m.senderId === activeThread.id))
    : []), [ordered, userId, activeThread?.id]);

  const chatVisible = isDesktop || mobileView === 'chat';
  const unreadKey = activeConversation
    .filter(m => m.receiverId === userId && !m.read && !locallyRead.has(m.id))
    .map(m => m.id)
    .join(',');

  // Mark incoming messages read once the conversation is actually on screen.
  useEffect(() => {
    if (!chatVisible || !activeThread || !unreadKey || !userId) return;
    const attempt = `${activeThread.id}:${unreadKey}`;
    if (markAttemptRef.current === attempt) return;
    markAttemptRef.current = attempt;
    const ids = unreadKey.split(',');
    void markConversationRead(userId, activeThread.id).then(ok => {
      if (!ok) return;
      setLocallyRead(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.add(id));
        return next;
      });
    });
  }, [chatVisible, activeThread?.id, unreadKey, userId]);

  // Keep the newest message in view.
  const lastMessageId = activeConversation[activeConversation.length - 1]?.id;
  useEffect(() => {
    const feed = feedRef.current;
    if (feed && chatVisible) feed.scrollTop = feed.scrollHeight;
  }, [lastMessageId, activeThread?.id, chatVisible]);

  const openThread = (partnerId: string) => {
    setSelectedPartnerId(partnerId);
    setSendError('');
    setMobileView('chat');
    if (!isDesktop) window.scrollTo({ top: 0 });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = replyText.trim();
    if (!text || !activeThread || sending || !userId) return;

    const senderName = userRole === 'employer'
      ? DataStore.getEmployerById(userId)?.companyName || 'Employer'
      : DataStore.getDriverById(userId).fullName || 'Driver';

    setSending(true);
    setSendError('');
    SupabaseSync.lastError = '';
    try {
      const sent = await DataStore.sendMessage({
        id: newId(),
        senderId: userId,
        senderName,
        senderRole: userRole,
        receiverId: activeThread.id,
        receiverName: activeThread.name,
        jobId: sendJobId || undefined,
        jobTitle: sendJobTitle || undefined,
        text,
        timestamp: new Date().toISOString(),
        read: false
      });
      if (!sent) {
        setSendError(DataStore.getLastError('Message could not be sent. Check your connection and try again.'));
        return;
      }
      setReplyText('');
      loadMessages();
    } catch {
      setSendError('Message could not be sent. Check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  if (!currentUser) return null;

  const partnerVerified = activeThread && userRole === 'driver'
    ? Boolean(DataStore.getEmployerById(activeThread.id)?.verified)
    : false;
  const emptyText = userRole === 'employer'
    ? 'No conversations yet. Message a driver from your applications pipeline or an unlocked profile.'
    : 'No conversations yet. Employers you applied to can message you here, and you can message an employer from My Applications.';

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className={mobileView === 'chat' ? 'hidden md:block' : ''}>
        <h1 className="text-2xl font-extrabold text-[#08233F] font-display">
          {t('Direct Hiring Messages')}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {t('Instant communication between verified fleet employers and commercial drivers')}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden md:grid md:grid-cols-12 md:grid-rows-1 md:h-[min(640px,calc(100vh-12rem))] md:min-h-[480px]">
        {/* Thread list: its own view on phones */}
        <div className={`${mobileView === 'chat' ? 'hidden' : 'flex'} md:flex md:col-span-4 flex-col md:border-r border-slate-200 min-h-0 md:overflow-hidden`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {t('Active Conversations')} ({listThreads.length})
            </span>
          </div>

          {listThreads.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p>{emptyText}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 md:overflow-y-auto md:flex-1 min-h-0">
              {listThreads.map(thread => {
                const isSelected = activeThread?.id === thread.id;
                const preview = thread.lastMessage?.text || 'New conversation — send the first message.';
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => openThread(thread.id)}
                    aria-current={isSelected ? 'true' : undefined}
                    className={`w-full p-4 text-left transition-colors flex items-start gap-3 cursor-pointer ${
                      isSelected ? 'md:bg-blue-50/70' : ''
                    } hover:bg-slate-50`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#08233F] text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                      {thread.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs text-slate-900 truncate ${thread.unread > 0 ? 'font-extrabold' : 'font-bold'}`}>{thread.name}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {thread.lastMessage ? formatShortDateTime(thread.lastMessage.timestamp) : ''}
                        </span>
                      </div>
                      {thread.jobTitle && (
                        <p className="text-[10px] font-semibold text-emerald-700 truncate mt-0.5">
                          {thread.jobTitle}
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={`text-xs truncate ${thread.unread > 0 ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>{preview}</p>
                        {thread.unread > 0 && (
                          <span
                            className="shrink-0 min-w-5 px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold text-center"
                            aria-label={`${thread.unread} unread`}
                          >
                            {thread.unread > 99 ? '99+' : thread.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Chat window: its own view on phones, with a fixed height */}
        <div
          className={`${mobileView === 'list' ? 'hidden' : 'flex'} md:flex md:col-span-8 flex-col bg-slate-50/40 min-h-[340px] h-[calc(100vh-14rem)] supports-[height:100dvh]:h-[calc(100dvh-14rem-env(safe-area-inset-bottom))] md:h-auto md:supports-[height:100dvh]:h-auto md:min-h-0 md:overflow-hidden`}
        >
          {activeThread ? (
            <>
              {/* Chat Header */}
              <div className="px-2 py-2 sm:p-4 bg-white border-b border-slate-200 flex items-center gap-2 sm:gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileView('list')}
                  className="md:hidden min-h-10 min-w-10 inline-flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 shrink-0"
                  aria-label={t('Back')}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {activeThread.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 min-w-0">
                    <span className="truncate">{activeThread.name}</span>
                    {partnerVerified && <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Verified employer" />}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    {sendJobTitle || 'Direct hiring conversation'}
                  </p>
                </div>
              </div>

              {/* Messages Feed */}
              <div ref={feedRef} className="p-3 sm:p-5 space-y-3.5 overflow-y-auto flex-1 min-h-0" aria-live="polite">
                {activeConversation.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-8">No messages yet. Say hello to start the conversation.</p>
                ) : activeConversation.map(m => {
                  const isMine = m.senderId === userId;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs break-words [overflow-wrap:anywhere] ${
                          isMine
                            ? 'bg-[#08233F] text-white rounded-br-xs'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1 max-w-[85%] truncate">
                        {isMine ? 'You' : m.senderName} • {formatDateTime(m.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Message Input */}
              <form
                onSubmit={handleSend}
                className="p-2.5 sm:p-3.5 bg-white border-t border-slate-200 flex items-center gap-2 sm:gap-2.5 shrink-0"
              >
                <input
                  type="text"
                  value={replyText}
                  maxLength={2000}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder={t('Type a message regarding interview slot, documents, or vehicle trial...')}
                  aria-label={t('Message')}
                  className="flex-1 min-w-0 min-h-10 px-3 sm:px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base md:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="min-h-10 min-w-10 px-3 sm:px-5 py-2.5 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-xl text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label={t('Send')}
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{sending ? t('Sending…') : t('Send')}</span>
                </button>
              </form>
              {sendError && <p role="alert" className="px-4 pb-3 bg-white text-xs text-red-700 break-words shrink-0">{sendError}</p>}
            </>
          ) : (
            <div className="p-8 sm:p-12 text-center my-auto space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">
                {listThreads.length === 0 ? emptyText : t('Select a conversation to begin messaging.')}
              </p>
              <button
                type="button"
                onClick={() => setMobileView('list')}
                className="md:hidden min-h-10 px-4 text-xs font-bold text-brand-blue hover:underline"
              >
                {t('Back')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
