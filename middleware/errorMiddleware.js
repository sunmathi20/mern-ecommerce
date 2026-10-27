/**
 * Error handling middleware for AURELIA backend.
 * 
 * - notFound: catches 404s for undefined routes
 * - errorHandler: global error handler — never exposes stack traces to clients
 */

// 404 handler — catches requests to undefined routes
const notFound = (req, res, next) => {
  const error = new Error(`Not Found — ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Global error handler
const errorHandler = (err, req, res, _next) => {
  // Default to 500 if status code is still 200 (unhandled throw)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // Only include stack trace in development — never in production
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export { notFound, errorHandler };
