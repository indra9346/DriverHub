import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, ExternalLink, Trash2, Sparkles } from 'lucide-react';
import { DataStore } from '../../services/store';
import { Notification } from '../../types';
import { useLanguage } from '../../services/i18n';

export const DriverNotifications: React.FC = () => {
  const { t } = useLanguage();
  const currentUser = DataStore.getCurrentUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadNotifs = () => {
    if (!currentUser) return;
    setNotifications(DataStore.getNotifications(currentUser.id));
  };

  useEffect(() => {
    loadNotifs();
    window.addEventListener('driverhub_storage_updated', loadNotifs);
    return () => window.removeEventListener('driverhub_storage_updated', loadNotifs);
  }, [currentUser?.id]);

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    if (!(await DataStore.markAllNotificationsAsRead(currentUser.id))) return;
    loadNotifs();
  };

  const handleMarkRead = async (id: string) => {
    if (!(await DataStore.markNotificationAsRead(id))) return;
    loadNotifs();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy font-display">{t('Notification Center')}</h1>
          <p className="text-xs text-slate-500 mt-1">{t('Application updates and matching driver opportunities')}</p>
        </div>

        {notifications.some(n => !n.read) && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-semibold text-brand-blue hover:text-brand-navy hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" /> {t('Mark all as read')}
          </button>
        )}
      </div>

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
              className={`p-5 flex items-start justify-between gap-4 transition-colors ${
                !notif.read ? 'bg-amber-50/40' : 'hover:bg-slate-50'
              }`}
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  {!notif.read && <span className="w-2 h-2 rounded-full bg-brand-amber shrink-0" />}
                  <h3 className="text-xs font-bold text-brand-navy">{notif.title}</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                  <span>{notif.createdAt}</span>
                  {notif.link && (
                    <Link to={notif.link} className="text-brand-blue font-semibold hover:underline flex items-center gap-0.5">
                      {t('View Details')} <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>

              {!notif.read && (
                <button
                  onClick={() => { void handleMarkRead(notif.id); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition-colors"
                  title="Mark as read"
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
