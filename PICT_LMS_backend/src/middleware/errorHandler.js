const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Default error status and message
  let status = err.status || 500;
  let message = err.message || "Internal Server Error";

  // Handle Sequelize validation errors
  if (err.name === "SequelizeValidationError") {
    status = 400;
    message = err.errors.map((e) => e.message).join(", ");
  }

  // Handle Sequelize unique constraint errors
  if (err.name === "SequelizeUniqueConstraintError") {
    status = 409;
    message = err.errors.map((e) => e.message).join(", ");
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    status = 401;
    message = "Invalid token";
  }

  // Handle JWT expiration
  if (err.name === "TokenExpiredError") {
    status = 401;
    message = "Token expired";
  }

  // Send error response
  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = { errorHandler };
