const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    merchantName: { type: String, required: true, trim: true },
    normalizedName: { type: String, trim: true }, // lower-case canonical form
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    frequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'annual', 'irregular'],
      default: 'monthly',
    },
    category: {
      type: String,
      enum: ['streaming', 'saas', 'utilities', 'rent', 'emi', 'insurance', 'cloud', 'fitness', 'news', 'other'],
      default: 'other',
    },
    // Dates
    firstDetectedDate: { type: Date },
    lastDetectedDate:  { type: Date },
    nextBillingDate:   { type: Date },

    // Status
    active: { type: Boolean, default: true },
    autoPredicted: { type: Boolean, default: true }, // detected by AI vs manually added

    // Analytics
    yearlyCost:       { type: Number, default: 0 },
    occurrenceCount:  { type: Number, default: 1 },
    confidenceScore:  { type: Number, min: 0, max: 1, default: 0.5 }, // 0-1 confidence it's a real subscription
    priceIncreased:   { type: Boolean, default: false },
    previousAmount:   { type: Number, default: null },

    // Source upload batch that detected it
    uploadBatch: { type: String, default: null },
  },
  { timestamps: true }
);

subscriptionSchema.index({ userId: 1, normalizedName: 1 }, { unique: true });
subscriptionSchema.index({ userId: 1, nextBillingDate: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
