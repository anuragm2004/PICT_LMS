const Book = require("./Book");
const User = require("./User");
const Payment = require("./Payment");
const IssueRecord = require("./IssueRecord");
const LostDamagedBook = require("./LostDamagedBook");

const setupAssociations = () => {
  // Define associations
  User.hasMany(Payment, { foreignKey: "user_id" });
  User.hasMany(IssueRecord, { foreignKey: "user_id" });

  Book.hasMany(IssueRecord, { foreignKey: "book_id" });

  Payment.hasMany(IssueRecord, { foreignKey: "payment_id" });

  Book.hasOne(LostDamagedBook, {
    foreignKey: "book_id",
    as: "LostDamagedBook",
  });

  LostDamagedBook.belongsTo(Book, { foreignKey: "book_id", as: "Book" });
};

module.exports = setupAssociations;
