// Database query performance monitoring
const { PrismaClient } = require("@prisma/client");
const logger = require("../utils/logger");

// Query performance tracking
class QueryPerformanceMonitor {
  constructor() {
    this.queryStats = new Map();
    this.slowQueries = [];
    this.thresholds = {
      slowQuery: 1000, // 1 second
      verySlowQuery: 5000, // 5 seconds
      maxSlowQueries: 100, // Keep last 100 slow queries
    };
  }

  // Track query execution
  trackQuery(operation, model, duration, query = null) {
    const queryKey = `${operation}_${model}`;

    // Update statistics
    if (!this.queryStats.has(queryKey)) {
      this.queryStats.set(queryKey, {
        operation,
        model,
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        avgDuration: 0,
        slowCount: 0,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
      });
    }

    const stats = this.queryStats.get(queryKey);
    stats.count++;
    stats.totalDuration += duration;
    stats.minDuration = Math.min(stats.minDuration, duration);
    stats.maxDuration = Math.max(stats.maxDuration, duration);
    stats.avgDuration = stats.totalDuration / stats.count;
    stats.lastSeen = Date.now();

    // Track slow queries
    if (duration > this.thresholds.slowQuery) {
      stats.slowCount++;

      const slowQuery = {
        timestamp: Date.now(),
        operation,
        model,
        duration,
        query: query ? this.sanitizeQuery(query) : null,
        severity:
          duration > this.thresholds.verySlowQuery ? "critical" : "warning",
      };

      this.slowQueries.push(slowQuery);

      // Keep only the most recent slow queries
      if (this.slowQueries.length > this.thresholds.maxSlowQueries) {
        this.slowQueries.shift();
      }

      // Log slow query
      logger.database("Slow query detected", {
        operation,
        model,
        duration,
        severity: slowQuery.severity,
        query: slowQuery.query,
      });
    }
  }

  // Get query statistics
  getQueryStats() {
    const stats = Array.from(this.queryStats.entries()).map(([key, data]) => ({
      queryKey: key,
      ...data,
      slowPercentage: data.count > 0 ? (data.slowCount / data.count) * 100 : 0,
    }));

    return {
      overview: {
        totalQueries: stats.reduce((sum, stat) => sum + stat.count, 0),
        totalSlowQueries: this.slowQueries.length,
        uniqueQueryTypes: stats.length,
        avgQueryTime: this.calculateOverallAverage(stats),
      },
      queryTypes: stats.sort((a, b) => b.avgDuration - a.avgDuration),
      recentSlowQueries: this.slowQueries.slice(-10),
      timestamp: new Date().toISOString(),
    };
  }

  // Get slow query analysis
  getSlowQueryAnalysis() {
    const recentSlowQueries = this.slowQueries.slice(-50);

    // Group by operation and model
    const groupedQueries = {};
    recentSlowQueries.forEach((query) => {
      const key = `${query.operation}_${query.model}`;
      if (!groupedQueries[key]) {
        groupedQueries[key] = {
          operation: query.operation,
          model: query.model,
          count: 0,
          totalDuration: 0,
          avgDuration: 0,
          maxDuration: 0,
          queries: [],
        };
      }

      const group = groupedQueries[key];
      group.count++;
      group.totalDuration += query.duration;
      group.avgDuration = group.totalDuration / group.count;
      group.maxDuration = Math.max(group.maxDuration, query.duration);
      group.queries.push(query);
    });

    return {
      analysis: Object.values(groupedQueries).sort(
        (a, b) => b.avgDuration - a.avgDuration
      ),
      recommendations: this.generateRecommendations(groupedQueries),
      timestamp: new Date().toISOString(),
    };
  }

  // Generate performance recommendations
  generateRecommendations(groupedQueries) {
    const recommendations = [];

    Object.values(groupedQueries).forEach((group) => {
      if (group.avgDuration > this.thresholds.verySlowQuery) {
        recommendations.push({
          type: "critical_performance",
          operation: group.operation,
          model: group.model,
          issue: `Very slow ${group.operation} operations on ${group.model}`,
          avgDuration: group.avgDuration,
          maxDuration: group.maxDuration,
          count: group.count,
          suggestions: [
            "Add database indexes for frequently queried fields",
            "Consider pagination for large result sets",
            "Review query complexity and optimize joins",
            "Check for N+1 query problems",
          ],
        });
      } else if (
        group.count > 10 &&
        group.avgDuration > this.thresholds.slowQuery
      ) {
        recommendations.push({
          type: "frequent_slow_query",
          operation: group.operation,
          model: group.model,
          issue: `Frequently slow ${group.operation} operations on ${group.model}`,
          avgDuration: group.avgDuration,
          count: group.count,
          suggestions: [
            "Consider caching for frequently accessed data",
            "Add appropriate database indexes",
            "Optimize query structure",
          ],
        });
      }
    });

    return recommendations;
  }

  // Sanitize query for logging (remove sensitive data)
  sanitizeQuery(query) {
    if (typeof query === "string") {
      // Remove potential sensitive values
      return query
        .replace(/password\s*=\s*'[^']*'/gi, "password='[REDACTED]'")
        .replace(/token\s*=\s*'[^']*'/gi, "token='[REDACTED]'")
        .replace(/email\s*=\s*'[^']*'/gi, "email='[REDACTED]'");
    }

    if (typeof query === "object") {
      // For structured query objects, redact sensitive fields
      const sanitized = JSON.stringify(query, (key, value) => {
        if (["password", "token", "secret"].includes(key.toLowerCase())) {
          return "[REDACTED]";
        }
        return value;
      });

      return sanitized;
    }

    return "[Query not available]";
  }

  // Calculate overall average
  calculateOverallAverage(stats) {
    if (stats.length === 0) return 0;

    const totalQueries = stats.reduce((sum, stat) => sum + stat.count, 0);
    const totalDuration = stats.reduce(
      (sum, stat) => sum + stat.totalDuration,
      0
    );

    return totalQueries > 0 ? totalDuration / totalQueries : 0;
  }

  // Clear old data
  cleanup() {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours

    // Remove old slow queries
    this.slowQueries = this.slowQueries.filter(
      (query) => query.timestamp > cutoff
    );

    // Reset query stats that haven't been used recently
    for (const [key, stats] of this.queryStats.entries()) {
      if (stats.lastSeen < cutoff) {
        this.queryStats.delete(key);
      }
    }

    logger.database("Query performance monitor cleanup completed", {
      remainingSlowQueries: this.slowQueries.length,
      remainingQueryTypes: this.queryStats.size,
    });
  }
}

// Create singleton instance
const queryMonitor = new QueryPerformanceMonitor();

// Enhanced Prisma client with monitoring
function createMonitoredPrismaClient() {
  const prisma = new PrismaClient({
    log: [
      {
        emit: "event",
        level: "query",
      },
      {
        emit: "event",
        level: "error",
      },
      {
        emit: "event",
        level: "warn",
      },
    ],
  });

  // Monitor query events
  prisma.$on("query", (e) => {
    const duration = parseFloat(e.duration);

    // Extract operation and model from query
    const operation = extractOperation(e.query);
    const model = extractModel(e.query);

    queryMonitor.trackQuery(operation, model, duration, e.query);
  });

  // Monitor error events
  prisma.$on("error", (e) => {
    logger.database("Database error", {
      message: e.message,
      target: e.target,
      timestamp: e.timestamp,
    });
  });

  // Monitor warning events
  prisma.$on("warn", (e) => {
    logger.database("Database warning", {
      message: e.message,
      target: e.target,
      timestamp: e.timestamp,
    });
  });

  return prisma;
}

// Helper functions
function extractOperation(query) {
  const normalizedQuery = query.toLowerCase().trim();

  if (normalizedQuery.startsWith("select")) return "SELECT";
  if (normalizedQuery.startsWith("insert")) return "INSERT";
  if (normalizedQuery.startsWith("update")) return "UPDATE";
  if (normalizedQuery.startsWith("delete")) return "DELETE";
  if (normalizedQuery.includes("create")) return "CREATE";
  if (normalizedQuery.includes("alter")) return "ALTER";
  if (normalizedQuery.includes("drop")) return "DROP";

  return "UNKNOWN";
}

function extractModel(query) {
  // Simple model extraction - in production, you might want more sophisticated parsing
  const patterns = [
    /from\s+`?(\w+)`?/i,
    /into\s+`?(\w+)`?/i,
    /update\s+`?(\w+)`?/i,
    /table\s+`?(\w+)`?/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      return match[1].toUpperCase();
    }
  }

  return "UNKNOWN";
}

// Scheduled cleanup (run every hour)
const cron = require("node-cron");
cron.schedule("0 * * * *", () => {
  queryMonitor.cleanup();
});

module.exports = {
  QueryPerformanceMonitor,
  queryMonitor,
  createMonitoredPrismaClient,
};
