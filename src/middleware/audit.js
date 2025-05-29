// Audit trail middleware for security and compliance
const logger = require("../utils/logger");

// Audit trail for sensitive operations
const auditTrail = (action, resource) => {
  return (req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
      // Log successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logger.audit(`${action} ${resource}`, {
          action,
          resource,
          userId: req.user?.id,
          userEmail: req.user?.email,
          userRole: req.user?.role,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get("User-Agent"),
          timestamp: new Date().toISOString(),
          requestId: req.id,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          resourceId: req.params.id || req.body?.id,
          changes: getChanges(req, action),
        });
      }

      originalSend.call(res, data);
    };

    next();
  };
};

// Authentication audit
const authAudit = (req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    if (req.path.includes("/auth/")) {
      const action = getAuthAction(req.path);
      const isSuccess = res.statusCode >= 200 && res.statusCode < 300;

      if (action === "login") {
        logger.audit(`User login ${isSuccess ? "successful" : "failed"}`, {
          action: "login",
          success: isSuccess,
          email: req.body?.email,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get("User-Agent"),
          timestamp: new Date().toISOString(),
          requestId: req.id,
          statusCode: res.statusCode,
          failureReason: !isSuccess ? getErrorMessage(data) : null,
        });
      } else if (action === "logout") {
        logger.audit("User logout", {
          action: "logout",
          userId: req.user?.id,
          userEmail: req.user?.email,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get("User-Agent"),
          timestamp: new Date().toISOString(),
          requestId: req.id,
        });
      } else if (action === "register") {
        logger.audit(
          `User registration ${isSuccess ? "successful" : "failed"}`,
          {
            action: "register",
            success: isSuccess,
            email: req.body?.email,
            role: req.body?.role,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get("User-Agent"),
            timestamp: new Date().toISOString(),
            requestId: req.id,
            statusCode: res.statusCode,
          }
        );
      }
    }

    originalSend.call(res, data);
  };

  next();
};

// Security events audit
const securityAudit = (eventType, details = {}) => {
  logger.security(`Security event: ${eventType}`, {
    eventType,
    timestamp: new Date().toISOString(),
    severity: getSeverityLevel(eventType),
    ...details,
  });
};

// Admin actions audit
const adminAudit = (req, res, next) => {
  if (req.user?.role === "ADMIN") {
    const originalSend = res.send;

    res.send = function (data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logger.audit("Admin action performed", {
          action: `${req.method} ${req.path}`,
          adminId: req.user.id,
          adminEmail: req.user.email,
          targetResource: req.params.id,
          changes: req.body,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get("User-Agent"),
          timestamp: new Date().toISOString(),
          requestId: req.id,
        });
      }

      originalSend.call(res, data);
    };
  }

  next();
};

// Data access audit
const dataAccessAudit = (resourceType) => {
  return (req, res, next) => {
    if (req.method === "GET" && isDataAccess(req.url)) {
      logger.audit(`Data access: ${resourceType}`, {
        action: "data_access",
        resourceType,
        userId: req.user?.id,
        userEmail: req.user?.email,
        userRole: req.user?.role,
        resourceId: req.params.id,
        query: req.query,
        ip: req.ip || req.connection.remoteAddress,
        timestamp: new Date().toISOString(),
        requestId: req.id,
      });
    }

    next();
  };
};

// Failed authentication attempts tracking
const failedAuthTracker = {
  attempts: new Map(),

  record: (ip, email) => {
    const key = `${ip}_${email}`;
    const now = Date.now();
    const attempts = failedAuthTracker.attempts.get(key) || [];

    // Remove attempts older than 15 minutes
    const recentAttempts = attempts.filter(
      (time) => now - time < 15 * 60 * 1000
    );
    recentAttempts.push(now);

    failedAuthTracker.attempts.set(key, recentAttempts);

    // Alert on multiple failed attempts
    if (recentAttempts.length >= 5) {
      securityAudit("multiple_failed_login_attempts", {
        ip,
        email,
        attemptCount: recentAttempts.length,
        timeWindow: "15 minutes",
      });
    }

    return recentAttempts.length;
  },

  reset: (ip, email) => {
    const key = `${ip}_${email}`;
    failedAuthTracker.attempts.delete(key);
  },
};

// Helper functions
function getAuthAction(path) {
  if (path.includes("/login")) return "login";
  if (path.includes("/logout")) return "logout";
  if (path.includes("/register")) return "register";
  if (path.includes("/forgot-password")) return "forgot_password";
  if (path.includes("/reset-password")) return "reset_password";
  return "unknown_auth_action";
}

function getChanges(req, action) {
  if (action.includes("CREATE") || action.includes("UPDATE")) {
    return req.body;
  }
  return null;
}

function getErrorMessage(data) {
  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    return parsed.message || parsed.error || "Unknown error";
  } catch {
    return "Error parsing response";
  }
}

function getSeverityLevel(eventType) {
  const highSeverity = [
    "multiple_failed_login_attempts",
    "unauthorized_access_attempt",
    "privilege_escalation",
    "suspicious_activity",
  ];

  const mediumSeverity = [
    "failed_login_attempt",
    "rate_limit_exceeded",
    "invalid_token",
  ];

  if (highSeverity.includes(eventType)) return "high";
  if (mediumSeverity.includes(eventType)) return "medium";
  return "low";
}

function isDataAccess(url) {
  const dataEndpoints = [
    "/users/",
    "/projects/",
    "/tasks/",
    "/time-entries/",
    "/analytics/",
    "/reports/",
  ];

  return dataEndpoints.some((endpoint) => url.includes(endpoint));
}

module.exports = {
  auditTrail,
  authAudit,
  securityAudit,
  adminAudit,
  dataAccessAudit,
  failedAuthTracker,
};
