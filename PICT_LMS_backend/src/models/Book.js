const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const VALID_CATEGORIES = [
  "Programming Languages",
  "Data Structures & Algorithms",
  "Operating Systems",
  "Artificial Intelligence & Machine Learning",
  "Databases",
  "Cybersecurity",
  "Software Engineering",
  "Digital Electronics",
  "Signal Processing",
  "Communication Systems",
  "VLSI Design",
  "Embedded Systems",
  "Circuit Theory",
  "Power Systems",
  "Control Systems",
  "Electrical Machines",
  "Renewable Energy",
  "Thermodynamics",
  "Fluid Mechanics",
  "Manufacturing Processes",
  "Robotics",
  "CAD/CAM",
  "Structural Engineering",
  "Transportation Engineering",
  "Surveying",
  "Construction Management",
  "Environmental Engineering",
  "Web Development",
  "Mobile App Development",
  "Cloud Computing",
  "Data Analytics",
  "Human-Computer Interaction",
  "Discrete Mathematics",
  "Engineering Mathematics",
  "Physics",
  "Chemistry",
  "Statistics",
  "Communication Skills",
  "Professional Ethics",
  "Economics for Engineers",
  "Psychology",
  "Soft Skills",
  "Reference Books",
  "Project Reports / Theses",
  "Journals & Magazines",
  "E-Books & Online Resources",
  "Competitive Exam Materials (GATE, GRE, etc.)",
  "Research Papers",
  "Previous Year Question Papers",
];

const Book = sequelize.define(
  "Book",
  {
    book_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal("'B' || nextval('book_id_seq')"),
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isbn: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    author: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    publication: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: {
          args: [VALID_CATEGORIES],
          msg: "Invalid category. Please provide a valid category from the predefined list.",
        },
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    tableName: "books",
    timestamps: false,
  }
);

// Add static method to get valid categories
Book.getValidCategories = () => VALID_CATEGORIES;

module.exports = Book;
