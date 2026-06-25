const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middlewares/error.middleware');

// Route imports
const authRoutes         = require('./routes/auth.routes');
const uploadRoutes       = require('./routes/upload.routes');
const analyticsRoutes    = require('./routes/analytics.routes');
const taxRoutes          = require('./routes/tax.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const emergencyFundRoutes = require('./routes/emergencyFund.routes');
const budgetRoutes        = require('./routes/budget.routes');
const aiRoutes            = require('./routes/ai.routes');


const app = express();

// ─── Core Middlewares ────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',  // Next.js dev server (localhost)
  'http://127.0.0.1:3000',  // Next.js dev server (IPv4)
  'http://localhost:5173',  // Vite (old frontend)
  'http://127.0.0.1:5173',  // Vite (IPv4)
];

// Add production Vercel URL if configured
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.some(o => origin.endsWith('.vercel.app'))) {
      return callback(null, true);
    }
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Health Check ────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'SpendNest Express API', timestamp: new Date().toISOString() });
});

// ─── Routes ──────────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/upload',         uploadRoutes);
app.use('/api/analytics',      analyticsRoutes);
app.use('/api/tax',            taxRoutes);
app.use('/api/subscriptions',  subscriptionRoutes);
app.use('/api/emergency-fund', emergencyFundRoutes);
app.use('/api/budgets',        budgetRoutes);
app.use('/api/ai',             aiRoutes);


// ─── Global Error Handler ────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
