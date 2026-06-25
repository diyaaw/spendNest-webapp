const mongoose = require('mongoose');

// Sub-schema for each advance tax instalment
const advanceTaxSchema = new mongoose.Schema(
  {
    dueDate:    { type: String },            // e.g. "15 Jun"
    label:      { type: String },            // e.g. "1st Instalment"
    percentage: { type: Number },            // cumulative % at this quarter
    amountDue:  { type: Number, default: 0 }, // incremental amount for this quarter
    cumulative: { type: Number, default: 0 }, // total paid so far by this date
  },
  { _id: false }
);

const taxProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one record per user — always upserted
      index: true,
    },

    // ── Income Basis ──────────────────────────────────────────────────────────
    grossAnnualIncome: { type: Number, default: 0 },
    // Presumptive income under Sec 44ADA (50% of gross)
    taxableIncome:     { type: Number, default: 0 },

    // ── Regime Comparison ─────────────────────────────────────────────────────
    // Which regime was recommended on last calculation
    recommendedRegime: { type: String, enum: ['old', 'new'], default: 'new' },
    // Rupee savings from choosing the recommended regime
    regimeSavings:     { type: Number, default: 0 },

    // ── Old Regime ────────────────────────────────────────────────────────────
    oldRegime: {
      totalTax:       { type: Number, default: 0 },
      cess:           { type: Number, default: 0 },
      effectiveRate:  { type: Number, default: 0 }, // % of gross
      monthlyReserve: { type: Number, default: 0 },
      advanceTax:     { type: [advanceTaxSchema], default: [] },
    },

    // ── New Regime ────────────────────────────────────────────────────────────
    newRegime: {
      totalTax:       { type: Number, default: 0 },
      cess:           { type: Number, default: 0 },
      effectiveRate:  { type: Number, default: 0 },
      monthlyReserve: { type: Number, default: 0 },
      advanceTax:     { type: [advanceTaxSchema], default: [] },
    },

    // ── Flags ─────────────────────────────────────────────────────────────────
    gstRequired: { type: Boolean, default: false }, // income > 20L
    calculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TaxProfile', taxProfileSchema);
