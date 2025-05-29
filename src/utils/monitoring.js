// System metrics and health monitoring
const os = require("os");
const { PrismaClient } = require("@prisma/client");
const logger = require("../utils/logger");

const prisma = new PrismaClient();

// System metrics collection
class SystemMetrics {
  constructor() {
    this.metrics = {
      system: {},
      database: {},
      application: {},
      performance: {},
    };

    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimeSum = 0;
    this.slowRequestCount = 0;
  }

  // Collect system metrics
  async collectSystemMetrics() {
    const cpuUsage = process.cpuUsage();
    const memUsage = process.memoryUsage();

    this.metrics.system = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      loadAverage: os.loadavg(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpu: {
        count: os.cpus().length,
        usage: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
      },
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
      },
    };

    return this.metrics.system;
  }

  // Collect database metrics
  async collectDatabaseMetrics() {
    try {
      const startTime = Date.now();

      // Test database connection
      await prisma.$queryRaw`SELECT 1`;
      const connectionTime = Date.now() - startTime;

      // Get database stats
      const [userCount, projectCount, taskCount, timeEntryCount] =
        await Promise.all([
          prisma.user.count(),
          prisma.project.count(),
          prisma.task.count(),
          prisma.timeEntry.count(),
        ]);

      this.metrics.database = {
        timestamp: new Date().toISOString(),
        status: "connected",
        connectionTime,
        stats: {
          users: userCount,
          projects: projectCount,
          tasks: taskCount,
          timeEntries: timeEntryCount,
        },
      };
    } catch (error) {
      this.metrics.database = {
        timestamp: new Date().toISOString(),
        status: "error",
        error: error.message,
      };

      logger.error("Database metrics collection failed", {
        error: error.message,
      });
    }

    return this.metrics.database;
  }

  // Collect application metrics
  collectApplicationMetrics() {
    const uptimeSeconds = Math.floor(process.uptime());
    const avgResponseTime =
      this.requestCount > 0 ? this.responseTimeSum / this.requestCount : 0;

    this.metrics.application = {
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptimeSeconds,
        formatted: this.formatUptime(uptimeSeconds),
      },
      requests: {
        total: this.requestCount,
        errors: this.errorCount,
        errorRate:
          this.requestCount > 0
            ? (this.errorCount / this.requestCount) * 100
            : 0,
        slowRequests: this.slowRequestCount,
        averageResponseTime: Math.round(avgResponseTime),
      },
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0",
    };

    return this.metrics.application;
  }

  // Collect performance metrics
  collectPerformanceMetrics() {
    const eventLoopDelay = this.measureEventLoopDelay();

    this.metrics.performance = {
      timestamp: new Date().toISOString(),
      eventLoopDelay,
      gc: this.getGCStats(),
      handles: process._getActiveHandles().length,
      requests: process._getActiveRequests().length,
    };

    return this.metrics.performance;
  }

  // Track request
  trackRequest(responseTime, isError = false) {
    this.requestCount++;
    this.responseTimeSum += responseTime;

    if (isError) {
      this.errorCount++;
    }

    if (responseTime > 1000) {
      // Slow request threshold
      this.slowRequestCount++;
    }
  }

  // Get all metrics
  async getAllMetrics() {
    const [system, database, application, performance] = await Promise.all([
      this.collectSystemMetrics(),
      this.collectDatabaseMetrics(),
      this.collectApplicationMetrics(),
      this.collectPerformanceMetrics(),
    ]);

    return {
      system,
      database,
      application,
      performance,
      collectedAt: new Date().toISOString(),
    };
  }

  // Health check
  async getHealthStatus() {
    const metrics = await this.getAllMetrics();
    const issues = [];

    // Check system health
    const memoryUsagePercent =
      (metrics.system.memory.heapUsed / metrics.system.memory.heapTotal) * 100;
    if (memoryUsagePercent > 85) {
      issues.push({
        type: "memory",
        severity: "warning",
        message: `High memory usage: ${memoryUsagePercent.toFixed(1)}%`,
      });
    }

    // Check database health
    if (metrics.database.status !== "connected") {
      issues.push({
        type: "database",
        severity: "critical",
        message: "Database connection failed",
      });
    } else if (metrics.database.connectionTime > 1000) {
      issues.push({
        type: "database",
        severity: "warning",
        message: `Slow database connection: ${metrics.database.connectionTime}ms`,
      });
    }

    // Check application health
    if (metrics.application.requests.errorRate > 10) {
      issues.push({
        type: "application",
        severity: "warning",
        message: `High error rate: ${metrics.application.requests.errorRate.toFixed(
          1
        )}%`,
      });
    }

    const status = issues.some((issue) => issue.severity === "critical")
      ? "unhealthy"
      : issues.length > 0
      ? "degraded"
      : "healthy";

    return {
      status,
      timestamp: new Date().toISOString(),
      issues,
      metrics,
    };
  }

  // Helper methods
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }

  measureEventLoopDelay() {
    // Simple event loop delay measurement
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const delay = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
      return delay;
    });
    return 0; // Simplified for now
  }

  getGCStats() {
    try {
      if (global.gc) {
        const before = process.memoryUsage();
        global.gc();
        const after = process.memoryUsage();

        return {
          heapFreed: before.heapUsed - after.heapUsed,
          lastRun: new Date().toISOString(),
        };
      }
    } catch (error) {
      // GC not available
    }

    return {
      available: false,
      message: "GC stats not available",
    };
  }
}

// Create singleton instance
const systemMetrics = new SystemMetrics();

// Monitoring middleware
const monitoringMiddleware = (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const responseTime = Date.now() - startTime;
    const isError = res.statusCode >= 400;

    systemMetrics.trackRequest(responseTime, isError);

    // Log slow requests
    if (responseTime > 1000) {
      logger.performance("Slow request detected", {
        method: req.method,
        url: req.url,
        responseTime,
        statusCode: res.statusCode,
        userId: req.user?.id,
      });
    }
  });

  next();
};

module.exports = {
  SystemMetrics,
  systemMetrics,
  monitoringMiddleware,
};
