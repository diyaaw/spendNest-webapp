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
  { key: 'description', label: 'Description / Memo', placeholder: 'e.g. narration, description', icon: '📝' },
  { key: 'type', label: 'Income/Expense Flag', placeholder: 'e.g. type, dr_cr', icon: '↕️' },
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

      // Simulate detected patterns from ML response
      const patterns: string[] = [];
      if (data.allTransactions?.length > 0) patterns.push(`✅ ${data.allTransactions.length} transactions imported`);
      if (data.forecast) patterns.push('🔮 Income forecast generated');
      if (data.recommendation) patterns.push('💡 Cash-flow recommendation ready');
      setDetectedPatterns(patterns);
      setUploadState('success');

      // Mark onboarding complete
      await saveToBackend({ onboardingCompleted: true, onboardingStep: 5 });

      // Navigate after a brief success flash
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white mb-1">Import your financial data</h1>
        <p className="text-white/40 text-sm">Upload your bank statement CSV for instant AI-powered insights. You can always add data later.</p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer
          ${isDragging ? 'border-indigo-400 bg-indigo-500/10' : file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/15 bg-white/3 hover:border-white/25 hover:bg-white/5'}
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
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-emerald-400 font-semibold text-sm">{file.name}</p>
              <p className="text-white/30 text-xs mt-1">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-white/60 font-semibold text-sm">Drop your CSV here</p>
              <p className="text-white/25 text-xs mt-1">or click to browse · Supports bank statement exports</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Column mapper (shown when file selected) */}
      <AnimatePresence>
        {file && uploadState === 'idle' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">CSV Column Mapping</p>
                <span className="text-xs text-white/25 ml-1">— tell us which columns contain which data</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {CSV_COLUMNS.map((col) => (
                  <div key={col.key} className="flex items-center gap-3">
                    <span className="text-base w-6 text-center">{col.icon}</span>
                    <label className="text-xs font-medium text-white/50 w-36 flex-shrink-0">{col.label}</label>
                    <input
                      type="text"
                      placeholder={col.placeholder}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs placeholder-white/15 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 hover:border-white/20 transition-all"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/20 mt-4">💡 Leave fields blank to use AI auto-detection — our ML model identifies column types automatically.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload error */}
      {uploadState === 'error' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3"
        >
          <span className="text-rose-400">⚠️</span>
          <p className="text-rose-400 text-sm">{uploadError}</p>
        </motion.div>
      )}

      {/* Success state */}
      <AnimatePresence>
        {uploadState === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-5"
          >
            <p className="text-emerald-400 font-bold text-sm mb-3">🎉 Upload successful! Redirecting to dashboard…</p>
            <div className="space-y-1.5">
              {detectedPatterns.map((p) => (
                <p key={p} className="text-emerald-400/70 text-xs">{p}</p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uploading spinner */}
      {uploadState === 'uploading' && (
        <div className="flex items-center gap-3 text-indigo-400 text-sm">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span>Analysing your transactions with AI…</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-3.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/25 text-sm font-medium transition-all"
        >
          ← Back
        </button>

        {file && uploadState !== 'success' && (
          <motion.button
            id="onboarding-upload-btn"
            type="button"
            onClick={handleUpload}
            disabled={uploadState === 'uploading'}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-60 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-900/30 text-sm"
          >
            {uploadState === 'uploading' ? 'Uploading…' : 'Upload & Analyse →'}
          </motion.button>
        )}

        {uploadState !== 'success' && (
          <button
            id="onboarding-skip-btn"
            type="button"
            onClick={handleSkip}
            className={`py-3.5 rounded-xl border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 text-sm font-medium transition-all ${file ? 'px-5' : 'flex-1'}`}
          >
            {file ? 'Skip' : 'Skip for now →'}
          </button>
        )}
      </div>

      <p className="text-xs text-white/20 text-center leading-relaxed">
        Your data is processed securely and never shared. You can connect more accounts or re-upload data anytime from your dashboard.
      </p>
    </div>
  );
}
