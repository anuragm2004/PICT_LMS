const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  // Skip auth for public routes
  if (req.path.startsWith("/api/auth") || req.path === "/api/health") {
    return next();
  }

  // Get token from header
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    // Set user in request
    req.user = {
      user_id: decoded.user_id,
      kind: decoded.kind,
      email: decoded.email,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Token is not valid" });
  }
};

const isAuthenticated = (req, res, next) => {
  if (req.user) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
};

const isKind = (kind) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (Array.isArray(kind)) {
    if (!kind.includes(req.user.kind)) {
      return res.status(403).json({
        message: `Not authorized. Requires one of: ${kind.join(
          ", "
        )} privileges`,
      });
    }
  } else {
    if (req.user.kind !== kind) {
      return res
        .status(403)
        .json({ message: `Not authorized. Requires ${kind} privileges` });
    }
  }
  next();
};

module.exports = {
  authMiddleware,
  isAuthenticated,
  isKind,
};
