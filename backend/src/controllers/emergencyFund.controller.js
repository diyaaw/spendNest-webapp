const mongoose = require('mongoose');
const Transaction = require('../models/Transaction.model');
const EmergencyFund = require('../models/EmergencyFund.model');

const { isDbConnected } = require('../config/db');  // shared singleton � never define locally

// ── Risk classification ───────────────────────────────────────────────────────

function classifyRisk(months) {
  if (months >= 12) return { level: 'excellent', score: 100, color: '#10B981' };
  if (months >= 6)  return { level: 'healthy',   score: 80,  color: '#34D399' };
  if (months >= 3)  return { level: 'moderate',  score: 50,  color: '#F59E0B' };
  if (months >= 1)  return { level: 'low',       score: 25,  color: '#F97316' };
  return              { level: 'critical',  score: 5,   color: '#F43F5E' };
}

// ── GET /api/emergency-fund ─────────────────────────────────────────────────

const getEmergencyFund = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (!isDbConnected()) {
      return res.status(503).json({ message: 'Database not connected.' });
    }

    // Auto-compute avg monthly expenses from last 6 months of transactions
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const result = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(String(userId)),
          type: { $in: ['expense', 'transfer'] },
          date: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year:  { $year: '$date' },
            month: { $month: '$date' },
          },
          monthlyTotal: { $sum: { $abs: '$amount' } },
        },
      },
    ]);

    const avgMonthlyExpenses = result.length > 0
      ? result.reduce((s, m) => s + m.monthlyTotal, 0) / result.length
      : 0;

    // Fetch or create the fund document
    let fund = await EmergencyFund.findOne({ userId });
    if (!fund) {
      fund = new EmergencyFund({ userId, avgMonthlyExpenses });
    } else {
      fund.avgMonthlyExpenses = avgMonthlyExpenses || fund.avgMonthlyExpenses;
    }

    // Recalculate derived fields
    fund.runwayMonths = fund.avgMonthlyExpenses > 0
      ? parseFloat((fund.currentSavings / fund.avgMonthlyExpenses).toFixed(1))
      : 0;

    const targetSavings = (fund.avgMonthlyExpenses * fund.targetMonths) || 0;
    fund.targetSavings = Math.round(targetSavings);

    const risk = classifyRisk(fund.runwayMonths);
    fund.riskLevel = risk.level;
    fund.readinessScore = risk.score;

    // Monthly contribution needed to reach target in 12 months
    const gap = Math.max(0, fund.targetSavings - fund.currentSavings);
    fund.monthlyTargetToGoal = Math.round(gap / 12);
    fund.lastUpdated = new Date();

    await fund.save();

    res.json({
      ...fund.toObject(),
      riskColor: risk.color,
      progressPct: fund.targetSavings > 0
        ? Math.min(100, parseFloat(((fund.currentSavings / fund.targetSavings) * 100).toFixed(1)))
        : 0,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/emergency-fund/update ─────────────────────────────────────────

const updateEmergencyFund = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { currentSavings, targetMonths } = req.body;

    let fund = await EmergencyFund.findOne({ userId });
    if (!fund) fund = new EmergencyFund({ userId });

    if (currentSavings !== undefined) fund.currentSavings = Math.max(0, Number(currentSavings));
    if (targetMonths !== undefined)   fund.targetMonths   = Math.max(1, Math.min(24, Number(targetMonths)));

    await fund.save();
    res.json({ message: 'Emergency fund updated.', fund });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/emergency-fund/analysis ─────────────────────────────────────────

const getAnalysis = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const fund = await EmergencyFund.findOne({ userId });
    if (!fund) {
      return res.json({ scenarios: [], recommendations: [] });
    }

    const avg = fund.avgMonthlyExpenses || 1;
    const savings = fund.currentSavings || 0;

    // Income drop simulations
    const scenarios = [
      { label: '20% income drop', incomeDropPct: 20 },
      { label: '40% income drop', incomeDropPct: 40 },
      { label: 'No income (layoff/dry spell)', incomeDropPct: 100 },
      { label: 'Emergency: ₹50,000 medical', emergencyExpense: 50_000 },
      { label: 'Emergency: ₹1,00,000 medical', emergencyExpense: 100_000 },
    ].map((s) => {
      const remainingSavings = savings - (s.emergencyExpense || 0);
      const newRunway = Math.max(0, remainingSavings / avg);
      const risk = classifyRisk(newRunway);
      return {
        ...s,
        remainingSavings: Math.round(Math.max(0, remainingSavings)),
        runwayMonths: parseFloat(newRunway.toFixed(1)),
        riskLevel: risk.level,
        riskColor: risk.color,
      };
    });

    // AI recommendations
    const recommendations = [];
    const runway = fund.runwayMonths;
    if (runway < 1) {
      recommendations.push(`🔴 Critical: You have less than 1 month of runway. Prioritize building an emergency fund immediately.`);
      recommendations.push(`Set aside ₹${(avg * 0.3).toLocaleString('en-IN', {maximumFractionDigits:0})} every month — even a 3-month cushion changes everything.`);
    } else if (runway < 3) {
      recommendations.push(`🟡 You have ${runway} months of runway. Target 3 months as your first milestone.`);
      recommendations.push(`Save ₹${fund.monthlyTargetToGoal.toLocaleString('en-IN')} per month to reach ${fund.targetMonths} months coverage in 1 year.`);
    } else if (runway < 6) {
      recommendations.push(`🟠 You have ${runway} months of runway. Good start — push to 6 months for real security.`);
      recommendations.push(`₹${fund.monthlyTargetToGoal.toLocaleString('en-IN')}/month will get you there in 12 months.`);
    } else {
      recommendations.push(`🟢 Excellent! ${runway} months runway. Your emergency fund is healthy.`);
      recommendations.push(`Consider investing surplus savings in liquid mutual funds for better returns.`);
    }

    if (savings < 10_000) {
      recommendations.push(`Start a dedicated savings account to separate emergency funds from daily spending.`);
    }

    res.json({
      currentRunway: runway,
      riskLevel: fund.riskLevel,
      scenarios,
      recommendations,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getEmergencyFund, updateEmergencyFund, getAnalysis };
