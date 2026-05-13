'use client';

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { uploadCsvFile } from '@/lib/api';
import { useSpendNestStore } from '@/store/useSpendNestStore';
import { useRouter } from 'next/navigation';

// ── Column mapper ─────────────────────────────────────────────────────────────

const CSV_COLUMNS = [
  { key: 'date', label: 'Date Column', placeholder: 'e.g. date, transaction_date', icon: '📅' },
  { key: 'amount', label: 'Amount Column', placeholder: 'e.g. amount, debit, credit', icon: '💰' },
  { key: 'description', label: 'Description', placeholder: 'e.g. narration, description', icon: '📝' },
  { key: 'type', label: 'Type/Flag', placeholder: 'e.g. type, dr_cr', icon: '↕️' },
  { key: 'category', label: 'Category', placeholder: 'e.g. category (optional)', icon: '🏷️' },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

interface Step5Props {
  onBack: () => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function Step5DataImport({ onBack }: Step5Props) {
  const { saveToBackend } = useOnboardingStore();
  const { setDashboardData } = useSpendNestStore();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadError, setUploadError] = useState('');
  const [detectedPatterns, setDetectedPatterns] = useState<string[]>([]);

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith('.csv')) {
      setFile(dropped);
      setUploadState('idle');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setUploadState('idle'); }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploadState('uploading');
    setUploadError('');
    try {
      const data = await uploadCsvFile(file);
      setDashboardData(data);

      const patterns: string[] = [];
      if (data.allTransactions?.length > 0) patterns.push(`✅ ${data.allTransactions.length} transactions imported`);
      if (data.forecast) patterns.push('🔮 Income forecast generated');
      if (data.recommendation) patterns.push('💡 Cash-flow recommendation ready');
      setDetectedPatterns(patterns);
      setUploadState('success');

      await saveToBackend({ onboardingCompleted: true, onboardingStep: 5 });
      setTimeout(() => router.replace('/dashboard'), 2000);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Please try again.');
      setUploadState('error');
    }
  };

  const handleSkip = async () => {
    await saveToBackend({ onboardingCompleted: true, onboardingStep: 5 });
    router.replace('/dashboard');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">Import Data</h1>
        <p className="text-slate-500 text-sm leading-relaxed">Upload your bank statement CSV for instant AI-powered insights.</p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-[2rem] p-12 text-center transition-all duration-300 cursor-pointer
          ${isDragging ? 'border-indigo-400 bg-indigo-50' : file ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'}
        `}
      >
        <input
          id="csv-upload-input"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />

        <AnimatePresence mode="wait">
          {file ? (
            <motion.div key="file" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="w-16 h-16 bg-emerald-100 rounded-[1.25rem] flex items-center justify-center mx-auto mb-4 text-emerald-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-slate-900 font-bold text-lg">{file.name}</p>
              <p className="text-slate-400 text-xs mt-1">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="w-16 h-16 bg-slate-100 rounded-[1.25rem] flex items-center justify-center mx-auto mb-4 text-slate-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-slate-900 font-bold text-lg">Drop statement here</p>
              <p className="text-slate-400 text-xs mt-1">or click to browse · Supports .csv exports</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Column mapper */}
      <AnimatePresence>
        {file && uploadState === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">CSV Mapping (Optional)</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {CSV_COLUMNS.map((col) => (
                  <div key={col.key} className="flex items-center gap-4">
                    <span className="text-xl w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg">{col.icon}</span>
                    <label className="text-xs font-bold text-slate-500 w-32 flex-shrink-0">{col.label}</label>
                    <input
                      type="text"
                      placeholder={col.placeholder}
                      className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-slate-900 text-xs placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 transition-all"
                    />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-6 font-medium leading-relaxed italic">
                💡 Tip: Leave fields blank for AI auto-detection. Our model identifies columns automatically.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error / Success / Uploading */}
      {uploadState === 'error' && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold flex items-center gap-2">
           <span>⚠️</span>
           {uploadError}
        </div>
      )}

      {uploadState === 'success' && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-6 text-center">
          <p className="text-emerald-700 font-black text-lg mb-2">🎉 Import Successful!</p>
          <p className="text-emerald-600/80 text-sm">Redirecting you to the dashboard...</p>
        </div>
      )}

      {uploadState === 'uploading' && (
        <div className="flex flex-col items-center justify-center p-8 bg-indigo-50 rounded-[2rem] border border-indigo-100">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-indigo-900 font-bold text-sm text-center">Analysing transactions with AI...</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          className="px-8 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 hover:text-slate-600 hover:border-slate-200 text-sm font-bold transition-all"
        >
          Back
        </button>

        {file && uploadState !== 'success' && (
          <motion.button
            id="onboarding-upload-btn"
            type="button"
            onClick={handleUpload}
            disabled={uploadState === 'uploading'}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl transition-all duration-200 shadow-xl shadow-slate-200 text-sm flex items-center justify-center gap-2"
          >
            {uploadState === 'uploading' ? 'Analyzing...' : 'Analyze Statement'}
          </motion.button>
        )}

        {!file && uploadState !== 'success' && (
          <button
            id="onboarding-skip-btn"
            type="button"
            onClick={handleSkip}
            className="flex-1 py-4 bg-white border-2 border-slate-100 text-slate-400 hover:text-slate-600 hover:border-slate-200 text-sm font-bold rounded-2xl transition-all"
          >
            Skip for now →
          </button>
        )}
      </div>

      <p className="text-[10px] text-slate-400 text-center px-8 font-medium">
        Secure encryption active. Your data is private and SOC 2 compliant.
      </p>
    </div>
  );
}
