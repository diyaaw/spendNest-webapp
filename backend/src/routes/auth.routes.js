const express = require('express');
const { register, login, logout, getMe, updateOnboarding, getOnboarding } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.get('/onboarding', protect, getOnboarding);
router.patch('/onboarding', protect, updateOnboarding);

module.exports = router;

