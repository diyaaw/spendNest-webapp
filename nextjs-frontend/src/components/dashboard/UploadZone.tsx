'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { uploadStatementFile } from '@/lib/api';
import { useSpendNestStore } from '@/store/useSpendNestStore';

export default function UploadZone() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [bankName, setBankName] = useState('Main Account');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setDashboardData, clearDashboardData } = useSpendNestStore();

  const handleFile = (selectedFile: File | null) => {
    if (selectedFile) {
      const isAllowed = selectedFile.name.toLowerCase().endsWith('.csv') || 
                        selectedFile.name.toLowerCase().endsWith('.pdf');
      if (!isAllowed) {
        setError('Invalid file type. Please select a .csv or .pdf file.');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUploadClick = async () => {
    if (!file) return;
    setIsUploading(true);
    setError('');
    
    // Clear Zustand store before upload
    clearDashboardData();

    try {
      const data = await uploadStatementFile(file, bankName);
      setDashboardData(data);
      router.refresh(); // re-render dashboard page with new data
    } catch (err: any) {
      setError(err.message || 'Failed to upload and analyze statement.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="w-full max-w-2xl bg-white p-8 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)] mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-14 transition-all duration-300 text-center flex flex-col items-center justify-center cursor-pointer relative overflow-hidden
          ${isDragging ? 'border-blue-400 bg-blue-50 scale-[1.02]' : ''}
          ${file && !error && !isDragging ? 'border-blue-400 bg-blue-50/50' : ''}
          ${!file && !error && !isDragging ? 'border-slate-200 hover:border-blue-300 hover:bg-slate-50' : ''}
          ${error && !isDragging ? 'border-rose-300 bg-rose-50' : ''}
        `}
      >
        <input
          type="file"
          className="hidden"
          accept=".csv,.pdf"
          ref={fileInputRef}
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
          disabled={isUploading}
        />

        <div className={`mb-6 transition-colors duration-300 ${isDragging ? 'text-blue-500 scale-110' : error ? 'text-rose-500' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={file && !error ? 'text-blue-500' : ''}>
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
            <path d="M12 12v9"/>
            <path d="m16 16-4-4-4 4"/>
          </svg>
        </div>

        {file && !error ? (
          <>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{file.name}</h3>
            <div className="mb-6 w-full max-w-xs mx-auto">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 text-left">Bank / Account Name</label>
              <input 
                type="text" 
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. ICICI, HDFC, Chase"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <p className="text-slate-500 text-sm mb-6">Ready for analysis</p>
            <button
              onClick={(e) => { e.stopPropagation(); handleUploadClick(); }}
              disabled={isUploading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold transition-all shadow-md disabled:opacity-50"
            >
              {isUploading ? 'Uploading & Parsing...' : 'Analyze Statement'}
            </button>
          </>
        ) : (
          <>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Upload Bank Statement</h3>
            <p className="text-slate-500 text-sm mb-6">Drag and drop or click to browse (.csv, .pdf)</p>
            <div className="bg-white text-slate-700 px-6 py-2 rounded-full font-medium text-sm border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
              Select File
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-medium flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}
