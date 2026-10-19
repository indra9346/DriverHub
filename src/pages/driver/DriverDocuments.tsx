import React, { useState, useEffect, useCallback } from 'react';
import { FileText, ShieldCheck, Trash2, Eye, UploadCloud, ExternalLink, Loader2 } from 'lucide-react';
import { DataStore } from '../../services/store';
import { SupabaseSync } from '../../services/supabaseSync';
import { formatDate } from '../../services/driverApi';
import { DriverProfile, DriverDocument } from '../../types';
import { FileUploader } from '../../components/common/FileUploader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useLanguage } from '../../services/i18n';

const DOCUMENT_TYPE_LABELS: Record<DriverDocument['type'], string> = {
  driving_license: 'Driving licence',
  resume: 'Resume / CV',
  aadhar: 'Aadhaar / ID',
  pan: 'PAN card',
  experience_cert: 'Experience certificate',
  police_verification: 'Police verification',
  other: 'Other document',
};

export const DriverDocuments: React.FC = () => {
  const { t } = useLanguage();
  const currentUser = DataStore.getCurrentUser();
  const userId = currentUser?.id || '';
  const [profile, setProfile] = useState<DriverProfile | null>(() => (userId ? DataStore.getDriverById(userId) : null));
  const [error, setError] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Shown when the browser blocked the new tab: a real link the user can tap.
  const [readyLink, setReadyLink] = useState<{ docId: string; url: string } | null>(null);

  const loadProfile = useCallback(() => {
    if (!userId) return;
    setProfile(DataStore.getDriverById(userId));
  }, [userId]);

  useEffect(() => {
    loadProfile();
    window.addEventListener('driverhub_storage_updated', loadProfile);
    return () => window.removeEventListener('driverhub_storage_updated', loadProfile);
  }, [loadProfile]);

  if (!profile) return null;

  const handleUploadComplete = (newDoc: DriverDocument) => {
    DataStore.addDriverDocument(profile.id, newDoc);
    loadProfile();
  };

  const handleView = async (doc: DriverDocument) => {
    if (openingId) return;
    setError('');
    setReadyLink(null);
    setOpeningId(doc.id);
    // iOS Safari (and most pop-up blockers) only allow a new tab opened
    // synchronously inside the tap. Open it now, then point it at the signed
    // URL once it is ready.
    let pending: Window | null = null;
    try {
      pending = window.open('', '_blank');
      if (pending) {
        try {
          pending.opener = null;
          pending.document.title = 'Opening document…';
          pending.document.body.innerHTML = '<p style="font:14px system-ui,sans-serif;color:#334155;padding:24px">Opening document…</p>';
        } catch {
          // The placeholder text is cosmetic.
        }
      }
    } catch {
      pending = null;
    }
    try {
      const url = await SupabaseSync.getDriverDocumentUrl(doc.fileUrl);
      if (pending && !pending.closed) {
        pending.location.href = url;
      } else {
        setReadyLink({ docId: doc.id, url });
      }
    } catch (e) {
      if (pending && !pending.closed) pending.close();
      setError(e instanceof Error && e.message ? `Could not open this document: ${e.message}` : 'Could not open this document. Check your connection and try again.');
    } finally {
      setOpeningId(null);
    }
  };

  const handleDelete = async (doc: DriverDocument) => {
    if (deletingId) return;
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    setDeletingId(doc.id);
    setError('');
    try {
      const deleted = await DataStore.deleteDriverDocument(profile.id, doc.id);
      if (!deleted) {
        setError('The document could not be deleted. Check your connection and try again.');
        return;
      }
      if (readyLink?.docId === doc.id) setReadyLink(null);
      loadProfile();
    } finally {
      setDeletingId(null);
    }
  };

  const documents = profile.documents || [];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy font-display">{t('Documents & License Verification')}</h1>
        <p className="text-xs text-slate-500 mt-1">
          {t('Upload clear scanned copies or photos of your driving license, ID, and certificates. Verified documents increase employer contact rates by 300%.')}
        </p>
      </div>

      {/* Uploader Box */}
      <FileUploader
        driverId={profile.id}
        onUploadComplete={handleUploadComplete}
      />

      {error && <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 break-words">{error}</p>}

      {/* Uploaded Documents List */}
      <div className="bg-white rounded-2xl p-4 sm:p-8 border border-slate-200 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" /> {t('Uploaded Documents')} ({documents.length})
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">{t('Encrypted Cloud Storage')}</span>
        </div>

        {documents.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 space-y-2">
            <UploadCloud className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
            <p>{t('No documents uploaded yet. Upload your driving license above.')}</p>
          </div>
        ) : (
          <div className="space-y-3 divide-y divide-slate-100">
            {documents.map((doc) => (
              <div key={doc.id} className="pt-3 first:pt-0 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-brand-surface text-brand-blue flex items-center justify-center shrink-0 border border-slate-200">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-brand-navy break-all">{doc.name}</h4>
                      <p className="text-[11px] text-slate-400 break-words">
                        {DOCUMENT_TYPE_LABELS[doc.type] || doc.type} • Uploaded on {formatDate(doc.uploadDate)}{doc.fileSize ? ` • ${doc.fileSize}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <StatusBadge status={doc.verificationStatus} size="sm" kind="document" />
                    <button
                      type="button"
                      onClick={() => void handleView(doc)}
                      disabled={openingId !== null}
                      className="min-h-10 min-w-10 inline-flex items-center justify-center text-slate-500 hover:text-blue-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                      title="View document"
                      aria-label={`View ${doc.name}`}
                    >
                      {openingId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(doc)}
                      disabled={deletingId !== null}
                      className="min-h-10 min-w-10 inline-flex items-center justify-center text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                      title="Delete document"
                      aria-label={`Delete ${doc.name}`}
                    >
                      {deletingId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {readyLink?.docId === doc.id && (
                  <a
                    href={readyLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setReadyLink(null)}
                    className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Tap to open the document (link valid for 1 minute)
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
