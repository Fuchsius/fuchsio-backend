// Error tracking and alerting system
const logger = require("../utils/logger");
const { systemMetrics } = require("../utils/monitoring");

// Error tracking and alerting class
class ErrorTracker {
  constructor() {
    this.errorCounts = new Map();
    this.criticalErrors = [];
    this.alertThresholds = {
      errorRate: 10, // 10% error rate
      criticalErrorCount: 5, // 5 critical errors in timeframe
      consecutiveErrors: 10, // 10 consecutive errors
      timeWindow: 5 * 60 * 1000, // 5 minutes
    };

    this.consecutiveErrorCount = 0;
    this.lastSuccessTime = Date.now();
  }

  // Track error occurrence
  trackError(error, context = {}) {
    const errorKey = this.generateErrorKey(error);
    const now = Date.now();

    // Update error counts
    if (!this.errorCounts.has(errorKey)) {
      this.errorCounts.set(errorKey, {
        count: 0,
        firstOccurrence: now,
        lastOccurrence: now,
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code,
        },
        contexts: [],
      });
    }

    const errorData = this.errorCounts.get(errorKey);
    errorData.count++;
    errorData.lastOccurrence = now;
    errorData.contexts.push({
      timestamp: now,
      ...context,
    });

    // Track consecutive errors
    this.consecutiveErrorCount++;

    // Check if this is a critical error
    if (this.isCriticalError(error)) {
      this.criticalErrors.push({
        timestamp: now,
        error,
        context,
      });

      // Clean old critical errors
      this.cleanOldCriticalErrors();
    }

    // Check alert conditions
    this.checkAlertConditions(errorKey, errorData);

    // Log the error
    logger.error("Error tracked", {
      errorKey,
      errorMessage: error.message,
      errorCount: errorData.count,
      consecutiveErrors: this.consecutiveErrorCount,
      ...context,
    });
  }

  // Track successful request (reset consecutive error counter)
  trackSuccess() {
    this.consecutiveErrorCount = 0;
    this.lastSuccessTime = Date.now();
  }

  // Generate unique error key
  generateErrorKey(error) {
    const message = error.message || "Unknown error";
    const stack = error.stack || "";

    // Extract the first line of stack trace for more specific grouping
    const stackLine = stack.split("\n")[1] || "";
    const location = stackLine.includes("at ")
      ? stackLine.split("at ")[1]?.split(" ")[0] || "unknown"
      : "unknown";

    return `${message}_${location}`.replace(/[^a-zA-Z0-9_]/g, "_");
  }

  // Check if error is critical
  isCriticalError(error) {
    const criticalPatterns = [
      /database.*connection/i,
      /out of memory/i,
      /fatal/i,
      /critical/i,
      /authentication.*failed/i,
      /unauthorized.*access/i,
      /security.*violation/i,
    ];

    const errorText = `${error.message} ${error.stack}`.toLowerCase();
    return criticalPatterns.some((pattern) => pattern.test(errorText));
  }

  // Check alert conditions and trigger alerts
  checkAlertConditions(errorKey, errorData) {
    const now = Date.now();

    // Check error rate
    const appMetrics = systemMetrics.collectApplicationMetrics();
    if (appMetrics.requests.errorRate > this.alertThresholds.errorRate) {
      this.triggerAlert("high_error_rate", {
        currentRate: appMetrics.requests.errorRate,
        threshold: this.alertThresholds.errorRate,
        totalRequests: appMetrics.requests.total,
        totalErrors: appMetrics.requests.errors,
      });
    }

    // Check critical error count
    if (this.criticalErrors.length >= this.alertThresholds.criticalErrorCount) {
      this.triggerAlert("critical_error_threshold", {
        criticalErrorCount: this.criticalErrors.length,
        threshold: this.alertThresholds.criticalErrorCount,
        timeWindow: this.alertThresholds.timeWindow,
        recentErrors: this.criticalErrors.slice(-3).map((ce) => ({
          timestamp: ce.timestamp,
          message: ce.error.message,
        })),
      });
    }

    // Check consecutive errors
    if (this.consecutiveErrorCount >= this.alertThresholds.consecutiveErrors) {
      this.triggerAlert("consecutive_errors", {
        consecutiveCount: this.consecutiveErrorCount,
        threshold: this.alertThresholds.consecutiveErrors,
        lastSuccessTime: this.lastSuccessTime,
        timeSinceLastSuccess: now - this.lastSuccessTime,
      });
    }

    // Check frequent specific error
    const recentOccurrences = errorData.contexts.filter(
      (ctx) => now - ctx.timestamp < this.alertThresholds.timeWindow
    );

    if (recentOccurrences.length >= 5) {
      this.triggerAlert("frequent_specific_error", {
        errorKey,
        errorMessage: errorData.error.message,
        occurrenceCount: recentOccurrences.length,
        timeWindow: this.alertThresholds.timeWindow,
        firstOccurrence: errorData.firstOccurrence,
        totalCount: errorData.count,
      });
    }
  }

  // Trigger alert
  triggerAlert(alertType, data) {
    const alert = {
      type: alertType,
      severity: this.getAlertSeverity(alertType),
      timestamp: new Date().toISOString(),
      data,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // Log alert
    logger.security(`Alert triggered: ${alertType}`, alert);

    // In production, you would send this to:
    // - Email notifications
    // - Slack/Teams webhooks
    // - PagerDuty/OpsGenie
    // - SMS alerts
    this.sendAlertNotification(alert);

    return alert;
  }

  // Get alert severity
  getAlertSeverity(alertType) {
    const criticalAlerts = [
      "critical_error_threshold",
      "consecutive_errors",
      "database_connection_lost",
    ];

    const warningAlerts = ["high_error_rate", "frequent_specific_error"];

    if (criticalAlerts.includes(alertType)) return "critical";
    if (warningAlerts.includes(alertType)) return "warning";
    return "info";
  }

  // Send alert notification (placeholder for actual implementation)
  async sendAlertNotification(alert) {
    // Placeholder for actual notification sending
    // In production, implement:
    // - Email notifications
    // - Webhook notifications (Slack, Teams, etc.)
    // - SMS alerts for critical issues
    // - Push notifications

    logger.info("Alert notification would be sent", {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      // In production, add notification channels and results
    });
  }

  // Get error statistics
  getErrorStats() {
    const now = Date.now();
    const timeWindow = this.alertThresholds.timeWindow;

    const recentErrors = Array.from(this.errorCounts.entries())
      .map(([key, data]) => ({
        errorKey: key,
        totalCount: data.count,
        recentCount: data.contexts.filter(
          (ctx) => now - ctx.timestamp < timeWindow
        ).length,
        firstSeen: new Date(data.firstOccurrence).toISOString(),
        lastSeen: new Date(data.lastOccurrence).toISOString(),
        error: data.error,
      }))
      .sort((a, b) => b.recentCount - a.recentCount);

    return {
      summary: {
        totalUniqueErrors: this.errorCounts.size,
        totalCriticalErrors: this.criticalErrors.length,
        consecutiveErrors: this.consecutiveErrorCount,
        lastSuccessTime: new Date(this.lastSuccessTime).toISOString(),
      },
      recentErrors: recentErrors.slice(0, 10), // Top 10 recent errors
      criticalErrors: this.criticalErrors.slice(-5), // Last 5 critical errors
      timeWindow,
      timestamp: new Date().toISOString(),
    };
  }

  // Clean old data
  cleanOldCriticalErrors() {
    const now = Date.now();
    const cutoff = now - this.alertThresholds.timeWindow;

    this.criticalErrors = this.criticalErrors.filter(
      (error) => error.timestamp > cutoff
    );
  }

  // Reset error tracking (for testing or maintenance)
  reset() {
    this.errorCounts.clear();
    this.criticalErrors = [];
    this.consecutiveErrorCount = 0;
    this.lastSuccessTime = Date.now();

    logger.info("Error tracker reset", {
      timestamp: new Date().toISOString(),
    });
  }
}

// Create singleton instance
const errorTracker = new ErrorTracker();

// Error tracking middleware
const errorTrackingMiddleware = (err, req, res, next) => {
  // Track the error
  errorTracker.trackError(err, {
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("User-Agent"),
    requestId: req.id,
  });

  next(err);
};

// Success tracking middleware
const successTrackingMiddleware = (req, res, next) => {
  res.on("finish", () => {
    if (res.statusCode < 400) {
      errorTracker.trackSuccess();
    }
  });

  next();
};

module.exports = {
  ErrorTracker,
  errorTracker,
  errorTrackingMiddleware,
  successTrackingMiddleware,
};
