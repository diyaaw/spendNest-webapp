const mongoose = require('mongoose');
const Transaction = require('../models/Transaction.model');

const { isDbConnected } = require('../config/db');  // shared singleton - never define locally
const { UploadStore } = require('../services/sharedStore');

// ── Indian Tax Slabs (FY 2024-25) ────────────────────────────────────────────

const OLD_SLABS = [
  { limit: 250_000,   rate: 0 },
  { limit: 500_000,   rate: 0.05 },
  { limit: 1_000_000, rate: 0.20 },
  { limit: Infinity,  rate: 0.30 },
];

const NEW_SLABS = [
  { limit: 300_000,   rate: 0 },
  { limit: 600_000,   rate: 0.05 },
  { limit: 900_000,   rate: 0.10 },
  { limit: 1_200_000, rate: 0.15 },
  { limit: 1_500_000, rate: 0.20 },
  { limit: Infinity,  rate: 0.30 },
];

function computeSlabTax(income, slabs) {
  let remaining = income;
  let tax = 0;
  let prevLimit = 0;
  const breakdown = [];

  for (const slab of slabs) {
    if (remaining <= 0) break;
    const width = slab.limit === Infinity ? remaining : slab.limit - prevLimit;
    const taxable = Math.min(remaining, width);
    const taxInSlab = Math.round(taxable * slab.rate);
    tax += taxInSlab;
    breakdown.push({ taxableInRange: taxable, rate: slab.rate * 100, taxInSlab });
    remaining -= width;
    prevLimit = slab.limit;
  }
  return { tax, breakdown };
}

function rebate87A(taxBeforeRebate, taxableIncome, regime) {
  if (regime === 'old' && taxableIncome <= 500_000) return Math.min(taxBeforeRebate, 12_500);
  if (regime === 'new' && taxableIncome <= 700_000) return Math.min(taxBeforeRebate, 25_000);
  return 0;
}

function computeTax(grossIncome, regime) {
  const stdDeduction = regime === 'new' ? 75_000 : 50_000;
  const taxableIncome = Math.max(0, grossIncome - stdDeduction);
  const slabs = regime === 'new' ? NEW_SLABS : OLD_SLABS;
  const { tax: taxBeforeRebate, breakdown } = computeSlabTax(taxableIncome, slabs);
  const rebate = rebate87A(taxBeforeRebate, taxableIncome, regime);
  const taxAfterRebate = Math.max(0, taxBeforeRebate - rebate);
  const cess = Math.round(taxAfterRebate * 0.04);
  const totalTax = taxAfterRebate + cess;
  const effectiveRate = grossIncome > 0 ? parseFloat(((totalTax / grossIncome) * 100).toFixed(2)) : 0;
  const monthlyReserve = Math.round(totalTax / 12);

  const advanceTax = [
    { dueDate: '15 Jun', percentage: 15, label: '1st Instalment' },
    { dueDate: '15 Sep', percentage: 45, label: '2nd Instalment' },
    { dueDate: '15 Dec', percentage: 75, label: '3rd Instalment' },
    { dueDate: '15 Mar', percentage: 100, label: 'Final Instalment' },
  ].map((q, i, arr) => {
    const prevPct = i > 0 ? arr[i - 1].percentage : 0;
    return {
      ...q,
      amountDue: Math.round((totalTax * (q.percentage - prevPct)) / 100),
      cumulative: Math.round(totalTax * q.percentage / 100),
    };
  });

  return {
    taxableIncome,
    regime,
    totalTax,
    cess,
    effectiveRate,
    monthlyReserve,
    slabBreakdown: breakdown,
    advanceTax,
    gstRequired: grossIncome > 20_00_000,
  };
}

// ── GET /api/tax/estimate ─────────────────────────────────────────────────────

const getTaxEstimate = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const regime = req.query.regime === 'old' ? 'old' : 'new';

    let grossIncome = parseFloat(req.query.annualIncome) || 0;

    // If no annualIncome supplied, compute from actual transactions
    if (!grossIncome) {
      if (isDbConnected() && mongoose.Types.ObjectId.isValid(String(userId))) {
        // Sum income transactions for last 12 months
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

        let result = await Transaction.aggregate([
          {
            $match: {
              userId: new mongoose.Types.ObjectId(String(userId)),
              type: 'income',
              date: { $gte: twelveMonthsAgo },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);

        // Robustness: if no income in last 12 months, take all time income
        if (!result.length || !result[0].total) {
          result = await Transaction.aggregate([
            {
              $match: {
                userId: new mongoose.Types.ObjectId(String(userId)),
                type: 'income',
              },
            },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ]);
        }
        grossIncome = result[0]?.total ?? 0;
      }


      // Fallback to UploadStore if DB search returned 0 or DB is disconnected
      if (!grossIncome) {
        const uploads = await UploadStore.findByUserId(userId);
        const uniqueTxMap = new Map();

        for (const upload of uploads) {
          if (!upload.txDocs) continue;
          for (const tx of upload.txDocs) {
            if (tx.type !== 'income') continue;
            // Create a unique key to prevent double-counting same transactions across uploads
            const key = `${tx.date}_${tx.description}_${tx.amount}`;
            if (!uniqueTxMap.has(key)) {
              uniqueTxMap.set(key, tx.amount);
            }
          }
        }
        grossIncome = Array.from(uniqueTxMap.values()).reduce((sum, amt) => sum + amt, 0);
      }
    }

    const oldRegime = computeTax(grossIncome, 'old');
    const newRegime = computeTax(grossIncome, 'new');

    res.json({
      grossAnnualIncome: grossIncome,
      old: oldRegime,
      new: newRegime,
      recommended: newRegime.totalTax <= oldRegime.totalTax ? 'new' : 'old',
      savings: Math.abs(oldRegime.totalTax - newRegime.totalTax),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTaxEstimate };
