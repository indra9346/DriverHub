import React, { useState, useEffect } from 'react';
import { 
  FileText, ShieldCheck, Download, Trash2, Eye, Award, 
  CheckCircle2, Clock, UploadCloud 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { SupabaseSync } from '../../services/supabaseSync';
import { DriverProfile, DriverDocument } from '../../types';
import { FileUploader } from '../../components/common/FileUploader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useLanguage } from '../../services/i18n';

export const DriverDocuments: React.FC = () => {
  const { t } = useLanguage();
  const currentUser = DataStore.getCurrentUser();
  const [profile, setProfile] = useState<DriverProfile>(() => {
    if (currentUser) {
      return DataStore.getDriverById(currentUser.id);
    }
    return DataStore.getDrivers()[0];
  });
  const [error, setError] = useState('');

  const loadProfile = () => {
    if (!currentUser) return;
    const p = DataStore.getDriverById(currentUser.id);
    if (p) setProfile(p);
  };

  useEffect(() => {
    loadProfile();
  }, [currentUser]);

  const handleUploadComplete = (newDoc: DriverDocument) => {
    DataStore.addDriverDocument(profile.id, newDoc);
    loadProfile();
  };

  const handleView = async (doc: DriverDocument) => {
    try {
      setError('');
      const url = await SupabaseSync.getDriverDocumentUrl(doc.fileUrl);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open this document.');
    }
  };

  const handleDelete = async (docId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      const deleted = await DataStore.deleteDriverDocument(profile.id, docId);
      if (!deleted) {
        setError('The document could not be deleted. Check your connection and try again.');
        return;
      }
      loadProfile();
    }
  };

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

      {error && <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}

      {/* Uploaded Documents List */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> {t('Uploaded Documents')} ({profile.documents?.length || 0})
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">{t('Encrypted Cloud Storage')}</span>
        </div>

        {!profile.documents || profile.documents.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 space-y-2">
            <UploadCloud className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
            <p>{t('No documents uploaded yet. Upload your driving license above.')}</p>
          </div>
        ) : (
          <div className="space-y-3 divide-y divide-slate-100">
            {profile.documents.map((doc) => (
              <div key={doc.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-surface text-brand-blue flex items-center justify-center shrink-0 border border-slate-200">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-navy">{doc.name}</h4>
                    <p className="text-[11px] text-slate-400">
                      Uploaded on {doc.uploadDate} {doc.fileSize && `• ${doc.fileSize}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={doc.verificationStatus} size="sm" />
                  <button
                    onClick={() => void handleView(doc)}
                    className="text-slate-400 hover:text-blue-700 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                    title="View document"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => void handleDelete(doc.id)}
                    className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
