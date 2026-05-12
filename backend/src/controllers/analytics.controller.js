const Transaction = require('../models/Transaction.model');
const Ledger = require('../models/Ledger.model');
const Forecast = require('../models/Forecast.model');
const FinancialHealth = require('../models/FinancialHealth.model');
const { UploadStore } = require('../services/sharedStore');

const { isDbConnected } = require('../config/db');  // shared singleton � never define locally

// ─── Shared filter builder ────────────────────────────────────────────────────
const txFilter = (userId, uploadBatch) => {
  const filter = { userId };
  if (uploadBatch) filter.uploadBatch = uploadBatch;
  return filter;
};

// ─── GET /api/analytics/summary ───────────────────────────────────────────────
/**
 * Returns overall financial metrics.
 *
 * Rules (enforced here AND in ML service):
 *   income   = SUM(amount) WHERE type == 'income' AND amount > 0
 *   expenses = SUM(ABS(amount)) WHERE type == 'expense' AND amount < 0
 *   balance  = latestTransaction.balance (NEVER manually summed)
 */
const getSummary = async (req, res, next) => {
  try {
    const { uploadId } = req.query;
    const userId = req.user.id || req.user._id;

    let transactions = [];
    let mlSummary = null;
    let mlCurrentMonth = null;

    if (isDbConnected()) {
      transactions = await Transaction.find(txFilter(userId, uploadId)).sort({ date: 1 });
    }

    // Fallback to In-Memory
    if (!transactions.length) {
      const uploads = await UploadStore.findByUserId(userId);
      const target = uploadId
        ? uploads.find((u) => u.uploadId === uploadId)
        : uploads[0];
      if (target) {
        transactions = target.txDocs;
        mlSummary      = target.summary;      // trust ML service computed summary
        mlCurrentMonth = target.currentMonth; // ML pre-computed current-month slice
      }
    }

    if (!transactions.length) {
      return res.status(404).json({ message: 'No data found. Please upload a CSV first.' });
    }

    // ── Sort by date (required for correct balance extraction and month math) ──
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    // ── Available Balance: last non-zero balance in sorted list ───────────────
    // Rule: NEVER sum balances. NEVER derive from income - expenses.
    const txWithBalance = sorted.filter((t) => t.balance != null && t.balance !== 0);
    const latestBalance = txWithBalance.length > 0
      ? txWithBalance[txWithBalance.length - 1].balance
      : 0;

    // ── Determine the "active" month window for KPI cards ─────────────────────
    // Use the current calendar month. If no data exists for it (historical CSV),
    // fall back to the latest month present in the dataset.
    const now = new Date();
    const matchesMonth = (dt, ref) =>
      dt.getMonth() === ref.getMonth() && dt.getFullYear() === ref.getFullYear();

    const currentMonthTx = sorted.filter((t) => matchesMonth(new Date(t.date), now));
    const activeTx = currentMonthTx.length > 0
      ? currentMonthTx
      : (() => {
          const latestDate = new Date(sorted[sorted.length - 1].date);
          return sorted.filter((t) => matchesMonth(new Date(t.date), latestDate));
        })();

    // ── Current-month income & expenses ──────────────────────────────────────
    // Priority: ML pre-computed > derived from activeTx
    let cmIncome, cmExpenses;

    if (mlCurrentMonth && mlCurrentMonth.income != null) {
      cmIncome   = Number(mlCurrentMonth.income)   || 0;
      cmExpenses = Number(mlCurrentMonth.expenses)  || 0;
    } else {
      // income = positive-amount income-typed rows
      cmIncome = activeTx
        .filter((t) => t.amount > 0 && t.type === 'income')
        .reduce((s, t) => s + t.amount, 0);

      // Fallback: no explicit income type — use all positive-amount rows
      if (cmIncome === 0) {
        cmIncome = activeTx
          .filter((t) => t.amount > 0)
          .reduce((s, t) => s + t.amount, 0);
      }

      // expenses = ABS of all negative-amount rows
      cmExpenses = activeTx
        .filter((t) => t.amount < 0)
        .reduce((s, t) => s + Math.abs(t.amount), 0);
    }

    const cmSavings = cmIncome - cmExpenses;

    // Human-readable label for the active month
    const refDate = activeTx.length > 0 ? new Date(activeTx[0].date) : now;
    const cmLabel = refDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // ── All-time totals ───────────────────────────────────────────────────────
    let allTimeIncome, allTimeExpenses;

    if (mlSummary) {
      allTimeIncome   = Number(mlSummary.total_income)   || 0;
      allTimeExpenses = Number(mlSummary.total_expenses)  || 0;
    } else {
      allTimeIncome = sorted
        .filter((t) => t.type === 'income' && t.amount > 0)
        .reduce((s, t) => s + t.amount, 0);

      allTimeExpenses = sorted
        .filter((t) => t.type === 'expense' && t.amount < 0)
        .reduce((s, t) => s + Math.abs(t.amount), 0);
    }

    const r = (n) => Math.round(n * 100) / 100;

    return res.json({
      // ── All-time totals (for annual tax card, health score, etc.) ─────────
      total_income:         r(allTimeIncome),
      total_expenses:       r(allTimeExpenses),
      total_savings:        r(allTimeIncome - allTimeExpenses),
      latest_balance:       r(latestBalance),
      total_transactions:   sorted.length,
      income_transactions:  sorted.filter((t) => t.type === 'income').length,
      expense_transactions: sorted.filter((t) => t.type === 'expense').length,

      // ── Current-month metrics (KPI cards MUST read from here, not totals) ─
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
      const target = uploadId
        ? uploads.find((u) => u.uploadId === uploadId)
        : uploads[0];
      if (target) {
        // If ML service pre-computed monthly analytics, return them directly
        if (target.monthlyAnalytics && target.monthlyAnalytics.length > 0) {
          return res.json(target.monthlyAnalytics);
        }
        transactions = target.txDocs;
      }
    }

    if (!transactions.length) return res.json([]);

    // Group by month — filter each group independently
    const monthMap = {};
    transactions.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      if (!monthMap[key]) monthMap[key] = { key, month: label, income: 0, expenses: 0 };

      // Income: only positive-amount income rows
      if (t.type === 'income' && t.amount > 0) {
        monthMap[key].income += t.amount;
      }
      // Expenses: only negative-amount expense rows
      if (t.type === 'expense' && t.amount < 0) {
        monthMap[key].expenses += Math.abs(t.amount);
      }
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
      const filter = {
        ...txFilter(userId, uploadId),
        type: 'expense',
        amount: { $lt: 0 },
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
    const target = uploadId
      ? uploads.find((u) => u.uploadId === uploadId)
      : uploads[0];

    if (target) {
      const catMap = {};
      target.txDocs
        .filter((t) => t.type === 'expense' && t.amount < 0)
        .forEach((t) => {
          const cat = t.category || 'Other';
          catMap[cat] = (catMap[cat] || 0) + Math.abs(t.amount);
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
            type: 'income',
            amount: { $gt: 0 },
          }).sort({ date: 1 });

          const monthMap = {};
          txs.forEach((t) => {
            const key = new Date(t.date).toLocaleString('en-US', {
              month: 'short',
              year: 'numeric',
            });
            monthMap[key] = (monthMap[key] || 0) + t.amount;
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
    const target = uploadId
      ? uploads.find((u) => u.uploadId === uploadId)
      : uploads[0];

    if (target) {
      let allTx = [...target.txDocs];

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
      const target = uploadId
        ? uploads.find((u) => u.uploadId === uploadId)
        : uploads[0];
      if (target) transactions = target.txDocs;
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

      if (t.type === 'income' && t.amount > 0)  monthMap[key].income   += t.amount;
      if (t.type === 'expense' && t.amount < 0) monthMap[key].expenses += Math.abs(t.amount);
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
