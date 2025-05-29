// Routes for monitoring and health checks
const express = require("express");
const { systemMetrics } = require("../utils/monitoring");
const { sendSuccess, sendError } = require("../utils/helpers");
const { authenticateToken, adminOnly } = require("../middleware/auth");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * @route   GET /api/v1/monitoring/health
 * @desc    Basic health check endpoint
 * @access  Public
 */
router.get("/health", async (req, res) => {
  try {
    const health = await systemMetrics.getHealthStatus();

    const statusCode =
      health.status === "healthy"
        ? 200
        : health.status === "degraded"
        ? 200
        : 503;

    res.status(statusCode).json({
      success: true,
      data: health,
    });
  } catch (error) {
    logger.error("Health check failed", { error: error.message });
    res.status(503).json({
      success: false,
      message: "Health check failed",
      data: {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error.message,
      },
    });
  }
});

/**
 * @route   GET /api/v1/monitoring/health/detailed
 * @desc    Detailed health check with all metrics
 * @access  Private (Admin only)
 */
router.get(
  "/health/detailed",
  authenticateToken,
  adminOnly,
  async (req, res) => {
    try {
      const metrics = await systemMetrics.getAllMetrics();
      sendSuccess(
        res,
        metrics,
        "Detailed health metrics retrieved successfully"
      );
    } catch (error) {
      logger.error("Detailed health check failed", { error: error.message });
      sendError(res, "Failed to retrieve detailed health metrics", 500);
    }
  }
);

/**
 * @route   GET /api/v1/monitoring/metrics
 * @desc    System metrics endpoint
 * @access  Private (Admin only)
 */
router.get("/metrics", authenticateToken, adminOnly, async (req, res) => {
  try {
    const { type } = req.query;
    let metrics;

    switch (type) {
      case "system":
        metrics = await systemMetrics.collectSystemMetrics();
        break;
      case "database":
        metrics = await systemMetrics.collectDatabaseMetrics();
        break;
      case "application":
        metrics = systemMetrics.collectApplicationMetrics();
        break;
      case "performance":
        metrics = systemMetrics.collectPerformanceMetrics();
        break;
      default:
        metrics = await systemMetrics.getAllMetrics();
    }

    sendSuccess(
      res,
      metrics,
      `${type || "All"} metrics retrieved successfully`
    );
  } catch (error) {
    logger.error("Metrics collection failed", {
      error: error.message,
      type: req.query.type,
    });
    sendError(res, "Failed to retrieve metrics", 500);
  }
});

/**
 * @route   GET /api/v1/monitoring/status
 * @desc    Quick status endpoint for monitoring tools
 * @access  Public
 */
router.get("/status", async (req, res) => {
  try {
    const appMetrics = systemMetrics.collectApplicationMetrics();

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      requests: {
        total: appMetrics.requests.total,
        errorRate: appMetrics.requests.errorRate,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: "Status check failed",
    });
  }
});

/**
 * @route   GET /api/v1/monitoring/logs
 * @desc    Recent logs endpoint
 * @access  Private (Admin only)
 */
router.get("/logs", authenticateToken, adminOnly, async (req, res) => {
  try {
    const { level = "info", limit = 100, type } = req.query;

    // This is a simplified version - in production you'd read from log files
    // or use a log aggregation service
    const logs = await getRecentLogs(level, limit, type);

    sendSuccess(res, logs, "Recent logs retrieved successfully");
  } catch (error) {
    logger.error("Log retrieval failed", { error: error.message });
    sendError(res, "Failed to retrieve logs", 500);
  }
});

/**
 * @route   POST /api/v1/monitoring/alerts/test
 * @desc    Test alert system
 * @access  Private (Admin only)
 */
router.post("/alerts/test", authenticateToken, adminOnly, async (req, res) => {
  try {
    const { type = "test", message = "Test alert" } = req.body;

    // Log test alert
    logger.security("Alert system test", {
      type,
      message,
      triggeredBy: req.user.id,
      timestamp: new Date().toISOString(),
    });

    sendSuccess(
      res,
      {
        alertSent: true,
        type,
        message,
        timestamp: new Date().toISOString(),
      },
      "Test alert sent successfully"
    );
  } catch (error) {
    logger.error("Alert test failed", { error: error.message });
    sendError(res, "Failed to send test alert", 500);
  }
});

/**
 * @route   GET /api/v1/monitoring/performance
 * @desc    Performance metrics and analysis
 * @access  Private (Admin only)
 */
router.get("/performance", authenticateToken, adminOnly, async (req, res) => {
  try {
    const { timeframe = "1h" } = req.query;

    const performanceData = {
      current: systemMetrics.collectPerformanceMetrics(),
      application: systemMetrics.collectApplicationMetrics(),
      system: await systemMetrics.collectSystemMetrics(),
      timeframe,
      recommendations: generatePerformanceRecommendations(),
    };

    sendSuccess(
      res,
      performanceData,
      "Performance metrics retrieved successfully"
    );
  } catch (error) {
    logger.error("Performance metrics retrieval failed", {
      error: error.message,
    });
    sendError(res, "Failed to retrieve performance metrics", 500);
  }
});

/**
 * @route   GET /api/v1/monitoring/dashboard
 * @desc    Monitoring dashboard data
 * @access  Private (Admin only)
 */
router.get("/dashboard", authenticateToken, adminOnly, async (req, res) => {
  try {
    const [health, metrics] = await Promise.all([
      systemMetrics.getHealthStatus(),
      systemMetrics.getAllMetrics(),
    ]);

    const dashboardData = {
      health,
      overview: {
        status: health.status,
        uptime: metrics.application.uptime.formatted,
        requests: metrics.application.requests,
        memory: {
          used: Math.round(metrics.system.memory.heapUsed / 1024 / 1024),
          total: Math.round(metrics.system.memory.heapTotal / 1024 / 1024),
          percentage: Math.round(
            (metrics.system.memory.heapUsed / metrics.system.memory.heapTotal) *
              100
          ),
        },
        database: metrics.database,
      },
      alerts: health.issues,
      timestamp: new Date().toISOString(),
    };

    sendSuccess(
      res,
      dashboardData,
      "Monitoring dashboard data retrieved successfully"
    );
  } catch (error) {
    logger.error("Dashboard data retrieval failed", { error: error.message });
    sendError(res, "Failed to retrieve dashboard data", 500);
  }
});

// Helper functions
async function getRecentLogs(level, limit, type) {
  // Simplified log retrieval - in production, you'd read from log files
  // or use a log management system like ELK stack
  return {
    logs: [],
    message: "Log retrieval feature requires log aggregation setup",
    parameters: { level, limit, type },
    timestamp: new Date().toISOString(),
  };
}

function generatePerformanceRecommendations() {
  const appMetrics = systemMetrics.collectApplicationMetrics();
  const recommendations = [];

  if (appMetrics.requests.errorRate > 5) {
    recommendations.push({
      type: "error_rate",
      severity: "warning",
      message: "High error rate detected. Review error logs and fix issues.",
      currentValue: `${appMetrics.requests.errorRate.toFixed(1)}%`,
      threshold: "5%",
    });
  }

  if (appMetrics.requests.averageResponseTime > 500) {
    recommendations.push({
      type: "response_time",
      severity: "info",
      message: "Average response time is elevated. Consider optimization.",
      currentValue: `${appMetrics.requests.averageResponseTime}ms`,
      threshold: "500ms",
    });
  }

  return recommendations;
}

module.exports = router;
