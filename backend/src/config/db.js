const mongoose = require("mongoose");

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn('⚠️ WARNING: MONGO_URI is missing. Running in "In-Memory" mode. Data will not persist.');
    return;
  }
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    // Don't exit the process so the user can still see the UI
    console.warn('⚠️ Continuing without database connection...');
  }
};

module.exports = connectDB;

