const express = require("express");
const router = express.Router();
const { isAuthenticated, isKind } = require("../middleware/auth");
const User = require("../models/User");
const IssueRecord = require("../models/IssueRecord");
const Payment = require("../models/Payment");
const { authMiddleware } = require("../middleware/auth");
const { Op } = require("sequelize");
const Book = require("../models/Book");

// Get all users (admin only)
router.get("/", isAuthenticated, isKind("ADMIN"), async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user profile data
router.get("/profile", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findOne({
      where: { user_id: req.user.user_id },
      attributes: ["user_id", "name", "email", "phone", "kind"],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const currentIssues = await IssueRecord.findAll({
      where: {
        user_id: req.user.user_id,
        return_date: null,
      },
      include: [
        {
          model: Book,
          as: "Book",
          attributes: ["book_id", "title", "author", "category"],
        },
      ],
      order: [["issue_date", "DESC"]],
    });

    const issueHistory = await IssueRecord.findAll({
      where: {
        user_id: req.user.user_id,
        return_date: {
          [Op.ne]: null,
        },
      },
      include: [
        {
          model: Book,
          as: "Book",
          attributes: ["book_id", "title", "author", "category"],
        },
      ],
      order: [["return_date", "DESC"]],
      limit: 10,
    });

    const pendingPayments = await Payment.findAll({
      where: {
        user_id: req.user.user_id,
        status: "PENDING",
      },
      order: [["payment_id", "ASC"]],
    });

    const paymentHistory = await Payment.findAll({
      where: {
        user_id: req.user.user_id,
        status: "PAID",
      },
      order: [["payment_id", "DESC"]],
      limit: 10,
    });

    return res.json({
      success: true,
      data: {
        user,
        currentIssues,
        issueHistory,
        pendingPayments,
        paymentHistory,
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching profile data",
      error: error.message,
    });
  }
});

// Get user by ID
router.get("/:user_id", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findOne({ where: { user_id: req.params.user_id } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create user (admin only)
router.post("/", isAuthenticated, isKind("ADMIN"), async (req, res) => {
  try {
    const { email, password, kind, name, phone } = req.body;
    
    // Generate user_id in the format U1, U2, etc.
    const latestUser = await User.findOne({
      order: [['user_id', 'DESC']]
    });
    
    let nextId = 1;
    if (latestUser) {
      const currentId = parseInt(latestUser.user_id.substring(1));
      nextId = currentId + 1;
    }
    
    const user = await User.create({
      user_id: `U${nextId}`,
      email,
      password,
      kind,
      name,
      phone,
    });
    
    res.status(201).json(user);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ 
      message: "Server error",
      details: err.message 
    });
  }
});

// Update user
router.put("/:user_id", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findOne({ where: { user_id: req.params.user_id } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Only admin can change user kind
    if (req.body.kind && req.user.kind !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "Only admin can change user kind" });
    }

    await user.update(req.body);
    res.json(user);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ 
      message: "Server error",
      details: err.message 
    });
  }
});

// Delete user (admin only)
router.delete("/:user_id", isAuthenticated, isKind("ADMIN"), async (req, res) => {
  try {
    // Validate user_id format
    const user_id = req.params.user_id;
    if (!user_id || !/^U\d+$/.test(user_id)) {
      return res.status(400).json({ 
        message: "Invalid user ID format",
        details: "User ID must be in the format 'U' followed by numbers (e.g., U1, U2)"
      });
    }

    // Find the user
    const user = await User.findOne({ where: { user_id } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has any active issue records
    const activeIssues = await IssueRecord.findOne({
      where: {
        user_id,
        returned: false
      }
    });

    if (activeIssues) {
      return res.status(400).json({
        message: "Cannot delete user",
        details: "User has active book issues. Please ensure all books are returned before deleting the user."
      });
    }

    // Check if user has any pending payments
    const pendingPayments = await Payment.findOne({
      where: {
        user_id,
        status: "PENDING"
      }
    });

    if (pendingPayments) {
      return res.status(400).json({
        message: "Cannot delete user",
        details: "User has pending payments. Please resolve all payments before deleting the user."
      });
    }

    // Delete all related records first
    await IssueRecord.destroy({ where: { user_id } });
    await Payment.destroy({ where: { user_id } });

    // Finally delete the user
    await user.destroy();

    res.json({ 
      message: "User deleted successfully",
      details: {
        user_id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ 
      message: "Server error", 
      details: err.message 
    });
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
