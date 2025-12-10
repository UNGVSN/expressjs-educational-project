/**
 * Session Middleware
 *
 * Server-side session management with cookie-based session IDs.
 * Similar to 'express-session' npm package.
 */

'use strict';

const crypto = require('crypto');
const { serialize } = require('./cookie');
const { sign, unsign } = require('./signed');
const MemoryStore = require('./memory-store');

/**
 * Generate a random session ID
 *
 * @param {number} [length=24] - Length of the ID in bytes
 * @returns {string} Base64-encoded session ID
 */
function generateSessionId(length = 24) {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Create session middleware
 *
 * @param {Object} options - Session options
 * @param {string} options.secret - Required secret for signing session ID
 * @param {string} [options.name='connect.sid'] - Cookie name
 * @param {boolean} [options.resave=true] - Save session on every request
 * @param {boolean} [options.saveUninitialized=true] - Save new empty sessions
 * @param {Function} [options.genid] - Custom session ID generator
 * @param {Object} [options.cookie] - Cookie options
 * @param {Object} [options.store] - Session store instance
 * @returns {Function} Express middleware
 *
 * @example
 * app.use(session({
 *   secret: 'keyboard cat',
 *   resave: false,
 *   saveUninitialized: false,
 *   cookie: { secure: true, maxAge: 60000 }
 * }));
 */
function session(options = {}) {
  // Validate required options
  if (!options.secret) {
    throw new Error('Session secret is required');
  }

  const {
    secret,
    name = 'connect.sid',
    resave = true,
    saveUninitialized = true,
    rolling = false,
    genid = generateSessionId,
    cookie: cookieOptions = {},
    store = new MemoryStore()
  } = options;

  // Default cookie options
  const defaultCookieOptions = {
    path: '/',
    httpOnly: true,
    secure: false,
    maxAge: null,
    ...cookieOptions
  };

  return function sessionMiddleware(req, res, next) {
    // Skip if session already exists
    if (req.session) {
      return next();
    }

    // Store reference to original end method
    const originalEnd = res.end;
    let sessionSaved = false;

    // Get session ID from cookie
    // Check signedCookies first (if cookie-parser with secret was used)
    // Then check regular cookies and try to unsign manually
    let sessionId = null;

    // If cookie-parser already verified the signed cookie
    if (req.signedCookies && req.signedCookies[name]) {
      sessionId = req.signedCookies[name];
    }
    // Otherwise try to get from regular cookies and unsign manually
    else if (req.cookies && req.cookies[name]) {
      const rawCookie = req.cookies[name];
      const unsigned = unsign(rawCookie, secret);
      if (unsigned !== false) {
        sessionId = unsigned;
      }
    }

    // Create session object
    const createSession = (sid, sessionData = {}) => {
      const sess = {
        ...sessionData,
        cookie: { ...defaultCookieOptions, ...sessionData.cookie }
      };

      // Add session methods
      sess.regenerate = function(callback) {
        store.destroy(sid, (err) => {
          if (err) return callback(err);

          // Generate new session ID
          const newSid = genid();
          sessionId = newSid;
          req.session = createSession(newSid);
          req.session.isNew = true;

          callback(null);
        });
      };

      sess.destroy = function(callback) {
        store.destroy(sid, (err) => {
          if (err) return callback(err);

          req.session = null;

          // Clear cookie
          res.clearCookie(name, {
            path: defaultCookieOptions.path
          });

          callback(null);
        });
      };

      sess.reload = function(callback) {
        store.get(sid, (err, data) => {
          if (err) return callback(err);
          if (!data) return callback(new Error('Session not found'));

          // Restore session data
          Object.assign(sess, data);
          callback(null);
        });
      };

      sess.save = function(callback) {
        store.set(sid, sess, callback || (() => {}));
      };

      sess.touch = function() {
        // Update cookie expiration
        if (sess.cookie.maxAge) {
          sess.cookie.expires = new Date(Date.now() + sess.cookie.maxAge);
        }
      };

      // Define non-enumerable properties
      Object.defineProperty(sess, 'id', {
        value: sid,
        enumerable: false
      });

      return sess;
    };

    // Save session before response ends
    const saveSession = (callback) => {
      if (sessionSaved || !req.session) {
        return callback();
      }

      sessionSaved = true;

      // Check if we should save
      const isNew = req.session.isNew;
      const isModified = true; // Simplified - always assume modified

      // Don't save empty uninitialized sessions
      if (isNew && !saveUninitialized) {
        const keys = Object.keys(req.session).filter(k =>
          k !== 'cookie' && k !== 'id' && k !== 'isNew'
        );
        if (keys.length === 0) {
          return callback();
        }
      }

      // Don't resave unmodified sessions
      if (!isNew && !resave && !isModified) {
        return callback();
      }

      // Save to store
      store.set(sessionId, req.session, (err) => {
        if (err) {
          console.error('Session save error:', err);
        }

        // Set cookie if new session or rolling sessions enabled
        if (isNew || rolling) {
          const signedId = sign(sessionId, secret);
          const cookieStr = serialize(name, signedId, req.session.cookie);
          res.setHeader('Set-Cookie', cookieStr);
        }

        callback();
      });
    };

    // Override res.end to save session
    res.end = function(...args) {
      saveSession(() => {
        originalEnd.apply(res, args);
      });
    };

    // Load or create session
    if (sessionId) {
      // Try to load existing session
      store.get(sessionId, (err, sessionData) => {
        if (err) {
          return next(err);
        }

        if (sessionData) {
          // Existing session found
          req.session = createSession(sessionId, sessionData);
          req.session.isNew = false;
        } else {
          // Session expired or not found - create new
          sessionId = genid();
          req.session = createSession(sessionId);
          req.session.isNew = true;
        }

        next();
      });
    } else {
      // No session cookie - create new session
      sessionId = genid();
      req.session = createSession(sessionId);
      req.session.isNew = true;
      next();
    }
  };
}

// Export session middleware factory
module.exports = session;
module.exports.session = session;
module.exports.MemoryStore = MemoryStore;
