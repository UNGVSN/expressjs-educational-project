/**
 * Memory Session Store
 *
 * In-memory session storage for development and testing.
 * WARNING: Not suitable for production - sessions are lost on restart
 * and not shared across processes.
 */

'use strict';

/**
 * Session store that keeps sessions in memory
 *
 * @example
 * const store = new MemoryStore();
 *
 * // Set session
 * store.set('sess:abc123', { userId: 1 }, callback);
 *
 * // Get session
 * store.get('sess:abc123', (err, session) => {
 *   console.log(session); // { userId: 1 }
 * });
 */
class MemoryStore {
  constructor(options = {}) {
    this.sessions = new Map();

    // Check interval for expired sessions (default: 60 seconds)
    this.checkPeriod = options.checkPeriod || 60000;

    // Start cleanup interval
    if (this.checkPeriod > 0) {
      this._startCleanup();
    }
  }

  /**
   * Start periodic cleanup of expired sessions
   */
  _startCleanup() {
    this._cleanupInterval = setInterval(() => {
      this._cleanup();
    }, this.checkPeriod);

    // Allow process to exit even if interval is running
    if (this._cleanupInterval.unref) {
      this._cleanupInterval.unref();
    }
  }

  /**
   * Remove expired sessions
   */
  _cleanup() {
    const now = Date.now();

    for (const [sid, data] of this.sessions.entries()) {
      if (data.expires && data.expires < now) {
        this.sessions.delete(sid);
      }
    }
  }

  /**
   * Get a session by ID
   *
   * @param {string} sid - Session ID
   * @param {Function} callback - Callback(err, session)
   */
  get(sid, callback) {
    setImmediate(() => {
      const data = this.sessions.get(sid);

      if (!data) {
        return callback(null, null);
      }

      // Check if expired
      if (data.expires && data.expires < Date.now()) {
        this.sessions.delete(sid);
        return callback(null, null);
      }

      // Return a copy of the session data
      callback(null, { ...data.session });
    });
  }

  /**
   * Set a session
   *
   * @param {string} sid - Session ID
   * @param {Object} session - Session data
   * @param {Function} callback - Callback(err)
   */
  set(sid, session, callback) {
    setImmediate(() => {
      // Calculate expiration time
      let expires = null;
      if (session.cookie && session.cookie.maxAge) {
        expires = Date.now() + session.cookie.maxAge;
      } else if (session.cookie && session.cookie.expires) {
        expires = new Date(session.cookie.expires).getTime();
      }

      this.sessions.set(sid, {
        session: { ...session },
        expires
      });

      callback(null);
    });
  }

  /**
   * Update a session (touch to extend expiration)
   *
   * @param {string} sid - Session ID
   * @param {Object} session - Session data
   * @param {Function} callback - Callback(err)
   */
  touch(sid, session, callback) {
    setImmediate(() => {
      const data = this.sessions.get(sid);

      if (!data) {
        return callback(null);
      }

      // Update expiration
      if (session.cookie && session.cookie.maxAge) {
        data.expires = Date.now() + session.cookie.maxAge;
      }

      callback(null);
    });
  }

  /**
   * Destroy a session
   *
   * @param {string} sid - Session ID
   * @param {Function} callback - Callback(err)
   */
  destroy(sid, callback) {
    setImmediate(() => {
      this.sessions.delete(sid);
      callback(null);
    });
  }

  /**
   * Clear all sessions
   *
   * @param {Function} callback - Callback(err)
   */
  clear(callback) {
    setImmediate(() => {
      this.sessions.clear();
      callback(null);
    });
  }

  /**
   * Get count of sessions
   *
   * @param {Function} callback - Callback(err, count)
   */
  length(callback) {
    setImmediate(() => {
      callback(null, this.sessions.size);
    });
  }

  /**
   * Get all session IDs
   *
   * @param {Function} callback - Callback(err, ids)
   */
  ids(callback) {
    setImmediate(() => {
      callback(null, Array.from(this.sessions.keys()));
    });
  }

  /**
   * Get all sessions
   *
   * @param {Function} callback - Callback(err, sessions)
   */
  all(callback) {
    setImmediate(() => {
      const sessions = {};
      const now = Date.now();

      for (const [sid, data] of this.sessions.entries()) {
        // Skip expired sessions
        if (data.expires && data.expires < now) {
          continue;
        }
        sessions[sid] = { ...data.session };
      }

      callback(null, sessions);
    });
  }

  /**
   * Stop the cleanup interval
   */
  stopCleanup() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }
  }
}

module.exports = MemoryStore;
