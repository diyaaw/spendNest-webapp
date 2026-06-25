const express = require('express');
const { register, login, refreshToken, logout, logoutAll, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Uses HttpOnly cookie — no auth header needed
router.post('/refresh-token', refreshToken);

// Protected routes — require valid access token
router.post('/logout', protect, logout);
router.post('/logout-all', protect, logoutAll);
router.get('/me', protect, getMe);

module.exports = router;
