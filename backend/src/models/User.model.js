const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    // ── Core Auth ─────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },

    // ── Refresh Token Rotation ─────────────────────────────────────
    // Stores hashed refresh tokens so we can rotate & revoke them server-side
    refreshTokens: {
      type: [String],
      select: false,
      default: [],
    },

    // ── Step 1 — Location & Currency ──────────────────────────────
    country: { type: String, default: 'IN' },
    state: { type: String, default: '' },
    currency: { type: String, default: 'INR' },

    // ── Step 2 — Work Profile ─────────────────────────────────────
    freelancerType: {
      type: String,
      enum: ['solo', 'agency', 'part-time', 'creator'],
      default: 'solo',
    },
    workCategory: {
      type: String,
      enum: ['developer', 'designer', 'writer', 'marketing', 'video', 'consultant', 'other'],
      default: 'developer',
    },
    incomeFrequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly', 'irregular'],
      default: 'monthly',
    },
    incomeTarget: { type: Number, default: 0 },
    avgMonthlyIncome: { type: Number, default: 0 },

    // ── Step 3 — Tax Config ───────────────────────────────────────
    taxFilingStatus: {
      type: String,
      enum: ['individual', 'sole-proprietor', 'llp', 'agency'],
      default: 'individual',
    },
    gstRegistered: { type: Boolean, default: false },
    taxBracket: { type: Number, default: 5 },
    autoTaxEstimation: { type: Boolean, default: true },

    // Legacy alias kept for existing analytics queries
    incomeType: {
      type: String,
      enum: ['freelance', 'gig', 'part-time'],
      default: 'freelance',
    },
    taxSlab: { type: Number, enum: [5, 10, 20, 30], default: 5 },

    // ── Step 4 — Expenses & Safety ───────────────────────────────
    avgMonthlyExpenses: { type: Number, default: 0 },
    emergencyFundTarget: { type: Number, default: 0 },
    safetyBufferMonths: { type: Number, enum: [1, 3, 6, 12], default: 3 },
    savingsGoalPct: { type: Number, min: 0, max: 100, default: 20 },
    optimizeFor: {
      type: [String],
      enum: ['stability', 'growth', 'tax-savings', 'budgeting', 'less-anxiety'],
      default: ['stability'],
    },

    healthScore: { type: Number, min: 0, max: 100, default: 50 },
    
    // ── Preferences ───────────────────────────────────────────────
    preferences: {
      currency: { type: String, default: 'INR' },
      theme: { type: String, default: 'dark' },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
