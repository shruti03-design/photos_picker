// In-memory session storage
// In production, use a database like Redis, MongoDB, or PostgreSQL
const sessions = new Map();

console.log('📦 [Session Model] Module loaded');
console.log('💾 [Session Model] Using in-memory storage (Map)');

class Session {
  // Create a new session
  static createSession(sessionId, data) {
    console.log('\n💾 [Session] createSession: Creating new session');
    console.log('🔑 [Session] SessionId:', sessionId);
    console.log('📊 [Session] Initial data:', data);
    
    const sessionData = {
      sessionId,
      createdAt: Date.now(),
      authenticated: false,
      ...data,
    };
    
    sessions// In-memory session storage
// In production, use a database like Redis, MongoDB, or PostgreSQL
const sessions = new Map();

class Session {
  // Create a new session
  static createSession(sessionId, data) {
    sessions.set(sessionId, {
      sessionId,
      createdAt: Date.now(),
      authenticated: false,
      ...data,
    });
    return sessionId;
  }

  // Get session by ID
  static getSession(sessionId) {
    return sessions.get(sessionId);
  }

  // Update session data
  static updateSession(sessionId, data) {
    const session = sessions.get(sessionId);
    if (session) {
      sessions.set(sessionId, {
        ...session,
        ...data,
        updatedAt: Date.now(),
      });
    }
    return sessions.get(sessionId);
  }

  // Delete session
  static deleteSession(sessionId) {
    return sessions.delete(sessionId);
  }

  // Find session by state parameter
  static findByState(state) {
    for (const [sessionId, session] of sessions.entries()) {
      if (session.state === state) {
        return sessionId;
      }
    }
    return null;
  }

  // Get all sessions (for debugging)
  static getAllSessions() {
    return Array.from(sessions.entries());
  }

  // Clean up expired sessions (call periodically)
  static cleanupExpiredSessions() {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    
    for (const [sessionId, session] of sessions.entries()) {
      // Remove sessions older than 1 hour if not authenticated
      if (!session.authenticated && (now - session.createdAt) > ONE_HOUR) {
        sessions.delete(sessionId);
        console.log('🗑️  Cleaned up expired session:', sessionId);
      }
      
      // Remove sessions with expired tokens
      if (session.expiresAt && session.expiresAt < now) {
        sessions.delete(sessionId);
        console.log('🗑️  Cleaned up session with expired token:', sessionId);
      }
    }
  }
}

// Run cleanup every 10 minutes
setInterval(() => {
  Session.cleanupExpiredSessions();
}, 10 * 60 * 1000);

module.exports = Session;
  };
}