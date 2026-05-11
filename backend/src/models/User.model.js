const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
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
      select: false, // never returned in queries by default
    },
    incomeType: {
      type: String,
      enum: ['freelance', 'gig', 'part-time'],
      default: 'freelance',
    },
    currency: {
      type: String,
      default: 'INR',
    },
    // Indian tax slabs: 5%, 10%, 20%, 30%
    taxSlab: {
      type: Number,
      enum: [5, 10, 20, 30],
      default: 5,
    },
    // Financial health score computed by the platform (0–100)
    healthScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
