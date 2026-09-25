import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, X, AlertCircle, Loader2 } from 'lucide-react';
import { DocumentType, DriverDocument } from '../../types';

interface FileUploaderProps {
  driverId: string;
  onUploadComplete: (doc: DriverDocument) => void;
  allowedTypes?: DocumentType[];
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  driverId,
  onUploadComplete,
}) => {
  const [docType, setDocType] = useState<DocumentType>('driving_license');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 5 * 1024 * 1024) {
        setError('File size must be under 5MB');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleUpload = () => {
    if (!file) {
      setError('Please choose a file to upload');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const fileDataUrl = (reader.result as string) || URL.createObjectURL(file);
      
      const newDoc: DriverDocument = {
        id: 'doc-' + Date.now(),
        driverId,
        name: file.name,
        type: docType,
        fileUrl: fileDataUrl,
        fileSize: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        uploadDate: new Date().toISOString().slice(0, 10),
        verificationStatus: 'verified',
      };

      setUploading(false);
      setFile(null);
      setProgress(0);
      onUploadComplete(newDoc);
    };

    reader.onerror = () => {
      const newDoc: DriverDocument = {
        id: 'doc-' + Date.now(),
        driverId,
        name: file.name,
        type: docType,
        fileUrl: URL.createObjectURL(file),
        fileSize: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        uploadDate: new Date().toISOString().slice(0, 10),
        verificationStatus: 'verified',
      };

      setUploading(false);
      setFile(null);
      setProgress(0);
      onUploadComplete(newDoc);
    };

    // Simulate smooth progress & storage upload
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 95;
        }
        return prev + 25;
      });
    }, 120);

    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      reader.readAsDataURL(file);
    }, 600);
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900">Upload New Document</h4>
        <span className="text-[11px] text-slate-500">PDF, JPG, PNG up to 5MB</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Document Category
          </label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocumentType)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
          >
            <option value="driving_license">Commercial Driving License (Front/Back)</option>
            <option value="resume">Driver Resume / CV</option>
            <option value="aadhar">Aadhar Card / Government ID</option>
            <option value="pan">PAN Card</option>
            <option value="experience_cert">Previous Employer Experience Certificate</option>
            <option value="police_verification">Police Clearance Record</option>
            <option value="other">Medical Fitness / Other Badge</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Select File
          </label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {file && (
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs font-semibold text-slate-800 truncate max-w-xs">{file.name}</p>
              <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
          </div>

          <button
            onClick={() => setFile(null)}
            className="text-slate-400 hover:text-red-500 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {uploading && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-600 font-medium">
            <span>Encrypting & uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full flex items-center justify-center gap-2 bg-[#0A2540] hover:bg-[#06182B] disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-all"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Uploading to Secure Storage...
          </>
        ) : (
          <>
            <UploadCloud className="w-4 h-4 text-amber-400" /> Upload & Verify Document
          </>
        )}
      </button>
    </div>
  );
};
