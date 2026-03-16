const jwt = require('jsonwebtoken');
const { validateToken } = require('../services/userService');

/**
 * Auth middleware that validates JWT.
 * First tries local JWT verification (faster), then falls back to User Service validation.
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Try local JWT verification first (shared secret)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Optionally validate against User Service for fresh user data
    try {
      const userData = await validateToken(token);
      if (userData.valid) {
        req.user = { ...decoded, ...userData.user };
      }
    } catch {
      // If User Service is down, rely on the JWT payload
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = { protect };
