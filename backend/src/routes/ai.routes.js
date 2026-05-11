const express = require('express');
const { chatAdvisor } = require('../controllers/ai.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/chat', protect, chatAdvisor);

module.exports = router;
