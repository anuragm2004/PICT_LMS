const express = require("express");
const router = express.Router();
const { Payment, User } = require("../models");
const { isAuthenticated } = require("../middleware/auth");
const { paymentQueue } = require("../config/queue");

// Get all payments (admin only)
router.get("/", isAuthenticated, async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        message: "Authentication required",
        details: { error: "No user data in token" },
      });
    }

    if (req.user.kind !== "ADMIN") {
      return res.status(403).json({
        message: "Access denied",
        details: {
          error: "Only admin users can access all payments",
          required: "ADMIN",
          current: req.user.kind || "UNKNOWN",
        },
      });
    }

    const payments = await Payment.findAll({
      include: [
        {
          model: User,
          as: "User",
          attributes: ["user_id", "name", "email"],
        },
      ],
    });

    res.status(200).json({
      message: payments.length
        ? "All payments retrieved successfully"
        : "No payments found",
      payments,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      message: "Error fetching payments",
      error: error.message,
      details: error.errors
        ? error.errors.map((err) => ({
            field: err.path,
            message: err.message,
            value: err.value,
          }))
        : undefined,
    });
  }
});

// Get payments for a specific user (admin or own user)
router.get("/user/:user_id", isAuthenticated, async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        message: "Authentication required",
        details: { error: "No user data in token" },
      });
    }

    if (req.user.kind !== "ADMIN" && req.params.user_id !== req.user.user_id) {
      return res.status(403).json({
        message: "Non-admin users can only view their own payments",
        details: {
          requested_user_id: req.params.user_id,
          current_user_id: req.user.user_id,
        },
      });
    }

    if (!req.params.user_id.match(/^U\d+$/)) {
      return res.status(400).json({
        message: "Invalid user_id format",
        details: {
          user_id: req.params.user_id,
          expected: "Format like U1, U2, etc.",
        },
      });
    }

    const user = await User.findByPk(req.params.user_id);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        details: { user_id: req.params.user_id },
      });
    }

    const payments = await Payment.findAll({
      where: { user_id: req.params.user_id },
      include: [
        {
          model: User,
          as: "User",
          attributes: ["user_id", "name", "email"],
        },
      ],
    });

    res.status(200).json({
      message: payments.length
        ? `Payments for user ${req.params.user_id} retrieved successfully`
        : `No payments found for user ${req.params.user_id}`,
      payments,
    });
  } catch (error) {
    console.error("Error fetching user payments:", error);
    res.status(500).json({
      message: "Error fetching user payments",
      error: error.message,
      details: error.errors
        ? error.errors.map((err) => ({
            field: err.path,
            message: err.message,
            value: err.value,
          }))
        : undefined,
    });
  }
});

// Create new payment (commented out, retained as-is)
router.post("/", isAuthenticated, async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        message: "Authentication required",
        details: { error: "No user data in token" },
      });
    }

    const { amount, description } = req.body;

    if (!amount || !description) {
      return res.status(400).json({
        message: "Missing required fields",
        details: {
          required: ["amount", "description"],
          received: req.body,
        },
      });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        message: "Invalid amount",
        details: {
          amount,
          expected: "Positive number",
        },
      });
    }

    if (typeof description !== "string" || description.trim().length === 0) {
      return res.status(400).json({
        message: "Invalid description",
        details: {
          description,
          expected: "Non-empty string",
        },
      });
    }

    const payment = await Payment.create({
      user_id: req.user.user_id,
      amount,
      description,
      status: "PENDING",
    });

    try {
      await paymentQueue.add({
        payment_id: payment.payment_id,
        user_id: req.user.user_id,
        amount,
        description,
      });
    } catch (queueError) {
      console.error("Error adding to payment queue:", queueError);
    }

    res.status(201).json({
      message: "Payment created successfully",
      payment,
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).json({
      message: "Error creating payment",
      error: error.message,
      details: error.errors
        ? error.errors.map((err) => ({
            field: err.path,
            message: err.message,
            value: err.value,
          }))
        : undefined,
    });
  }
});

// Update payment status and details
router.post("/update/:id", isAuthenticated, async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        message: "Authentication required",
        details: { error: "No user data in token" },
      });
    }

    if (!req.params.id.match(/^P\d+$/)) {
      return res.status(400).json({
        message: "Invalid payment_id format",
        details: {
          payment_id: req.params.id,
          expected: "Format like P1, P2, etc.",
        },
      });
    }

    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
        details: { payment_id: req.params.id },
      });
    }

    if (req.user.kind !== "ADMIN" && payment.user_id !== req.user.user_id) {
      return res.status(403).json({
        message: "Only admins or payment owners can update payment",
        details: {
          payment_user_id: payment.user_id,
          current_user_id: req.user.user_id,
        },
      });
    }

    const { status, payment_method, transaction_id } = req.body;

    // Validate status against Payment model's ENUM values
    if (status && !["PENDING", "FAILED", "PAID"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
        details: {
          received: status,
          allowed: ["PENDING", "FAILED", "PAID"],
        },
      });
    }

    if (payment_method && typeof payment_method !== "string") {
      return res.status(400).json({
        message: "Invalid payment_method",
        details: {
          payment_method,
          expected: "String or null",
        },
      });
    }

    if (transaction_id && typeof transaction_id !== "string") {
      return res.status(400).json({
        message: "Invalid transaction_id",
        details: {
          transaction_id,
          expected: "String or null",
        },
      });
    }

    const updates = {
      status: status || payment.status,
      payment_method:
        payment_method !== undefined ? payment_method : payment.payment_method,
      transaction_id:
        transaction_id !== undefined ? transaction_id : payment.transaction_id,
    };

    await payment.update(updates);

    if (status && status !== payment.status) {
      try {
        await paymentQueue.add({
          payment_id: payment.payment_id,
          user_id: payment.user_id,
          status,
        });
      } catch (queueError) {
        console.error("Error adding to payment queue:", queueError);
      }
    }

    res.status(200).json({
      message: "Payment updated successfully",
      payment,
    });
  } catch (error) {
    console.error("Error updating payment:", error);
    res.status(500).json({
      message: "Error updating payment",
      error: error.message,
      details: error.errors
        ? error.errors.map((err) => ({
            field: err.path,
            message: err.message,
            value: err.value,
          }))
        : undefined,
    });
  }
});

// Update payment status (admin only)
router.put("/status/:id", isAuthenticated, async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        message: "Authentication required",
        details: { error: "No user data in token" },
      });
    }

    if (req.user.kind !== "ADMIN") {
      return res.status(403).json({
        message: "Access denied",
        details: {
          error: "Only admin users can update payment status",
          required: "ADMIN",
          current: req.user.kind || "UNKNOWN",
        },
      });
    }

    if (!req.params.id.match(/^P\d+$/)) {
      return res.status(400).json({
        message: "Invalid payment_id format",
        details: {
          payment_id: req.params.id,
          expected: "Format like P1, P2, etc.",
        },
      });
    }

    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        message: "Missing required field",
        details: { required: ["status"], received: req.body },
      });
    }

    // Validate status against Payment model's ENUM values
    if (!["PENDING", "FAILED", "PAID"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
        details: {
          received: status,
          allowed: ["PENDING", "FAILED", "PAID"],
        },
      });
    }

    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
        details: { payment_id: req.params.id },
      });
    }

    await payment.update({ status });

    res.status(200).json({
      message: "Payment status updated successfully",
      payment,
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({
      message: "Error updating payment status",
      error: error.message,
      details: error.errors
        ? error.errors.map((err) => ({
            field: err.path,
            message: err.message,
            value: err.value,
          }))
        : undefined,
    });
  }
});

// Delete payment (admin only)
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        message: "Authentication required",
        details: { error: "No user data in token" },
      });
    }

    if (req.user.kind !== "ADMIN") {
      return res.status(403).json({
        message: "Access denied",
        details: {
          error: "Only admin users can delete payments",
          required: "ADMIN",
          current: req.user.kind || "UNKNOWN",
        },
      });
    }

    if (!req.params.id.match(/^P\d+$/)) {
      return res.status(400).json({
        message: "Invalid payment_id format",
        details: {
          payment_id: req.params.id,
          expected: "Format like P1, P2, etc.",
        },
      });
    }

    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
        details: { payment_id: req.params.id },
      });
    }

    await payment.destroy();

    res.status(200).json({
      message: "Payment deleted successfully",
      details: {
        payment_id: req.params.id,
      },
    });
  } catch (error) {
    console.error("Error deleting payment:", error);
    res.status(500).json({
      message: "Error deleting payment",
      error: error.message,
      details: error.errors
        ? error.errors.map((err) => ({
            field: err.path,
            message: err.message,
            value: err.value,
          }))
        : undefined,
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
