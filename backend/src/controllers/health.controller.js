const mongoose = require('mongoose');
const Transaction = require('../models/Transaction.model');
const FinancialHealth = require('../models/FinancialHealth.model');

const { isDbConnected } = require('../config/db');  // shared singleton � never define locally

/**
 * GET /api/analytics/health-score
 * ─────────────────────────────────
 * Computes a 0–100 Financial Health Score based on the user's real transaction data.
 *
 * Sub-scores (total 100):
 *   savingsScore     (25) — what % of income is saved
 *   spendingScore    (20) — expense consistency (low variance = good)
 *   emergencyScore   (25) — months of expenses covered by current savings
 *   taxScore         (15) — estimated tax readiness
 *   incomeScore      (15) — income regularity month-over-month
 */
const getHealthScore = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (!isDbConnected()) {
      return res.json(emptyScore('Database not connected — upload a CSV to generate your score.'));
    }

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const txs = await Transaction.find({
      userId: new mongoose.Types.ObjectId(String(userId)),
      date: { $gte: twelveMonthsAgo },
    }).sort({ date: 1 });

    if (txs.length < 5) {
      return res.json(emptyScore('Upload more transaction data to calculate your Financial Health Score.'));
    }

    // ── Group by month ─────────────────────────────────────────────────────────
    const monthMap = {};
    txs.forEach((t) => {
      const key = `${new Date(t.date).getFullYear()}-${String(new Date(t.date).getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { income: 0, expenses: 0 };
      if (t.type === 'income') monthMap[key].income += t.amount;
      if (['expense', 'transfer'].includes(t.type)) monthMap[key].expenses += Math.abs(t.amount);
    });
    const months = Object.values(monthMap);
    const N = months.length;

    const totalIncome = months.reduce((s, m) => s + m.income, 0);
    const totalExpenses = months.reduce((s, m) => s + m.expenses, 0);
    const totalSavings = totalIncome - totalExpenses;

    // ── 1. Savings Score (25 pts) — target 30% savings rate ───────────────────
    const savingsRate = totalIncome > 0 ? totalSavings / totalIncome : 0;
    const savingsScore = Math.min(25, Math.round((savingsRate / 0.30) * 25));

    // ── 2. Spending Score (20 pts) — coefficient of variation of expenses ─────
    const avgExp = totalExpenses / N;
    const expVariance = months.reduce((s, m) => s + Math.pow(m.expenses - avgExp, 2), 0) / N;
    const expCV = avgExp > 0 ? Math.sqrt(expVariance) / avgExp : 1;
    const spendingScore = Math.min(20, Math.round(Math.max(0, (1 - expCV)) * 20));

    // ── 3. Emergency Score (25 pts) — months of runway at current burn rate ───
    const avgMonthlyExpenses = avgExp || 1;
    const monthsRunway = totalSavings > 0 ? totalSavings / avgMonthlyExpenses : 0;
    const emergencyScore = Math.min(25, Math.round((monthsRunway / 6) * 25));

    // ── 4. Tax Score (15 pts) — 20% income reserved is ideal ─────────────────
    const estimatedAnnualTax = totalIncome * 0.15; // rough ~15% avg effective rate
    const taxReserved = totalSavings * 0.5; // assume half of savings is tax reserve
    const taxScore = Math.min(15, Math.round((taxReserved / estimatedAnnualTax) * 15));

    // ── 5. Income Score (15 pts) — income regularity ─────────────────────────
    const monthsWithIncome = months.filter((m) => m.income > 0).length;
    const incomeScore = Math.min(15, Math.round((monthsWithIncome / N) * 15));

    const overall = Math.max(0, savingsScore) + 
                    Math.max(0, spendingScore) + 
                    Math.max(0, emergencyScore) + 
                    Math.max(0, taxScore) + 
                    Math.max(0, incomeScore);

    const label = overall >= 75 ? 'Excellent' : overall >= 50 ? 'Good' : overall >= 25 ? 'Fair' : 'At Risk';

    const recommendations = [];
    if (savingsScore < 15) recommendations.push(`Your savings rate is ${Math.round(savingsRate * 100)}%. Try to reach 20–30% of income.`);
    if (spendingScore < 12) recommendations.push('Your monthly expenses vary significantly. Consider a fixed budget.');
    if (emergencyScore < 15) recommendations.push(`You have ${monthsRunway.toFixed(1)} months of runway. Build up to 6 months.`);
    if (taxScore < 8) recommendations.push('Set aside at least 15–20% of each payment received for taxes.');
    if (incomeScore < 10) recommendations.push('Income was 0 in some months. Diversify your client base for stability.');
    if (!recommendations.length) recommendations.push('Your financial health is excellent. Keep it up!');

    const healthDoc = await FinancialHealth.findOne({ userId });
    
    res.json({
      overall,
      savingsScore,
      spendingScore,
      emergencyScore,
      taxScore,
      incomeScore,
      label,
      recommendations,
      insights: healthDoc?.insights || [],
      trends:   healthDoc?.trends   || {},
      meta: {
        monthsAnalyzed: N,
        totalIncome: Math.round(totalIncome),
        totalExpenses: Math.round(totalExpenses),
        savingsRate: parseFloat((savingsRate * 100).toFixed(1)),
        monthsRunway: parseFloat(monthsRunway.toFixed(1)),
      },
    });
  } catch (err) {
    next(err);
  }
};

function emptyScore(msg) {
  return {
    overall: 0,
    savingsScore: 0,
    spendingScore: 0,
    emergencyScore: 0,
    taxScore: 0,
    incomeScore: 0,
    label: 'No Data',
    recommendations: [msg],
    meta: null,
  };
}

module.exports = { getHealthScore };
