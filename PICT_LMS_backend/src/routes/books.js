const express = require("express");
const router = express.Router();
const { isAuthenticated, isKind } = require("../middleware/auth");
const { Book } = require("../models");
const { Op } = require("sequelize");
const sequelize = require("../config/database");

// Get all valid categories
router.get("/categories", isAuthenticated, (req, res) => {
  res.json({
    message: "List of valid book categories",
    categories: Book.getValidCategories(),
  });
});

// Get all books
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const books = await Book.findAll();
    const formattedBooks = books.map((book) => {
      const bookData = book.toJSON();
      const { createdAt, updatedAt, ...bookWithoutTimestamps } = bookData;
      return bookWithoutTimestamps;
    });
    res.json(formattedBooks);
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({
      message: "Error fetching books",
      error: error.message,
    });
  }
});

// Get book by ID
router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book) {
      return res.status(404).json({
        message: "Book not found",
        details: { book_id: req.params.id },
      });
    }
    const bookData = book.toJSON();
    const { createdAt, updatedAt, ...bookWithoutTimestamps } = bookData;
    res.json(bookWithoutTimestamps);
  } catch (error) {
    console.error("Error fetching book:", error);
    res.status(500).json({
      message: "Error fetching book",
      error: error.message,
    });
  }
});

// Create new book (ADMIN only)
router.post("/", isAuthenticated, isKind("ADMIN"), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { title, isbn, author, publication, category, quantity } = req.body;

    // Validate required fields
    if (!title || !isbn || !author || !publication || !category || quantity === undefined) {
      await t.rollback();
      return res.status(400).json({
        message: "Missing required fields",
        details: {
          required: ["title", "isbn", "author", "publication", "category", "quantity"],
          received: { title, isbn, author, publication, category, quantity },
        },
      });
    }

    // Validate quantity
    const parsedQuantity = Number(quantity);
    if (isNaN(parsedQuantity) || !Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
      await t.rollback();
      return res.status(400).json({
        message: "Invalid quantity",
        details: {
          error: "Quantity must be a non-negative integer",
          received: quantity,
        },
      });
    }

    // Check if ISBN already exists
    const existingBook = await Book.findOne({
      where: { isbn },
      transaction: t,
    });

    if (existingBook) {
      await t.rollback();
      return res.status(400).json({
        message: "ISBN already exists",
        details: { isbn },
      });
    }

    // Create new book
    const book = await Book.create(
      {
        title,
        isbn,
        author,
        publication,
        category,
        quantity: parsedQuantity,
      },
      { transaction: t }
    );

    await t.commit();
    const bookData = book.toJSON();
    const { createdAt, updatedAt, ...bookWithoutTimestamps } = bookData;
    res.status(201).json({
      message: "Book created successfully",
      book: bookWithoutTimestamps,
    });
  } catch (error) {
    await t.rollback();
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        message: "Validation error",
        details: error.errors.map((err) => ({
          field: err.path,
          message: err.message,
        })),
      });
    }
    console.error("Error creating book:", error);
    res.status(500).json({
      message: "Error creating book",
      error: error.message,
    });
  }
});

// Update book (ADMIN only)
router.put("/:id", isAuthenticated, isKind("ADMIN"), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { title, isbn, author, publication, category, quantity } = req.body;

    // Find the book
    const book = await Book.findByPk(id, { transaction: t });
    if (!book) {
      await t.rollback();
      return res.status(404).json({
        message: "Book not found",
        details: { book_id: id },
      });
    }

    // Check if ISBN is being changed and if it already exists
    if (isbn && isbn !== book.isbn) {
      const existingBook = await Book.findOne({
        where: { isbn },
        transaction: t,
      });

      if (existingBook) {
        await t.rollback();
        return res.status(400).json({
          message: "ISBN already exists",
          details: { isbn },
        });
      }
    }

    // Validate quantity if provided
    if (quantity !== undefined) {
      const parsedQuantity = Number(quantity);
      if (isNaN(parsedQuantity) || !Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
        await t.rollback();
        return res.status(400).json({
          message: "Invalid quantity",
          details: {
            error: "Quantity must be a non-negative integer",
            received: quantity,
          },
        });
      }
    }

    // Update book
    await book.update(
      {
        title: title || book.title,
        isbn: isbn || book.isbn,
        author: author || book.author,
        publication: publication || book.publication,
        category: category || book.category,
        quantity: quantity !== undefined ? Number(quantity) : book.quantity,
      },
      { transaction: t }
    );

    await t.commit();
    const bookData = book.toJSON();
    const { createdAt, updatedAt, ...bookWithoutTimestamps } = bookData;
    res.json({
      message: "Book updated successfully",
      book: bookWithoutTimestamps,
    });
  } catch (error) {
    await t.rollback();
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        message: "Validation error",
        details: error.errors.map((err) => ({
          field: err.path,
          message: err.message,
        })),
      });
    }
    console.error("Error updating book:", error);
    res.status(500).json({
      message: "Error updating book",
      error: error.message,
    });
  }
});

// Delete book (ADMIN only)
router.delete("/:id", isAuthenticated, isKind("ADMIN"), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    // Find the book
    const book = await Book.findByPk(id, { transaction: t });
    if (!book) {
      await t.rollback();
      return res.status(404).json({
        message: "Book not found",
        details: { book_id: id },
      });
    }

    // Delete the book
    await book.destroy({ transaction: t });

    await t.commit();
    res.json({
      message: "Book deleted successfully",
    });
  } catch (error) {
    await t.rollback();
    console.error("Error deleting book:", error);
    res.status(500).json({
      message: "Error deleting book",
      error: error.message,
    });
  }
});

// Search books
router.get("/search/:query", isAuthenticated, async (req, res) => {
  try {
    const { query } = req.params;
    const books = await Book.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.iLike]: `%${query}%` } },
          { isbn: { [Op.iLike]: `%${query}%` } },
          { author: { [Op.iLike]: `%${query}%` } },
          { publication: { [Op.iLike]: `%${query}%` } },
          { category: { [Op.iLike]: `%${query}%` } },
        ],
      },
    });
    const formattedBooks = books.map((book) => {
      const bookData = book.toJSON();
      const { createdAt, updatedAt, ...bookWithoutTimestamps } = bookData;
      return bookWithoutTimestamps;
    });
    res.json(formattedBooks);
  } catch (error) {
    console.error("Error searching books:", error);
    res.status(500).json({
      message: "Error searching books",
      error: error.message,
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
