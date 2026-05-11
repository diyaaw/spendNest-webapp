const express = require('express');
const { getEmergencyFund, updateEmergencyFund, getAnalysis } = require('../controllers/emergencyFund.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(protect);

router.get('/',          getEmergencyFund);
router.post('/update',   updateEmergencyFund);
router.get('/analysis',  getAnalysis);

module.exports = router;
