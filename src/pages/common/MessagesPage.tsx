import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Send, ShieldCheck, Phone, User, Briefcase, CheckCircle2 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { DirectMessage } from '../../types';
import { useLanguage } from '../../services/i18n';

export const MessagesPage: React.FC = () => {
  const { t } = useLanguage();
  const currentUser = DataStore.getCurrentUser();
  const userId = currentUser?.id || 'usr-employer-1';
  const userRole = currentUser?.role || 'employer';

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const loadMessages = () => {
    const all = DataStore.getMessages(userId);
    setMessages(all);
    if (!selectedPartnerId && all.length > 0) {
      const first = all[0];
      const partner = first.senderId === userId ? first.receiverId : first.senderId;
      setSelectedPartnerId(partner);
    }
  };

  useEffect(() => {
    loadMessages();
    window.addEventListener('driverhub_storage_updated', loadMessages);
    return () => window.removeEventListener('driverhub_storage_updated', loadMessages);
  }, [userId, selectedPartnerId]);

  // Group threads by partner
  const partnersMap = new Map<string, { id: string; name: string; lastMessage: DirectMessage }>();
  messages.forEach(m => {
    const isSender = m.senderId === userId;
    const pId = isSender ? m.receiverId : m.senderId;
    const pName = isSender ? m.receiverName : m.senderName;
    partnersMap.set(pId, { id: pId, name: pName, lastMessage: m });
  });

  const threads = Array.from(partnersMap.values());
  const activePartner = partnersMap.get(selectedPartnerId) || threads[0];
  const activeConversation = messages.filter(
    m =>
      (m.senderId === userId && m.receiverId === activePartner?.id) ||
      (m.receiverId === userId && m.senderId === activePartner?.id)
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activePartner || sending) return;

    const senderName =
      userRole === 'employer'
        ? DataStore.getEmployerById(userId)?.companyName || 'Verified Fleet Employer'
        : DataStore.getDriverById(userId)?.fullName || 'Verified Driver';

    setSending(true);
    setSendError('');
    const sent = await DataStore.sendMessage({
      id: 'msg-' + Date.now(),
      senderId: userId,
      senderName,
      senderRole: userRole,
      receiverId: activePartner.id,
      receiverName: activePartner.name,
      jobTitle: activePartner.lastMessage.jobTitle || 'Direct Driver Hiring Inquiry',
      text: replyText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    });

    setSending(false);
    if (!sent) {
      setSendError('Message could not be sent. Check your connection and hiring access, then try again.');
      return;
    }
    setReplyText('');
    loadMessages();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#08233F] font-display">
          {t('Direct Hiring Messages')}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {t('Instant communication between verified fleet employers and commercial drivers')}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
        {/* Left Thread List (4 Cols) */}
        <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/70">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {t('Active Conversations')} ({threads.length})
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {threads.map(tItem => {
              const isSelected = activePartner?.id === tItem.id;
              return (
                <button
                  key={tItem.id}
                  onClick={() => setSelectedPartnerId(tItem.id)}
                  className={`w-full p-4 text-left transition-colors flex items-start gap-3 cursor-pointer ${
                    isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#08233F] text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                    {tItem.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 truncate">{tItem.name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{tItem.lastMessage.timestamp}</span>
                    </div>
                    {tItem.lastMessage.jobTitle && (
                      <p className="text-[10px] font-semibold text-emerald-700 truncate mt-0.5">
                        {tItem.lastMessage.jobTitle}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 truncate mt-0.5">{tItem.lastMessage.text}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Chat Window (8 Cols) */}
        <div className="md:col-span-8 flex flex-col justify-between bg-slate-50/40">
          {activePartner ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center">
                    {activePartner.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      {activePartner.name}
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {activePartner.lastMessage.jobTitle || 'Verified DriverHub Conversation'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages Feed */}
              <div className="p-5 space-y-3.5 overflow-y-auto flex-1 max-h-[360px]">
                {activeConversation.map(m => {
                  const isMine = m.senderId === userId;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                          isMine
                            ? 'bg-[#08233F] text-white rounded-br-xs'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                        }`}
                      >
                        <p>{m.text}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1">
                        {m.senderName} • {m.timestamp}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Message Input */}
              <form
                onSubmit={handleSend}
                className="p-3.5 bg-white border-t border-slate-200 flex items-center gap-2.5"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder={t('Type a message regarding interview slot, documents, or vehicle trial...')}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="px-5 py-2.5 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" /> {sending ? t('Sending…') : t('Send')}
                </button>
              </form>
              {sendError && <p role="alert" className="px-4 pb-3 text-xs text-red-700">{sendError}</p>}
            </>
          ) : (
            <div className="p-12 text-center my-auto space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">{t('Select a conversation to begin messaging.')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
