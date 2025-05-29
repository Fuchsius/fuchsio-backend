// Response helper functions
const sendSuccess = (res, data, message = "Success", statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

const sendError = (res, error, statusCode = 500) => {
  res.status(statusCode).json({
    success: false,
    error: error.message || error,
    timestamp: new Date().toISOString(),
  });
};

const sendPaginated = (res, data, page, limit, total) => {
  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    timestamp: new Date().toISOString(),
  });
};

// Async error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation helper
const validateRequired = (fields, body) => {
  const missing = fields.filter((field) => !body[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }
};

module.exports = {
  sendSuccess,
  sendError,
  sendPaginated,
  asyncHandler,
  validateRequired,
};
