import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DataStore } from '../../services/store';
import { Notification } from '../../types';
import { useLanguage } from '../../services/i18n';
import { formatDateTime } from '../../services/driverApi';

interface NotificationBellProps {
  userId: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ userId }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = () => {
    setNotifications(DataStore.getNotifications(userId));
  };

  useEffect(() => {
    loadNotifications();
    window.addEventListener('driverhub_storage_updated', loadNotifications);
    return () => window.removeEventListener('driverhub_storage_updated', loadNotifications);
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(await DataStore.markNotificationAsRead(id))) return;
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    if (!(await DataStore.markAllNotificationsAsRead(userId))) return;
    loadNotifications();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('Notifications')}
        aria-expanded={isOpen}
        className="relative min-h-10 min-w-10 inline-flex items-center justify-center p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 bg-amber-500 text-slate-900 text-[10px] font-bold rounded-full animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        // Phones: pinned under the 4rem navbar, full width minus a small gutter,
        // so it is never cut off at 360-375px. Larger screens: anchored dropdown.
        <div className="fixed inset-x-2 top-16 flex max-h-[calc(100vh-5rem)] supports-[height:100dvh]:max-h-[calc(100dvh-5rem)] flex-col sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:max-h-[28rem] sm:supports-[height:100dvh]:max-h-[28rem] bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between gap-2 px-4 py-1.5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-semibold text-slate-800 text-sm">{t('Notifications')}</h3>
              {unreadCount > 0 && (
                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium">
                  {t('{count} new', { count: unreadCount })}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => { void handleMarkAllRead(); }}
                className="min-h-10 px-2 -mr-2 shrink-0 text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {t('Mark all read')}
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                {t('No notifications right now')}
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3.5 pr-2 transition-colors hover:bg-slate-50 relative flex items-start justify-between gap-2 ${
                    !notif.read ? 'bg-amber-50/40' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${!notif.read ? 'bg-amber-500' : 'bg-transparent'}`} />
                      <h4 className="text-xs font-semibold text-slate-900 truncate min-w-0">
                        {notif.title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 break-words">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-slate-400">
                      <span>{formatDateTime(notif.createdAt)}</span>
                      {notif.link && (
                        <Link
                          to={notif.link}
                          onClick={() => setIsOpen(false)}
                          className="min-h-8 px-1 text-blue-600 font-medium hover:underline inline-flex items-center gap-0.5 shrink-0"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {!notif.read && (
                    <button
                      type="button"
                      onClick={(e) => { void handleMarkAsRead(notif.id, e); }}
                      title={t('Mark as read')}
                      aria-label={t('Mark as read')}
                      className="min-h-10 min-w-10 inline-flex items-center justify-center text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 shrink-0 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
