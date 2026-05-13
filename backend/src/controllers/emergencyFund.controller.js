const mongoose = require('mongoose');
const Transaction = require('../models/Transaction.model');
const EmergencyFund = require('../models/EmergencyFund.model');
const { UploadStore, EmergencyFundStore } = require('../services/sharedStore');

const { isDbConnected } = require('../config/db');

function classifyRisk(months) {
  if (months >= 12) return { level: 'excellent', score: 100, color: '#10B981' };
  if (months >= 6)  return { level: 'healthy',   score: 80,  color: '#34D399' };
  if (months >= 3)  return { level: 'moderate',  score: 50,  color: '#F59E0B' };
  if (months >= 1)  return { level: 'low',       score: 25,  color: '#F97316' };
  return              { level: 'critical',  score: 5,   color: '#F43F5E' };
}

const getEmergencyFund = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    let avgMonthlyExpenses = 0;

    if (isDbConnected() && mongoose.Types.ObjectId.isValid(String(userId))) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const result = await Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(String(userId)), type: { $in: ['expense', 'transfer'] }, date: { $gte: sixMonthsAgo } } },
        { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, monthlyTotal: { $sum: { $abs: '$amount' } } } }
      ]);
      avgMonthlyExpenses = result.length > 0 ? result.reduce((s, m) => s + m.monthlyTotal, 0) / result.length : 0;
    }

    if (avgMonthlyExpenses === 0) {
      const uploads = await UploadStore.findByUserId(userId);
      const target = uploads[0];
      if (target && target.txDocs) {
        const monthMap = {};
        target.txDocs.forEach(t => {
          if (['expense', 'transfer'].includes(t.type)) {
            const date = new Date(t.date);
            if (!isNaN(date.getTime())) {
              const key = `${date.getFullYear()}-${date.getMonth()}`;
              monthMap[key] = (monthMap[key] || 0) + Math.abs(t.amount);
            }
          }
        });
        const months = Object.values(monthMap);
        // If we have data across multiple months, average it. 
        // If only one month, it might be the total sum of a small period, so we divide by 1.
        avgMonthlyExpenses = months.length > 0 ? months.reduce((a, b) => a + b, 0) / months.length : 0;
      }
    }

    let fund;
    let isInMemory = true;

    if (isDbConnected() && mongoose.Types.ObjectId.isValid(String(userId))) {
      fund = await EmergencyFund.findOne({ userId });
      if (fund) isInMemory = false;
    }

    if (!fund) {
      // Try to load pre-calculated data from UploadStore
      const uploads = await UploadStore.findByUserId(userId);
      const latest = uploads[0];
      const mlFund = (latest && latest.emergency_fund) ? latest.emergency_fund : {};
      
      // Load user settings from In-Memory store
      const settings = await EmergencyFundStore.findByUserId(userId);

      // Return a virtual object for In-Memory mode
      fund = {
        userId,
        currentSavings: settings?.currentSavings || mlFund.current_savings || 0,
        targetMonths: settings?.targetMonths || mlFund.target_months || 6,
        avgMonthlyExpenses: avgMonthlyExpenses || mlFund.monthly_burn || 0,
        runwayMonths: 0,
        targetSavings: 0,
        riskLevel: 'critical',
        readinessScore: 0,
        monthlyTargetToGoal: 0,
        lastUpdated: new Date(),
        toObject: function() { return this; },
        save: async function() { return this; }
      };
    } else {
      fund.avgMonthlyExpenses = avgMonthlyExpenses || fund.avgMonthlyExpenses || 0;
    }

    fund.runwayMonths = fund.avgMonthlyExpenses > 0 ? parseFloat((fund.currentSavings / fund.avgMonthlyExpenses).toFixed(1)) : 0;
    fund.targetSavings = Math.round(fund.avgMonthlyExpenses * fund.targetMonths);
    const risk = classifyRisk(fund.runwayMonths);
    fund.riskLevel = risk.level; fund.readinessScore = risk.score;
    fund.monthlyTargetToGoal = Math.round(Math.max(0, fund.targetSavings - fund.currentSavings) / 12);
    fund.lastUpdated = new Date();

    if (!isInMemory) await fund.save();

    res.json({
      ...fund.toObject(),
      riskColor: risk.color,
      progressPct: fund.targetSavings > 0 ? Math.min(100, parseFloat(((fund.currentSavings / fund.targetSavings) * 100).toFixed(1))) : 0
    });
  } catch (err) { next(err); }
};

const updateEmergencyFund = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { currentSavings, targetMonths } = req.body;
    let fund; let isInMemory = true;
    if (isDbConnected() && mongoose.Types.ObjectId.isValid(String(userId))) {
      fund = await EmergencyFund.findOne({ userId });
      if (!fund) fund = new EmergencyFund({ userId });
      isInMemory = false;
    }
    if (!fund) {
      await EmergencyFundStore.upsert(userId, {
        currentSavings: currentSavings !== undefined ? Number(currentSavings) : undefined,
        targetMonths: targetMonths !== undefined ? Number(targetMonths) : undefined
      });
      return res.json({ message: 'Emergency fund settings updated in memory.', fund: { currentSavings, targetMonths } });
    }
    if (currentSavings !== undefined) fund.currentSavings = Math.max(0, Number(currentSavings));
    if (targetMonths !== undefined) fund.targetMonths = Math.max(1, Math.min(24, Number(targetMonths)));
    if (!isInMemory) await fund.save();
    res.json({ message: 'Emergency fund updated.', fund });
  } catch (err) { next(err); }
};

const getAnalysis = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    let fund;
    if (isDbConnected() && mongoose.Types.ObjectId.isValid(String(userId))) fund = await EmergencyFund.findOne({ userId });
    if (!fund) {
      const settings = await EmergencyFundStore.findByUserId(userId);
      const uploads = await UploadStore.findByUserId(userId);
      const latest = uploads[0];
      const mlFund = (latest && latest.emergency_fund) ? latest.emergency_fund : {};
      
      if (latest) {
          fund = { 
            avgMonthlyExpenses: mlFund.monthly_burn || 50000, 
            currentSavings: settings?.currentSavings || 0, 
            runwayMonths: 0, 
            targetMonths: settings?.targetMonths || 6 
          };
      } else {
          return res.json({ scenarios: [], recommendations: [] });
      }
    }
    const avg = fund.avgMonthlyExpenses || 1; const savings = fund.currentSavings || 0;
    const scenarios = [
      { label: '20% income drop', incomeDropPct: 20 },
      { label: '40% income drop', incomeDropPct: 40 },
      { label: 'No income (layoff/dry spell)', incomeDropPct: 100 },
      { label: 'Emergency: 50,000 medical', emergencyExpense: 50000 },
      { label: 'Emergency: 100,000 medical', emergencyExpense: 100000 },
    ].map((s) => {
      const remainingSavings = savings - (s.emergencyExpense || 0); const newRunway = Math.max(0, remainingSavings / avg); const risk = classifyRisk(newRunway);
      return { ...s, remainingSavings: Math.round(Math.max(0, remainingSavings)), runwayMonths: parseFloat(newRunway.toFixed(1)), riskLevel: risk.level, riskColor: risk.color };
    });
    const recommendations = []; const runway = fund.runwayMonths || 0; const monthlyTarget = fund.monthlyTargetToGoal || Math.round(avg / 12);
    if (runway < 1) { recommendations.push('Critical: Low runway. Build fund immediately.'); }
    else if (runway < 3) { recommendations.push('Target 3 months runway.'); }
    else if (runway < 6) { recommendations.push('Push to 6 months runway.'); }
    else { recommendations.push('Emergency fund is healthy.'); }
    res.json({ currentRunway: runway, riskLevel: fund.riskLevel || 'critical', scenarios, recommendations });
  } catch (err) { next(err); }
};

module.exports = { getEmergencyFund, updateEmergencyFund, getAnalysis };
