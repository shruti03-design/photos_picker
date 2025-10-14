const Session = require('../models/Session');

// Middleware to validate session
function validateSession(req, res, next) {
  const { sessionId } = req.query;

  if (!sessionId) {
    return res.status(401).json({ error: 'Session ID is required' });
  }

  const session = Session.getSession(sessionId);

  if (!session) {
    return res.status(401).json({ error: 'Invalid session ID' });
  }

  if (!session.authenticated) {
    return res.status(401).json({ error: 'Session not authenticated' });
  }

  if (!session.accessToken) {
    return res.status(401).json({ error: 'No access token found' });
  }

  // Check if token is expired
  if (session.expiresAt && session.expiresAt < Date.now()) {
    return res.status(401).json({ error: 'Access token expired' });
  }

  // Attach session to request
  req.session = session;
  
  next();
}

module.exports = validateSession;