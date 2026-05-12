const Budget      = require('../models/Budget.model');
const Transaction = require('../models/Transaction.model');
const AuditLog    = require('../models/AuditLog.model');
const mongoose    = require('mongoose');
const { isDbConnected } = require('../config/db');  // shared singleton — never define locally

const getBudgets = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const now = new Date();
    const month = req.query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let budgets = await Budget.find({ userId, month });

    // If no budgets found, we might want to return an empty array or sync them
    res.json(budgets);
  } catch (err) {
    next(err);
  }
};

const setBudget = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { category, budgetLimit, month: targetMonth } = req.body;
    
    const now = new Date();
    const month = targetMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (!category || budgetLimit === undefined) {
      return res.status(400).json({ message: 'Category and budgetLimit are required' });
    }

    // Calculate current spending for this category/month to set initial 'spent'
    const startOfMonth = new Date(`${month}-01`);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const txs = await Transaction.find({
      userId,
      category,
      type: 'expense',
      date: { $gte: startOfMonth, $lt: endOfMonth }
    });

    const spent = txs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const status = spent >= budgetLimit ? 'exceeded' : spent >= budgetLimit * 0.8 ? 'warning' : 'safe';

    const budget = await Budget.findOneAndUpdate(
      { userId, month, category },
      { $set: { budgetLimit, spent, status } },
      { upsert: true, returnDocument: 'after' }
    );

    // Audit Log
    await AuditLog.create({
      userId,
      action: 'budget_set',
      metadata: { category, budgetLimit, month }
    });

    res.json(budget);
  } catch (err) {
    next(err);
  }
};

const syncBudgets = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const now = new Date();
    const month = req.query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const startOfMonth = new Date(`${month}-01`);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    // Get all expense categories and their totals for this month
    const aggregate = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(String(userId)),
          type: 'expense',
          date: { $gte: startOfMonth, $lt: endOfMonth }
        }
      },
      {
        $group: {
          _id: '$category',
          totalSpent: { $sum: { $abs: '$amount' } }
        }
      }
    ]);

    const results = [];
    for (const item of aggregate) {
      const category = item._id;
      const spent = item.totalSpent;
      
      const budget = await Budget.findOne({ userId, month, category });
      if (budget) {
        budget.spent = spent;
        budget.status = spent >= budget.budgetLimit ? 'exceeded' : spent >= budget.budgetLimit * 0.8 ? 'warning' : 'safe';
        await budget.save();
        results.push(budget);
      }
    }

    res.json({ message: 'Budgets synced', budgets: results });
  } catch (err) {
    next(err);
  }
};

module.exports = { getBudgets, setBudget, syncBudgets };
