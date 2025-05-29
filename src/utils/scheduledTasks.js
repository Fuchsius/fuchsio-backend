const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const logger = require("./logger");
const { systemMetrics } = require("./monitoring");
const { errorTracker } = require("./errorTracking");
const { cleanExpiredTokens } = require("./auth");

const prisma = new PrismaClient();

class ScheduledTasks {
  constructor() {
    this.tasks = new Map();
    this.isRunning = false;
  }

  // Start all scheduled tasks
  start() {
    if (this.isRunning) {
      logger.warn("Scheduled tasks already running");
      return;
    }

    logger.info("Starting scheduled tasks");
    this.isRunning = true;

    // Clean expired tokens every hour
    this.scheduleTask(
      "clean-tokens",
      "0 * * * *",
      this.cleanExpiredTokens.bind(this)
    );

    // Clean old log files every day at midnight
    this.scheduleTask("clean-logs", "0 0 * * *", this.cleanOldLogs.bind(this));

    // System health check every 5 minutes
    this.scheduleTask(
      "health-check",
      "*/5 * * * *",
      this.performHealthCheck.bind(this)
    );

    // Database maintenance every day at 2 AM
    this.scheduleTask(
      "db-maintenance",
      "0 2 * * *",
      this.performDatabaseMaintenance.bind(this)
    );

    // Generate daily reports every day at 6 AM
    this.scheduleTask(
      "daily-reports",
      "0 6 * * *",
      this.generateDailyReports.bind(this)
    );

    // Clean error tracking data every week
    this.scheduleTask(
      "clean-error-data",
      "0 3 * * 0",
      this.cleanErrorTrackingData.bind(this)
    );

    // Archive old audit logs every month
    this.scheduleTask(
      "archive-audit-logs",
      "0 1 1 * *",
      this.archiveAuditLogs.bind(this)
    );

    logger.info("All scheduled tasks started successfully", {
      taskCount: this.tasks.size,
      tasks: Array.from(this.tasks.keys()),
    });
  }

  // Stop all scheduled tasks
  stop() {
    if (!this.isRunning) {
      logger.warn("Scheduled tasks not running");
      return;
    }

    logger.info("Stopping scheduled tasks");

    this.tasks.forEach((task, name) => {
      try {
        task.destroy();
        logger.debug(`Stopped task: ${name}`);
      } catch (error) {
        logger.error(`Error stopping task ${name}`, { error: error.message });
      }
    });

    this.tasks.clear();
    this.isRunning = false;
    logger.info("All scheduled tasks stopped");
  }

  // Schedule a new task
  scheduleTask(name, schedule, callback) {
    try {
      const task = cron.schedule(
        schedule,
        async () => {
          const startTime = Date.now();
          logger.debug(`Starting scheduled task: ${name}`);

          try {
            await callback();
            const duration = Date.now() - startTime;
            logger.info(`Scheduled task completed: ${name}`, {
              duration,
              success: true,
            });
          } catch (error) {
            const duration = Date.now() - startTime;
            logger.error(`Scheduled task failed: ${name}`, {
              error: error.message,
              stack: error.stack,
              duration,
              success: false,
            });
          }
        },
        {
          scheduled: false,
          timezone: process.env.TIMEZONE || "UTC",
        }
      );

      task.start();
      this.tasks.set(name, task);

      logger.info(`Scheduled task registered: ${name}`, {
        schedule,
        timezone: process.env.TIMEZONE || "UTC",
      });
    } catch (error) {
      logger.error(`Failed to schedule task: ${name}`, {
        error: error.message,
        schedule,
      });
    }
  }

  // Clean expired JWT tokens
  async cleanExpiredTokens() {
    logger.info("Starting token cleanup");

    try {
      await cleanExpiredTokens();

      const count = await prisma.refreshToken.count({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      if (count > 0) {
        await prisma.refreshToken.deleteMany({
          where: {
            expiresAt: {
              lt: new Date(),
            },
          },
        });

        logger.info("Expired tokens cleaned", { deletedCount: count });
      } else {
        logger.debug("No expired tokens to clean");
      }
    } catch (error) {
      logger.error("Token cleanup failed", { error: error.message });
      throw error;
    }
  }

  // Clean old log files
  async cleanOldLogs() {
    logger.info("Starting log cleanup");

    try {
      const logsDir = path.join(__dirname, "../../logs");
      const maxAge = parseInt(process.env.LOG_RETENTION_DAYS) || 30; // 30 days default
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAge);

      if (!fs.existsSync(logsDir)) {
        logger.debug("Logs directory does not exist");
        return;
      }

      const files = fs.readdirSync(logsDir);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile() && stats.mtime < cutoffDate) {
          try {
            fs.unlinkSync(filePath);
            deletedCount++;
            logger.debug(`Deleted old log file: ${file}`, {
              age: Math.floor(
                (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)
              ),
            });
          } catch (error) {
            logger.error(`Failed to delete log file: ${file}`, {
              error: error.message,
            });
          }
        }
      }

      logger.info("Log cleanup completed", {
        deletedCount,
        maxAgeDays: maxAge,
      });
    } catch (error) {
      logger.error("Log cleanup failed", { error: error.message });
      throw error;
    }
  }

  // Perform system health check
  async performHealthCheck() {
    try {
      const health = await systemMetrics.getHealthStatus();

      if (health.status === "unhealthy") {
        logger.warn("System health check failed", {
          status: health.status,
          issues: health.issues,
          metrics: health.metrics,
        });

        // Send alert for critical issues
        const criticalIssues = health.issues.filter(
          (issue) => issue.severity === "critical" || issue.severity === "high"
        );

        if (criticalIssues.length > 0) {
          logger.error("Critical system issues detected", {
            criticalIssues,
            totalIssues: health.issues.length,
          });
        }
      } else {
        logger.debug("System health check passed", {
          status: health.status,
          issueCount: health.issues.length,
        });
      }
    } catch (error) {
      logger.error("Health check failed", { error: error.message });
      throw error;
    }
  }

  // Perform database maintenance
  async performDatabaseMaintenance() {
    logger.info("Starting database maintenance");

    try {
      // Clean up old sessions
      const oldSessionDate = new Date();
      oldSessionDate.setDate(oldSessionDate.getDate() - 7); // 7 days old

      const deletedSessions = await prisma.refreshToken.deleteMany({
        where: {
          createdAt: {
            lt: oldSessionDate,
          },
        },
      });

      // Clean up old notifications (if exists)
      let deletedNotifications = 0;
      try {
        const oldNotificationDate = new Date();
        oldNotificationDate.setDate(oldNotificationDate.getDate() - 30); // 30 days old

        const result = await prisma.notification?.deleteMany({
          where: {
            createdAt: {
              lt: oldNotificationDate,
            },
            read: true,
          },
        });
        deletedNotifications = result?.count || 0;
      } catch (error) {
        // Notification table might not exist
        logger.debug("Notification cleanup skipped", {
          reason: "Table might not exist",
        });
      }

      logger.info("Database maintenance completed", {
        deletedSessions: deletedSessions.count,
        deletedNotifications,
      });
    } catch (error) {
      logger.error("Database maintenance failed", { error: error.message });
      throw error;
    }
  }

  // Generate daily reports
  async generateDailyReports() {
    logger.info("Generating daily reports");

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Generate system metrics report
      const metrics = await systemMetrics.getMetrics();
      const errorStats = errorTracker.getErrorStats();

      const report = {
        date: yesterday.toISOString().split("T")[0],
        system: {
          uptime: process.uptime(),
          memory: metrics.system.memory,
          cpu: metrics.system.cpu,
        },
        database: metrics.database,
        application: metrics.application,
        errors: {
          total: errorStats.totalErrors,
          byType: errorStats.errorsByType,
          criticalCount: errorStats.criticalErrors,
        },
        timestamp: new Date().toISOString(),
      };

      // Log the daily report
      logger.info("Daily system report", report);

      // You could also save this to a file or send to external monitoring service
      const reportsDir = path.join(__dirname, "../../reports");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const reportFile = path.join(
        reportsDir,
        `daily-report-${report.date}.json`
      );
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

      logger.info("Daily report saved", { reportFile });
    } catch (error) {
      logger.error("Daily report generation failed", { error: error.message });
      throw error;
    }
  }

  // Clean error tracking data
  async cleanErrorTrackingData() {
    logger.info("Cleaning error tracking data");

    try {
      const cleaned = errorTracker.cleanup();
      logger.info("Error tracking data cleaned", { cleaned });
    } catch (error) {
      logger.error("Error tracking cleanup failed", { error: error.message });
      throw error;
    }
  }

  // Archive old audit logs
  async archiveAuditLogs() {
    logger.info("Archiving old audit logs");

    try {
      const logsDir = path.join(__dirname, "../../logs");
      const archiveDir = path.join(logsDir, "archive");

      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }

      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 3); // 3 months old

      const files = fs.readdirSync(logsDir);
      let archivedCount = 0;

      for (const file of files) {
        if (file.includes("audit") && !file.includes("archive")) {
          const filePath = path.join(logsDir, file);
          const stats = fs.statSync(filePath);

          if (stats.isFile() && stats.mtime < cutoffDate) {
            const archivePath = path.join(archiveDir, file);
            fs.renameSync(filePath, archivePath);
            archivedCount++;
            logger.debug(`Archived audit log: ${file}`);
          }
        }
      }

      logger.info("Audit log archiving completed", { archivedCount });
    } catch (error) {
      logger.error("Audit log archiving failed", { error: error.message });
      throw error;
    }
  }

  // Get status of all scheduled tasks
  getStatus() {
    return {
      isRunning: this.isRunning,
      taskCount: this.tasks.size,
      tasks: Array.from(this.tasks.keys()).map((name) => ({
        name,
        status: this.tasks.get(name)?.running ? "running" : "stopped",
      })),
    };
  }
}

// Create singleton instance
const scheduledTasks = new ScheduledTasks();

module.exports = {
  scheduledTasks,
  ScheduledTasks,
};
