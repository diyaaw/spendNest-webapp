const Transaction = require('../models/Transaction.model');
const Ledger = require('../models/Ledger.model');
const Forecast = require('../models/Forecast.model');
const FinancialHealth = require('../models/FinancialHealth.model');
const { UploadStore } = require('../services/sharedStore');

const { isDbConnected } = require('../config/db');

// ═══════════════════════════════════════════════════════════════════════════
// FIELD NORMALIZER
// ═══════════════════════════════════════════════════════════════════════════
// Handles CSV column name variants before any logic runs.
// This is the single source of truth for field access — never read
// t.amount, t.type, t.date directly anywhere else in this file.
//
//   CSV column      →  normalized field
//   ─────────────────────────────────────
//   Amount_INR      →  amount
//   Amount / amount →  amount
//   Type / type     →  type   (lowercased)
//   Date / date     →  date
//   Category        →  category
//   Description     →  description
// ─────────────────────────────────────────────────────────────────────────

/**
 * Returns the numeric amount from a transaction object,
 * checking all known column name variants. Always positive (abs).
 */
const normAmt = (t) => {
  const raw =
    t.Amount_INR ??   // Excel/CSV header variant
    t.amount_inr ??   // lowercase variant
    t.Amount ??   // generic capitalized
    t.amount ??   // standard
    0;
  return Math.abs(Number(raw) || 0);
};

/**
 * Returns the type string from a transaction object,
 * normalized to lowercase. Checks all known column name variants.
 */
const normType = (t) => {
  const raw = t.type || t.Type || t.category || t.Category || '';
  return raw.toString().toLowerCase().trim();
};

/**
 * Returns a valid Date object from a transaction,
 * checking all known date column variants.
 */
const normDate = (t) => {
  const raw = t.date || t.Date || null;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

// ═══════════════════════════════════════════════════════════════════════════
// CENTRALIZED ACCOUNTING HELPERS
// ═══════════════════════════════════════════════════════════════════════════
// RULE: Classification is TYPE-based, not sign-based.
//   income  = normType === 'income'
//   expense = normType === 'expense'
// Always uses normAmt() so column name mismatches don't silently produce ₹0.
// ─────────────────────────────────────────────────────────────────────────

const calcIncome = (txList) => {
  let total = 0;
  txList.forEach((t) => {
    if (normType(t) === 'income') total += normAmt(t);
  });
  return total;
};

const calcExpenses = (txList) => {
  let total = 0;
  txList.forEach((t) => {
    if (normType(t) === 'expense') total += normAmt(t);
  });
  return total;
};

const calcSavings = (txList) => calcIncome(txList) - calcExpenses(txList);

/**
 * Deduplicate a transaction array by _id / transactionId / composite key.
 * Prevents double-counting when in-memory uploads are concatenated.
 */
const deduplicateTx = (txList) => {
  const seen = new Set();
  return txList.filter((t) => {
    const d = normDate(t);
    const key = String(
      t._id ||
      t.transactionId ||
      `${d ? d.toISOString() : 'nodate'}|${normAmt(t)}|${t.description || t.Description || ''}`
    );
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Emit diagnostic summary to the backend console.
 */
const logAccountingDiagnostics = (label, txList) => {
  const income = calcIncome(txList);
  const expenses = calcExpenses(txList);
  const savings = income - expenses;
  const expTxCount = txList.filter((t) => normType(t) === 'expense').length;
  const incTxCount = txList.filter((t) => normType(t) === 'income').length;

  console.log(
    `[${label}] txns=${txList.length} (income=${incTxCount}, expense=${expTxCount}) | ` +
    `income=₹${Math.round(income).toLocaleString()} | ` +
    `expenses=₹${Math.round(expenses).toLocaleString()} | ` +
    `savings=₹${Math.round(savings).toLocaleString()}`
  );

  // Warn if amounts are suspiciously zero despite typed rows existing
  if (expenses === 0 && expTxCount > 0) {
    console.warn(
      `[${label}] ⚠️  expenses=₹0 but ${expTxCount} expense-typed rows exist. ` +
      `Check that Amount_INR/amount column is being read correctly.`
    );
  }
  if (income === 0 && incTxCount > 0) {
    console.warn(
      `[${label}] ⚠️  income=₹0 but ${incTxCount} income-typed rows exist. ` +
      `Check that Amount_INR/amount column is being read correctly.`
    );
  }
  if (income > 0 && savings > income * 1.5) {
    console.warn(
      `[${label}] ⚠️  savings (₹${Math.round(savings)}) > 1.5× income — ` +
      `possible duplicate aggregation.`
    );
  }

  // Sample first 3 rows to help debug column mismatches in production
  if ((income === 0 || expenses === 0) && txList.length > 0) {
    console.warn(`[${label}] 🔍 First 3 raw txn objects for inspection:`);
    txList.slice(0, 3).forEach((t, i) => {
      console.warn(`  [${i}]`, JSON.stringify({
        date: t.date || t.Date,
        type: t.type || t.Type,
        amount: t.amount,
        Amount: t.Amount,
        Amount_INR: t.Amount_INR,
        normAmt: normAmt(t),
        normType: normType(t),
      }));
    });
  }
};

// ─── Shared filter builder ────────────────────────────────────────────────────
const txFilter = (userId, uploadBatch) => {
  const filter = { userId };
  if (uploadBatch) filter.uploadBatch = uploadBatch;
  return filter;
};

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/analytics/summary
// ═══════════════════════════════════════════════════════════════════════════
const getSummary = async (req, res, next) => {
  try {
    const { uploadId } = req.query;
    const userId = req.user.id || req.user._id;

    let transactions = [];
    let mlSummary = null;
    let mlRecommendation = null;

    if (isDbConnected()) {
      transactions = await Transaction.find(txFilter(userId, uploadId)).sort({ date: 1 });
      const ledger = await Ledger.findOne({ userId }).sort({ month: -1 });
      if (ledger) {
        mlRecommendation = {
          reserved_funds: ledger.quarantinedForTaxes,
          emergency_buffer: ledger.emergencyBuffer,
        };
      }
    }

    // Fallback to in-memory
    if (!transactions.length) {
      const uploads = await UploadStore.findByUserId(userId);
      if (uploadId) {
        const target = uploads.find((u) => u.uploadId === uploadId);
        if (target) {
          transactions = target.txDocs;
          mlSummary = target.summary;
          mlRecommendation = target.recommendation;
        }
      } else {
        transactions = uploads.reduce((acc, u) => acc.concat(u.txDocs), []);
      }
    }

    if (!transactions.length) {
      return res.status(404).json({ message: 'No data found. Please upload a CSV first.' });
    }

    // ── Sort by date ──────────────────────────────────────────────────────
    const sorted = [...transactions].sort((a, b) => {
      const da = normDate(a);
      const db = normDate(b);
      if (!da && !db) return 0;
      if (!da) return -1;
      if (!db) return 1;
      return da - db;
    });

    // ── Future-date guard ─────────────────────────────────────────────────
    // Transactions dated beyond Dec 31 of the current year are almost always
    // mis-parsed 2-digit years from Indian bank CSVs (e.g. "27" → 2027).
    const now = new Date();
    const uploadCutoff = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    const validSorted = sorted.filter((t) => {
      const d = normDate(t);
      return d !== null && d <= uploadCutoff;
    });

    const invalidCount = sorted.length - validSorted.length;
    if (invalidCount > 0) {
      console.warn(
        `⚠️  [getSummary] Future-date guard removed ${invalidCount} transaction(s) ` +
        `with dates beyond ${uploadCutoff.toISOString().slice(0, 10)} or unparseable dates.`
      );
    }

    const cleanSorted = deduplicateTx(validSorted.length > 0 ? validSorted : sorted);
    logAccountingDiagnostics('getSummary', cleanSorted);

    // ── CSV running balance (reference only) ──────────────────────────────
    const txWithBalance = cleanSorted.filter((t) => {
      const b = t.balance ?? t.Balance;
      return b != null && Number(b) !== 0;
    });
    const csvBalance = txWithBalance.length > 0
      ? Number(txWithBalance[txWithBalance.length - 1].balance ?? txWithBalance[txWithBalance.length - 1].Balance)
      : null;

    // ── Active month window: always use dataset's latest month ────────────
    const datasetLatestDate = normDate(cleanSorted[cleanSorted.length - 1]);
    const activeYear = datasetLatestDate.getFullYear();
    const activeMonth = datasetLatestDate.getMonth(); // 0-indexed

    const startOfDatasetMonth = new Date(activeYear, activeMonth, 1, 0, 0, 0, 0);
    const endOfDatasetMonth = new Date(activeYear, activeMonth + 1, 0, 23, 59, 59, 999);

    let cmIncome = 0;
    let cmExpenses = 0;

    cleanSorted.forEach((t) => {
      const tDate = normDate(t);
      if (!tDate) return;
      if (tDate >= startOfDatasetMonth && tDate <= endOfDatasetMonth) {
        if (normType(t) === 'income') cmIncome += normAmt(t);
        if (normType(t) === 'expense') cmExpenses += normAmt(t);
      }
    });

    const cmSavings = cmIncome - cmExpenses;
    const cmLabel = datasetLatestDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // ── All-time totals ───────────────────────────────────────────────────
    let allTimeIncome, allTimeExpenses;

    if (mlSummary && Number(mlSummary.total_income) > 0) {
      allTimeIncome = Number(mlSummary.total_income) || 0;
      allTimeExpenses = Number(mlSummary.total_expenses) || 0;
    } else {
      allTimeIncome = calcIncome(cleanSorted);
      allTimeExpenses = calcExpenses(cleanSorted);
    }

    const r = (n) => Math.round(n * 100) / 100;

    const taxBuffer = mlRecommendation?.reserved_funds ? Number(mlRecommendation.reserved_funds) : 0;
    const savingsBuffer = mlRecommendation?.emergency_buffer ? Number(mlRecommendation.emergency_buffer) : 0;

    const formulaBalance = allTimeIncome - allTimeExpenses;
    const finalBalance = allTimeIncome - allTimeExpenses - taxBuffer - savingsBuffer;

    // Sanity guards
    if (csvBalance !== null && allTimeIncome > 0) {
      const deviation = Math.abs(csvBalance - finalBalance) / allTimeIncome;
      if (deviation > 1.5) {
        console.warn(
          `⚠️  [getSummary] Balance discrepancy — CSV: ${r(csvBalance)}, ` +
          `Formula: ${r(finalBalance)}, deviation ${Math.round(deviation * 100)}% > 150%.`
        );
      }
    }

    const flagSuspiciousBalance = allTimeIncome > 0 && finalBalance > allTimeIncome * 1.5;
    if (flagSuspiciousBalance) {
      console.warn(
        `⚠️  [getSummary] Suspicious balance: finalBalance (${r(finalBalance)}) ` +
        `> 1.5 × total_income (${r(allTimeIncome * 1.5)}).`
      );
    }

    return res.json({
      // All-time totals
      total_income: r(allTimeIncome),
      total_expenses: r(allTimeExpenses),
      total_savings: r(formulaBalance),
      latest_balance: r(finalBalance),
      csv_balance: csvBalance !== null ? r(csvBalance) : null,
      balance_suspicious: flagSuspiciousBalance,
      total_transactions: cleanSorted.length,
      income_transactions: cleanSorted.filter((t) => normType(t) === 'income').length,
      expense_transactions: cleanSorted.filter((t) => normType(t) === 'expense').length,

      // Current-month KPI cards — frontend MUST read from here, not totals
      current_month: {
        income: r(cmIncome),
        expenses: r(cmExpenses),
        savings: r(cmSavings),
        label: cmLabel,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/analytics/monthly
// ═══════════════════════════════════════════════════════════════════════════
const getMonthlyAnalytics = async (req, res, next) => {
  try {
    const { uploadId } = req.query;
    const userId = req.user.id || req.user._id;

    let transactions = [];
    if (isDbConnected()) {
      transactions = await Transaction.find(txFilter(userId, uploadId)).sort({ date: 1 });
    }

    if (!transactions.length) {
      const uploads = await UploadStore.findByUserId(userId);
      if (uploadId) {
        const target = uploads.find((u) => u.uploadId === uploadId);
        if (target) transactions = target.txDocs;
      } else {
        transactions = uploads.reduce((acc, u) => acc.concat(u.txDocs), []);
      }
    }

    if (!transactions.length) return res.json([]);

    // Future-date guard
    const monthlyCutoff = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);
    const cleanTx = transactions.filter((t) => {
      const d = normDate(t);
      return d !== null && d <= monthlyCutoff;
    });

    const monthMap = {};
    cleanTx.forEach((t) => {
      const d = normDate(t);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      if (!monthMap[key]) monthMap[key] = { key, month: label, income: 0, expenses: 0 };

      if (normType(t) === 'income') monthMap[key].income += normAmt(t);
      if (normType(t) === 'expense') monthMap[key].expenses += normAmt(t);
    });

    const result = Object.values(monthMap)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((m) => ({
        month: m.month,
        income: Math.round(m.income * 100) / 100,
        expenses: Math.round(m.expenses * 100) / 100,
        savings: Math.round((m.income - m.expenses) * 100) / 100,
      }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/analytics/categories
// ═══════════════════════════════════════════════════════════════════════════
const getCategoryBreakdown = async (req, res, next) => {
  try {
    const { uploadId } = req.query;
    const userId = req.user.id || req.user._id;

    if (isDbConnected()) {
      const filter = { ...txFilter(userId, uploadId), type: { $in: ['expense', 'Expense'] } };
      const result = await Transaction.aggregate([
        { $match: filter },
        { $group: { _id: '$category', value: { $sum: { $abs: '$amount' } } } },
        { $sort: { value: -1 } },
        { $match: { value: { $gt: 0 } } },
        { $project: { _id: 0, name: '$_id', value: { $round: ['$value', 2] } } },
      ]);
      if (result.length) return res.json(result);
    }

    // In-memory fallback
    const uploads = await UploadStore.findByUserId(userId);
    let allTx = [];
    if (uploadId) {
      const target = uploads.find((u) => u.uploadId === uploadId);
      if (target) allTx = [...target.txDocs];
    } else {
      allTx = uploads.reduce((acc, u) => acc.concat(u.txDocs), []);
    }

    if (allTx.length) {
      const catMap = {};
      allTx
        .filter((t) => normType(t) === 'expense')
        .forEach((t) => {
          const cat = t.category || t.Category || 'Other';
          catMap[cat] = (catMap[cat] || 0) + normAmt(t);
        });

      const result = Object.entries(catMap)
        .map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value: Math.round(value * 100) / 100,
        }))
        .filter((c) => c.value > 0)
        .sort((a, b) => b.value - a.value);

      return res.json(result);
    }

    res.json([]);
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/analytics/forecast
// ═══════════════════════════════════════════════════════════════════════════
const getForecast = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (isDbConnected()) {
      const forecast = await Forecast.findOne({ userId }).sort({ generatedAt: -1 });
      if (forecast) {
        let historicalIncome = forecast.historicalIncome || [];

        if (historicalIncome.length === 0) {
          const txs = await Transaction.find({
            userId,
            type: { $in: ['income', 'Income'] },
          }).sort({ date: 1 });

          const monthMap = {};
          txs.forEach((t) => {
            const d = normDate(t);
            if (!d) return;
            const key = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
            monthMap[key] = (monthMap[key] || 0) + normAmt(t);
          });
          historicalIncome = Object.entries(monthMap).map(([month, income]) => ({ month, income }));
        }

        return res.json({
          model: forecast.model,
          generatedAt: forecast.generatedAt,
          predictions: forecast.predictions,
          historicalIncome,
          volatility: forecast.volatility || { score: 0, fluctuationPct: 0, stabilityScore: 100, variance: 0 },
          bufferRecommendation: forecast.bufferRecommendation || { emergencySavingsPct: 20, taxReservePct: 15 },
          insights: forecast.insights || [],
          isExpenseForecast: forecast.isExpenseForecast || false,
          stagesAvailable: forecast.stagesAvailable || 0,
        });
      }
    }

    // In-memory fallback
    const uploads = await UploadStore.findByUserId(userId);
    const target = uploads[0];
    if (target && target.forecast) {
      const fc = target.forecast;
      const predictions = [];
      if (fc.predicted_month && fc.predicted_month !== 'Insufficient Data') {
        predictions.push({
          month: fc.predicted_month,
          predictedIncome: Number(fc.predicted_income) || 0,
          recommendedSaveRate: target.recommendation?.recommended_reserve_rate || 0.10,
        });
      }
      return res.json({
        model: fc.model_used || 'WMA',
        generatedAt: new Date(),
        predictions,
        historicalIncome: fc.historical_income || [],
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
        isExpenseForecast: fc.is_expense_forecast || false,
        stagesAvailable: fc.stages_available || 0,
      });
    }

    res.status(404).json({ message: 'No forecast data found.' });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/analytics/ledger
// ═══════════════════════════════════════════════════════════════════════════
const getLedger = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (isDbConnected()) {
      const ledger = await Ledger.findOne({ userId }).sort({ month: -1 });
      if (ledger) {
        return res.json({
          month: ledger.month,
          totalIncome: ledger.totalIncome,
          totalExpenses: ledger.totalExpenses,
          safe_to_spend: ledger.availableToSpend,
          reserved_funds: ledger.quarantinedForTaxes,
          emergency_buffer: ledger.emergencyBuffer,
          recommended_reserve_rate: ledger.saveRate,
          monthly_burn: ledger.monthlyBurn || 0,
        });
      }
    }

    const uploads = await UploadStore.findByUserId(userId);
    const target = uploads[0];
    if (target && target.recommendation) {
      const rec = target.recommendation;
      const summ = target.summary;
      return res.json({
        month: 'Current',
        totalIncome: summ.total_income,
        totalExpenses: summ.total_expenses,
        safe_to_spend: rec.safe_to_spend,
        reserved_funds: rec.reserved_funds,
        emergency_buffer: rec.emergency_buffer,
        recommended_reserve_rate: rec.recommended_reserve_rate,
        monthly_burn: rec.monthly_burn || 0,
      });
    }

    res.status(404).json({ message: 'No ledger data found.' });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/analytics/transactions
// ═══════════════════════════════════════════════════════════════════════════
const getTransactions = async (req, res, next) => {
  try {
    const { uploadId, page = 1, limit = 50, type, category, search } = req.query;
    const userId = req.user.id || req.user._id;

    let transactions = [];
    if (isDbConnected()) {
      const filter = txFilter(userId, uploadId);

      // Normalize type filter to catch both cases stored in DB
      if (type) {
        const lc = type.toLowerCase();
        filter.type = { $in: [lc, lc.charAt(0).toUpperCase() + lc.slice(1)] };
      }
      if (category) filter.category = category;
      if (search) filter.description = { $regex: search, $options: 'i' };

      const skip = (parseInt(page) - 1) * parseInt(limit);
      transactions = await Transaction.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      if (transactions.length) {
        const total = await Transaction.countDocuments(filter);
        return res.json({
          transactions,
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
        });
      }
    }

    const uploads = await UploadStore.findByUserId(userId);
    let allTx = [];
    if (uploadId) {
      const target = uploads.find((u) => u.uploadId === uploadId);
      if (target) allTx = [...target.txDocs];
    } else {
      allTx = uploads.reduce((acc, u) => acc.concat(u.txDocs), []);
    }

    if (allTx.length) {
      if (type) allTx = allTx.filter((t) => normType(t) === type.toLowerCase());
      if (category) allTx = allTx.filter((t) => (t.category || t.Category || '') === category);
      if (search) allTx = allTx.filter((t) =>
        (t.description || t.Description || '').toLowerCase().includes(search.toLowerCase())
      );

      allTx.sort((a, b) => {
        const da = normDate(a);
        const db = normDate(b);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db - da;
      });

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const paginated = allTx.slice(skip, skip + parseInt(limit));

      return res.json({
        transactions: paginated,
        total: allTx.length,
        page: parseInt(page),
        totalPages: Math.ceil(allTx.length / parseInt(limit)),
      });
    }

    res.json({ transactions: [], total: 0, page: 1, totalPages: 0 });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/analytics/insights
// ═══════════════════════════════════════════════════════════════════════════
const getInsights = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (isDbConnected()) {
      const health = await FinancialHealth.findOne({ userId });
      if (health && health.insights && health.insights.length > 0) {
        return res.json({ insights: health.insights });
      }
    }

    const uploads = await UploadStore.findByUserId(userId);
    const target = uploads[0];
    if (target && target.insights) {
      return res.json({ insights: target.insights });
    }

    res.json({ insights: [] });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/analytics/cashflow
// ═══════════════════════════════════════════════════════════════════════════
const getCashflow = async (req, res, next) => {
  try {
    const { uploadId, months = 6 } = req.query;
    const userId = req.user.id || req.user._id;

    let transactions = [];
    if (isDbConnected()) {
      const since = new Date();
      since.setMonth(since.getMonth() - parseInt(months));
      const filter = { ...txFilter(userId, uploadId), date: { $gte: since } };
      transactions = await Transaction.find(filter).sort({ date: 1 });
    }

    if (!transactions.length) {
      const uploads = await UploadStore.findByUserId(userId);
      if (uploadId) {
        const target = uploads.find((u) => u.uploadId === uploadId);
        if (target) transactions = target.txDocs;
      } else {
        transactions = uploads.reduce((acc, u) => acc.concat(u.txDocs), []);
      }
    }

    if (!transactions.length) return res.json({ cashflow: [], net_trend: 'stable' });

    const monthMap = {};
    transactions.forEach((t) => {
      const d = normDate(t);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      if (!monthMap[key]) monthMap[key] = { key, month: label, income: 0, expenses: 0 };

      if (normType(t) === 'income') monthMap[key].income += normAmt(t);
      if (normType(t) === 'expense') monthMap[key].expenses += normAmt(t);
    });

    const cashflow = Object.values(monthMap)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((m) => ({
        month: m.month,
        income: Math.round(m.income * 100) / 100,
        expenses: Math.round(m.expenses * 100) / 100,
        net: Math.round((m.income - m.expenses) * 100) / 100,
        cumulative: 0,
      }));

    let cumul = 0;
    cashflow.forEach((m) => {
      cumul += m.net;
      m.cumulative = Math.round(cumul * 100) / 100;
    });

    let net_trend = 'stable';
    if (cashflow.length >= 2) {
      const first = cashflow[0].net;
      const last = cashflow[cashflow.length - 1].net;
      if (last > first * 1.1) net_trend = 'improving';
      else if (last < first * 0.9) net_trend = 'declining';
    }

    res.json({ cashflow, net_trend, months: cashflow.length });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/analytics/health-score
// ═══════════════════════════════════════════════════════════════════════════
const getHealthScore = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (isDbConnected()) {
      const health = await FinancialHealth.findOne({ userId });
      if (health) return res.json(health);
    }

    const uploads = await UploadStore.findByUserId(userId);
    const target = uploads[0];

    if (!target) return res.json({ overallScore: 0, label: 'No Data' });

    const summ = target.summary || {};
    const income = summ.total_income || 0;
    const expenses = summ.total_expenses || 0;

    if (income === 0) return res.json({ overallScore: 0, label: 'No Income Data' });

    const savingsRate = ((income - expenses) / income) * 100;

    let score = 0;
    let label = 'Poor';

    if (savingsRate >= 30) { score = 90; label = 'Excellent'; }
    else if (savingsRate >= 20) { score = 75; label = 'Good'; }
    else if (savingsRate >= 10) { score = 55; label = 'Fair'; }
    else if (savingsRate >= 0) { score = 30; label = 'Needs Work'; }
    else { score = 10; label = 'Critical'; }

    res.json({
      overallScore: score,
      label,
      savingsRate: Math.round(savingsRate * 10) / 10,
      income,
      expenses,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSummary,
  getMonthlyAnalytics,
  getCategoryBreakdown,
  getForecast,
  getLedger,
  getTransactions,
  getInsights,
  getCashflow,
  getHealthScore,
};