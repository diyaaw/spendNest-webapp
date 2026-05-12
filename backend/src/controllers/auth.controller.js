const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { UserStore } = require('../services/sharedStore');

// Helper to check if DB is connected
const { isDbConnected } = require('../config/db');  // shared singleton — never define locally

// Helper to sign a JWT
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// Helper to send token in cookie + body
const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };

  res.cookie('token', token, cookieOptions);

  res.status(statusCode).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  });
};

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

    sendTokenResponse(user, 201, res);
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
    if (isDbConnected()) {
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

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};
// POST /api/auth/logout

const logout = (req, res) => {
  res.cookie('token', '', { expires: new Date(0), httpOnly: true });
  res.status(200).json({ message: 'Logged out successfully' });
};

// PATCH /api/auth/onboarding
const updateOnboarding = async (req, res, next) => {
  try {
    const allowedFields = [
      'country', 'state', 'currency',
      'freelancerType', 'workCategory', 'incomeFrequency', 'incomeTarget', 'avgMonthlyIncome',
      'taxFilingStatus', 'gstRegistered', 'taxBracket', 'autoTaxEstimation',
      'avgMonthlyExpenses', 'emergencyFundTarget', 'safetyBufferMonths', 'savingsGoalPct', 'optimizeFor',
      'onboardingStep', 'onboardingCompleted',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (isDbConnected()) {
      await User.findByIdAndUpdate(req.user._id, { $set: updates }, { returnDocument: 'after', runValidators: true });
    }
    // In-memory store doesn't have update â€” silently succeed
    res.status(200).json({ message: 'Profile updated', updates });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/onboarding
const getOnboarding = async (req, res) => {
  res.status(200).json({ user: req.user });
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.status(200).json({ user: req.user });
};


module.exports = { register, login, logout, getMe, updateOnboarding, getOnboarding };
