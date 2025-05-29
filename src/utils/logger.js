// Advanced logging configuration using Winston
const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");

// Create logs directory if it doesn't exist
const fs = require("fs");
const logsDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for structured logging
const customFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = {
      timestamp,
      level,
      message,
      ...meta,
    };

    if (stack) {
      log.stack = stack;
    }

    return JSON.stringify(log);
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length
      ? JSON.stringify(meta, null, 2)
      : "";
    return `${timestamp} [${level}]: ${message} ${metaString}`;
  })
);

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: customFormat,
  defaultMeta: {
    service: "fuchsio-backend",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  },
  transports: [
    // Error logs
    new DailyRotateFile({
      filename: path.join(logsDir, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxSize: "20m",
      maxFiles: "14d",
      auditFile: path.join(logsDir, "error-audit.json"),
    }),

    // Combined logs
    new DailyRotateFile({
      filename: path.join(logsDir, "combined-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
      auditFile: path.join(logsDir, "combined-audit.json"),
    }),

    // Audit logs for security events
    new DailyRotateFile({
      filename: path.join(logsDir, "audit-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      level: "info",
      maxSize: "20m",
      maxFiles: "30d",
      auditFile: path.join(logsDir, "audit-audit.json"),
      filter: (info) => info.type === "audit",
    }),

    // Performance logs
    new DailyRotateFile({
      filename: path.join(logsDir, "performance-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      level: "info",
      maxSize: "20m",
      maxFiles: "7d",
      auditFile: path.join(logsDir, "performance-audit.json"),
      filter: (info) => info.type === "performance",
    }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Additional logger methods for specific types
logger.audit = (message, metadata = {}) => {
  logger.info(message, {
    type: "audit",
    ...metadata,
  });
};

logger.performance = (message, metadata = {}) => {
  logger.info(message, {
    type: "performance",
    ...metadata,
  });
};

logger.security = (message, metadata = {}) => {
  logger.warn(message, {
    type: "security",
    ...metadata,
  });
};

logger.database = (message, metadata = {}) => {
  logger.info(message, {
    type: "database",
    ...metadata,
  });
};

logger.api = (message, metadata = {}) => {
  logger.info(message, {
    type: "api",
    ...metadata,
  });
};

module.exports = logger;
