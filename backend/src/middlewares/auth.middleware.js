const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User.model');
const { UserStore } = require('../services/sharedStore');

const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * protect — verifies the short-lived ACCESS token.
 * The client must pass it as:  Authorization: Bearer <accessToken>
 * (or optionally in the legacy 'token' cookie for backward compat)
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    // Legacy cookie fallback — will be removed after frontend migrates
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized — no access token' });
  }

  try {
    // Verify against the ACCESS secret (not the refresh secret)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user;
    if (isDbConnected()) {
      user = await User.findById(decoded.id).select('-password -refreshTokens');
    }

    // DB disconnected or user not found — fall back to In-Memory store
    if (!user) {
      const inMemUser = await UserStore.findById(decoded.id);
      if (inMemUser) {
        const { password, refreshTokens, ...safeUser } = inMemUser;
        user = safeUser;
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Access token expired',
        code: 'TOKEN_EXPIRED', // client can use this code to trigger a silent refresh
      });
    }
    return res.status(401).json({ message: 'Not authorized — token invalid' });
  }
};

module.exports = { protect };
