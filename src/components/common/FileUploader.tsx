import React, { useState } from 'react';
import { UploadCloud, FileText, X, AlertCircle, Loader2 } from 'lucide-react';
import { DocumentType, DriverDocument } from '../../types';
import { SupabaseSync } from '../../services/supabaseSync';
import { useLanguage } from '../../services/i18n';

interface FileUploaderProps {
  driverId: string;
  onUploadComplete: (doc: DriverDocument) => void | Promise<void>;
  allowedTypes?: DocumentType[];
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export const FileUploader: React.FC<FileUploaderProps> = ({ driverId, onUploadComplete, allowedTypes }) => {
  const { t } = useLanguage();
  const [docType, setDocType] = useState<DocumentType>('driving_license');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    e.target.value = '';
    if (!selected) return;
    if (selected.size > MAX_FILE_SIZE) {
      setError('File size must be under 5 MB.');
      setFile(null);
      return;
    }
    if (!ALLOWED_MIME_TYPES.includes(selected.type)) {
      setError('Choose a PDF, JPG, or PNG file.');
      setFile(null);
      return;
    }
    setFile(selected);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file || !driverId) {
      setError('Choose a file and sign in to your driver account before uploading.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const isDemo = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_DATA === 'true';
      let document: DriverDocument;
      if (isDemo) {
        document = {
          id: crypto.randomUUID(), driverId, name: file.name, type: docType,
          fileUrl: URL.createObjectURL(file), fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          uploadDate: new Date().toISOString().slice(0, 10), verificationStatus: 'pending'
        };
      } else {
        document = await SupabaseSync.uploadDriverDocument(driverId, file, docType);
      }
      await onUploadComplete(document);
      setFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const documentTypes: { value: DocumentType; label: string }[] = [
    { value: 'driving_license', label: t('Commercial Driving License (Front/Back)') },
    { value: 'resume', label: t('Driver Resume / CV') },
    { value: 'aadhar', label: t('Aadhaar Card / Government ID') },
    { value: 'pan', label: t('PAN Card') },
    { value: 'experience_cert', label: t('Previous Employer Experience Certificate') },
    { value: 'police_verification', label: t('Police Clearance Record') },
    { value: 'other', label: t('Medical Fitness / Other Badge') }
  ];

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900">{t('Upload New Document')}</h4>
        <span className="text-[11px] text-slate-500">PDF, JPG, PNG up to 5 MB</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Document Category')}</label>
          <select
            value={docType}
            onChange={e => setDocType(e.target.value as DocumentType)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
          >
            {documentTypes.filter(option => !allowedTypes || allowedTypes.includes(option.value)).map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Select File')}</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={handleFileChange}
            className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 p-2 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {file && (
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate max-w-xs">{file.name}</p>
              <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
          </div>
          <button type="button" onClick={() => setFile(null)} aria-label="Remove selected file" className="text-slate-400 hover:text-red-500 p-1 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleUpload()}
        disabled={!file || uploading}
        className="w-full flex items-center justify-center gap-2 bg-[#0A2540] hover:bg-[#06182B] disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-all"
      >
        {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('Uploading securely…')}</> : <><UploadCloud className="w-4 h-4 text-amber-400" /> {t('Upload Document')}</>}
      </button>
      <p className="text-[11px] text-slate-500">{t('New documents stay pending until DriverHub reviews them.')}</p>
    </div>
  );
};
