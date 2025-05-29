const {
  verifyToken,
  prisma,
  hasRole,
  canAccessResource,
} = require("../utils/auth");
const { sendError } = require("../utils/helpers");
const logger = require("../utils/logger");
const { auditTrail } = require("./audit");

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    if (!token) {
      // Log failed authentication attempt
      logger.security("Authentication failed - No token provided", {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get("User-Agent"),
        method: req.method,
        url: req.url,
        requestId: req.requestId,
      });

      return sendError(res, "Access token is required", 401);
    }

    const decoded = verifyToken(token);

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        lastLogin: true,
      },
    });

    if (!user) {
      logger.security("Authentication failed - User not found", {
        tokenUserId: decoded.id,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get("User-Agent"),
        method: req.method,
        url: req.url,
        requestId: req.requestId,
      });

      return sendError(res, "User not found", 401);
    }

    if (user.status !== "ACTIVE") {
      logger.security("Authentication failed - User account inactive", {
        userId: user.id,
        username: user.username,
        status: user.status,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get("User-Agent"),
        method: req.method,
        url: req.url,
        requestId: req.requestId,
      });

      return sendError(res, "User account is not active", 401);
    }

    // Log successful authentication
    logger.audit("User authenticated successfully", {
      userId: user.id,
      username: user.username,
      role: user.role,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
      method: req.method,
      url: req.url,
      requestId: req.requestId,
    });

    req.user = user;
    next();
  } catch (error) {
    logger.security("Authentication failed - Token error", {
      error: error.message,
      errorType: error.name,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
      method: req.method,
      url: req.url,
      requestId: req.requestId,
    });
    if (error.name === "JsonWebTokenError") {
      return sendError(res, "Invalid token", 401);
    }
    if (error.name === "TokenExpiredError") {
      return sendError(res, "Token expired", 401);
    }
    return sendError(res, "Authentication failed", 401);
  }
};

// Authorization middleware - check if user has required role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.security("Authorization failed - No authenticated user", {
        requiredRoles: roles,
        ip: req.ip || req.connection.remoteAddress,
        method: req.method,
        url: req.url,
        requestId: req.requestId,
      });
      return sendError(res, "Authentication required", 401);
    }

    const hasRequiredRole = roles.some((role) => hasRole(req.user.role, role));

    if (!hasRequiredRole) {
      logger.security("Authorization failed - Insufficient permissions", {
        userId: req.user.id,
        username: req.user.username,
        userRole: req.user.role,
        requiredRoles: roles,
        ip: req.ip || req.connection.remoteAddress,
        method: req.method,
        url: req.url,
        requestId: req.requestId,
      });
      return sendError(res, "Insufficient permissions", 403);
    }

    logger.audit("Authorization successful", {
      userId: req.user.id,
      username: req.user.username,
      userRole: req.user.role,
      requiredRoles: roles,
      ip: req.ip || req.connection.remoteAddress,
      method: req.method,
      url: req.url,
      requestId: req.requestId,
    });

    next();
  };
};

// Resource ownership middleware - check if user owns the resource or has sufficient role
const checkResourceAccess = (resourceIdParam = "id", allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required", 401);
      }

      const resourceId = req.params[resourceIdParam];
      const isOwner = resourceId === req.user.id;

      // Check if user has role-based access or owns the resource
      const hasRoleAccess = allowedRoles.some((role) =>
        hasRole(req.user.role, role)
      );

      if (!hasRoleAccess && !isOwner) {
        return sendError(res, "Access denied", 403);
      }

      req.isOwner = isOwner;
      next();
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  };
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (!req.user) {
    logger.security("Admin access denied - No authenticated user", {
      ip: req.ip || req.connection.remoteAddress,
      method: req.method,
      url: req.url,
      requestId: req.requestId,
    });
    return sendError(res, "Authentication required", 401);
  }

  if (req.user.role !== "ADMIN") {
    logger.security("Admin access denied - Insufficient role", {
      userId: req.user.id,
      username: req.user.username,
      userRole: req.user.role,
      requiredRole: "ADMIN",
      ip: req.ip || req.connection.remoteAddress,
      method: req.method,
      url: req.url,
      requestId: req.requestId,
    });
    return sendError(res, "Admin access required", 403);
  }

  logger.audit("Admin access granted", {
    userId: req.user.id,
    username: req.user.username,
    userRole: req.user.role,
    ip: req.ip || req.connection.remoteAddress,
    method: req.method,
    url: req.url,
    requestId: req.requestId,
  });

  next();
};

// Team Lead or Admin middleware
const teamLeadOrAdmin = (req, res, next) => {
  if (!req.user) {
    logger.security("Team Lead/Admin access denied - No authenticated user", {
      ip: req.ip || req.connection.remoteAddress,
      method: req.method,
      url: req.url,
      requestId: req.requestId,
    });
    return sendError(res, "Authentication required", 401);
  }

  if (!hasRole(req.user.role, "TEAM_LEAD")) {
    logger.security("Team Lead/Admin access denied - Insufficient role", {
      userId: req.user.id,
      username: req.user.username,
      userRole: req.user.role,
      requiredRole: "TEAM_LEAD or higher",
      ip: req.ip || req.connection.remoteAddress,
      method: req.method,
      url: req.url,
      requestId: req.requestId,
    });
    return sendError(res, "Team Lead or Admin access required", 403);
  }

  logger.audit("Team Lead/Admin access granted", {
    userId: req.user.id,
    username: req.user.username,
    userRole: req.user.role,
    ip: req.ip || req.connection.remoteAddress,
    method: req.method,
    url: req.url,
    requestId: req.requestId,
  });

  next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const user = req.user ? `User: ${req.user.username}` : "Anonymous";
    console.log(
      `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ${user}`
    );
  });

  next();
};

// Validation middleware
const validateRequest = (schema, source = "body") => {
  return (req, res, next) => {
    let validationSchema;

    // Handle nested schema structure (e.g., {body: Joi.object(), params: Joi.object()})
    if (schema && typeof schema === "object" && schema[source]) {
      validationSchema = schema[source];
    } else {
      // Handle direct schema (e.g., Joi.object())
      validationSchema = schema;
    }

    // Check if validationSchema is actually a Joi schema with validate method
    if (!validationSchema || typeof validationSchema.validate !== "function") {
      console.error("Invalid validation schema:", validationSchema);
      return sendError(
        res,
        {
          message: "Internal validation error",
        },
        500
      );
    }

    const data = source === "params" ? req.params : req.body;
    const { error, value } = validationSchema.validate(data, {
      abortEarly: false,
    });
    if (error) {
      const errorDetails = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      console.log("Validation error details:", {
        source,
        data,
        errors: errorDetails,
        schema: validationSchema.describe(),
      });

      return sendError(
        res,
        {
          message: "Validation error",
          details: errorDetails,
        },
        400
      );
    }

    if (source === "params") {
      req.validatedParams = value;
    } else {
      req.validatedBody = value;
    }

    next();
  };
};

// Rate limiting for auth endpoints
const authRateLimit = (windowMs = 15 * 60 * 1000, max = 5) => {
  const attempts = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!attempts.has(ip)) {
      attempts.set(ip, []);
    }

    const userAttempts = attempts.get(ip);
    const recentAttempts = userAttempts.filter((time) => now - time < windowMs);

    if (recentAttempts.length >= max) {
      return sendError(
        res,
        "Too many authentication attempts. Please try again later.",
        429
      );
    }

    recentAttempts.push(now);
    attempts.set(ip, recentAttempts);

    next();
  };
};

module.exports = {
  authenticateToken,
  authorize,
  checkResourceAccess,
  adminOnly,
  teamLeadOrAdmin,
  requestLogger,
  validateRequest,
  authRateLimit,
};
