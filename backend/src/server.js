/**
 * server.js — SpendNest Express Entry Point
 * ───────────────────────────────────────────
 * dotenv MUST be imported first — before any module reads process.env.
 */
require('dotenv').config();

const app      = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // 1. Establish MongoDB connection before accepting HTTP traffic.
  //    connectDB() is idempotent — safe to call multiple times (nodemon hot-reloads).
  //    Graceful shutdown (SIGINT/SIGTERM) is handled entirely inside db.js.
  await connectDB();

  // 2. Start Express HTTP server
  app.listen(PORT, () => {
    console.log(`\n🚀 SpendNest API   →  http://localhost:${PORT}`);
    console.log(`   Mode            :  ${process.env.NODE_ENV || 'development'}`);
    console.log(`   ML Service      →  ${process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000'}`);
  });
};

startServer();
