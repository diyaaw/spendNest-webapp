const mongoose = require('mongoose');

const healthSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    breakdown: {
      savings: { type: Number, default: 0 },
      spending: { type: Number, default: 0 },
      emergency: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
    },
    emergencySavings: {
      type: Number,
      default: 0,
    },
    runwayMonths: {
      type: Number,
      default: 0,
    },
    targetCoverageMonths: {
      type: Number,
      default: 6,
    },
    // AI-generated natural language summaries
    insights: {
      type: [String],
      default: [],
    },
    // Spending patterns (weekend vs weekday, etc.)
    trends: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FinancialHealth', healthSchema);
