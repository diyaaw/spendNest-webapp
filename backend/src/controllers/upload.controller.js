const crypto = require('crypto');
const { parseAndAnalyze } = require('../services/ml.service');
const Transaction = require('../models/Transaction.model');
const Ledger = require('../models/Ledger.model');
const Forecast = require('../models/Forecast.model');
const FinancialHealth = require('../models/FinancialHealth.model');
const AuditLog = require('../models/AuditLog.model');
const { UploadStore } = require('../services/sharedStore');

const { isDbConnected } = require('../config/db');

// Allowed type values in Transaction model enum
const VALID_TYPES = new Set(['income', 'expense', 'transfer', 'refund', 'unknown']);

// ═══════════════════════════════════════════════════════════════════════════
// FIELD NORMALIZER
// ═══════════════════════════════════════════════════════════════════════════
// Flask may return any of these column name variants depending on the CSV.
// We resolve them here — ONCE — so every downstream consumer gets clean,
// consistent { date, type, amount, category, description, balance } objects.
//
//   Flask field     →  normalized field
//   ─────────────────────────────────────────────────────────────────────
//   Amount_INR      →  amount   (Indian bank CSV header)
//   Amount / amount →  amount   (generic)
//   Type / type     →  type     (lowercased + validated)
//   Date / date     →  date
//   Category        →  category (lowercased)
//   Description     →  description
//   Balance         →  balance
// ─────────────────────────────────────────────────────────────────────────

/**
 * Reads the numeric amount from a Flask transaction object,
 * checking all known column name variants. Returns a raw number (may be negative).
 */
const resolveAmount = (tx) => {
  const raw =
    tx.Amount_INR ??   // Indian bank CSV — capital A, underscore, capital I
    tx.amount_inr ??   // lowercase variant
    tx.Amount ??   // generic capitalized
    tx.amount ??   // standard lowercase
    null;

  if (raw === null || raw === undefined) return null;

  if (typeof raw === 'number' && !isNaN(raw)) return raw;

  // String — strip currency symbols, commas, spaces; keep minus sign and decimal
  const parsed = parseFloat(String(raw).replace(/[^\d.\-]/g, ''));
  return isNaN(parsed) ? null : parsed;
};

/**
 * Reads the type string from a Flask transaction object,
 * normalized to lowercase. Falls back to sign-based inference.
 */
const resolveType = (tx, amount) => {
  const raw = tx.type || tx.Type || '';
  const normalized = raw.toString().toLowerCase().trim();

  if (VALID_TYPES.has(normalized) && normalized !== 'unknown') return normalized;

  // Sign-based fallback when Flask didn't classify
  if (amount > 0) return 'income';
  if (amount < 0) return 'expense';
  return 'transfer';
};

/**
 * Reads the date from a Flask transaction object.
 */
const resolveDate = (tx) => {
  const raw = tx.date || tx.Date || null;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Reads the category, normalized to lowercase.
 */
const resolveCategory = (tx) => {
  const raw = tx.category || tx.Category || 'other';
  return raw.toString().toLowerCase().trim();
};

/**
 * Reads the description.
 */
const resolveDescription = (tx) => tx.description || tx.Description || '';

/**
 * Reads the running balance.
 */
const resolveBalance = (tx) => {
  const raw = tx.balance ?? tx.Balance ?? 0;
  const n = Number(raw);
  return isNaN(n) ? 0 : n;
};

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/upload
// ═══════════════════════════════════════════════════════════════════════════
const uploadStatement = async (req, res, next) => {
  // ── 1. Validate uploaded file ──────────────────────────────────────────────
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded. Please attach a CSV file.' });
  }

  console.log(`📁 [Upload] File received: '${req.file.originalname}' (${req.file.size} bytes)`);

  const userId = req.user.id || req.user._id;
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

  // ── 4. Log first raw transaction from Flask for diagnostics ───────────────
  // This helps immediately spot column name mismatches during development.
  console.log('🔍 [Upload] First raw transaction from Flask:', JSON.stringify(mlResult.transactions[0]));

  // ── 5. Normalize + prepare transaction documents ───────────────────────────
  // THIS IS THE CRITICAL STEP.
  // resolveAmount / resolveType / resolveDate check all known Flask column name
  // variants (Amount_INR, Type, Date, etc.) so downstream code always sees
  // { amount, type, date, category, description, balance } regardless of what
  // column names the original CSV used.
  const INCOME_HINTS = ['salary', 'payroll', 'bonus', 'stipend', 'interest', 'freelance', 'refund', 'income'];
  const bank = req.body.bankName || 'Main Account';

  const txDocs = mlResult.transactions
    .map((tx) => {
      // ── Resolve all fields through normalizers ──
      let amount = resolveAmount(tx);

      // Unparseable amount — skip this row
      if (amount === null) {
        console.warn('[Upload] Skipping row with unparseable amount:', JSON.stringify(tx));
        return null;
      }

      let type = resolveType(tx, amount);

      // Income sign-correction: negative amount but description hints at income
      const desc = resolveDescription(tx).toLowerCase();
      if (amount < 0 && INCOME_HINTS.some((hint) => desc.includes(hint))) {
        amount = Math.abs(amount);
        type = 'income';
      }

      // Expense amounts should always be stored as positive (absolute)
      // Income amounts should also be positive
      // We use type-based accounting everywhere, not sign-based
      amount = Math.abs(amount);

      const date = resolveDate(tx);

      return {
        userId,
        date,
        description: resolveDescription(tx),
        amount,
        balance: resolveBalance(tx),
        type,
        category: resolveCategory(tx),
        isRecurring: tx.is_likely_recurring ?? tx.is_recurring ?? false,
        isAnomaly: tx.is_anomaly ?? false,
        source: 'statement_upload',
        uploadBatch: uploadId,
        bank,
      };
    })
    .filter((doc) => {
      if (!doc) return false;                           // null from unparseable amount

      if (!doc.date || isNaN(doc.date.getTime())) {    // invalid date
        console.warn('[Upload] Skipping row with invalid date:', doc.description);
        return false;
      }

      // Future-date guard: reject anything beyond end of current year
      // (catches mis-parsed 2-digit years like "27" → 2027)
      const cutoff = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);
      if (doc.date > cutoff) {
        console.warn('[Upload] Skipping future-dated tx (likely mis-parsed year):', doc.description, doc.date);
        return false;
      }

      return true;
    });

  // Diagnostics: log aggregated totals from normalized txDocs
  const diagIncome = txDocs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const diagExpenses = txDocs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  console.log(
    `📊 [Upload] txDocs ready — total: ${txDocs.length} | ` +
    `income txns: ${txDocs.filter(t => t.type === 'income').length} (₹${Math.round(diagIncome).toLocaleString()}) | ` +
    `expense txns: ${txDocs.filter(t => t.type === 'expense').length} (₹${Math.round(diagExpenses).toLocaleString()})`
  );

  if (txDocs.length === 0) {
    return res.status(422).json({
      message: 'No valid transactions remained after date validation. Check that dates are in a recognizable format.',
    });
  }

  const rec = mlResult.recommendation || {};
  const summ = mlResult.summary || {};
  const fc = mlResult.forecast || {};
  const subs = mlResult.subscriptions || [];
  const efund = mlResult.emergency_fund || {};

  // ── 6. Persist (MongoDB vs In-Memory) ─────────────────────────────────────
  if (isDbConnected()) {
    try {
      // a) Transactions — batch insert
      await Transaction.insertMany(txDocs);

      // b) Ledger — upsert current month
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      await Ledger.findOneAndUpdate(
        { userId, month },
        {
          $set: {
            totalIncome: Number(summ.total_income) || diagIncome,
            totalExpenses: Number(summ.total_expenses) || diagExpenses,
            availableToSpend: Number(rec.safe_to_spend) || 0,
            quarantinedForTaxes: Number(rec.reserved_funds) || 0,
            emergencyBuffer: Number(rec.emergency_buffer) || 0,
            monthlyBurn: Number(rec.monthly_burn) || 0,
            saveRate: Math.min(1, Math.max(0,
              Number(rec.recommended_reserve_rate) || 0.10)),
          },
        },
        { upsert: true }
      );

      // c) Forecast
      const predictions = [];
      if (fc.predicted_month && fc.predicted_month !== 'Insufficient Data') {
        predictions.push({
          month: fc.predicted_month,
          predictedIncome: Number(fc.predicted_income) || 0,
          recommendedSaveRate: Number(rec.recommended_reserve_rate) || 0.10,
        });
      }
      await Forecast.create({
        userId,
        generatedAt: new Date(),
        model: fc.model_used || 'WMA',
        predictions,
        historicalIncome: fc.historical_income || [],
        stagesAvailable: fc.stages_available || 0,
        isExpenseForecast: fc.is_expense_forecast || false,
        volatility: {
          score: fc.volatility?.score || 0,
          fluctuationPct: fc.volatility?.fluctuation_pct || 0,
          stabilityScore: fc.volatility?.stability_score || 0,
          variance: fc.volatility?.variance || 0,
        },
        bufferRecommendation: {
          emergencySavingsPct: fc.buffer_recommendation?.emergency_savings_pct || 20,
          taxReservePct: fc.buffer_recommendation?.tax_reserve_pct || 15,
        },
        insights: fc.insights || [],
      });

      // d) Financial Health
      await FinancialHealth.findOneAndUpdate(
        { userId },
        { $set: { insights: mlResult.insights || [], trends: mlResult.trends || {} } },
        { upsert: true, returnDocument: 'after' }
      );

      // e) Audit Log
      await AuditLog.create({
        userId,
        action: 'statement_upload',
        metadata: { filename: req.file.originalname, rowCount: txDocs.length, uploadBatch: uploadId },
      });

      console.log(`✅ [Upload] Persisted to MongoDB (batch: ${uploadId})`);
    } catch (err) {
      console.error('❌ [Upload] MongoDB persistence failed:', err.message);
      console.warn('⚠️  Falling back to In-Memory store for this upload...');
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

  // ── 7. Respond ─────────────────────────────────────────────────────────────
  return res.status(201).json({
    uploadId,
    filename: req.file.originalname,
    rowCount: txDocs.length,
    summary: summ,
  });
};

module.exports = { uploadStatement };


