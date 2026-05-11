const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['budget_exceeded', 'tax_buffer_low', 'anomaly', 'goal_achieved'],
      required: true,
    },
    message: {
      type: String,
      required: [true, 'Alert message is required'],
      trim: true,
    },
    // Defaults to unread — user marks as read via API
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Quickly fetch all unread alerts for a user
alertSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
