const express = require("express");
const router = express.Router();
const { isAuthenticated, isKind } = require("../middleware/auth");
const { Book } = require("../models");
const { User } = require("../models");
const { IssueRecord } = require("../models");
const { LostDamagedBook } = require("../models");
const { Payment } = require("../models");
const { Op } = require("sequelize");

// Get dashboard statistics (admin only)
router.get("/stats", isAuthenticated, isKind("ADMIN"), async (req, res) => {
  try {
    // Get total books
    const totalBooks = await Book.sum('quantity');

    // Get total students
    const totalStudents = await User.count({
      where: {
        kind: 'STUDENT'
      }
    });

    // Get total admins
    const totalAdmins = await User.count({
      where: {
        kind: 'ADMIN'
      }
    });

    // Get currently issued books
    const booksIssued = await IssueRecord.count({
      where: {
        returned: false
      }
    });

    // Get overdue books
    const overdueBooks = await IssueRecord.count({
      where: {
        returned: false,
        due_date: {
          [Op.lt]: new Date()
        }
      }
    });

    // Get total lost/damaged books
    const lostDamagedBooks = await LostDamagedBook.sum('quantity');

    // Get pending payments
    const pendingPayments = await Payment.count({
      where: {
        status: 'PENDING'
      }
    });

    // Get total revenue
    const totalRevenue = await Payment.sum('amount', {
      where: {
        status: 'PAID'
      }
    });

    // Calculate available books (total books - issued books - lost/damaged books)
    const availableBooks = totalBooks - booksIssued - lostDamagedBooks;

    res.status(200).json({
      message: "Dashboard statistics retrieved successfully",
      stats: {
        totalBooks,
        totalStudents,
        totalAdmins,
        booksIssued,
        overdueBooks,
        lostDamagedBooks,
        pendingPayments,
        totalRevenue,
        availableBooks
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard statistics:", error);
    res.status(500).json({
      message: "Error fetching dashboard statistics",
      error: error.message
    });
  }
});

// Get recent issues (admin only)
router.get("/recent-issues", isAuthenticated, isKind("ADMIN"), async (req, res) => {
  try {
    const recentIssues = await IssueRecord.findAll({
      include: [
        {
          model: User,
          as: "User",
          attributes: ["user_id", "name", "email"]
        },
        {
          model: Book,
          as: "Book",
          attributes: ["book_id", "title", "author"]
        }
      ],
      order: [["issue_date", "DESC"]],
      limit: 5
    });

    const formattedIssues = recentIssues.map(issue => ({
      id: issue.issue_record_id,
      book: {
        title: issue.Book.title,
        author: issue.Book.author
      },
      user: {
        name: issue.User.name,
        email: issue.User.email
      },
      issueDate: issue.issue_date,
      dueDate: issue.due_date,
      status: issue.returned ? 'returned' : (new Date(issue.due_date) < new Date() ? 'overdue' : 'issued')
    }));

    res.status(200).json({
      message: "Recent issues retrieved successfully",
      issues: formattedIssues
    });
  } catch (error) {
    console.error("Error fetching recent issues:", error);
    res.status(500).json({
      message: "Error fetching recent issues",
      error: error.message
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
      suggestion: "Check the API documentation for valid endpoints"
    }
  });
});

module.exports = router; 