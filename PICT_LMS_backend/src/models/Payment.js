const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const Payment = sequelize.define(
  "Payment",
  {
    payment_id: {
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
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("PENDING", "FAILED", "PAID"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    payment_method: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    transaction_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "payments",
    timestamps: false,
  }
);

// Define associations
Payment.belongsTo(User, { foreignKey: "user_id", as: "User" });

module.exports = Payment;
