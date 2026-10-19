import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ExternalLink, Eye, FileText, LoaderCircle, RotateCw, X } from 'lucide-react';
import { SupabaseSync } from '../../services/supabaseSync';
import { useLanguage } from '../../services/i18n';
import {
  ADMIN_LIST_LIMIT, AdminReviewDocument, DocumentCounts, DocumentStatusFilter, LocalOnlyDocumentError,
  extractDriverDocumentPath, fetchDocumentQueue, formatAdminDate, getDriverDocumentViewUrl, subscribeToTables
} from '../../services/adminApi';

const FILTERS: DocumentStatusFilter[] = ['pending', 'verified', 'rejected', 'all'];
const EMPTY_COUNTS: DocumentCounts = { all: 0, pending: 0, verified: 0, rejected: 0 };

export const AdminDocuments: React.FC = () => {
  const { t, lang } = useLanguage();
  const [documents, setDocuments] = useState<AdminReviewDocument[]>([]);
  const [counts, setCounts] = useState<DocumentCounts>(EMPTY_COUNTS);
  const [filter, setFilter] = useState<DocumentStatusFilter>('pending');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [openingId, setOpeningId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // Popup blocked: show a link the admin can tap instead.
  const [fallbackLink, setFallbackLink] = useState<{ id: string; url: string } | null>(null);

  // Only the newest request may update the list, so a slow, older load can
  // never overwrite a newer one or undo an optimistic review. While a review
  // is being saved, loads are not applied; the reload after it is.
  const requestSeq = useRef(0);
  const reviewsInFlight = useRef(0);
  const filterRef = useRef(filter);
  filterRef.current = filter;
  const tRef = useRef(t);
  tRef.current = t;

  const loadDocuments = useCallback(async (options: { silent?: boolean } = {}) => {
    const seq = ++requestSeq.current;
    const isCurrent = () => seq === requestSeq.current && reviewsInFlight.current === 0;
    if (!options.silent) setLoading(true);
    try {
      const result = await fetchDocumentQueue(filterRef.current);
      if (!isCurrent()) return;
      setDocuments(result.documents);
      setCounts(result.counts);
      setError('');
    } catch (e) {
      if (!isCurrent()) return;
      const message = tRef.current('documentsLoadFailed');
      setError(e instanceof Error && e.message ? `${message} ${e.message}` : message);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  // Load on mount and whenever the status filter changes.
  useEffect(() => {
    void loadDocuments();
  }, [filter, loadDocuments]);

  // New uploads and reviews made elsewhere arrive through realtime, debounced
  // so a burst of changes causes one reload.
  useEffect(() => subscribeToTables(['driver_documents'], () => { void loadDocuments({ silent: true }); }), [loadDocuments]);

  const review = async (document: AdminReviewDocument, status: 'verified' | 'rejected') => {
    setWorkingId(document.id);
    setError('');
    setNotice('');
    // Invalidate any load in flight: it was started before this review.
    requestSeq.current += 1;
    reviewsInFlight.current += 1;
    const previous = { documents, counts };
    setDocuments(current => current.map(item => item.id === document.id ? { ...item, verificationStatus: status } : item));
    setCounts(current => ({
      ...current,
      [document.verificationStatus]: Math.max(0, current[document.verificationStatus] - 1),
      [status]: current[status] + 1
    }));
    SupabaseSync.lastError = '';
    let saved = false;
    try {
      saved = await SupabaseSync.reviewDriverDocument(document.id, status);
    } catch {
      saved = false;
    } finally {
      reviewsInFlight.current = Math.max(0, reviewsInFlight.current - 1);
    }
    if (!saved) {
      requestSeq.current += 1;
      setDocuments(previous.documents);
      setCounts(previous.counts);
      setError(SupabaseSync.lastError || t('reviewSaveFailed'));
    } else {
      setNotice(t(status === 'verified' ? 'documentMarkedVerified' : 'documentMarkedRejected', { name: document.name || document.type }));
    }
    setWorkingId('');
    // Confirm against the database (and drop the row from a filtered list).
    void loadDocuments({ silent: true });
  };

  const openDocument = async (document: AdminReviewDocument) => {
    setError('');
    setFallbackLink(null);
    if (!extractDriverDocumentPath(document.fileUrl)) {
      setError(t('documentLocalOnly'));
      return;
    }
    setOpeningId(document.id);
    // iOS Safari only allows a new tab during the tap itself, so open it now
    // and point it at the signed URL once that arrives.
    let popup: Window | null = null;
    try {
      popup = window.open('', '_blank');
      if (popup) {
        popup.document.title = t('opening');
        popup.document.body.innerHTML = `<p style="font-family:system-ui,sans-serif;padding:24px;color:#334155">${t('opening')}</p>`;
      }
    } catch {
      // Some browsers forbid touching the new tab; it is still navigated below.
    }
    try {
      const url = await getDriverDocumentViewUrl(document.fileUrl);
      if (popup && !popup.closed) {
        try { popup.opener = null; } catch { /* ignore */ }
        popup.location.replace(url);
      } else {
        setFallbackLink({ id: document.id, url });
        setNotice(t('popupBlockedOpenLink'));
      }
    } catch (e) {
      if (popup && !popup.closed) popup.close();
      setError(e instanceof LocalOnlyDocumentError
        ? t('documentLocalOnly')
        : `${t('documentOpenFailed')}${e instanceof Error && e.message ? ` (${e.message})` : ''}`);
    } finally {
      setOpeningId('');
    }
  };

  const filterLabel = (status: DocumentStatusFilter) =>
    status === 'pending' ? t('pending') : status === 'verified' ? t('verified') : status === 'rejected' ? t('rejected') : t('all');
  const shown = documents.length;
  const total = counts[filter];

  return (
    <div className="mx-auto max-w-6xl space-y-6 min-w-0">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-[#08233F]">{t('driverDocReviews')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('driverDocReviewsSubtitle')}</p>
        </div>
        <button type="button" onClick={() => { void loadDocuments(); }} disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer">
          <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {t('refresh')}
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 break-words">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 break-words">{notice}</p>}

      <div className="flex flex-wrap gap-2" role="group" aria-label={t('filterDocumentsByStatus')}>
        {FILTERS.map(status => (
          <button key={status} type="button" aria-pressed={filter === status}
            onClick={() => {
              if (status === filter) return;
              setDocuments([]);
              setFallbackLink(null);
              setFilter(status);
            }}
            className={`min-h-10 rounded-full border px-4 py-2 text-xs font-semibold cursor-pointer ${filter === status ? 'border-[#0A2540] bg-[#0A2540] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}>
            {filterLabel(status)} <span className="ml-1 opacity-75">{counts[status]}</span>
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading && documents.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" /> {t('loading')}</div>
        ) : documents.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">{t('noDocumentsFound')}</p>
            <p className="mt-1 text-xs text-slate-500">{t('newDriverUploadsAppearHere')}</p>
          </div>
        ) : (
          <>
            {total > shown && (
              <p className="border-b border-slate-100 bg-slate-50 px-5 py-2 text-xs text-slate-500">
                {t('showingNewest', { shown: Math.min(shown, ADMIN_LIST_LIMIT), total })}
              </p>
            )}
            <ul className={`divide-y divide-slate-100 ${loading ? 'opacity-60' : ''}`}>
              {documents.map(document => (
                <li key={document.id} className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 shrink-0 rounded-xl bg-blue-50 p-2.5 text-blue-700"><FileText className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <h2 className="break-words text-sm font-bold text-slate-900">{document.name}</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        <span className="capitalize">{document.type.split('_').join(' ')}</span>
                        {' · '}{t('uploaded')} {document.uploadDate ? formatAdminDate(document.uploadDate, lang) : t('dateUnavailable')}
                        {document.fileSize ? ` · ${document.fileSize}` : ''}
                      </p>
                      <p className="mt-2 break-words text-sm font-semibold text-[#08233F]">{document.driverName}</p>
                      <p className="break-all text-xs text-slate-500">{[document.driverCity, document.driverState].filter(Boolean).join(', ')}{document.driverPhone ? ` · ${document.driverPhone}` : ''}{document.driverEmail ? ` · ${document.driverEmail}` : ''}</p>
                      {fallbackLink?.id === document.id && (
                        <a href={fallbackLink.url} target="_blank" rel="noopener noreferrer"
                          className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-blue-700 underline">
                          <ExternalLink className="h-4 w-4" /> {t('openDocument')}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
                    <span className={`mr-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${document.verificationStatus === 'verified' ? 'bg-emerald-50 text-emerald-700' : document.verificationStatus === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
                      {document.verificationStatus === 'verified' ? t('verified') : document.verificationStatus === 'rejected' ? t('rejected') : t('pending')}
                    </span>
                    <button type="button" onClick={() => { void openDocument(document); }} disabled={openingId === document.id}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer">
                      {openingId === document.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />} {t('view')}
                    </button>
                    {document.verificationStatus !== 'verified' && (
                      <button type="button" onClick={() => { void review(document, 'verified'); }} disabled={Boolean(workingId)}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer">
                        {workingId === document.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} {t('verify')}
                      </button>
                    )}
                    {document.verificationStatus !== 'rejected' && (
                      <button type="button" onClick={() => { void review(document, 'rejected'); }} disabled={Boolean(workingId)}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50 cursor-pointer">
                        <X className="h-3.5 w-3.5" /> {t('reject')}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
};
