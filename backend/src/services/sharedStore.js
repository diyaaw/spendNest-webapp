/**
 * sharedStore.js
 * ──────────────
 * A thread-safe (within the event loop) in-memory data store for SpendNest.
 * This acts as a secondary storage layer to ensure the dashboard works even
 * if MongoDB is unreachable or running in "In-Memory" mode.
 *
 * DATA PERSISTENCE:
 * - This data is NOT persistent across server restarts.
 * - Used as a fallback for: Users, Uploads, and Analytics.
 *
 * Upload record shape:
 * {
 *   _id, userId, uploadId, txDocs, summary, recommendation, forecast,
 *   subscriptions, emergency_fund, insights, trends,
 *   monthlyAnalytics, currentMonth, createdAt
 * }
 */

const storage = {
  users: [],       // [{ _id, name, email, password }]
  uploads: [],     // [{ _id, userId, filename, rowCount, summary, transactions, forecast, recommendation }]
  emergencyFunds: [], // [{ userId, currentSavings, targetMonths }]
};

// ─── User Store ──────────────────────────────────────────────────────────────

const UserStore = {
  create: async (data) => {
    const newUser = {
      _id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      createdAt: new Date(),
    };
    storage.users.push(newUser);
    return newUser;
  },

  findOne: async (query) => {
    return storage.users.find(u => {
      for (let key in query) {
        if (u[key] !== query[key]) return false;
      }
      return true;
    });
  },

  findById: async (id) => {
    return storage.users.find(u => String(u._id) === String(id));
  }
};

// ─── Upload Store ────────────────────────────────────────────────────────────

const UploadStore = {
  create: async (data) => {
    const newUpload = {
      _id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      createdAt: new Date(),
    };
    storage.uploads.push(newUpload);
    return newUpload;
  },

  findByUserId: async (userId) => {
    return storage.uploads
      .filter(u => String(u.userId) === String(userId))
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  findByUploadId: async (uploadId) => {
    return storage.uploads.find(u => String(u.uploadId) === String(uploadId)) || null;
  }
};

// ─── Emergency Fund Store ───────────────────────────────────────────────────

const EmergencyFundStore = {
  upsert: async (userId, data) => {
    let fund = storage.emergencyFunds.find(f => String(f.userId) === String(userId));
    if (!fund) {
      fund = { userId, currentSavings: 0, targetMonths: 6 };
      storage.emergencyFunds.push(fund);
    }
    Object.assign(fund, data);
    return fund;
  },

  findByUserId: async (userId) => {
    return storage.emergencyFunds.find(f => String(f.userId) === String(userId)) || null;
  }
};

module.exports = { UserStore, UploadStore, EmergencyFundStore };
