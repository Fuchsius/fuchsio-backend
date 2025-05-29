// Performance monitoring middleware
const responseTime = require("response-time");
const logger = require("../utils/logger");

// Response time tracking
const responseTimeMiddleware = responseTime((req, res, time) => {
  const slowThreshold = 1000; // 1 second
  const verySlowThreshold = 5000; // 5 seconds

  const logData = {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: Math.round(time),
    userAgent: req.get("User-Agent"),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id,
    contentLength: res.get("Content-Length"),
  };

  // Log performance data
  if (time > verySlowThreshold) {
    logger.performance("Very slow response", {
      level: "error",
      ...logData,
    });
  } else if (time > slowThreshold) {
    logger.performance("Slow response", {
      level: "warn",
      ...logData,
    });
  } else {
    logger.performance("Request completed", logData);
  }
});

// Request tracking middleware
const requestTracker = (req, res, next) => {
  const startTime = Date.now();

  // Generate unique request ID
  req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add request ID to response headers
  res.set("X-Request-ID", req.id);

  // Log incoming request
  logger.api("Incoming request", {
    requestId: req.id,
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("User-Agent"),
    userId: req.user?.id,
    body: req.method !== "GET" ? req.body : undefined,
    query: req.query,
    headers: {
      "content-type": req.get("Content-Type"),
      authorization: req.get("Authorization") ? "[PRESENT]" : "[ABSENT]",
    },
  });

  // Track request completion
  res.on("finish", () => {
    const duration = Date.now() - startTime;

    logger.api("Request completed", {
      requestId: req.id,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,
    });
  });

  next();
};

// Memory usage tracking
const memoryUsageMiddleware = (req, res, next) => {
  const memUsage = process.memoryUsage();

  // Log memory usage for heavy endpoints
  if (
    req.url.includes("/api/v1/analytics") ||
    req.url.includes("/reports") ||
    req.url.includes("/bulk")
  ) {
    logger.performance("Memory usage check", {
      requestId: req.id,
      url: req.url,
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
      },
    });
  }

  next();
};

// Error response logging
const errorLogger = (err, req, res, next) => {
  logger.error("Request error", {
    requestId: req.id,
    error: {
      message: err.message,
      stack: err.stack,
      code: err.code,
    },
    request: {
      method: req.method,
      url: req.url,
      userId: req.user?.id,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
    },
  });

  next(err);
};

module.exports = {
  responseTimeMiddleware,
  requestTracker,
  memoryUsageMiddleware,
  errorLogger,
};
