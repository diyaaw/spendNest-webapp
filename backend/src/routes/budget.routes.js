const express = require('express');
const { getBudgets, setBudget, syncBudgets } = require('../controllers/budget.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/', getBudgets);
router.post('/', setBudget);
router.post('/sync', syncBudgets);

module.exports = router;
