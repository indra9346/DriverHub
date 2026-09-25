import React, { useCallback, useEffect, useState } from 'react';
import { Check, Eye, FileText, LoaderCircle, RotateCw, X } from 'lucide-react';
import { SupabaseSync } from '../../services/supabaseSync';
import { DriverDocument, VerificationStatus } from '../../types';

type ReviewDocument = DriverDocument & {
  driverName: string;
  driverEmail: string;
  driverPhone: string;
  driverCity: string;
  driverState: string;
};

type StatusFilter = 'all' | VerificationStatus;

export const AdminDocuments: React.FC = () => {
  const [documents, setDocuments] = useState<ReviewDocument[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDocuments(await SupabaseSync.getAdminDocumentQueue());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the driver document queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
    window.addEventListener('driverhub_storage_updated', loadDocuments);
    return () => window.removeEventListener('driverhub_storage_updated', loadDocuments);
  }, [loadDocuments]);

  const review = async (document: ReviewDocument, status: 'verified' | 'rejected') => {
    setWorkingId(document.id);
    setError('');
    setNotice('');
    const saved = await SupabaseSync.reviewDriverDocument(document.id, status);
    if (!saved) {
      setError('The review was not saved. Check your administrator access and connection, then retry.');
    } else {
      setDocuments(current => current.map(item => item.id === document.id ? { ...item, verificationStatus: status } : item));
      setNotice(`${document.name} marked ${status}.`);
    }
    setWorkingId('');
  };

  const openDocument = async (document: ReviewDocument) => {
    try {
      setError('');
      const url = await SupabaseSync.getDriverDocumentUrl(document.fileUrl);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open this document.');
    }
  };

  const visibleDocuments = filter === 'all'
    ? documents
    : documents.filter(document => document.verificationStatus === filter);
  const statusCounts: Record<StatusFilter, number> = {
    all: documents.length,
    pending: documents.filter(document => document.verificationStatus === 'pending').length,
    verified: documents.filter(document => document.verificationStatus === 'verified').length,
    rejected: documents.filter(document => document.verificationStatus === 'rejected').length
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#08233F]">Driver document reviews</h1>
          <p className="mt-1 text-sm text-slate-500">Review uploaded licenses, identity documents, and certificates.</p>
        </div>
        <button onClick={() => { void loadDocuments(); }} disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <div className="flex flex-wrap gap-2" aria-label="Filter documents by review status">
        {(['pending', 'verified', 'rejected', 'all'] as StatusFilter[]).map(status => (
          <button key={status} onClick={() => setFilter(status)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold capitalize ${filter === status ? 'border-[#0A2540] bg-[#0A2540] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}>
            {status} <span className="ml-1 opacity-75">{statusCounts[status]}</span>
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading documents…</div>
        ) : visibleDocuments.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">No {filter === 'all' ? '' : `${filter} `}documents</p>
            <p className="mt-1 text-xs text-slate-500">New driver uploads will appear here for review.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visibleDocuments.map(document => (
              <li key={document.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 rounded-xl bg-blue-50 p-2.5 text-blue-700"><FileText className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-slate-900">{document.name}</h2>
                    <p className="mt-0.5 text-xs capitalize text-slate-500">{document.type.split('_').join(' ')} · uploaded {document.uploadDate || 'date unavailable'} {document.fileSize ? `· ${document.fileSize}` : ''}</p>
                    <p className="mt-2 text-sm font-semibold text-[#08233F]">{document.driverName}</p>
                    <p className="break-all text-xs text-slate-500">{[document.driverCity, document.driverState].filter(Boolean).join(', ')}{document.driverPhone ? ` · ${document.driverPhone}` : ''}{document.driverEmail ? ` · ${document.driverEmail}` : ''}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span className={`mr-1 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${document.verificationStatus === 'verified' ? 'bg-emerald-50 text-emerald-700' : document.verificationStatus === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
                    {document.verificationStatus}
                  </span>
                  <button onClick={() => { void openDocument(document); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    <Eye className="h-3.5 w-3.5" /> View
                  </button>
                  {document.verificationStatus !== 'verified' && (
                    <button onClick={() => { void review(document, 'verified'); }} disabled={Boolean(workingId)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50">
                      {workingId === document.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Verify
                    </button>
                  )}
                  {document.verificationStatus !== 'rejected' && (
                    <button onClick={() => { void review(document, 'rejected'); }} disabled={Boolean(workingId)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">
                      <X className="h-3.5 w-3.5" /> Reject
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
