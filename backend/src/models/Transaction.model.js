const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      // FastAPI may return: income, expense, transfer, refund, unknown
      enum: ['income', 'expense', 'transfer', 'refund', 'unknown'],
      default: 'unknown',
    },
    category: {
      type: String,
      default: 'Uncategorized',
      trim: true,
    },
    merchant: {
      type: String,
      default: '',
      trim: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    isTaxDeductible: {
      type: Boolean,
      default: false,
    },
    // How the transaction entered the system
    source: {
      type: String,
      enum: ['csv_upload', 'manual', 'statement_upload', 'api'],
      default: 'manual',
    },
    // Groups all transactions from the same CSV upload together
    uploadBatch: {
      type: String,
      index: true,
      default: null,
    },
    // Flagged by ML anomaly detection
    isAnomaly: {
      type: Boolean,
      default: false,
    },
    bank: {
      type: String,
      default: 'Main Account',
      trim: true,
    },
  },
  {
    // Only createdAt — transactions are immutable once written
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index for common dashboard query pattern
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ userId: 1, uploadBatch: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
