import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, LoaderCircle, Phone, PhoneCall, RotateCcw, RotateCw } from 'lucide-react';
import { useLanguage } from '../../services/i18n';
import { formatAdminDate, subscribeToTables } from '../../services/adminApi';
import {
  CallbackCounts, CallbackFilter, CallbackRequest, CallbackStatus, fetchCallbackRequests, setCallbackStatus
} from '../../services/callbackApi';

const FILTERS: CallbackFilter[] = ['new', 'contacted', 'all'];
const EMPTY_COUNTS: CallbackCounts = { new: 0, contacted: 0, all: 0 };

/** "+919876543210" -> "+91 98765 43210" */
const formatPhone = (phone: string) =>
  /^\+91\d{10}$/.test(phone) ? `+91 ${phone.slice(3, 8)} ${phone.slice(8)}` : phone;

export const AdminCallbacks: React.FC = () => {
  const { t, lang } = useLanguage();
  const [requests, setRequests] = useState<CallbackRequest[]>([]);
  const [counts, setCounts] = useState<CallbackCounts>(EMPTY_COUNTS);
  const [filter, setFilter] = useState<CallbackFilter>('new');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');

  // Only the newest load may update the list.
  const requestSeq = useRef(0);
  const filterRef = useRef(filter);
  filterRef.current = filter;
  const tRef = useRef(t);
  tRef.current = t;

  const loadRequests = useCallback(async (options: { silent?: boolean } = {}) => {
    const seq = ++requestSeq.current;
    if (!options.silent) setLoading(true);
    try {
      const result = await fetchCallbackRequests(filterRef.current);
      if (seq !== requestSeq.current) return;
      setRequests(result.requests);
      setCounts(result.counts);
      setError('');
    } catch (e) {
      if (seq !== requestSeq.current) return;
      const message = tRef.current('callbackLoadFailed');
      setError(e instanceof Error && e.message ? `${message} ${e.message}` : message);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [filter, loadRequests]);

  // New requests arrive through realtime.
  useEffect(() => subscribeToTables(['driverhub_callback_requests'], () => { void loadRequests({ silent: true }); }), [loadRequests]);

  const changeStatus = async (request: CallbackRequest, status: CallbackStatus) => {
    setWorkingId(request.id);
    setError('');
    try {
      await setCallbackStatus(request.id, status);
    } catch (e) {
      const message = t('callbackSaveFailed');
      setError(e instanceof Error && e.message ? `${message} ${e.message}` : message);
    }
    setWorkingId('');
    await loadRequests({ silent: true });
  };

  const filterLabel = (status: CallbackFilter) =>
    status === 'new' ? t('callbackNew') : status === 'contacted' ? t('callbackContacted') : t('all');

  return (
    <div className="mx-auto max-w-6xl space-y-6 min-w-0">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-[#08233F]">{t('callbackRequests')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('callbackRequestsSubtitle')}</p>
        </div>
        <button type="button" onClick={() => { void loadRequests(); }} disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer">
          <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {t('refresh')}
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 break-words">{error}</p>}

      <div className="flex flex-wrap gap-2" role="group" aria-label={t('filterCallbacksByStatus')}>
        {FILTERS.map(status => (
          <button key={status} type="button" aria-pressed={filter === status}
            onClick={() => {
              if (status === filter) return;
              setRequests([]);
              setFilter(status);
            }}
            className={`min-h-10 rounded-full border px-4 py-2 text-xs font-semibold cursor-pointer ${filter === status ? 'border-[#0A2540] bg-[#0A2540] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}>
            {filterLabel(status)} <span className="ml-1 opacity-75">{counts[status]}</span>
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading && requests.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" /> {t('loading')}</div>
        ) : requests.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <PhoneCall className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">{t('noCallbackRequests')}</p>
            <p className="mt-1 text-xs text-slate-500">{t('newCallbackRequestsAppearHere')}</p>
          </div>
        ) : (
          <ul className={`divide-y divide-slate-100 ${loading ? 'opacity-60' : ''}`}>
            {requests.map(request => (
              <li key={request.id} className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`mt-0.5 shrink-0 rounded-xl p-2.5 ${request.status === 'new' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    <PhoneCall className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="break-words text-sm font-bold text-slate-900">{request.name}</h2>
                    <p className="mt-0.5 text-sm font-semibold text-[#08233F]">{formatPhone(request.phone)}</p>
                    {request.message && (
                      <p className="mt-2 whitespace-pre-line break-words text-sm text-slate-700">{request.message}</p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      {formatAdminDate(request.createdAt, lang, true)}
                      {request.page ? ` · ${t('callbackFromPage', { page: request.page })}` : ''}
                      {request.status === 'contacted' && request.contactedAt
                        ? ` · ${t('callbackCalledOn', { date: formatAdminDate(request.contactedAt, lang, true) })}`
                        : ''}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
                  <a href={`tel:${request.phone}`}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    <Phone className="h-3.5 w-3.5" /> {t('callNow')}
                  </a>
                  {request.status === 'new' ? (
                    <button type="button" onClick={() => { void changeStatus(request, 'contacted'); }} disabled={Boolean(workingId)}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer">
                      {workingId === request.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} {t('markCalled')}
                    </button>
                  ) : (
                    <button type="button" onClick={() => { void changeStatus(request, 'new'); }} disabled={Boolean(workingId)}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
                      {workingId === request.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} {t('markNotCalled')}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
