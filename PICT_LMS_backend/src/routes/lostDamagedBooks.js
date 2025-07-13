const express = require("express");
const router = express.Router();
const { isAuthenticated, isKind } = require("../middleware/auth");
const { LostDamagedBook, Book } = require("../models");
const sequelize = require("../config/database");

// Get all lost or damaged books (ADMIN only)
router.get("/", isAuthenticated, isKind("ADMIN"), async (req, res) => {
  try {
    const lostDamagedBooks = await LostDamagedBook.findAll({
      include: [
        {
          model: Book,
          as: "Book",
          attributes: ["book_id", "title", "author", "category", "isbn", "publication"],
        },
      ],
    });

    const formattedRecords = lostDamagedBooks.map((record) => ({
      lost_damaged_book_id: record.lost_damaged_book_id,
      book_id: record.book_id,
      quantity: record.quantity,
      book: record.Book
        ? {
            book_id: record.Book.book_id,
            title: record.Book.title,
            author: record.Book.author,
            category: record.Book.category,
            isbn: record.Book.isbn,
            publication: record.Book.publication,
          }
        : null,
    }));

    res.status(200).json({
      message: "Lost or damaged books retrieved successfully",
      records: formattedRecords,
    });
  } catch (error) {
    console.error("Error fetching lost or damaged books:", error);
    res.status(500).json({
      message: "Error fetching lost or damaged books",
      error: error.message,
    });
  }
});

// Get a single lost or damaged book record by ID (ADMIN only)
router.get("/:lost_damaged_book_id", isAuthenticated, isKind("ADMIN"), async (req, res) => {
  try {
    const { lost_damaged_book_id } = req.params;

    const record = await LostDamagedBook.findByPk(lost_damaged_book_id, {
      include: [
        {
          model: Book,
          as: "Book",
          attributes: ["book_id", "title", "author", "category", "isbn", "publication"],
        },
      ],
    });

    if (!record) {
      return res.status(404).json({
        message: "Lost or damaged book record not found",
        details: { lost_damaged_book_id },
      });
    }

    const formattedRecord = {
      lost_damaged_book_id: record.lost_damaged_book_id,
      book_id: record.book_id,
      quantity: record.quantity,
      book: record.Book
        ? {
            book_id: record.Book.book_id,
            title: record.Book.title,
            author: record.Book.author,
            category: record.Book.category,
            isbn: record.Book.isbn,
            publication: record.Book.publication,
          }
        : null,
    };

    res.status(200).json({
      message: "Lost or damaged book record retrieved successfully",
      record: formattedRecord,
    });
  } catch (error) {
    console.error("Error fetching lost or damaged book record:", error);
    res.status(500).json({
      message: "Error fetching lost or damaged book record",
      error: error.message,
    });
  }
});

// Add or update a lost or damaged book (ADMIN only)
router.post("/", isAuthenticated, isKind("ADMIN"), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { book_id, quantity: rawQuantity } = req.body;

    // Convert quantity to number
    const quantity = Number(rawQuantity);

    // Log input for debugging
    console.log("POST /lost-damaged-books - Input:", {
      book_id,
      rawQuantity,
      quantity,
      typeOfQuantity: typeof quantity,
    });

    // Validate required fields
    if (!book_id || rawQuantity === undefined) {
      await t.rollback();
      console.log("Validation failed: Missing required fields");
      return res.status(400).json({
        message: "Missing required fields",
        details: {
          required: ["book_id", "quantity"],
          received: { book_id, quantity: rawQuantity },
        },
      });
    }

    // Validate book_id format (must be string starting with 'B' followed by digits, e.g., 'B1', 'B21')
    if (typeof book_id !== "string" || !/^B\d+$/.test(book_id)) {
      await t.rollback();
      console.log("Validation failed: Invalid book_id format");
      return res.status(400).json({
        message: "Invalid book_id",
        details: {
          error:
            "book_id must be a string starting with 'B' followed by digits (e.g., 'B1', 'B21')",
          received: book_id,
        },
      });
    }

    // Extract numeric part for additional validation (ensure it's a positive integer)
    const numericPart = parseInt(book_id.slice(1), 10);
    if (isNaN(numericPart) || numericPart <= 0) {
      await t.rollback();
      console.log("Validation failed: Invalid numeric part in book_id");
      return res.status(400).json({
        message: "Invalid book_id",
        details: {
          error: "The numeric part of book_id must be a positive integer",
          received: book_id,
        },
      });
    }

    // Validate quantity is a non-negative integer
    if (isNaN(quantity) || !Number.isInteger(quantity) || quantity < 0) {
      await t.rollback();
      console.log("Validation failed: Invalid quantity");
      return res.status(400).json({
        message: "Invalid quantity",
        details: {
          error: "Quantity must be a non-negative integer",
          received: rawQuantity,
        },
      });
    }

    // Check if book exists
    console.log("Checking book existence for book_id:", book_id);
    const book = await Book.findByPk(book_id, { transaction: t });
    if (!book) {
      await t.rollback();
      console.log("Book not found:", book_id);
      return res.status(404).json({
        message: "Book not found",
        details: { book_id },
      });
    }
    console.log("Book found:", book.toJSON());

    // Validate requested quantity against available book quantity
    if (quantity > book.quantity) {
      await t.rollback();
      console.log("Validation failed: Requested quantity exceeds available", {
        available: book.quantity,
        requested: quantity,
      });
      return res.status(400).json({
        message: "Requested quantity exceeds available book quantity",
        details: {
          available_quantity: book.quantity,
          requested_quantity: quantity,
        },
      });
    }

    // Check if book is already in lost_damaged_books
    console.log(
      "Checking for existing lost/damaged record for book_id:",
      book_id
    );
    const existingRecord = await LostDamagedBook.findOne({
      where: { book_id },
      transaction: t,
    });

    if (existingRecord) {
      // Update existing record
      console.log("Existing record found:", existingRecord.toJSON());

      // Update Book table quantity: available = available - quantity (directly using request body quantity)
      console.log("Updating book quantity:", {
        book_id,
        current_quantity: book.quantity,
        requested_quantity: quantity,
        new_quantity: book.quantity - quantity,
      });
      await book.update(
        { quantity: book.quantity - quantity },
        { transaction: t }
      );
      console.log("Book quantity updated:", book.toJSON());

      // Update lost_damaged_books record with new quantity
      console.log("Updating lost/damaged book record:", { book_id, quantity });
      await existingRecord.update({ quantity }, { transaction: t });
      console.log("Record updated:", existingRecord.toJSON());

      await t.commit();
      const formattedRecord = {
        lost_damaged_book_id: existingRecord.lost_damaged_book_id,
        book_id: existingRecord.book_id,
        quantity: existingRecord.quantity,
        book: {
          book_id: book.book_id,
          title: book.title,
          author: book.author,
          category: book.category,
          publication: book.publication,
        },
      };

      res.status(200).json({
        message: "Lost or damaged book quantity updated successfully",
        record: formattedRecord,
      });
    } else {
      // Create new record
      console.log("No existing record found");

      // Update Book table quantity: available = available - quantity
      console.log("Updating book quantity:", {
        book_id,
        current_quantity: book.quantity,
        requested_quantity: quantity,
        new_quantity: book.quantity - quantity,
      });
      await book.update(
        { quantity: book.quantity - quantity },
        { transaction: t }
      );
      console.log("Book quantity updated:", book.toJSON());

      // Create new lost or damaged book record
      console.log("Creating new lost/damaged book record:", {
        book_id,
        quantity,
      });
      const lostDamagedBook = await LostDamagedBook.create(
        {
          book_id,
          quantity,
        },
        { transaction: t }
      );
      console.log("Record created:", lostDamagedBook.toJSON());

      await t.commit();
      const formattedRecord = {
        lost_damaged_book_id: lostDamagedBook.lost_damaged_book_id,
        book_id: lostDamagedBook.book_id,
        quantity: lostDamagedBook.quantity,
        book: {
          book_id: book.book_id,
          title: book.title,
          author: book.author,
          category: book.category,
          publication: book.publication,
        },
      };

      res.status(201).json({
        message: "Lost or damaged book added successfully",
        record: formattedRecord,
      });
    }
  } catch (error) {
    await t.rollback();
    console.error("Error adding or updating lost or damaged book:", error);
    res.status(500).json({
      message: "Error adding or updating lost or damaged book",
      error: error.message,
    });
  }
});

// Update a lost or damaged book record (ADMIN only)
router.put("/:lost_damaged_book_id", isAuthenticated, isKind("ADMIN"), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { lost_damaged_book_id } = req.params;
    const { quantity: rawQuantity } = req.body;

    // Convert quantity to number
    const quantity = Number(rawQuantity);

    // Log input for debugging
    console.log("PUT /lost-damaged-books/:id - Input:", {
      lost_damaged_book_id,
      rawQuantity,
      quantity,
      typeOfQuantity: typeof quantity,
    });

    // Validate quantity is a non-negative integer
    if (isNaN(quantity) || !Number.isInteger(quantity) || quantity < 0) {
      await t.rollback();
      console.log("Validation failed: Invalid quantity");
      return res.status(400).json({
        message: "Invalid quantity",
        details: {
          error: "Quantity must be a non-negative integer",
          received: rawQuantity,
        },
      });
    }

    // Find the record
    const record = await LostDamagedBook.findByPk(lost_damaged_book_id, {
      include: [
        {
          model: Book,
          as: "Book",
          attributes: ["book_id", "title", "author", "category", "quantity", "publication"],
        },
      ],
      transaction: t,
    });

    if (!record) {
      await t.rollback();
      console.log("Record not found:", lost_damaged_book_id);
      return res.status(404).json({
        message: "Lost or damaged book record not found",
        details: { lost_damaged_book_id },
      });
    }

    // If quantity is 0, delete the record
    if (quantity === 0) {
      // Update Book table quantity: available = available + current_quantity
      await record.Book.update(
        { quantity: record.Book.quantity + record.quantity },
        { transaction: t }
      );

      // Delete the record
      await record.destroy({ transaction: t });

      await t.commit();
      return res.status(200).json({
        message: "Lost or damaged book record deleted successfully",
      });
    }

    // Calculate the difference in quantity
    const quantityDiff = quantity - record.quantity;

    // Update Book table quantity: available = available - quantityDiff
    await record.Book.update(
      { quantity: record.Book.quantity - quantityDiff },
      { transaction: t }
    );

    // Update the record
    await record.update({ quantity }, { transaction: t });

    await t.commit();
    const formattedRecord = {
      lost_damaged_book_id: record.lost_damaged_book_id,
      book_id: record.book_id,
      quantity: record.quantity,
      book: {
        book_id: record.Book.book_id,
        title: record.Book.title,
        author: record.Book.author,
        category: record.Book.category,
        publication: record.Book.publication,
      },
    };

    res.status(200).json({
      message: "Lost or damaged book record updated successfully",
      record: formattedRecord,
    });
  } catch (error) {
    await t.rollback();
    console.error("Error updating lost or damaged book record:", error);
    res.status(500).json({
      message: "Error updating lost or damaged book record",
      error: error.message,
    });
  }
});

// Delete a lost or damaged book record (ADMIN only)
router.delete(
  "/:lost_damaged_book_id",
  isAuthenticated,
  isKind("ADMIN"),
  async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { lost_damaged_book_id } = req.params;

      // Log input
      console.log("DELETE /lost-damaged-books - Input:", {
        lost_damaged_book_id,
      });

      // Find the record
      console.log(
        "Finding record for lost_damaged_book_id:",
        lost_damaged_book_id
      );
      const lostDamagedBook = await LostDamagedBook.findByPk(
        lost_damaged_book_id,
        { transaction: t }
      );
      if (!lostDamagedBook) {
        await t.rollback();
        console.log("Record not found");
        return res.status(404).json({
          message: "Lost or damaged book record not found",
          details: { lost_damaged_book_id },
        });
      }
      console.log("Record found:", lostDamagedBook.toJSON());

      // Delete the record
      console.log("Deleting record");
      await lostDamagedBook.destroy({ transaction: t });
      console.log("Record deleted");

      await t.commit();
      res.status(200).json({
        message: "Lost or damaged book record deleted successfully",
      });
    } catch (error) {
      await t.rollback();
      console.error("Error deleting lost or damaged book:", error);
      res.status(500).json({
        message: "Error deleting lost or damaged book",
        error: error.message,
      });
    }
  }
);

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
