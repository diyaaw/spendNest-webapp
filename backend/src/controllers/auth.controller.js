const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User.model');
const { UserStore } = require('../services/sharedStore');

// Helper to check if DB is connected
const { isDbConnected } = require('../config/db'); // shared singleton — never define locally

// ─────────────────────────────────────────────────────────────────────────────
// Token helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sign a short-lived ACCESS token (default 15 min).
 * Contains only the user id — keep the payload lean.
 */
const signAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

/**
 * Sign a long-lived REFRESH token (default 7 days).
 * Uses a dedicated secret so a compromised access-token secret
 * can't be used to mint new refresh tokens.
 */
const signRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

/**
 * SHA-256 hash of a token — safe to store in DB.
 * We never store raw refresh tokens.
 */
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

/**
 * Persist a new (hashed) refresh token for the user.
 * Caps at 5 concurrent sessions; drops the oldest on overflow.
 */
const saveRefreshToken = async (userId, rawRefreshToken, isDbUser = true) => {
  const hashed = hashToken(rawRefreshToken);

  if (isDbUser) {
    // Pull the current list, cap at 5 sessions, append new one
    const user = await User.findById(userId).select('+refreshTokens');
    const tokens = user.refreshTokens || [];
    const updated = [...tokens.slice(-4), hashed]; // keep max 5 (last 4 + new)
    user.refreshTokens = updated;
    await user.save();
  }
  // In-Memory store does not persist refresh tokens between restarts — that's acceptable for demo mode.
};

/**
 * Set the refresh token as an HttpOnly cookie.
 * The access token is returned in the JSON body (short-lived, safe for memory storage on client).
 */
const sendTokens = (user, statusCode, res, accessToken, refreshToken) => {
  const refreshCookieOptions = {
    httpOnly: true,                                       // inaccessible to JS
    secure: process.env.NODE_ENV === 'production',        // HTTPS only in prod
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,                     // 7 days in ms
    path: '/api/auth',                                    // scope cookie to auth endpoints only
  };

  res.cookie('refreshToken', refreshToken, refreshCookieOptions);

  res.status(statusCode).json({
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Controllers
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email and password' });
    }

    let user;
    if (isDbConnected()) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ message: 'User with this email already exists' });
      }
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);
      user = await User.create({ name, email, password: hashedPassword });
    } else {
      // Fallback to In-Memory store
      const existingUser = await UserStore.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ message: 'User with this email already exists (In-Memory)' });
      }
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);
      user = await UserStore.create({ name, email, password: hashedPassword });
    }

    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    await saveRefreshToken(user._id, refreshToken, isDbConnected());

    sendTokens(user, 201, res, accessToken, refreshToken);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    let user;
    const dbConnected = isDbConnected();

    if (dbConnected) {
      user = await User.findOne({ email }).select('+password');
    } else {
      user = await UserStore.findOne({ email });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    await saveRefreshToken(user._id, refreshToken, dbConnected);

    sendTokens(user, 200, res, accessToken, refreshToken);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh-token
// Rotates the refresh token: validates the old one, revokes it, issues a fresh pair.
const refreshToken = async (req, res, next) => {
  try {
    const incomingRefreshToken = req.cookies?.refreshToken;

    if (!incomingRefreshToken) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    // Verify the refresh token signature & expiry
    let decoded;
    try {
      decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      // Expired or tampered token — clear the cookie
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(401).json({ message: 'Refresh token invalid or expired. Please log in again.' });
    }

    const hashedIncoming = hashToken(incomingRefreshToken);

    let user;
    if (isDbConnected()) {
      // Look up user and verify the hashed token exists in their token list
      user = await User.findById(decoded.id).select('+refreshTokens');

      if (!user || !user.refreshTokens.includes(hashedIncoming)) {
        // Token reuse attack detected — revoke ALL refresh tokens for this user
        if (user) {
          user.refreshTokens = [];
          await user.save();
        }
        res.clearCookie('refreshToken', { path: '/api/auth' });
        return res.status(401).json({ message: 'Refresh token reuse detected. All sessions revoked.' });
      }

      // Rotate: remove old token, issue new one
      user.refreshTokens = user.refreshTokens.filter((t) => t !== hashedIncoming);
      const newRefreshToken = signRefreshToken(user._id);
      const newAccessToken = signAccessToken(user._id);
      user.refreshTokens = [...user.refreshTokens.slice(-4), hashToken(newRefreshToken)];
      await user.save();

      sendTokens(user, 200, res, newAccessToken, newRefreshToken);
    } else {
      // In-Memory fallback: stateless rotation (no DB to check reuse)
      user = await UserStore.findById(decoded.id);
      if (!user) {
        res.clearCookie('refreshToken', { path: '/api/auth' });
        return res.status(401).json({ message: 'User not found' });
      }
      const newRefreshToken = signRefreshToken(user._id);
      const newAccessToken = signAccessToken(user._id);
      sendTokens(user, 200, res, newAccessToken, newRefreshToken);
    }
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
// Revokes the specific refresh token so this device is logged out.
const logout = async (req, res, next) => {
  try {
    const incomingRefreshToken = req.cookies?.refreshToken;

    if (incomingRefreshToken && isDbConnected()) {
      const hashedIncoming = hashToken(incomingRefreshToken);
      // Remove only this device's token — other sessions stay active
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: hashedIncoming },
      });
    }

    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.clearCookie('token'); // legacy cookie cleanup
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout-all
// Nuclear option: revoke every refresh token for this user (logout everywhere).
const logoutAll = async (req, res, next) => {
  try {
    if (isDbConnected()) {
      await User.findByIdAndUpdate(req.user._id, { refreshTokens: [] });
    }
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.status(200).json({ message: 'Logged out from all devices' });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.status(200).json({ user: req.user });
};

module.exports = { register, login, refreshToken, logout, logoutAll, getMe };
