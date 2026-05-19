const Transaction = require('../models/Transaction.model');
const Ledger = require('../models/Ledger.model');
const Forecast = require('../models/Forecast.model');
const FinancialHealth = require('../models/FinancialHealth.model');
const { UploadStore } = require('../services/sharedStore');

const { isDbConnected } = require('../config/db');  // shared singleton  never define locally

// ═══════════════════════════════════════════════════════════════════════════
// CENTRALIZED ACCOUNTING HELPERS
// ═══════════════════════════════════════════════════════════════════════════
// RULE: Classification is TYPE-based, not sign-based.
//   income   = type === 'income'   (amount may be positive OR negative in CSV)
//   expense  = type === 'expense'  (amount may be positive OR negative in CSV)
// Both always use Math.abs(amount) so sign mismatches don't cause ₹0 results.
// ─────────────────────────────────────────────────────────────────────────

const normAmt = (t) => Math.abs(Number(t.amount) || 0);

/** Sum income transactions (type-based, sign-agnostic). */
const calcIncome = (txList) => {
  let total = 0;
  txList.forEach((t) => {
    const rawType = t.type || t.category || '';
    const type = rawType.toLowerCase().trim();
    if (type === 'income') {
      total += normAmt(t);
    }
  });
  return total;
};

/** Sum expense transactions (type-based, sign-agnostic). */
const calcExpenses = (txList) => {
  let total = 0;
  txList.forEach((t) => {
    const rawType = t.type || t.category || '';
    const type = rawType.toLowerCase().trim();
    if (type === 'expense') {
      total += normAmt(t);
    }
  });
  return total;
};

/** Net savings = income - expenses. */
const calcSavings = (txList) => calcIncome(txList) - calcExpenses(txList);

/**
 * Deduplicate a transaction array by _id / transactionId.
 * Prevents double-counting when in-memory uploads are concatenated.
 */
const deduplicateTx = (txList) => {
  const seen = new Set();
  return txList.filter((t) => {
    const key = String(t._id || t.transactionId || t.date + '|' + (t.amount || 0) + '|' + (t.description || ''));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Emit diagnostic summary to the backend console.
 * @param {string}   label  — e.g. "getSummary", "getMonthlyAnalytics"
 * @param {object[]} txList — deduplicated, future-date-cleaned array
 */
const logAccountingDiagnostics = (label, txList) => {
  const income   = calcIncome(txList);
  const expenses = calcExpenses(txList);
  const savings  = income - expenses;
  const expTxCount = txList.filter((t) => (t.type || t.category || '').trim().toLowerCase() === 'expense').length;
  console.log(
    `[${label}] txns=${txList.length} | income=₹${Math.round(income).toLocaleString()} ` +
    `| expenses=₹${Math.round(expenses).toLocaleString()} (${expTxCount} rows) ` +
    `| savings=₹${Math.round(savings).toLocaleString()}`
  );
  if (expenses === 0 && expTxCount > 0) {
    console.warn(
      `[${label}] ⚠️  expenses=₹0 but ${expTxCount} expense-typed rows exist — ` +
      `possible sign-based filter bug.`
    );
  }
  if (income > 0 && savings > income * 1.5) {
    console.warn(
      `[${label}] ⚠️  savings (₹${Math.round(savings)}) > 1.5× income — ` +
      `possible duplicate aggregation.`
    );
  }
};


// ─── Shared filter builder ────────────────────────────────────────────────────
const txFilter = (userId, uploadBatch) => {
  const filter = { userId };
  if (uploadBatch) filter.uploadBatch = uploadBatch;
  return filter;
};

// ─── GET /api/analytics/summary ───────────────────────────────────────────────// ✅ GET /api/analytics/summary ✅
/**
 * Returns overall financial metrics.
 *
 * Rules:
 *   income          = SUM(amount) WHERE type == 'income' AND amount > 0
 *   expenses        = SUM(ABS(amount)) WHERE type == 'expense' AND amount < 0
 *   latest_balance  = total_income - total_expenses  (Opening Balance + Income - Expenses)
 *   csv_balance     = last non-zero value in the CSV balance column (reference only)
 */
const getSummary = async (req, res, next) => {
  try {
    const { uploadId } = req.query;
    const userId = req.user.id || req.user._id;
    let transactions = [];
    let mlSummary = null;
    let mlCurrentMonth = null;
    let mlRecommendation = null;

    if (isDbConnected()) {
      transactions = await Transaction.find(txFilter(userId, uploadId)).sort({ date: 1 });
      const ledger = await Ledger.findOne({ userId }).sort({ month: -1 });
      if (ledger) {
        mlRecommendation = {
          reserved_funds: ledger.quarantinedForTaxes,
          emergency_buffer: ledger.emergencyBuffer
        };
      }
    }

    // Fallback to In-Memory
    if (!transactions.length) {
      const uploads = await UploadStore.findByUserId(userId);
      if (uploadId) {
        const target = uploads.find((u) => u.uploadId === uploadId);
        if (target) {
          transactions = target.txDocs;
          mlSummary = target.summary;
          mlCurrentMonth = target.currentMonth;
          mlRecommendation = target.recommendation;
        }
      } else {
        // Aggregate ALL
        transactions = uploads.reduce((acc, u) => acc.concat(u.txDocs), []);
        // For summary/currentMonth in aggregate view, we let the logic below re-calculate 
        // because we don't have a pre-computed aggregate summary from ML yet
      }
    }

    if (!transactions.length) {
      return res.status(404).json({ message: 'No data found. Please upload a CSV first.' });
    }

    // ── Sort by date (required for correct balance extraction and month math) ──
    const sorted = [...transactions]
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // ── Future-date guard ────────────────────────────────────────────────
    // Transactions dated more than 365 days from now are almost certainly
    // mis-parsed 2-digit years from Indian bank CSVs ("09/09/27" → 2027).
    // Strip them so they cannot corrupt datasetLatestDate or cmLabel.
    const uploadCutoff = new Date();
    uploadCutoff.setFullYear(uploadCutoff.getFullYear() + 1);
    const validSorted = sorted.filter((t) => new Date(t.date) <= uploadCutoff);

    if (validSorted.length < sorted.length) {
      console.warn(
        `⚠️  [getSummary] Future-date guard removed ${sorted.length - validSorted.length} transaction(s) ` +
        `with dates beyond ${uploadCutoff.toISOString().slice(0, 10)}. ` +
        `These are likely mis-parsed 2-digit years from the uploaded CSV.`
      );
    }

    // Use the validated set for all subsequent calculations
    const cleanSorted = deduplicateTx(validSorted.length > 0 ? validSorted : sorted);
    logAccountingDiagnostics('getSummary', cleanSorted);

    // ── CSV running balance ─ preserved for overdraft detection / debugging only ──
    const txWithBalance = cleanSorted.filter((t) => t.balance != null && t.balance !== 0);
    const csvBalance = txWithBalance.length > 0
      ? txWithBalance[txWithBalance.length - 1].balance
      : null;

    // ── Determine the "active" month window for KPI cards ─────────────────────
    // RULE: ALWAYS use the latest month present in the DATASET.
    const datasetLatestDate = new Date(cleanSorted[cleanSorted.length - 1].date);
    const startOfDatasetMonth = new Date(datasetLatestDate.getFullYear(), datasetLatestDate.getMonth(), 1);

    let cmIncome = 0;
    let cmExpenses = 0;

    cleanSorted.forEach((t) => {
      const tDate = new Date(t.date);
      if (tDate >= startOfDatasetMonth && tDate <= datasetLatestDate) {
        const rawType = t.type || t.category || '';
        const type = rawType.toLowerCase().trim();
        
        if (type === 'income') {
          cmIncome += normAmt(t);
        }
        
        if (type === 'expense') {
          cmExpenses += normAmt(t);
        }
      }
    });

    const cmSavings = cmIncome - cmExpenses;

    // Human-readable label — reflects the dataset's latest month
    const cmLabel = datasetLatestDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // ── All-time totals ───────────────────────────────────────────────────────
    let allTimeIncome, allTimeExpenses;

    if (mlSummary) {
      allTimeIncome   = Number(mlSummary.total_income)   || 0;
      allTimeExpenses = Number(mlSummary.total_expenses)  || 0;
    } else {
      // Type-based, sign-agnostic — works for positive-expense datasets too
      allTimeIncome   = calcIncome(cleanSorted);
      allTimeExpenses = calcExpenses(cleanSorted);
    }

    const r = (n) => Math.round(n * 100) / 100;

    // ✅ Net Period Balance = Total Income - Total Expenses - Tax Buffer - Savings Buffer ✅
    const taxBuffer = (mlRecommendation && mlRecommendation.reserved_funds) ? Number(mlRecommendation.reserved_funds) : 0;
    const savingsBuffer = (mlRecommendation && mlRecommendation.emergency_buffer) ? Number(mlRecommendation.emergency_buffer) : 0;

    const formulaBalance = allTimeIncome - allTimeExpenses;
    
    // Applying the user requested formula
    const finalBalance = allTimeIncome - allTimeExpenses - taxBuffer - savingsBuffer;

    // 🔍 Sanity guard: log a warning if CSV balance deviates > 150% from formula
    if (csvBalance !== null && allTimeIncome > 0) {
      const deviation = Math.abs(csvBalance - finalBalance) / allTimeIncome;
      if (deviation > 1.5) {
        console.warn(
          `⚠️  [getSummary] Balance discrepancy — CSV: ${r(csvBalance)}, ` +
          `Formula: ${r(finalBalance)}, deviation ${Math.round(deviation * 100)}% > 150%. `
        );
      }
    }

    // 🚩 Suspicious balance guard ─────────────────────────────────────────────
    // Flag when the balance exceeds 1.5× total income.
    const flagSuspiciousBalance = allTimeIncome > 0 && finalBalance > allTimeIncome * 1.5;
    if (flagSuspiciousBalance) {
      console.warn(
        `⚠️  [getSummary] Suspicious balance: finalBalance (${r(finalBalance)}) ` +
        `> 1.5 × total_income (${r(allTimeIncome * 1.5)}). ` +
        `Possible causes: imported opening balance, retained earnings, sign error.`
      );
    }

    return res.json({
      // ✅ All-time totals ✅
      total_income:         r(allTimeIncome),
      total_expenses:       r(allTimeExpenses),
      total_savings:        r(formulaBalance),    // strictly income - expenses
      latest_balance:       r(finalBalance),      // exact CSV balance
      csv_balance:          csvBalance !== null ? r(csvBalance) : null,
      // 🚩 True when balance looks unrealistically high vs income
      balance_suspicious:   flagSuspiciousBalance,
      total_transactions:   cleanSorted.length,
      income_transactions:  cleanSorted.filter((t) => t.type === 'income').length,
      expense_transactions: cleanSorted.filter((t) => t.type === 'expense').length,

      // ✅ Current-month metrics (KPI cards MUST read from here, not totals) ✅
      current_month: {
        income:   r(cmIncome),
        expenses: r(cmExpenses),
        savings:  r(cmSavings),
        label:    cmLabel,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/analytics/monthly ───────────────────────────────────────────────
/**
 * Returns per-month income/expense/savings.
 * Each month is always filtered in isolation — NEVER cumulative.
 */
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

    // Future-date guard: strip transactions > 365 days ahead
    const monthlyCutoff = new Date();
    monthlyCutoff.setFullYear(monthlyCutoff.getFullYear() + 1);
    const cleanTx = transactions.filter((t) => new Date(t.date) <= monthlyCutoff);

    // Group by month — filter each group independently
    const monthMap = {};
    cleanTx.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      if (!monthMap[key]) monthMap[key] = { key, month: label, income: 0, expenses: 0 };

      // Type-based, sign-agnostic accounting
      const amt = normAmt(t);
      if ((t.type || t.category || '').trim().toLowerCase() === 'income')  monthMap[key].income   += amt;
      if ((t.type || t.category || '').trim().toLowerCase() === 'expense') monthMap[key].expenses += amt;
    });

    const result = Object.values(monthMap)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((m) => ({
        month:    m.month,
        income:   Math.round(m.income * 100) / 100,
        expenses: Math.round(m.expenses * 100) / 100,
        savings:  Math.round((m.income - m.expenses) * 100) / 100,
      }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/analytics/categories ────────────────────────────────────────────
const getCategoryBreakdown = async (req, res, next) => {
  try {
    const { uploadId } = req.query;
    const userId = req.user.id || req.user._id;

    if (isDbConnected()) {
      // Type-based: match expense rows regardless of sign
      const filter = {
        ...txFilter(userId, uploadId),
        type: 'expense',
      };
      const result = await Transaction.aggregate([
        { $match: filter },
        { $group: { _id: '$category', value: { $sum: { $abs: '$amount' } } } },
        { $sort: { value: -1 } },
        { $match: { value: { $gt: 0 } } },
        { $project: { _id: 0, name: '$_id', value: { $round: ['$value', 2] } } },
      ]);
      if (result.length) return res.json(result);
    }

    // In-Memory Fallback
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
        .filter((t) => (t.type || t.category || '').trim().toLowerCase() === 'expense')
        .forEach((t) => {
          const cat = t.category || 'Other';
          catMap[cat] = (catMap[cat] || 0) + normAmt(t);
        });
      const result = Object.entries(catMap)
        .map(([name, value]) => ({
          name:  name.charAt(0).toUpperCase() + name.slice(1),
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

// ─── GET /api/analytics/forecast ──────────────────────────────────────────────
const getForecast = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (isDbConnected()) {
      const forecast = await Forecast.findOne({ userId }).sort({ generatedAt: -1 });
      if (forecast) {
        let historicalIncome = forecast.historicalIncome || [];

        // Fallback: derive historical income from income transactions if missing
        if (historicalIncome.length === 0) {
          const txs = await Transaction.find({
            userId,
            type: 'income',  // type-based: no sign filter needed
          }).sort({ date: 1 });

          const monthMap = {};
          txs.forEach((t) => {
            const key = new Date(t.date).toLocaleString('en-US', {
              month: 'short',
              year: 'numeric',
            });
            monthMap[key] = (monthMap[key] || 0) + normAmt(t);
          });
          historicalIncome = Object.entries(monthMap).map(([month, income]) => ({
            month,
            income,
          }));
        }

        return res.json({
          model:                forecast.model,
          generatedAt:          forecast.generatedAt,
          predictions:          forecast.predictions,
          historicalIncome,
          volatility:           forecast.volatility || {
            score: 0, fluctuationPct: 0, stabilityScore: 100, variance: 0,
          },
          bufferRecommendation: forecast.bufferRecommendation || {
            emergencySavingsPct: 20, taxReservePct: 15,
          },
          insights:             forecast.insights || [],
          isExpenseForecast:    forecast.isExpenseForecast || false,
          stagesAvailable:      forecast.stagesAvailable || 0,
        });
      }
    }

    // In-Memory fallback
    const uploads = await UploadStore.findByUserId(userId);
    const target = uploads[0];
    if (target && target.forecast) {
      const fc = target.forecast;
      const predictions = [];
      if (fc.predicted_month && fc.predicted_month !== 'Insufficient Data') {
        predictions.push({
          month:               fc.predicted_month,
          predictedIncome:     Number(fc.predicted_income) || 0,
          recommendedSaveRate: target.recommendation?.recommended_reserve_rate || 0.10,
        });
      }
      return res.json({
        model:                fc.model_used || 'WMA',
        generatedAt:          new Date(),
        predictions,
        historicalIncome:     fc.historical_income || [],
        volatility: {
          score:          fc.volatility?.score || 0,
          fluctuationPct: fc.volatility?.fluctuation_pct || 0,
          stabilityScore: fc.volatility?.stability_score || 0,
          variance:       fc.volatility?.variance || 0,
        },
        bufferRecommendation: {
          emergencySavingsPct: fc.buffer_recommendation?.emergency_savings_pct || 20,
          taxReservePct:       fc.buffer_recommendation?.tax_reserve_pct || 15,
        },
        insights:             fc.insights || [],
        isExpenseForecast:    fc.is_expense_forecast || false,
        stagesAvailable:      fc.stages_available || 0,
      });
    }

    res.status(404).json({ message: 'No forecast data found.' });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/analytics/ledger ────────────────────────────────────────────────
const getLedger = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (isDbConnected()) {
      const ledger = await Ledger.findOne({ userId }).sort({ month: -1 });
      if (ledger) {
        return res.json({
          month:                    ledger.month,
          totalIncome:              ledger.totalIncome,
          totalExpenses:            ledger.totalExpenses,
          safe_to_spend:            ledger.availableToSpend,
          reserved_funds:           ledger.quarantinedForTaxes,
          emergency_buffer:         ledger.emergencyBuffer,
          recommended_reserve_rate: ledger.saveRate,
          monthly_burn:             ledger.monthlyBurn || 0,
        });
      }
    }

    const uploads = await UploadStore.findByUserId(userId);
    const target = uploads[0];
    if (target && target.recommendation) {
      const rec  = target.recommendation;
      const summ = target.summary;
      return res.json({
        month:                    'Current',
        totalIncome:              summ.total_income,
        totalExpenses:            summ.total_expenses,
        safe_to_spend:            rec.safe_to_spend,
        reserved_funds:           rec.reserved_funds,
        emergency_buffer:         rec.emergency_buffer,
        recommended_reserve_rate: rec.recommended_reserve_rate,
        monthly_burn:             rec.monthly_burn || 0,
      });
    }

    res.status(404).json({ message: 'No ledger data found.' });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/analytics/transactions ──────────────────────────────────────────
const getTransactions = async (req, res, next) => {
  try {
    const { uploadId, page = 1, limit = 50, type, category, search } = req.query;
    const userId = req.user.id || req.user._id;

    let transactions = [];
    if (isDbConnected()) {
      const filter = txFilter(userId, uploadId);

      // Optional filters
      if (type) filter.type = type;
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
          page:       parseInt(page),
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
      // Aggregate ALL uploads for the user
      allTx = uploads.reduce((acc, u) => acc.concat(u.txDocs), []);
    }

    if (allTx.length) {

      // Apply in-memory filters
      if (type)     allTx = allTx.filter((t) => t.type === type);
      if (category) allTx = allTx.filter((t) => t.category === category);
      if (search)   allTx = allTx.filter((t) =>
        (t.description || '').toLowerCase().includes(search.toLowerCase())
      );

      // Sort by date descending
      allTx.sort((a, b) => new Date(b.date) - new Date(a.date));

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const paginated = allTx.slice(skip, skip + parseInt(limit));

      return res.json({
        transactions: paginated,
        total:        allTx.length,
        page:         parseInt(page),
        totalPages:   Math.ceil(allTx.length / parseInt(limit)),
      });
    }

    res.json({ transactions: [], total: 0, page: 1, totalPages: 0 });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/analytics/insights ──────────────────────────────────────────────
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

// ─── GET /api/analytics/cashflow ──────────────────────────────────────────────
const getCashflow = async (req, res, next) => {
  try {
    const { uploadId, months = 6 } = req.query;
    const userId = req.user.id || req.user._id;

    let transactions = [];
    if (isDbConnected()) {
      const since = new Date();
      since.setMonth(since.getMonth() - parseInt(months));
      const filter = {
        ...txFilter(userId, uploadId),
        date: { $gte: since },
      };
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

    if (!transactions.length) {
      return res.json({ cashflow: [], net_trend: 'stable' });
    }

    // Group by month
    const monthMap = {};
    transactions.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      if (!monthMap[key]) monthMap[key] = { key, month: label, income: 0, expenses: 0 };

      // Type-based, sign-agnostic
      const camt = normAmt(t);
      if ((t.type || t.category || '').trim().toLowerCase() === 'income')  monthMap[key].income   += camt;
      if ((t.type || t.category || '').trim().toLowerCase() === 'expense') monthMap[key].expenses += camt;
    });

    const cashflow = Object.values(monthMap)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((m) => ({
        month:      m.month,
        income:     Math.round(m.income * 100) / 100,
        expenses:   Math.round(m.expenses * 100) / 100,
        net:        Math.round((m.income - m.expenses) * 100) / 100,
        cumulative: 0, // filled below
      }));

    // Compute cumulative net
    let cumul = 0;
    cashflow.forEach((m) => {
      cumul += m.net;
      m.cumulative = Math.round(cumul * 100) / 100;
    });

    // Trend: compare first and last net
    let net_trend = 'stable';
    if (cashflow.length >= 2) {
      const first = cashflow[0].net;
      const last  = cashflow[cashflow.length - 1].net;
      if (last > first * 1.1)  net_trend = 'improving';
      else if (last < first * 0.9) net_trend = 'declining';
    }

    res.json({ cashflow, net_trend, months: cashflow.length });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/analytics/health-score ──────────────────────────────────────────
const getHealthScore = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (isDbConnected()) {
      const health = await FinancialHealth.findOne({ userId });
      if (health) return res.json(health);
    }

    // Compute a basic health score from in-memory data
    const uploads = await UploadStore.findByUserId(userId);
    const target = uploads[0];

    if (!target) return res.json({ overallScore: 0, label: 'No Data' });

    const summ = target.summary || {};
    const income   = summ.total_income   || 0;
    const expenses = summ.total_expenses || 0;

    if (income === 0) return res.json({ overallScore: 0, label: 'No Income Data' });

    const savingsRate = ((income - expenses) / income) * 100;

    let score = 0;
    let label = 'Poor';

    if (savingsRate >= 30)      { score = 90; label = 'Excellent'; }
    else if (savingsRate >= 20) { score = 75; label = 'Good';      }
    else if (savingsRate >= 10) { score = 55; label = 'Fair';      }
    else if (savingsRate >= 0)  { score = 30; label = 'Needs Work';}
    else                        { score = 10; label = 'Critical';  }

    res.json({
      overallScore: score,
      label,
      savingsRate:  Math.round(savingsRate * 10) / 10,
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
