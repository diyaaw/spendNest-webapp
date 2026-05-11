const mongoose = require('mongoose');
const crypto = require('crypto');
const { parseAndAnalyze } = require('../services/ml.service');
const Transaction = require('../models/Transaction.model');
const Ledger      = require('../models/Ledger.model');
const Forecast    = require('../models/Forecast.model');
const { UploadStore } = require('../services/sharedStore');

const isDbConnected = () => mongoose.connection.readyState === 1;

// Allowed type values in Transaction model enum
const VALID_TYPES = new Set(['income', 'expense', 'transfer', 'refund', 'unknown']);

/**
 * POST /api/upload
 * ────────────────
 * 1. Validates the uploaded CSV file.
 * 2. Forwards it to the Flask ML service for parsing + analysis.
 * 3. Persists transactions, ledger, and forecast to MongoDB (or In-Memory store).
 * 4. Returns { uploadId, filename, rowCount, summary } to the frontend.
 */
const uploadCsv = async (req, res, next) => {
  // ── 1. Validate uploaded file ──────────────────────────────────────────────
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded. Please attach a CSV file.' });
  }

  console.log(`📁 [Upload] File received: '${req.file.originalname}' (${req.file.size} bytes)`);

  const userId   = req.user.id || req.user._id; // handle both models
  const uploadId = crypto.randomUUID();

  // ── 2. Forward CSV to Flask ML service ────────────────────────────────────
  let mlResult;
  try {
    mlResult = await parseAndAnalyze(req.file.buffer, req.file.originalname);
  } catch (err) {
    console.error('❌ [Upload] ML service call failed:', err.message);

    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        message: 'ML service is unavailable. Make sure Flask is running on port 8000.',
      });
    }
    if (err.code === 'ETIMEDOUT') {
      return res.status(504).json({ message: 'ML service timed out. Try a smaller file.' });
    }
    if (err.statusCode) {
      return res.status(502).json({
        message: 'ML service returned an error.',
        detail: err.mlDetail || err.message,
      });
    }
    return next(err);
  }

  // ── 3. Validate ML response ────────────────────────────────────────────────
  if (!mlResult.transactions || mlResult.transactions.length === 0) {
    return res.status(422).json({
      message: 'The ML service parsed the file but found no valid transactions. Check that the CSV has Date and Amount/Debit/Credit columns.',
    });
  }

  // ── 4. Prepare data for persistence ────────────────────────────────────────
  const txDocs = mlResult.transactions.map((tx) => {
    let amount = 0;
    if (typeof tx.amount === 'number' && !isNaN(tx.amount)) {
      amount = tx.amount;
    } else if (tx.amount != null) {
      const parsed = parseFloat(String(tx.amount).replace(/[^\d.\-]/g, ''));
      if (!isNaN(parsed)) amount = parsed;
    }

    let type = VALID_TYPES.has(tx.type) ? tx.type : 'unknown';
    if (type === 'unknown') {
      type = amount > 0 ? 'income' : amount < 0 ? 'expense' : 'transfer';
    }

    return {
      userId,
      date:        tx.date ? new Date(tx.date) : new Date(),
      description: tx.description || '',
      amount,
      type,
      category:    tx.category || 'Uncategorized',
      isRecurring: tx.is_recurring  ?? false,
      source:      'csv_upload',
      uploadBatch: uploadId,
      isAnomaly:   tx.is_anomaly   ?? false,
    };
  });

  const rec  = mlResult.recommendation || {};
  const summ = mlResult.summary        || {};
  const fc   = mlResult.forecast        || {};

  // ── 5. Persist (MongoDB vs In-Memory) ──────────────────────────────────────
  if (isDbConnected()) {
    try {
      // a) Transactions
      await Transaction.insertMany(txDocs);

      // b) Ledger
      const now   = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      await Ledger.findOneAndUpdate(
        { userId, month },
        {
          $set: {
            totalIncome:          Number(summ.total_income)                   || 0,
            totalExpenses:        Number(summ.total_expenses)                 || 0,
            availableToSpend:     Number(rec.safe_to_spend)                   || 0,
            quarantinedForTaxes:  Number(rec.reserved_funds)                  || 0,
            emergencyBuffer:      Number(rec.emergency_buffer)                || 0,
            saveRate:             Math.min(1, Math.max(0,
                                    Number(rec.recommended_reserve_rate) || 0.10)),
          },
        },
        { upsert: true }
      );

      // c) Forecast
      const predictions = [];
      if (fc.predicted_month) {
        predictions.push({
          month:               fc.predicted_month,
          predictedIncome:     Number(fc.predicted_income)   || 0,
          recommendedSaveRate: Number(rec.recommended_reserve_rate) || 0.10,
        });
      }
      await Forecast.create({
        userId,
        generatedAt: new Date(),
        model: (fc.model_used || 'SMA').includes('ARIMA') ? 'ARIMA' : 'SMA',
        predictions,
      });

      console.log(`✅ [Upload] Persisted to MongoDB (batch: ${uploadId})`);
    } catch (err) {
      console.error('❌ [Upload] MongoDB persistence failed:', err.message);
      // Fallback if insertion fails due to validation (like ObjectId cast)
      console.warn('⚠️ Falling back to In-Memory store for this upload...');
      await UploadStore.create({ userId, uploadId, txDocs, summary: summ, recommendation: rec, forecast: fc });
    }
  } else {
    // In-Memory Mode
    await UploadStore.create({ userId, uploadId, txDocs, summary: summ, recommendation: rec, forecast: fc });
    console.log(`✅ [Upload] Persisted to In-Memory store (batch: ${uploadId})`);
  }

  // ── 6. Respond ─────────────────────────────────────────────────────────────
  return res.status(201).json({
    uploadId,
    filename: req.file.originalname,
    rowCount: txDocs.length,
    summary:  summ,
  });
};


module.exports = { uploadCsv };
