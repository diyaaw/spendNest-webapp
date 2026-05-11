const Transaction = require('../models/Transaction.model');
const Ledger = require('../models/Ledger.model');
const FinancialHealth = require('../models/FinancialHealth.model');

const chatAdvisor = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { message } = req.body;

    if (!message) return res.status(400).json({ message: 'Message is required' });

    // 1. Gather context
    const latestLedger = await Ledger.findOne({ userId }).sort({ month: -1 });
    const health = await FinancialHealth.findOne({ userId });
    
    // 2. Simple NLP (Mock logic for "Can I afford...?")
    const lowerMsg = message.toLowerCase();
    let response = "";

    if (lowerMsg.includes('afford')) {
      const amountMatch = lowerMsg.match(/₹?\s?(\d+(?:,\d+)*(?:\.\d+)?)/);
      if (amountMatch) {
        const requestedAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
        const safeToSpend = latestLedger?.availableToSpend || 0;
        
        if (requestedAmount <= safeToSpend) {
          response = `Yes! Based on your current "Safe to Spend" limit of ₹${safeToSpend.toLocaleString()}, you can afford this expense of ₹${requestedAmount.toLocaleString()} while still meeting your savings goals.`;
        } else {
          response = `It might be tight. Your current "Safe to Spend" limit is ₹${safeToSpend.toLocaleString()}. Spending ₹${requestedAmount.toLocaleString()} would exceed your recommended monthly budget.`;
        }
      } else {
        response = "I can help with that! Tell me the specific amount you're considering spending.";
      }
    } else if (lowerMsg.includes('health') || lowerMsg.includes('score')) {
      const score = health?.overallScore || 0;
      response = `Your current Financial Health Score is ${score}/100 (${health?.label || 'Fair'}). ${health?.recommendations?.[0] || 'Keep uploading your data to get more insights!'}`;
    } else if (lowerMsg.includes('spend') || lowerMsg.includes('expense')) {
      const totalExp = latestLedger?.totalExpenses || 0;
      response = `You've spent a total of ₹${totalExp.toLocaleString()} so far this month. Your top category is ${latestLedger?.topCategory || 'General'}.`;
    } else {
      response = "I'm your SpendNest AI advisor. You can ask me things like 'Can I afford a ₹5,000 purchase?' or 'How is my financial health?'";
    }

    // Simulate "thinking" delay on frontend, but return immediately here
    res.json({
      reply: response,
      timestamp: new Date().toISOString(),
      suggestedQuestions: [
        "Can I afford ₹10,000 expense?",
        "How is my financial health score?",
        "What was my total spending this month?"
      ]
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { chatAdvisor };
