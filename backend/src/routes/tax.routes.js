const express = require('express');
const { getTaxEstimate } = require('../controllers/tax.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);
router.get('/estimate', getTaxEstimate);

module.exports = router;
