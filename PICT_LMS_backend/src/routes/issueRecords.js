const express = require("express");
const router = express.Router();
const { isAuthenticated, isKind } = require("../middleware/auth");
const { notificationQueue } = require("../config/queue");
const IssueRecord = require("../models/IssueRecord");
const Book = require("../models/Book");
const User = require("../models/User");
const Payment = require("../models/Payment");
const sequelize = require("../config/database");

// Get all issue records (admin only)
router.get("/", isAuthenticated, async (req, res) => {
  try {
    if (req.user.kind !== "ADMIN") {
      return res.status(403).json({
        message: "Access denied",
        details: {
          error: "Only admin users can access all issue records",
          required: "ADMIN",
          current: req.user.kind,
        },
      });
    }

    const issueRecords = await IssueRecord.findAll({
      include: [
        {
          model: User,
          as: "User",
          attributes: ["user_id", "name", "email", "phone", "kind"],
        },
        {
          model: Book,
          as: "Book",
          attributes: ["book_id", "title", "author", "category"],
        },
        {
          model: Payment,
          as: "Payment",
          attributes: ["payment_id", "amount", "status"],
        },
      ],
      order: [["issue_date", "DESC"]],
    });

    const formattedRecords = issueRecords.map((record) => ({
      ...record.toJSON(),
      issue_date: record.issue_date,
      due_date: record.due_date,
      return_date: record.return_date || null,
    }));

    res.status(200).json({
      message: "All issue records retrieved successfully",
      records: formattedRecords,
    });
  } catch (error) {
    console.error("Error fetching issue records:", error);
    res.status(500).json({
      message: "Error fetching issue records",
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

// Get issue record by ID
router.get("/:issue_record_id", isAuthenticated, async (req, res) => {
  try {
    const issueRecord = await IssueRecord.findByPk(req.params.issue_record_id, {
      include: [
        {
          model: User,
          as: "User",
          attributes: ["user_id", "name", "email", "phone", "kind"],
        },
        {
          model: Book,
          as: "Book",
          attributes: ["book_id", "title", "author", "category"],
        },
        {
          model: Payment,
          as: "Payment",
          attributes: ["payment_id", "amount", "status"],
        },
      ],
    });

    if (!issueRecord) {
      return res.status(404).json({
        message: "Issue record not found",
        details: {
          issue_record_id: req.params.issue_record_id,
        },
      });
    }

    const formattedRecord = {
      ...issueRecord.toJSON(),
      issue_date: issueRecord.issue_date,
      due_date: issueRecord.due_date,
      return_date: issueRecord.return_date || null,
    };

    res.status(200).json({
      message: "Issue record retrieved successfully",
      record: formattedRecord,
    });
  } catch (error) {
    console.error("Error fetching issue record:", error);
    res.status(500).json({
      message: "Error fetching issue record",
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

// Issue a book
router.post("/", isAuthenticated, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { user_id, book_id } = req.body;

    // Validate required fields
    if (!user_id || !book_id) {
      await t.rollback();
      return res.status(400).json({
        message: "Missing required fields",
        details: {
          required: ["user_id", "book_id"],
          received: req.body,
        },
      });
    }

    // Check if user exists
    const user = await User.findByPk(user_id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({
        message: "User not found",
        details: { user_id },
      });
    }

    // Check if user is an admin
    if (user.kind === "ADMIN") {
      await t.rollback();
      return res.status(403).json({
        message: "Access denied",
        details: {
          error: "Cannot issue books to admin users",
          user_id: user_id,
          user_kind: user.kind,
        },
      });
    }

    // Check for pending payments
    const pendingPayment = await Payment.findOne({
      where: {
        user_id: user_id,
        status: "PENDING",
      },
      attributes: ["payment_id", "amount", "status"],
      transaction: t,
    });

    if (pendingPayment) {
      await t.rollback();
      return res.status(403).json({
        message: "Cannot issue book due to pending payment",
        details: {
          user_id,
          pending_payment: {
            payment_id: pendingPayment.payment_id,
            amount: pendingPayment.amount,
            status: pendingPayment.status,
          },
        },
      });
    }

    // Check if book exists
    const book = await Book.findByPk(book_id, { transaction: t });
    if (!book) {
      await t.rollback();
      return res.status(404).json({
        message: "Book not found",
        details: { book_id },
      });
    }

    // Check if book is available (quantity > 0)
    if (book.quantity <= 0) {
      await t.rollback();
      return res.status(400).json({
        message: "Book is not available",
        details: {
          book_id,
          available_quantity: book.quantity,
        },
      });
    }

    // Check if book is already issued
    const existingIssue = await IssueRecord.findOne({
      where: {
        book_id,
        returned: false,
      },
      transaction: t,
    });

    if (existingIssue) {
      await t.rollback();
      return res.status(400).json({
        message: "Book is already issued",
        details: {
          book_id,
          current_holder: {
            user_id: existingIssue.user_id,
          },
          issue_date: existingIssue.issue_date,
          due_date: existingIssue.due_date,
        },
      });
    }

    // Update book quantity: decrement by 1
    await book.update({ quantity: book.quantity - 1 }, { transaction: t });
    console.log("Book quantity updated:", {
      book_id,
      new_quantity: book.quantity - 1,
    });

    // Create issue record
    const issueRecord = await IssueRecord.create(
      {
        user_id,
        book_id,
        issue_date: new Date(),
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        returned: false,
      },
      { transaction: t }
    );

    // Commit transaction
    await t.commit();

    // Add to notification queue (outside transaction)
    try {
      await notificationQueue.add({
        type: "book_issued",
        user_id,
        book_id,
        issue_record_id: issueRecord.issue_record_id,
      });
    } catch (queueError) {
      console.error("Error adding to notification queue:", queueError);
    }

    // Fetch the complete issue record with user and book details
    const completeIssueRecord = await IssueRecord.findByPk(
      issueRecord.issue_record_id,
      {
        include: [
          {
            model: User,
            as: "User",
            attributes: ["user_id", "name", "email", "phone", "kind"],
          },
          {
            model: Book,
            as: "Book",
            attributes: ["book_id", "title", "author", "category"],
          },
        ],
      }
    );

    // Format response
    const formattedIssueRecord = {
      ...completeIssueRecord.toJSON(),
      issue_date: completeIssueRecord.issue_date,
      due_date: completeIssueRecord.due_date,
      return_date: completeIssueRecord.return_date || null,
    };

    res.status(201).json({
      message: "Book issued successfully",
      issueRecord: formattedIssueRecord,
    });
  } catch (error) {
    // Rollback transaction if not already committed
    if (t && !t.finished) {
      await t.rollback();
    }
    console.error("Error issuing book:", error);
    res.status(500).json({
      message: "Error issuing book",
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

// Return a book
router.put("/return/:issue_record_id", isAuthenticated, async (req, res) => {
  try {
    const { return_date } = req.body;

    if (!return_date) {
      return res.status(400).json({
        message: "Missing required field",
        details: {
          required: ["return_date"],
          received: req.body,
          error: "Return date is required in the request body",
        },
      });
    }

    const parsedReturnDate = new Date(return_date);
    if (isNaN(parsedReturnDate.getTime())) {
      return res.status(400).json({
        message: "Invalid return date format",
        details: {
          error: "Return date must be a valid date in YYYY-MM-DD format",
          received: return_date,
          example: "2025-04-28",
        },
      });
    }

    const issueRecord = await IssueRecord.findByPk(req.params.issue_record_id, {
      include: [
        {
          model: User,
          as: "User",
          attributes: ["user_id", "name", "email", "phone", "kind"],
        },
        {
          model: Book,
          as: "Book",
          attributes: ["book_id", "title", "author", "category"],
        },
        {
          model: Payment,
          as: "Payment",
          attributes: ["payment_id", "amount", "status"],
        },
      ],
    });

    if (!issueRecord) {
      return res.status(404).json({
        message: "Issue record not found",
        details: {
          issue_record_id: req.params.issue_record_id,
          error: "No issue record exists with this ID",
          suggestion:
            "Check if the issue record ID is correct or create a new issue record first",
        },
      });
    }

    if (issueRecord.returned) {
      return res.status(400).json({
        message: "Book is already returned",
        details: {
          issue_record_id: issueRecord.issue_record_id,
          return_date: issueRecord.return_date,
          book: {
            title: issueRecord.Book.title,
            author: issueRecord.Book.author,
          },
        },
      });
    }

    const issueDate = new Date(issueRecord.issue_date);
    if (parsedReturnDate < issueDate) {
      return res.status(400).json({
        message: "Invalid return date",
        details: {
          error: "Return date cannot be before issue date",
          issue_date: issueRecord.issue_date,
          return_date: return_date,
        },
      });
    }

    // Check if return_date is after due_date
    const dueDate = new Date(issueRecord.due_date);
    let newPayment = null;
    if (parsedReturnDate > dueDate) {
      // Late return: Create a payment
      newPayment = await Payment.create({
        user_id: issueRecord.user_id,
        amount: 10.0,
        status: "PENDING",
      });

      // Update issue record with payment_id
      await issueRecord.update({
        payment_id: newPayment.payment_id,
      });
    }

    // Update issue record with return_date and returned status
    await issueRecord.update({
      return_date: parsedReturnDate,
      returned: true,
    });

    // Refresh issue record to include updated data
    const updatedIssueRecord = await IssueRecord.findByPk(
      issueRecord.issue_record_id,
      {
        include: [
          {
            model: User,
            as: "User",
            attributes: ["user_id", "name", "email", "phone", "kind"],
          },
          {
            model: Book,
            as: "Book",
            attributes: ["book_id", "title", "author", "category"],
          },
          {
            model: Payment,
            as: "Payment",
            attributes: ["payment_id", "amount", "status"],
          },
        ],
      }
    );

    const formattedIssueRecord = {
      ...updatedIssueRecord.toJSON(),
      issue_date: updatedIssueRecord.issue_date,
      due_date: updatedIssueRecord.due_date,
      return_date: updatedIssueRecord.return_date || null,
    };

    res.status(200).json({
      message: "Book returned successfully",
      issueRecord: formattedIssueRecord,
    });
  } catch (error) {
    console.error("Error returning book:", error);
    res.status(500).json({
      message: "Error returning book",
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

// Renew a book
router.put("/renew/:issue_record_id", isAuthenticated, async (req, res) => {
  try {
    const issueRecord = await IssueRecord.findByPk(req.params.issue_record_id, {
      include: [
        {
          model: User,
          as: "User",
          attributes: ["user_id", "name", "email", "phone", "kind"],
        },
        {
          model: Book,
          as: "Book",
          attributes: ["book_id", "title", "author", "category"],
        },
      ],
    });

    if (!issueRecord) {
      return res.status(404).json({
        message: "Issue record not found",
        details: {
          issue_record_id: req.params.issue_record_id,
          error: "No issue record exists with this ID",
        },
      });
    }

    if (issueRecord.returned) {
      return res.status(400).json({
        message: "Cannot renew returned book",
        details: {
          issue_record_id: issueRecord.issue_record_id,
          book: {
            title: issueRecord.Book.title,
            author: issueRecord.Book.author,
          },
        },
      });
    }

    // Check if user is authorized (own record or admin)
    if (req.user.kind !== "ADMIN" && issueRecord.user_id !== req.user.user_id) {
      return res.status(403).json({
        message: "Access denied",
        details: {
          error: "Can only renew own books",
          user_id: req.user.user_id,
          issue_user_id: issueRecord.user_id,
        },
      });
    }

    // Check for pending payments
    const pendingPayments = await Payment.findAll({
      where: {
        user_id: issueRecord.user_id,
        status: "PENDING",
      },
    });

    if (pendingPayments.length > 0) {
      return res.status(403).json({
        message: "Cannot renew book due to pending payments",
        details: {
          user_id: issueRecord.user_id,
          pending_payments: pendingPayments.map((p) => ({
            payment_id: p.payment_id,
            amount: p.amount,
            status: p.status,
          })),
        },
      });
    }

    const currentDate = new Date();
    const newDueDate = new Date(
      currentDate.getTime() + 15 * 24 * 60 * 60 * 1000
    );

    await issueRecord.update({
      due_date: newDueDate,
    });

    // Refresh issue record
    const updatedIssueRecord = await IssueRecord.findByPk(
      issueRecord.issue_record_id,
      {
        include: [
          {
            model: User,
            as: "User",
            attributes: ["user_id", "name", "email", "phone", "kind"],
          },
          {
            model: Book,
            as: "Book",
            attributes: ["book_id", "title", "author", "category"],
          },
          {
            model: Payment,
            as: "Payment",
            attributes: ["payment_id", "amount", "status"],
          },
        ],
      }
    );

    const formattedIssueRecord = {
      ...updatedIssueRecord.toJSON(),
      issue_date: updatedIssueRecord.issue_date,
      due_date: updatedIssueRecord.due_date,
      return_date: updatedIssueRecord.return_date || null,
    };

    res.status(200).json({
      message: "Book renewed successfully",
      issueRecord: formattedIssueRecord,
    });
  } catch (error) {
    console.error("Error renewing book:", error);
    res.status(500).json({
      message: "Error renewing book",
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

// Get user's issue records
router.get("/user/:user_id", isAuthenticated, async (req, res) => {
  try {
    // Check if user is authorized (own records or admin)
    if (req.user.kind !== "ADMIN" && req.params.user_id !== req.user.user_id) {
      return res.status(403).json({
        message: "Access denied",
        details: {
          error: "Can only view own issue records",
          user_id: req.user.user_id,
          requested_user_id: req.params.user_id,
        },
      });
    }

    const records = await IssueRecord.findAll({
      where: { user_id: req.params.user_id },
      include: [
        {
          model: Book,
          as: "Book",
          attributes: ["book_id", "title", "author", "category"],
        },
        {
          model: User,
          as: "User",
          attributes: ["user_id", "name", "email"],
        },
      ],
      order: [["issue_date", "DESC"]],
    });

    const formattedRecords = records.map((record) => ({
      ...record.toJSON(),
      issue_date: record.issue_date,
      due_date: record.due_date,
      return_date: record.return_date || null,
    }));

    res.json({
      message: "User issue records retrieved successfully",
      records: formattedRecords,
    });
  } catch (error) {
    console.error("Error fetching user issue records:", error);
    res.status(500).json({
      message: "Error fetching user issue records",
      error: error.message,
    });
  }
});

// Get book's issue history
router.get("/book/:bookId", isAuthenticated, async (req, res) => {
  try {
    const issueRecords = await IssueRecord.findAll({
      where: { book_id: req.params.bookId },
      include: [
        {
          model: User,
          as: "User",
          attributes: ["user_id", "name", "email"],
        },
        {
          model: Payment,
          as: "Payment",
          attributes: ["payment_id", "amount", "status"],
        },
      ],
    });

    const formattedRecords = issueRecords.map((record) => ({
      ...record.toJSON(),
      issue_date: record.issue_date,
      due_date: record.due_date,
      return_date: record.return_date || null,
    }));

    res.json(formattedRecords);
  } catch (err) {
    console.error(err);
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
