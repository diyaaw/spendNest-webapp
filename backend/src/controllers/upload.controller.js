const crypto = require('crypto');
const { parseAndAnalyze } = require('../services/ml.service');
const Transaction  = require('../models/Transaction.model');
const Ledger       = require('../models/Ledger.model');
const Forecast     = require('../models/Forecast.model');
const FinancialHealth = require('../models/FinancialHealth.model');
const AuditLog        = require('../models/AuditLog.model');
const { UploadStore } = require('../services/sharedStore');

const { isDbConnected } = require('../config/db');  // shared singleton � never define locally

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
const uploadStatement = async (req, res, next) => {
  // ── 1. Validate uploaded file ──────────────────────────────────────────────
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded. Please attach a CSV file.' });
  }

  console.log(`📁 [Upload] File received: '${req.file.originalname}' (${req.file.size} bytes)`);

  const userId   = req.user.id || req.user._id;
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
      message: 'The ML service parsed the file but found no valid transactions. Check that the file has Date and Amount columns.',
    });
  }

  // ── 4. Prepare transaction documents ──────────────────────────────────────
  const txDocs = mlResult.transactions.map((tx) => {
    let amount = 0;
    if (typeof tx.amount === 'number' && !isNaN(tx.amount)) {
      amount = tx.amount;
    } else if (tx.amount != null) {
      const parsed = parseFloat(String(tx.amount).replace(/[^\d.\-]/g, ''));
      if (!isNaN(parsed)) amount = parsed;
    }

    // Determine type from ML classification
    let type = VALID_TYPES.has(tx.type) ? tx.type : 'unknown';
    if (type === 'unknown') {
      type = amount > 0 ? 'income' : amount < 0 ? 'expense' : 'transfer';
    }

    // Income sign-correction: if description suggests income but amount is negative
    const INCOME_HINTS = ['salary', 'payroll', 'bonus', 'stipend', 'interest', 'freelance', 'refund', 'income'];
    const desc = (tx.description || '').toLowerCase();
    if (amount < 0 && INCOME_HINTS.some((hint) => desc.includes(hint))) {
      amount = Math.abs(amount);
      type = 'income';
    }

    const bank = req.body.bankName || 'Main Account';

    return {
      userId,
      date:        tx.date ? new Date(tx.date) : new Date(),
      description: tx.description || '',
      amount,
      balance:     typeof tx.balance === 'number' ? tx.balance : 0,
      type,
      category:    tx.category || 'other',
      isRecurring: tx.is_likely_recurring ?? tx.is_recurring ?? false,
      isAnomaly:   tx.is_anomaly   ?? false,
      source:      'statement_upload',
      uploadBatch: uploadId,
      bank,
    };
  });

  const rec   = mlResult.recommendation   || {};
  const summ  = mlResult.summary          || {};
  const fc    = mlResult.forecast         || {};
  const subs  = mlResult.subscriptions    || [];
  const efund = mlResult.emergency_fund   || {};

  // ── 5. Persist (MongoDB vs In-Memory) ──────────────────────────────────────
  if (isDbConnected()) {
    try {
      // a) Transactions — batch insert
      await Transaction.insertMany(txDocs);

      // b) Ledger — upsert current month
      const now   = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      await Ledger.findOneAndUpdate(
        { userId, month },
        {
          $set: {
            totalIncome:         Number(summ.total_income)                || 0,
            totalExpenses:       Number(summ.total_expenses)              || 0,
            availableToSpend:    Number(rec.safe_to_spend)                || 0,
            quarantinedForTaxes: Number(rec.reserved_funds)               || 0,
            emergencyBuffer:     Number(rec.emergency_buffer)             || 0,
            monthlyBurn:         Number(rec.monthly_burn)                 || 0,
            saveRate: Math.min(1, Math.max(0,
              Number(rec.recommended_reserve_rate) || 0.10)),
          },
        },
        { upsert: true }
      );

      // c) Forecast — create a new document
      const predictions = [];
      if (fc.predicted_month && fc.predicted_month !== 'Insufficient Data') {
        predictions.push({
          month:               fc.predicted_month,
          predictedIncome:     Number(fc.predicted_income) || 0,
          recommendedSaveRate: Number(rec.recommended_reserve_rate) || 0.10,
        });
      }
      await Forecast.create({
        userId,
        generatedAt: new Date(),
        model:        fc.model_used        || 'WMA',
        predictions,
        historicalIncome:  fc.historical_income  || [],
        stagesAvailable:   fc.stages_available   || 0,
        isExpenseForecast: fc.is_expense_forecast || false,
        volatility: {
          score:          fc.volatility?.score           || 0,
          fluctuationPct: fc.volatility?.fluctuation_pct || 0,
          stabilityScore: fc.volatility?.stability_score || 0,
          variance:       fc.volatility?.variance        || 0,
        },
        bufferRecommendation: {
          emergencySavingsPct: fc.buffer_recommendation?.emergency_savings_pct || 20,
          taxReservePct:       fc.buffer_recommendation?.tax_reserve_pct       || 15,
        },
        insights: fc.insights || [],
      });

      // d) Financial Health
      await FinancialHealth.findOneAndUpdate(
        { userId },
        {
          $set: {
            insights: mlResult.insights || [],
            trends:   mlResult.trends   || {},
          }
        },
        { upsert: true, returnDocument: 'after' }
      );

      // e) Audit Log
      await AuditLog.create({
        userId,
        action: 'statement_upload',
        metadata: {
          filename:    req.file.originalname,
          rowCount:    txDocs.length,
          uploadBatch: uploadId,
        },
      });

      console.log(`✅ [Upload] Persisted to MongoDB (batch: ${uploadId})`);
    } catch (err) {
      console.error('❌ [Upload] MongoDB persistence failed:', err.message);
      console.warn('⚠️ Falling back to In-Memory store for this upload...');
      await UploadStore.create({
        userId, uploadId, txDocs,
        summary: summ,
        recommendation: rec,
        forecast: fc,
        subscriptions: subs,
        emergency_fund: efund,
        insights: mlResult.insights || [],
        trends: mlResult.trends || {},
        monthlyAnalytics: mlResult.monthly_analytics || [],
        currentMonth: mlResult.current_month || {},
      });
    }
  } else {
    // In-Memory Mode — store everything the ML service returned
    await UploadStore.create({
      userId, uploadId, txDocs,
      summary: summ,
      recommendation: rec,
      forecast: fc,
      subscriptions: subs,
      emergency_fund: efund,
      insights: mlResult.insights || [],
      trends: mlResult.trends || {},
      monthlyAnalytics: mlResult.monthly_analytics || [],
      currentMonth: mlResult.current_month || {},
    });
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


module.exports = { uploadStatement };


