const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const bcrypt = require("bcryptjs");

const User = sequelize.define(
  "User",
  {
    user_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    kind: {
      type: DataTypes.ENUM("STUDENT", "ADMIN"),
      allowNull: false,
      defaultValue: "STUDENT",
    },
  },
  {
    tableName: "users",
    timestamps: false,
  }
);

// Generate user_id before creating
User.beforeCreate(async (user) => {
  if (!user.user_id) {
    // Find the latest user to determine the next ID
    const latestUser = await User.findOne({
      order: [['user_id', 'DESC']]
    });
    
    let nextId = 1;
    if (latestUser) {
      const currentId = parseInt(latestUser.user_id.substring(1));
      nextId = currentId + 1;
    }
    
    user.user_id = `U${nextId}`;
  }
  
  // Hash password
  if (user.password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

// Method to check password
User.prototype.checkPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = User;
