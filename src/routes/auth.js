const express = require("express");
const { PrismaClient } = require("@prisma/client");
const {
  hashPassword,
  comparePassword,
  generateTokens,
  storeRefreshToken,
  removeRefreshToken,
  verifyToken,
  cleanExpiredTokens,
} = require("../utils/auth");
const { sendSuccess, sendError, asyncHandler } = require("../utils/helpers");
const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  refreshTokenSchema,
} = require("../utils/validation");
const {
  authenticateToken,
  validateRequest,
  authRateLimit,
  adminOnly,
  teamLeadOrAdmin,
} = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Clean up expired tokens periodically
setInterval(cleanExpiredTokens, 24 * 60 * 60 * 1000); // Daily cleanup

// Register new user
router.post(
  "/register",
  authRateLimit(15 * 60 * 1000, 5), // 5 attempts per 15 minutes
  validateRequest(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, username, password, firstName, lastName, role } =
      req.validatedBody;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return sendError(res, "Email already registered", 400);
      }
      if (existingUser.username === username) {
        return sendError(res, "Username already taken", 400);
      }
    }

    // Only admins can create admin or team lead accounts
    if (role && role !== "EMPLOYEE") {
      if (!req.user || req.user.role !== "ADMIN") {
        return sendError(
          res,
          "Only admins can create admin or team lead accounts",
          403
        );
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || "EMPLOYEE",
        createdBy: req.user?.id || null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    sendSuccess(res, user, "User registered successfully", 201);
  })
);

// Login user
router.post(
  "/login",
  authRateLimit(15 * 60 * 1000, 5), // 5 attempts per 15 minutes
  validateRequest(loginSchema),
  asyncHandler(async (req, res) => {
    const { identifier, password } = req.validatedBody;

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user) {
      return sendError(res, "Invalid credentials", 401);
    }

    // Check if user is active
    if (user.status !== "ACTIVE") {
      return sendError(res, "Account is not active", 401);
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return sendError(res, "Invalid credentials", 401);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token
    await storeRefreshToken(user.id, refreshToken);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    sendSuccess(
      res,
      {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      },
      "Login successful"
    );
  })
);

// Refresh access token
router.post(
  "/refresh",
  validateRequest(refreshTokenSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.validatedBody;

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyToken(refreshToken, "refresh");
    } catch (error) {
      return sendError(res, "Invalid refresh token", 401);
    }

    // Check if refresh token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!storedToken) {
      return sendError(res, "Invalid refresh token", 401);
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      await removeRefreshToken(refreshToken);
      return sendError(res, "Refresh token expired", 401);
    }

    // Check if user is still active
    if (storedToken.user.status !== "ACTIVE") {
      await removeRefreshToken(refreshToken);
      return sendError(res, "User account is not active", 401);
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      storedToken.user
    );

    // Remove old refresh token and store new one
    await removeRefreshToken(refreshToken);
    await storeRefreshToken(storedToken.user.id, newRefreshToken);

    sendSuccess(
      res,
      {
        accessToken,
        refreshToken: newRefreshToken,
      },
      "Token refreshed successfully"
    );
  })
);

// Logout user
router.post(
  "/logout",
  authenticateToken,
  validateRequest(refreshTokenSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.validatedBody;

    // Remove refresh token
    await removeRefreshToken(refreshToken);

    sendSuccess(res, null, "Logout successful");
  })
);

// Logout from all devices
router.post(
  "/logout-all",
  authenticateToken,
  asyncHandler(async (req, res) => {
    // Remove all refresh tokens for user
    await prisma.refreshToken.deleteMany({
      where: { userId: req.user.id },
    });

    sendSuccess(res, null, "Logged out from all devices");
  })
);

// Change password
router.post(
  "/change-password",
  authenticateToken,
  validateRequest(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.validatedBody;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      return sendError(res, "Current password is incorrect", 400);
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedNewPassword },
    });

    // Logout from all devices (security measure)
    await prisma.refreshToken.deleteMany({
      where: { userId: req.user.id },
    });

    sendSuccess(
      res,
      null,
      "Password changed successfully. Please log in again."
    );
  })
);

// Get current user profile
router.get(
  "/me",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    sendSuccess(res, user, "Profile retrieved successfully");
  })
);

// Get all users (Admin only)
router.get(
  "/users",
  authenticateToken,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, role, status, search } = req.query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { username: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          createdAt: true,
          lastLogin: true,
          creator: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    sendSuccess(
      res,
      {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Users retrieved successfully"
    );
  })
);

// Get user by ID (Admin/Team Lead)
router.get(
  "/users/:id",
  authenticateToken,
  teamLeadOrAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!user) {
      return sendError(res, "User not found", 404);
    }

    // Team leads can only view employees
    if (req.user.role === "TEAM_LEAD" && user.role !== "EMPLOYEE") {
      return sendError(res, "Access denied", 403);
    }

    sendSuccess(res, user, "User retrieved successfully");
  })
);

module.exports = router;
