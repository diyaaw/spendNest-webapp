const mongoose = require('mongoose');
const Transaction = require('../models/Transaction.model');
const TaxProfile = require('../models/TaxProfile.model');

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
  { limit: 700_000,   rate: 0.05 },
  { limit: 1_000_000, rate: 0.10 },
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
  // Freelancer Presumptive Taxation (Section 44ADA): 
  // Taxable income is considered 50% of gross receipts.
  const businessProfit = grossIncome * 0.5;
  const stdDeduction = regime === 'new' ? 75_000 : 50_000;
  
  // Taxable income = 50% profit - deductions
  const taxableIncome = Math.max(0, businessProfit - stdDeduction);
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
        // Find date range and total income
        const stats = await Transaction.aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(String(userId)), type: 'income' } },
          {
            $group: {
              _id: {
                month: { $month: '$date' },
                year: { $year: '$date' }
              },
              monthlyTotal: { $sum: '$amount' }
            }
          }
        ]);

        if (stats.length > 0) {
          const totalIncome = stats.reduce((acc, curr) => acc + curr.monthlyTotal, 0);
          const monthCount = stats.length;
          
          if (monthCount < 11) {
            grossIncome = (totalIncome / monthCount) * 12;
          } else {
            grossIncome = totalIncome;
          }
        }
      }

      // Fallback to UploadStore if DB search returned 0 or DB is disconnected
      if (!grossIncome) {
        const uploads = await UploadStore.findByUserId(userId);
        const uniqueMonths = new Set();
        const uniqueTxMap = new Map();
        let total = 0;

        for (const upload of uploads) {
          if (!upload.txDocs) continue;
          for (const tx of upload.txDocs) {
            if (tx.type !== 'income') continue;
            
            const d = new Date(tx.date);
            if (isNaN(d.getTime())) continue;

            const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
            uniqueMonths.add(monthKey);

            const key = `${tx.date}_${tx.description}_${tx.amount}`;
            if (!uniqueTxMap.has(key)) {
              uniqueTxMap.set(key, tx.amount);
              total += tx.amount;
            }
          }
        }

        const monthCount = Math.max(1, uniqueMonths.size);
        if (monthCount < 11) {
          grossIncome = (total / monthCount) * 12;
        } else {
          grossIncome = total;
        }
      }
    }

    const oldRegime = computeTax(grossIncome, 'old');
    const newRegime = computeTax(grossIncome, 'new');

    const recommended = newRegime.totalTax <= oldRegime.totalTax ? 'new' : 'old';
    const savings = Math.abs(oldRegime.totalTax - newRegime.totalTax);

    // ── Persist to TaxProfile (upsert — one document per user) ───────────────
    if (isDbConnected() && mongoose.Types.ObjectId.isValid(String(userId))) {
      try {
        await TaxProfile.findOneAndUpdate(
          { userId },
          {
            $set: {
              grossAnnualIncome: grossIncome,
              taxableIncome:     newRegime.taxableIncome,
              recommendedRegime: recommended,
              regimeSavings:     savings,
              oldRegime: {
                totalTax:       oldRegime.totalTax,
                cess:           oldRegime.cess,
                effectiveRate:  oldRegime.effectiveRate,
                monthlyReserve: oldRegime.monthlyReserve,
                advanceTax:     oldRegime.advanceTax,
              },
              newRegime: {
                totalTax:       newRegime.totalTax,
                cess:           newRegime.cess,
                effectiveRate:  newRegime.effectiveRate,
                monthlyReserve: newRegime.monthlyReserve,
                advanceTax:     newRegime.advanceTax,
              },
              gstRequired:  newRegime.gstRequired,
              calculatedAt: new Date(),
            },
          },
          { upsert: true }
        );
      } catch (dbErr) {
        // Non-fatal — log but do not block the response
        console.error('[Tax] TaxProfile upsert failed:', dbErr.message);
      }
    }

    res.json({
      grossAnnualIncome: grossIncome,
      old: oldRegime,
      new: newRegime,
      recommended,
      savings,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTaxEstimate };
