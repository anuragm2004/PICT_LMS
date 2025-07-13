const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");
const Book = require("./Book");
const Payment = require("./Payment");

const IssueRecord = sequelize.define(
  "IssueRecord",
  {
    issue_record_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: User,
        key: "user_id",
      },
    },
    book_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Book,
        key: "book_id",
      },
    },
    issue_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    return_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    returned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    payment_id: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: Payment,
        key: "payment_id",
      },
    },
  },
  {
    tableName: "issue_records",
    timestamps: false,
  }
);

// Define associations
IssueRecord.belongsTo(User, { foreignKey: "user_id", as: "User" });
IssueRecord.belongsTo(Book, { foreignKey: "book_id", as: "Book" });
IssueRecord.belongsTo(Payment, { foreignKey: "payment_id", as: "Payment" });

module.exports = IssueRecord;
