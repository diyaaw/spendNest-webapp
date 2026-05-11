const mongoose = require('mongoose');

// Sub-schema for each monthly prediction point
const predictionSchema = new mongoose.Schema(
  {
    month: {
      type: String, // "YYYY-MM"
      required: true,
    },
    predictedIncome: {
      type: Number,
      required: true,
    },
    // ARIMA confidence interval upper bound
    confidenceHigh: {
      type: Number,
      default: null,
    },
    // ARIMA confidence interval lower bound
    confidenceLow: {
      type: Number,
      default: null,
    },
    // How much the platform recommends saving this month (decimal)
    recommendedSaveRate: {
      type: Number,
      default: 0.1,
    },
  },
  { _id: false } // embedded — no need for individual IDs
);

const forecastSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    // ML model used to generate this forecast
    model: {
      type: String,
      default: 'WMA',
    },
    // Embedded array of future month predictions
    predictions: {
      type: [predictionSchema],
      default: [],
    },
    // Data points from the past used to generate the forecast
    historicalIncome: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    // NEW: Analytics & Volatility
    volatility: {
      score: { type: Number, default: 0 },
      fluctuationPct: { type: Number, default: 0 },
      stabilityScore: { type: Number, default: 0 },
      variance: { type: Number, default: 0 }
    },
    bufferRecommendation: {
      emergencySavingsPct: { type: Number, default: 20 },
      taxReservePct: { type: Number, default: 15 }
    },
    insights: {
      type: [String],
      default: []
    }
  },
  { timestamps: false } // generatedAt is the only timestamp needed
);

// Latest forecast per user (sorted desc by generatedAt)
forecastSchema.index({ userId: 1, generatedAt: -1 });

module.exports = mongoose.model('Forecast', forecastSchema);
