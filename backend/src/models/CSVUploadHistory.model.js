const mongoose = require('mongoose');

const csvUploadHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    fileHash: {
      type: String, // Used to prevent duplicates
      required: true,
      index: true,
    },
    uploadBatch: {
      type: String,
      required: true,
      unique: true,
    },
    rowCount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    parsedDateRange: {
      startDate: { type: Date },
      endDate: { type: Date },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CSVUploadHistory', csvUploadHistorySchema);
