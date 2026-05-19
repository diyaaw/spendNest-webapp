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
  try {
    // 1. Establish MongoDB connection before accepting HTTP traffic.
    await connectDB();

    // 2. Start Express HTTP server
    const server = app.listen(PORT, () => {
      console.log(`\n🚀 SpendNest API   →  http://localhost:${PORT}`);
      console.log(`   Mode            :  ${process.env.NODE_ENV || 'development'}`);
      console.log(`   ML Service      →  ${process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000'}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please kill the existing process or use a different port.`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', err);
      }
    });

  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
