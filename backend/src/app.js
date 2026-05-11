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
app.use(cors({
  origin: [
    'http://localhost:3000',  // Next.js dev server
    'http://localhost:5173',  // Vite (old frontend — kept for backwards compat)
  ],
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
