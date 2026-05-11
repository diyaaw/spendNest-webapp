const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User.model');
const { UserStore } = require('../services/sharedStore');

const isDbConnected = () => mongoose.connection.readyState === 1;

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized — no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    let user;
    if (isDbConnected()) {
      user = await User.findById(decoded.id).select('-password');
    }
    
    // If not found in DB (or DB disconnected), check In-Memory store
    if (!user) {
      user = await UserStore.findById(decoded.id);
      if (user) {
        // Remove password before sending
        const { password, ...userWithoutPassword } = user;
        user = userWithoutPassword;
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized — token invalid' });
  }
};

module.exports = { protect };

