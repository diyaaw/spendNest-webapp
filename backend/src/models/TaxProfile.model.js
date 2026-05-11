const mongoose = require('mongoose');

const taxProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    regime: {
      type: String,
      enum: ['old', 'new'],
      default: 'new',
    },
    isGstRegistered: {
      type: Boolean,
      default: false,
    },
    estimatedYearlyIncome: {
      type: Number,
      default: 0,
    },
    deductibleExpenses: {
      type: Number,
      default: 0,
    },
    advanceTaxPaid: {
      type: Number,
      default: 0,
    },
    taxReserveAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TaxProfile', taxProfileSchema);
