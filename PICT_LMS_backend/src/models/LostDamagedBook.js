const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const LostDamagedBook = sequelize.define(
  "LostDamagedBook",
  {
    lost_damaged_book_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal("'LD' || nextval('lost_damaged_book_id_seq')"),
    },
    book_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "lost_damaged_books",
    timestamps: false,
  }
);

module.exports = LostDamagedBook;