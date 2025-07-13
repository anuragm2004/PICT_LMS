const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/auth");

// Register route
router.post("/register", async (req, res) => {
  const { email, password, name, phone, kind } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Validate kind
    const validKind = kind === "ADMIN" ? "ADMIN" : "STUDENT";

    // Create new user
    const user = await User.create({
      email,
      password,
      name,
      phone,
      kind: validKind,
    });

    // Create JWT token
    const token = jwt.sign(
      { user_id: user.user_id, kind: user.kind },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    res.status(201).json({
      token,
      user: {
        user_id: user.user_id,
        kind: user.kind,
        email: user.email,
        name: user.name,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.checkPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create JWT token
    const token = jwt.sign(
      { user_id: user.user_id, kind: user.kind },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    // Set session
    req.session.user = {
      user_id: user.user_id,
      kind: user.kind,
      email: user.email,
      name: user.name,
      phone: user.phone,
    };

    res.json({
      token,
      user: {
        user_id: user.user_id,
        kind: user.kind,
        email: user.email,
        name: user.name,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Logout route (requires authentication)
router.post("/logout", authMiddleware, async (req, res) => {
  try {
    // Clear the session
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ message: "Error logging out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error logging out" });
  }
});

// Verify token route
router.get("/verify", authMiddleware, async (req, res) => {
  try {
    // Get user from database
    const user = await User.findOne({ 
      where: { user_id: req.user.user_id },
      attributes: ['user_id', 'name', 'email', 'kind', 'phone']
    });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({ 
      message: "Token verified successfully",
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        kind: user.kind,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error("Error verifying token:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Handle invalid routes
router.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    details: {
      method: req.method,
      path: req.path,
      suggestion: "Check the API documentation for valid endpoints",
    },
  });
});

module.exports = router;
