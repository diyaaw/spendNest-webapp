/**
 * db.js — Production-grade MongoDB Singleton for SpendNest
 * ──────────────────────────────────────────────────────────
 *
 * ROOT CAUSE OF THE DISCONNECT BUG
 * ─────────────────────────────────
 * The previous implementation used a local `isConnected` boolean flag that was
 * set to `false` on every 'disconnected' event. MongoDB Atlas (free/shared tier)
 * has a 30-second idle socket timeout. During heavy ML uploads (CSV → Flask →
 * Python processing → insertMany), the round-trip can exceed this idle window,
 * causing Atlas to drop the TCP socket. Mongoose fires 'disconnected' → the flag
 * goes false → the next request thinks the DB is gone and silently falls back to
 * in-memory mode, even though Mongoose has already reconnected.
 *
 * THE CORRECT APPROACH
 * ─────────────────────
 * 1. Use mongoose.connection.readyState as the SINGLE source of truth.
 *    Do NOT cache the connected state in a custom variable.
 * 2. Enable `autoReconnect` via the `serverSelectionTimeoutMS` and socket
 *    keep-alive options so Mongoose handles reconnection transparently.
 * 3. Never manually call mongoose.disconnect() in upload/analytics routes.
 * 4. Register connection events ONCE — before the connect() call — to avoid
 *    duplicate listeners on nodemon hot-reloads.
 * 5. In development, guard against calling connect() multiple times across
 *    hot-reloads using the readyState check (not a custom boolean).
 */

'use strict';

const mongoose = require('mongoose');

// ── NEVER call this more than once. Mongoose manages a single internal pool. ──
let connectionInitialized = false;

/**
 * Returns the live readyState-based connection status.
 * readyState: 0=disconnected | 1=connected | 2=connecting | 3=disconnecting
 *
 * Use this everywhere instead of a cached boolean.
 * @returns {boolean}
 */
const isConnected = () => mongoose.connection.readyState === 1;
const isConnecting = () => mongoose.connection.readyState === 2;

/**
 * connectDB()
 * ───────────
 * Establishes a single, persistent Mongoose connection with:
 *  - Socket keep-alive to prevent Atlas idle-timeout disconnects
 *  - Automatic reconnection on transient failures
 *  - Event listeners registered ONCE (guarded by connectionInitialized flag)
 *  - Hot-reload safe: bails out if a connection already exists or is in-flight
 */
const connectDB = async () => {
  // Guard 1: bail out immediately if already connected or currently connecting.
  // This is the hot-reload / multiple-call guard.
  // We use readyState — NOT a custom boolean — as the canonical truth.
  if (isConnected() || isConnecting()) {
    console.log('🔄 MongoDB: reusing existing connection (readyState=%d)', mongoose.connection.readyState);
    return;
  }

  // Guard 2: MONGO_URI must exist
  if (!process.env.MONGO_URI) {
    console.warn('⚠️  MONGO_URI is not set. Skipping MongoDB connection.');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return;
  }

  // Register connection-lifecycle events ONCE.
  // Doing this inside connectDB but guarded by connectionInitialized ensures
  // nodemon hot-reloads (which re-require this module from cache) do not
  // register duplicate event listeners.
  if (!connectionInitialized) {
    connectionInitialized = true;

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected →', mongoose.connection.host);
    });

    mongoose.connection.on('disconnected', () => {
      // This fires when Atlas drops an idle socket, or on a genuine network blip.
      // Mongoose's reconnection logic takes over automatically.
      // DO NOT set any "isConnected = false" flag here — just log it.
      console.warn(
        '⚠️  MongoDB disconnected (readyState=%d). ' +
        'Mongoose will attempt automatic reconnection.',
        mongoose.connection.readyState
      );
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔁 MongoDB reconnected successfully.');
    });

    mongoose.connection.on('reconnectFailed', () => {
      // Only fires if maxReconnectAttempts is set — we leave it unlimited.
      console.error('❌ MongoDB reconnect attempts exhausted.');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('close', () => {
      console.warn('🔒 MongoDB connection closed.');
    });

    // Graceful shutdown: only close on explicit process termination signals.
    // Use once() to ensure we don't try to close multiple times.
    const gracefulClose = async (signal) => {
      console.log(`\n🛑 [${signal}] Closing MongoDB connection...`);
      
      // Set a hard timeout to prevent zombie processes if DB close hangs
      const forceExitTimeout = setTimeout(() => {
        console.warn('⚠️  MongoDB close timed out. Force exiting.');
        process.exit(1);
      }, 5000);

      try {
        await mongoose.connection.close(true); // true = force close active operations
        console.log('   MongoDB connection closed. Exiting.');
        clearTimeout(forceExitTimeout);
        process.exit(0);
      } catch (err) {
        console.error('❌ Error during MongoDB close:', err.message);
        process.exit(1);
      }
    };

    // Graceful shutdown: only close on explicit process termination signals.
    const handleSIGINT = () => gracefulClose('SIGINT');
    const handleSIGTERM = () => gracefulClose('SIGTERM');
    process.off('SIGINT', handleSIGINT);
    process.off('SIGTERM', handleSIGTERM);
    process.on('SIGINT', handleSIGINT);
    process.on('SIGTERM', handleSIGTERM);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      // ── Keep-alive prevents Atlas from dropping the socket during long ML pipelines ──
      // Without this, Atlas (free/shared tier) closes idle TCP sockets after ~30s,
      // which fires 'disconnected' even mid-upload. With keep-alive, the socket
      // stays open regardless of application idle time.
      socketTimeoutMS:          120_000,   // 2 min — covers ML-heavy upload round-trips
      serverSelectionTimeoutMS:  10_000,   // 10 s to select a replica set member
      heartbeatFrequencyMS:      10_000,   // ping Atlas every 10 s to keep socket alive
      maxPoolSize:                   10,   // max concurrent operations per connection
      minPoolSize: process.env.NODE_ENV === 'production' ? 2 : 0,   // keep at least 2 sockets warm in prod
      maxIdleTimeMS:             60_000,   // close pooled sockets idle > 60 s
      retryWrites:               true,
      retryReads:                true,
      autoIndex:                 process.env.NODE_ENV !== 'production', // skip in prod
    });

    // readyState is already 1 by the time await resolves — no extra check needed.
    console.log(
      '🏁 MongoDB initial connection established (pool: %d/%d)',
      mongoose.connection.pool?.totalConnectionCount ?? 0,
      10
    );
  } catch (err) {
    console.error('❌ MongoDB initial connection failed:', err.message);

    if (process.env.NODE_ENV === 'production') {
      // In production, crash fast so the orchestrator can restart the pod.
      process.exit(1);
    } else {
      // In development, warn and continue — routes will fall back to in-memory.
      console.warn(
        '⚠️  Continuing without MongoDB in development mode. ' +
        'Upload data will be stored in-memory (session-only).'
      );
    }
  }
};

/**
 * isDbConnected()
 * ───────────────
 * Single source of truth for all route guards throughout the application.
 *
 * Usage in controllers:
 *   const { isDbConnected } = require('../config/db');
 *   if (isDbConnected()) { ... }
 *
 * DO NOT import mongoose and check readyState manually in controllers.
 * Import this helper instead so there is one canonical check.
 */

module.exports = connectDB;
module.exports.isDbConnected = isConnected;  // named export for controllers
