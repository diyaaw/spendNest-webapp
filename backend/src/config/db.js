const mongoose = require('mongoose');

// Prevent multiple connections during hot-reloads in development
let isConnected = false;

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn('⚠️ WARNING: MONGO_URI is missing. Set it in .env to connect to MongoDB.');
    // Exit if this is a production environment without a DB
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return;
  }

  if (isConnected) {
    console.log('🔄 Using existing MongoDB connection');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Modern mongoose defaults are usually sufficient, but we enforce these for stability
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = conn.connections[0].readyState === 1;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Setup event listeners for connection issues after initial connection
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err}`);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected.');
      isConnected = false;
    });

  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('⚠️ Continuing in dev without database connection...');
    }
  }
};

module.exports = connectDB;
