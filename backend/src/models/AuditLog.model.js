const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['csv_upload', 'ledger_update', 'goal_created', 'goal_updated', 'budget_set', 'manual_transaction'],
      required: true,
    },
    // Schema.Types.Mixed — store any shape of data without enforcing a schema.
    // Examples:
    //   csv_upload:    { filename: 'may.csv', rowCount: 142, uploadBatch: 'abc123' }
    //   ledger_update: { month: '2024-06', previousSaveRate: 0.1, newSaveRate: 0.15 }
    //   goal_created:  { goalId: ObjectId, title: 'Emergency Fund', target: 50000 }
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    // Audit logs are append-only — createdAt only, no updatedAt
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Useful for admin dashboards and per-user activity feeds
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
