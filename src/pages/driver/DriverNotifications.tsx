import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { DataStore } from '../../services/store';
import { SupabaseSync } from '../../services/supabaseSync';
import { formatDateTime } from '../../services/driverApi';
import { Notification } from '../../types';
import { useLanguage } from '../../services/i18n';

export const DriverNotifications: React.FC = () => {
  const { t } = useLanguage();
  const currentUser = DataStore.getCurrentUser();
  const userId = currentUser?.id || '';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadNotifs = useCallback(() => {
    if (!userId) return;
    setNotifications(DataStore.getNotifications(userId));
  }, [userId]);

  useEffect(() => {
    loadNotifs();
    window.addEventListener('driverhub_storage_updated', loadNotifs);
    return () => window.removeEventListener('driverhub_storage_updated', loadNotifs);
  }, [loadNotifs]);

  const handleMarkAllRead = async () => {
    if (!userId || busy) return;
    setBusy(true);
    setError('');
    SupabaseSync.lastError = '';
    try {
      if (!(await DataStore.markAllNotificationsAsRead(userId))) {
        setError(DataStore.getLastError('Notifications could not be marked as read. Try again.'));
        return;
      }
      loadNotifs();
    } finally {
      setBusy(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    setError('');
    if (!(await DataStore.markNotificationAsRead(id))) {
      setError('This notification could not be marked as read. Try again.');
      return;
    }
    loadNotifs();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy font-display">{t('Notification Center')}</h1>
          <p className="text-xs text-slate-500 mt-1">{t('Application updates and matching driver opportunities')}</p>
        </div>

        {notifications.some(n => !n.read) && (
          <button
            type="button"
            onClick={() => { void handleMarkAllRead(); }}
            disabled={busy}
            className="min-h-10 px-2 text-xs font-semibold text-brand-blue hover:text-brand-navy hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" /> {t('Mark all as read')}
          </button>
        )}
      </div>

      {error && <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 break-words">{error}</p>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card divide-y divide-slate-100 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <Bell className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
            <p>{t('You have no notifications at this time.')}</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 sm:p-5 flex items-start justify-between gap-3 transition-colors ${
                !notif.read ? 'bg-amber-50/40' : 'hover:bg-slate-50'
              }`}
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  {!notif.read && <span className="mt-1 w-2 h-2 rounded-full bg-brand-amber shrink-0" />}
                  <h3 className="text-xs font-bold text-brand-navy break-words min-w-0">{notif.title}</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed break-words">{notif.message}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-1">
                  <span>{formatDateTime(notif.createdAt)}</span>
                  {notif.link && (
                    <Link to={notif.link} className="min-h-8 text-brand-blue font-semibold hover:underline inline-flex items-center gap-0.5">
                      {t('View Details')} <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>

              {!notif.read && (
                <button
                  type="button"
                  onClick={() => { void handleMarkRead(notif.id); }}
                  className="shrink-0 min-h-10 min-w-10 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition-colors"
                  title="Mark as read"
                  aria-label="Mark as read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
