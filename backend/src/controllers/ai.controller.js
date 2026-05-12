const Transaction = require('../models/Transaction.model');
const Ledger = require('../models/Ledger.model');
const FinancialHealth = require('../models/FinancialHealth.model');
const { UploadStore } = require('../services/sharedStore');

const { isDbConnected } = require('../config/db');  // shared singleton � never define locally

/**
 * POST /api/ai/chat
 * ─────────────────
 * NLP-based financial advisor that responds to user questions using
 * their actual financial data (ledger, health score, transactions).
 *
 * Supports queries about:
 *   - Affordability ("Can I afford ₹5000?")
 *   - Financial health score
 *   - Spending summaries
 *   - Savings rate
 *   - Top expense categories
 *   - Safe-to-spend balance
 *   - Income forecast
 */
const chatAdvisor = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { message } = req.body;

    if (!message) return res.status(400).json({ message: 'Message is required' });

    // ── 1. Gather financial context ──────────────────────────────────────────
    let safeToSpend    = 0;
    let totalExpenses  = 0;
    let totalIncome    = 0;
    let latestBalance  = 0;
    let monthlyBurn    = 0;
    let healthScore    = 0;
    let healthLabel    = 'No Data';
    let topCategory    = 'General';
    let savingsRate    = 0;
    let forecastIncome = 0;

    if (isDbConnected()) {
      const latestLedger = await Ledger.findOne({ userId }).sort({ month: -1 });
      const health = await FinancialHealth.findOne({ userId });

      if (latestLedger) {
        safeToSpend   = latestLedger.availableToSpend || 0;
        totalExpenses = latestLedger.totalExpenses     || 0;
        totalIncome   = latestLedger.totalIncome       || 0;
        monthlyBurn   = latestLedger.monthlyBurn       || 0;
      }
      if (health) {
        healthScore = health.overallScore || 0;
        healthLabel = health.label        || 'Fair';
      }
      if (totalIncome > 0) {
        savingsRate = Math.round(((totalIncome - totalExpenses) / totalIncome) * 100);
      }
    } else {
      // In-Memory fallback
      const uploads = await UploadStore.findByUserId(userId);
      const target = uploads[0];
      if (target) {
        const summ = target.summary || {};
        const rec  = target.recommendation || {};
        const fc   = target.forecast || {};
        totalIncome   = summ.total_income   || 0;
        totalExpenses = summ.total_expenses || 0;
        latestBalance = summ.latest_balance || 0;
        safeToSpend   = rec.safe_to_spend   || 0;
        monthlyBurn   = rec.monthly_burn    || 0;
        forecastIncome = fc.predicted_income || 0;

        if (totalIncome > 0) {
          savingsRate = Math.round(((totalIncome - totalExpenses) / totalIncome) * 100);
          // Rough health score from savings rate
          if (savingsRate >= 30)      { healthScore = 90; healthLabel = 'Excellent'; }
          else if (savingsRate >= 20) { healthScore = 75; healthLabel = 'Good'; }
          else if (savingsRate >= 10) { healthScore = 55; healthLabel = 'Fair'; }
          else                        { healthScore = 30; healthLabel = 'Needs Work'; }
        }

        // Top category from category breakdown
        const cats = target.summary?.category_breakdown ||
          Object.entries(
            target.txDocs
              ?.filter((t) => t.type === 'expense')
              ?.reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
                return acc;
              }, {}) || {}
          ).sort(([, a], [, b]) => b - a);
        if (cats.length > 0) {
          topCategory = Array.isArray(cats[0]) ? cats[0][0] : cats[0].name || 'General';
        }
      }
    }

    // ── 2. NLP Intent Detection ──────────────────────────────────────────────
    const lowerMsg = message.toLowerCase().trim();
    let response = '';

    // "Can I afford...?" — detect currency amounts
    if (lowerMsg.includes('afford') || lowerMsg.includes('buy') || lowerMsg.includes('spend')) {
      const amountMatch = lowerMsg.match(/[₹rs]?\s?(\d[\d,]*(?:\.\d+)?)\s*(?:thousand|k|lakh|l)?/i);
      if (amountMatch) {
        let requestedAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
        // Handle "k" / "thousand" / "lakh" multipliers
        if (lowerMsg.includes('lakh') || lowerMsg.includes(' l '))  requestedAmount *= 100_000;
        else if (lowerMsg.includes('thousand') || lowerMsg.includes(' k')) requestedAmount *= 1_000;

        const currentSafeToSpend = safeToSpend || (latestBalance * 0.7);

        if (requestedAmount <= currentSafeToSpend) {
          response = `✅ Yes, you can afford ₹${requestedAmount.toLocaleString('en-IN')}. ` +
            `Your current safe-to-spend is ₹${currentSafeToSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ` +
            `after reserving funds for emergencies and taxes.`;
        } else {
          const shortfall = requestedAmount - currentSafeToSpend;
          response = `⚠️ It might be tight. Your safe-to-spend is ₹${currentSafeToSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}, ` +
            `but ₹${requestedAmount.toLocaleString('en-IN')} would exceed it by ₹${shortfall.toLocaleString('en-IN', { maximumFractionDigits: 0 })}. ` +
            `Consider postponing or reducing other discretionary spending first.`;
        }
      } else {
        response = `💡 I can help! Tell me the specific amount you're considering — e.g. "Can I afford ₹5,000 shoes?".`;
      }

    // Health / score query
    } else if (lowerMsg.includes('health') || lowerMsg.includes('score') || lowerMsg.includes('rating')) {
      response = `📊 Your Financial Health Score is **${healthScore}/100** (${healthLabel}). ` +
        (savingsRate > 0
          ? `You're saving ${savingsRate}% of your income. `
          : `Upload more data to improve your score. `) +
        (healthScore >= 75
          ? `Great work — consider investing your surplus!`
          : `Try to save at least 20% of your monthly income.`);

    // Expense / spending query
    } else if (lowerMsg.includes('spend') || lowerMsg.includes('expense') || lowerMsg.includes('spent')) {
      response = `💸 Your total expenses amount to ₹${totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}. ` +
        `Your top spending category is **${topCategory}**. ` +
        (monthlyBurn > 0
          ? `Your average monthly burn rate is ₹${monthlyBurn.toLocaleString('en-IN', { maximumFractionDigits: 0 })}.`
          : '');

    // Income query
    } else if (lowerMsg.includes('income') || lowerMsg.includes('earn') || lowerMsg.includes('salary')) {
      response = `💰 Your recorded total income is ₹${totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}. ` +
        (forecastIncome > 0
          ? `The AI forecasts ₹${forecastIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })} for next month.`
          : `Upload more monthly data to enable income forecasting.`);

    // Savings query
    } else if (lowerMsg.includes('sav') || lowerMsg.includes('invest')) {
      const savings = totalIncome - totalExpenses;
      response = `🏦 Your net savings are ₹${savings.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ` +
        `(${savingsRate}% savings rate). ` +
        (savingsRate >= 20
          ? `Excellent! Consider putting ₹${Math.round(savings * 0.5).toLocaleString('en-IN')} into a liquid mutual fund.`
          : `Try to hit a 20% savings rate by reducing discretionary spending.`);

    // Balance query
    } else if (lowerMsg.includes('balance') || lowerMsg.includes('safe to spend') || lowerMsg.includes('available')) {
      response = `💳 Your safe-to-spend amount is ₹${safeToSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ` +
        `after reserving emergency and tax funds from your available balance.`;

    // Forecast query
    } else if (lowerMsg.includes('forecast') || lowerMsg.includes('predict') || lowerMsg.includes('next month')) {
      response = forecastIncome > 0
        ? `📈 The AI forecasts ₹${forecastIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })} for next month based on your income history.`
        : `📊 To generate a forecast, upload at least 1 month of income transactions. More data = more accurate predictions.`;

    // Subscription query
    } else if (lowerMsg.includes('subscription') || lowerMsg.includes('recurring')) {
      response = `🔁 To see your subscriptions, check the Subscription Tracker card on your dashboard. ` +
        `SpendNest automatically detects recurring charges like Netflix, Spotify, and gym memberships.`;

    // Default / greeting
    } else {
      response = `👋 I'm your SpendNest AI advisor! You can ask me:\n` +
        `• "Can I afford a ₹10,000 purchase?"\n` +
        `• "What is my financial health score?"\n` +
        `• "How much did I spend this month?"\n` +
        `• "What's my savings rate?"\n` +
        `• "How much is safe to spend?"`;
    }

    res.json({
      reply:     response,
      timestamp: new Date().toISOString(),
      context: {
        safeToSpend:   Math.round(safeToSpend),
        totalExpenses: Math.round(totalExpenses),
        totalIncome:   Math.round(totalIncome),
        savingsRate,
        healthScore,
      },
      suggestedQuestions: [
        'Can I afford a ₹10,000 purchase?',
        'What is my financial health score?',
        'What is my savings rate this month?',
        'How much do I have safe to spend?',
        'What is my top spending category?',
      ],
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { chatAdvisor };
