const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");
const RedisStore = require("connect-redis").default;
const redisClient = require("./config/redis");
const sequelize = require("./config/database");
const {
  notificationQueue,
  paymentQueue,
  emailQueue,
} = require("./config/queue");
const { authMiddleware } = require("./middleware/auth");
const { errorHandler } = require("./middleware/errorHandler");

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Session configuration
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const bookRoutes = require("./routes/books");
const issueRecordRoutes = require("./routes/issueRecords");
const paymentRoutes = require("./routes/payments");
const lostDamagedBookRoutes = require("./routes/lostDamagedBooks");
const dashboardRoutes = require("./routes/dashboard");

// Load models and associations
require("./models/associations");

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/books", authMiddleware, bookRoutes);
app.use("/api/issue-records", authMiddleware, issueRecordRoutes);
app.use("/api/payments", authMiddleware, paymentRoutes);
app.use("/api/lost-damaged-books", authMiddleware, lostDamagedBookRoutes);
app.use("/api/dashboard", authMiddleware, dashboardRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

sequelize
  .sync()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });