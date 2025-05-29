const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");
const monitor = require("express-status-monitor");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

// Import monitoring and logging utilities
const logger = require("./utils/logger");
const {
  responseTimeMiddleware,
  requestTracker,
  memoryUsageMiddleware,
  errorLogger,
} = require("./middleware/performance");
const {
  auditTrail,
  authAudit,
  adminAudit,
  dataAccessAudit,
} = require("./middleware/audit");
const { systemMetrics, monitoringMiddleware } = require("./utils/monitoring");
const {
  errorTracker,
  errorTrackingMiddleware,
  successTrackingMiddleware,
} = require("./utils/errorTracking");
const { scheduledTasks } = require("./utils/scheduledTasks");

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Real-time monitoring dashboard (Admin only in production)
if (process.env.NODE_ENV !== "production") {
  app.use(
    monitor({
      title: "Fuchsio Backend Monitoring",
      path: "/status-monitor",
      healthChecks: [
        {
          protocol: "http",
          host: "localhost",
          port: process.env.PORT || 3000,
          path: "/health",
        },
      ],
    })
  );
}

// Performance monitoring middleware
app.use(responseTimeMiddleware);
app.use(requestTracker);
app.use(monitoringMiddleware);
app.use(memoryUsageMiddleware);
app.use(successTrackingMiddleware);

// Audit middleware
app.use(authAudit);
app.use(adminAudit);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
// app.use(limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : ["http://localhost:3000"],
  credentials: true,
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression middleware
app.use(compression());

// Enhanced logging middleware
const morganFormat =
  process.env.NODE_ENV === "production"
    ? "combined"
    : ":method :url :status :res[content-length] - :response-time ms";

app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        logger.api("HTTP Request", {
          message: message.trim(),
          type: "http_access_log",
        });
      },
    },
  })
);

// Static file serving for uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.get("/", (req, res) => {
  const healthData = {
    message: "Welcome to Fuchsio Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    monitoring: {
      enabled: true,
      dashboard:
        process.env.NODE_ENV !== "production" ? "/status-monitor" : null,
      healthCheck: "/health",
      metrics: "/api/v1/monitoring/metrics",
    },
  };

  logger.api("Root endpoint accessed", {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("User-Agent"),
  });

  res.json(healthData);
});

// Enhanced health check endpoint
app.get("/health", async (req, res) => {
  try {
    const health = await systemMetrics.getHealthStatus();

    logger.api("Health check performed", {
      status: health.status,
      issues: health.issues.length,
      ip: req.ip || req.connection.remoteAddress,
    });

    const statusCode =
      health.status === "healthy"
        ? 200
        : health.status === "degraded"
        ? 200
        : 503;

    res.status(statusCode).json({
      status: health.status,
      timestamp: health.timestamp,
      uptime: process.uptime(),
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      issues: health.issues,
      metrics: {
        memory: health.metrics.system.memory,
        database: health.metrics.database.status,
        requests: health.metrics.application.requests,
      },
    });
  } catch (error) {
    logger.error("Health check failed", { error: error.message });
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      error: "Health check failed",
    });
  }
});

// API routes
app.use("/api/v1", require("./routes"));

// Error tracking middleware (should be after routes)
app.use(errorTrackingMiddleware);

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  // Log the error with full context
  logger.error("Unhandled application error", {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    userId: req.user?.id,
    userRole: req.user?.role,
    method: req.method,
    url: req.url,
    userAgent: req.get("User-Agent"),
    ip: req.ip || req.connection.remoteAddress,
    body: req.method !== "GET" ? req.body : undefined,
    params: req.params,
    query: req.query,
  });

  // Track error for monitoring
  errorTracker.trackError(err, {
    endpoint: `${req.method} ${req.path}`,
    userId: req.user?.id,
    userRole: req.user?.role,
    requestId: req.requestId,
  });

  // Determine error status code
  const statusCode = err.statusCode || err.status || 500;

  if (process.env.NODE_ENV === "production") {
    res.status(statusCode).json({
      error: statusCode === 500 ? "Internal Server Error" : err.message,
      message: statusCode === 500 ? "Something went wrong!" : err.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(statusCode).json({
      error: err.message,
      stack: err.stack,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }
});

// Enhanced 404 handler
app.use((req, res) => {
  const notFoundMessage = `Route ${req.method} ${req.path} not found`;

  logger.api("404 Not Found", {
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("User-Agent"),
    requestId: req.requestId,
  });

  res.status(404).json({
    error: "Not Found",
    message: notFoundMessage,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    availableEndpoints: "/api/v1",
  });
});

// Start server
if (require.main === module) {
  const http = require("http");
  const server = http.createServer(app);

  // Initialize Socket.io
  const { initializeSocketIO } = require("./websocket/socket.config");
  const io = initializeSocketIO(server);

  // Make io available globally for controllers
  app.set("io", io);
  server.listen(PORT, () => {
    logger.info("Server started successfully", {
      port: PORT,
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
      pid: process.pid,
      timestamp: new Date().toISOString(),
      monitoring: {
        enabled: true,
        dashboard:
          process.env.NODE_ENV !== "production" ? `/status-monitor` : null,
        healthCheck: "/health",
        metricsEndpoint: "/api/v1/monitoring/metrics",
      },
    });

    // Start scheduled tasks
    try {
      scheduledTasks.start();
      logger.info("Scheduled tasks initialized");
    } catch (error) {
      logger.error("Failed to start scheduled tasks", { error: error.message });
    }

    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🌐 API URL: http://localhost:${PORT}`);
    console.log(`⚡ WebSocket server initialized`);
    console.log(`🔔 Real-time notifications enabled`);
    console.log(
      `📊 Monitoring dashboard: ${
        process.env.NODE_ENV !== "production"
          ? `http://localhost:${PORT}/status-monitor`
          : "Disabled in production"
      }`
    );
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(
      `📈 Metrics API: http://localhost:${PORT}/api/v1/monitoring/metrics`
    );
    console.log(
      `⏰ Scheduled tasks: ${
        scheduledTasks.getStatus().taskCount
      } tasks running`
    );
  });
  // Graceful shutdown handling
  const gracefulShutdown = (signal) => {
    logger.info("Received shutdown signal", { signal });
    console.log(`\n🛑 Received ${signal}. Graceful shutdown...`);

    // Stop scheduled tasks first
    try {
      scheduledTasks.stop();
      logger.info("Scheduled tasks stopped");
      console.log("✅ Scheduled tasks stopped");
    } catch (error) {
      logger.error("Error stopping scheduled tasks", { error: error.message });
      console.error("❌ Error stopping scheduled tasks:", error);
    }

    server.close(() => {
      logger.info("HTTP server closed");
      console.log("✅ HTTP server closed");

      // Close database connections
      prisma
        .$disconnect()
        .then(() => {
          logger.info("Database connections closed");
          console.log("✅ Database connections closed");
          process.exit(0);
        })
        .catch((err) => {
          logger.error("Error closing database connections", {
            error: err.message,
          });
          console.error("❌ Error closing database connections:", err);
          process.exit(1);
        });
    });

    // Force close server after 30 seconds
    setTimeout(() => {
      logger.error(
        "Could not close connections in time, forcefully shutting down"
      );
      console.error(
        "❌ Could not close connections in time, forcefully shutting down"
      );
      process.exit(1);
    }, 30000);
  };

  // Handle shutdown signals
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Handle uncaught exceptions
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception", {
      error: err.message,
      stack: err.stack,
      pid: process.pid,
    });
    console.error("💥 Uncaught Exception:", err);
    gracefulShutdown("uncaughtException");
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection", {
      reason: reason?.toString(),
      promise: promise?.toString(),
      pid: process.pid,
    });
    console.error("💥 Unhandled Rejection:", reason);
    gracefulShutdown("unhandledRejection");
  });
}

module.exports = app;
