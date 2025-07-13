const User = require("./User");
const Book = require("./Book");
const Payment = require("./Payment");
const IssueRecord = require("./IssueRecord");
const LostDamagedBook = require("./LostDamagedBook");
const setupAssociations = require("./associations");

// Apply associations
setupAssociations();

module.exports = {
  User,
  Book,
  Payment,
  IssueRecord,
  LostDamagedBook,
};
