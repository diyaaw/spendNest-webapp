const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [1, 'Target must be greater than 0'],
    },
    // Tracks progress — updated as user saves toward the goal
    currentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    deadline: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'failed'],
      default: 'active',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// Virtual: percentage progress toward goal
goalSchema.virtual('progressPercent').get(function () {
  if (!this.targetAmount) return 0;
  return Math.min(100, Math.round((this.currentAmount / this.targetAmount) * 100));
});

module.exports = mongoose.model('Goal', goalSchema);
