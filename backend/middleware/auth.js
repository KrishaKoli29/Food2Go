const jwt = require("jsonwebtoken");

/**
 * requireAuth – verifies the JWT from "Authorization: Bearer <token>".
 * On success attaches req.user = { userId, role } and calls next().
 * On failure responds 401 / 403 and stops the chain.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token. Please log in again." });
  }
}

/**
 * requireRole(...roles) – factory that returns a middleware which ensures
 * req.user.role is in the allowed list. Must be placed AFTER requireAuth.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: "Access denied." });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
