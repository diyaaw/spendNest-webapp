// ⚠️  dotenv MUST be the very first import — before anything else reads process.env
require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // 1. Connect to MongoDB before accepting any HTTP requests
  await connectDB();

  // 2. Start Express
  const server = app.listen(PORT, () => {
    console.log(`🚀 FlowShield API running on http://localhost:${PORT}`);
    console.log(`   MODE: ${process.env.NODE_ENV || 'development'}`);
  });

  // 3. Graceful shutdown — close DB connection cleanly on process termination
  const shutdown = () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
      console.log('   HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer();

