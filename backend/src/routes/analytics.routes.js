const express = require('express');
const {
  getSummary,
  getMonthlyAnalytics,
  getCategoryBreakdown,
  getForecast,
  getLedger,
  getTransactions,
} = require('../controllers/analytics.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// All analytics routes are protected — user must be logged in
router.use(protect);

router.get('/summary', getSummary);
router.get('/monthly', getMonthlyAnalytics);
router.get('/categories', getCategoryBreakdown);
router.get('/forecast', getForecast);
router.get('/ledger', getLedger);
router.get('/transactions', getTransactions);

module.exports = router;
