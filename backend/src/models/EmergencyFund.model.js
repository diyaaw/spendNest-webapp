const mongoose = require('mongoose');

const emergencyFundSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one record per user
    },
    // User-set or calculated values
    currentSavings:   { type: Number, default: 0 },
    targetSavings:    { type: Number, default: 0 },
    targetMonths:     { type: Number, default: 6 }, // goal: X months of expenses

    // Computed from transactions
    avgMonthlyExpenses: { type: Number, default: 0 },
    runwayMonths:       { type: Number, default: 0 },

    // Risk classification
    riskLevel: {
      type: String,
      enum: ['critical', 'low', 'moderate', 'healthy', 'excellent'],
      default: 'critical',
    },
    readinessScore: { type: Number, min: 0, max: 100, default: 0 },

    // Monthly savings target to reach goal
    monthlyTargetToGoal: { type: Number, default: 0 },

    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmergencyFund', emergencyFundSchema);
