const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Format: "YYYY-MM"
    month: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    budgetLimit: {
      type: Number,
      required: [true, 'Budget limit is required'],
      min: [0, 'Budget limit cannot be negative'],
    },
    // Running total of actual spending in this category this month
    spent: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Computed status — can be updated by a scheduled job or on transaction write
    status: {
      type: String,
      enum: ['safe', 'warning', 'exceeded'],
      default: 'safe',
    },
  },
  {
    timestamps: false,
  }
);

// One budget per user per category per month
budgetSchema.index({ userId: 1, month: 1, category: 1 }, { unique: true });
budgetSchema.index({ userId: 1, month: 1 });

module.exports = mongoose.model('Budget', budgetSchema);
