const mongoose = require('mongoose');
const Transaction = require('../models/Transaction.model');
const Ledger = require('../models/Ledger.model');
const Forecast = require('../models/Forecast.model');
const { UploadStore } = require('../services/sharedStore');

const isDbConnected = () => mongoose.connection.readyState === 1;

// ─── Shared filter builder ────────────────────────────────────────────────────
const txFilter = (userId, uploadBatch) => {
  const filter = { userId };
  if (uploadBatch) filter.uploadBatch = uploadBatch;
  return filter;
};

// ─── GET /api/analytics/summary ───────────────────────────────────────────────
const getSummary = async (req, res, next) => {
  try {
    const { uploadId } = req.query;
    const userId = req.user.id || req.user._id;

    let transactions = [];
    let summary = null;

    if (isDbConnected()) {
      transactions = await Transaction.find(txFilter(userId, uploadId));
    }

    // Fallback to In-Memory
    if (!transactions.length) {
      const uploads = await UploadStore.findByUserId(userId);
      const target = uploadId ? uploads.find(u => u.uploadId === uploadId) : uploads[0];
      if (target) {
        transactions = target.txDocs;
        summary = target.summary;
      }
    }

    if (!transactions.length) {
      return res.status(404).json({ message: 'No data found. Please upload a CSV first.' });
    }

    if (summary) {
      return res.json({
        total_income:        Math.round(summary.total_income * 100) / 100,
        total_expenses:      Math.round(summary.total_expenses * 100) / 100,
        total_savings:       Math.round((summary.total_income - summary.total_expenses) * 100) / 100,
        latest_balance:      Math.round(summary.latest_balance * 100) / 100,
        total_transactions:  transactions.length,
      });
    }

    const income   = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter((t) => ['expense', 'transfer'].includes(t.type)).reduce((s, t) => s + Math.abs(t.amount), 0);

    res.json({
      total_income:        Math.round(income * 100) / 100,
      total_expenses:      Math.round(expenses * 100) / 100,
      total_savings:       Math.round((income - expenses) * 100) / 100,
      latest_balance:      Math.round((income - expenses) * 100) / 100,
      total_transactions:  transactions.length,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/analytics/monthly ───────────────────────────────────────────────
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
      const target = uploadId ? uploads.find(u => u.uploadId === uploadId) : uploads[0];
      if (target) transactions = target.txDocs;
    }

    const monthMap = {};
    transactions.forEach((t) => {
      const key = new Date(t.date).toLocaleString('en-US', { month: 'short', year: 'numeric' });
      if (!monthMap[key]) monthMap[key] = { month: key, income: 0, expenses: 0, savings: 0 };
      if (t.type === 'income') monthMap[key].income += t.amount;
      if (['expense', 'transfer'].includes(t.type)) monthMap[key].expenses += Math.abs(t.amount);
    });

    const result = Object.values(monthMap).map((m) => ({
      ...m,
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
      const filter = { ...txFilter(userId, uploadId), type: { $in: ['expense', 'transfer'] } };
      const result = await Transaction.aggregate([
        { $match: filter },
        { $group: { _id: '$category', value: { $sum: { $abs: '$amount' } } } },
        { $sort: { value: -1 } },
        { $project: { _id: 0, name: '$_id', value: { $round: ['$value', 2] } } },
      ]);
      if (result.length) return res.json(result);
    }

    // In-Memory Fallback
    const uploads = await UploadStore.findByUserId(userId);
    const target = uploadId ? uploads.find(u => u.uploadId === uploadId) : uploads[0];
    if (target) {
      const catMap = {};
      target.txDocs.filter(t => ['expense', 'transfer'].includes(t.type)).forEach(t => {
        catMap[t.category] = (catMap[t.category] || 0) + Math.abs(t.amount);
      });
      const result = Object.entries(catMap).map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100
      })).sort((a, b) => b.value - a.value);
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
        return res.json({
          model:       forecast.model,
          generatedAt: forecast.generatedAt,
          predictions: forecast.predictions,
        });
      }
    }

    const uploads = await UploadStore.findByUserId(userId);
    const target = uploads[0];
    if (target && target.forecast) {
      const fc = target.forecast;
      const predictions = [];
      if (fc.predicted_month) {
        predictions.push({
          month: fc.predicted_month,
          predictedIncome: fc.predicted_income,
          recommendedSaveRate: target.recommendation?.recommended_reserve_rate || 0.1
        });
      }
      return res.json({
        model: fc.model_used || 'SMA',
        generatedAt: new Date(),
        predictions
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
          month:               ledger.month,
          totalIncome:         ledger.totalIncome,
          totalExpenses:       ledger.totalExpenses,
          safe_to_spend:       ledger.availableToSpend,
          reserved_funds:      ledger.quarantinedForTaxes,
          emergency_buffer:    ledger.emergencyBuffer,
          recommended_reserve_rate: ledger.saveRate,
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
    const { uploadId, page = 1, limit = 50 } = req.query;
    const userId = req.user.id || req.user._id;

    let transactions = [];
    if (isDbConnected()) {
      const filter = txFilter(userId, uploadId);
      const skip = (parseInt(page) - 1) * parseInt(limit);
      transactions = await Transaction.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit));
      if (transactions.length) {
        const total = await Transaction.countDocuments(filter);
        return res.json({ transactions, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
      }
    }

    const uploads = await UploadStore.findByUserId(userId);
    const target = uploadId ? uploads.find(u => u.uploadId === uploadId) : uploads[0];
    if (target) {
      const allTx = target.txDocs;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const paginated = allTx.slice(skip, skip + parseInt(limit));
      return res.json({
        transactions: paginated,
        total: allTx.length,
        page: parseInt(page),
        totalPages: Math.ceil(allTx.length / parseInt(limit))
      });
    }

    res.json({ transactions: [], total: 0, page: 1, totalPages: 0 });
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
};

