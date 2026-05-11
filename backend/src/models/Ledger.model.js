const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Format: "YYYY-MM" — easy string filtering (e.g. "2024-06")
    month: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'],
    },
    totalIncome: {
      type: Number,
      default: 0,
    },
    totalExpenses: {
      type: Number,
      default: 0,
    },
    // Safe money to spend after tax buffer and emergency buffer
    availableToSpend: {
      type: Number,
      default: 0,
    },
    // Held back for tax obligations based on user's taxSlab
    quarantinedForTaxes: {
      type: Number,
      default: 0,
    },
    // 3–6 month runway buffer for income gaps (gig work reality)
    emergencyBuffer: {
      type: Number,
      default: 0,
    },
    // Dynamic save rate for this month (as a decimal, e.g. 0.15 = 15%)
    saveRate: {
      type: Number,
      default: 0.1,
      min: 0,
      max: 1,
    },
  },
  {
    // updatedAt tracks when the ledger was last recalculated
    timestamps: { createdAt: false, updatedAt: true },
  }
);

// One ledger document per user per month
ledgerSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Ledger', ledgerSchema);
