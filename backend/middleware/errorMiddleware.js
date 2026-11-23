// 404 Not Found Middleware
export const notFound = (req, res, next) => {
  const error = new Error(`Resource Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Global Error Handler Middleware
export const errorHandler = (err, req, res, next) => {
  // If status code is still 200 OK, default to 500 Internal Server Error
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    status: "error",
    message: err.message || "An unexpected internal server error occurred",
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};
