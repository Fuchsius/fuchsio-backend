const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("../utils/auth");
const { sendSuccess, sendError, asyncHandler } = require("../utils/helpers");
const {
  updateProfileSchema,
  adminUpdateUserSchema,
  idParamSchema,
  registerSchema,
} = require("../utils/validation");
const {
  authenticateToken,
  validateRequest,
  adminOnly,
  teamLeadOrAdmin,
  checkResourceAccess,
} = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Update own profile
router.put(
  "/profile",
  authenticateToken,
  validateRequest(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const { firstName, lastName, email, username } = req.validatedBody;

    // Check if email/username is already taken by another user
    if (email || username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: req.user.id } },
            {
              OR: [email ? { email } : {}, username ? { username } : {}].filter(
                (obj) => Object.keys(obj).length > 0
              ),
            },
          ],
        },
      });

      if (existingUser) {
        if (existingUser.email === email) {
          return sendError(res, "Email already in use", 400);
        }
        if (existingUser.username === username) {
          return sendError(res, "Username already taken", 400);
        }
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(username && { username }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    sendSuccess(res, updatedUser, "Profile updated successfully");
  })
);

// Admin: Create new user
router.post(
  "/",
  authenticateToken,
  adminOnly,
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
        createdBy: req.user.id,
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

    sendSuccess(res, user, "User created successfully", 201);
  })
);

// Admin: Update any user / Team Lead: Update employees only
router.put(
  "/:id",
  authenticateToken,
  validateRequest(idParamSchema, "params"),
  validateRequest(adminUpdateUserSchema),
  teamLeadOrAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const { firstName, lastName, email, username, role, status } =
      req.validatedBody;

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return sendError(res, "User not found", 404);
    }

    // Team leads can only update employees
    if (req.user.role === "TEAM_LEAD") {
      if (targetUser.role !== "EMPLOYEE") {
        return sendError(res, "Team leads can only update employees", 403);
      }
      // Team leads cannot change role or status
      if (role || status) {
        return sendError(
          res,
          "Team leads cannot change user role or status",
          403
        );
      }
    }

    // Prevent users from changing their own role (except admins)
    if (id === req.user.id && role && req.user.role !== "ADMIN") {
      return sendError(res, "Cannot change your own role", 403);
    }

    // Check if email/username is already taken by another user
    if (email || username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [email ? { email } : {}, username ? { username } : {}].filter(
                (obj) => Object.keys(obj).length > 0
              ),
            },
          ],
        },
      });

      if (existingUser) {
        if (existingUser.email === email) {
          return sendError(res, "Email already in use", 400);
        }
        if (existingUser.username === username) {
          return sendError(res, "Username already taken", 400);
        }
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(username && { username }),
        ...(role && { role }),
        ...(status && { status }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    // If user is deactivated, remove all their refresh tokens
    if (status && status !== "ACTIVE") {
      await prisma.refreshToken.deleteMany({
        where: { userId: id },
      });
    }

    sendSuccess(res, updatedUser, "User updated successfully");
  })
);

// Admin: Delete user
router.delete(
  "/:id",
  authenticateToken,
  validateRequest(idParamSchema, "params"),
  adminOnly,
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return sendError(res, "Cannot delete your own account", 400);
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return sendError(res, "User not found", 404);
    }

    // Delete user (this will cascade delete refresh tokens)
    await prisma.user.delete({
      where: { id },
    });

    sendSuccess(res, null, "User deleted successfully");
  })
);

// Get users by role (Admin/Team Lead)
router.get(
  "/role/:role",
  authenticateToken,
  teamLeadOrAdmin,
  asyncHandler(async (req, res) => {
    const { role } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Validate role
    if (!["ADMIN", "TEAM_LEAD", "EMPLOYEE"].includes(role)) {
      return sendError(res, "Invalid role", 400);
    }

    // Team leads can only view employees
    if (req.user.role === "TEAM_LEAD" && role !== "EMPLOYEE") {
      return sendError(res, "Team leads can only view employees", 403);
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { role },
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
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where: { role } }),
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
      `${role} users retrieved successfully`
    );
  })
);

// Get user statistics (Admin only)
router.get(
  "/stats",
  authenticateToken,
  adminOnly,
  asyncHandler(async (req, res) => {
    const [
      totalUsers,
      activeUsers,
      adminCount,
      teamLeadCount,
      employeeCount,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "TEAM_LEAD" } }),
      prisma.user.count({ where: { role: "EMPLOYEE" } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
    ]);

    const stats = {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      roleDistribution: {
        admin: adminCount,
        teamLead: teamLeadCount,
        employee: employeeCount,
      },
      recentRegistrations: recentUsers,
    };

    sendSuccess(res, stats, "User statistics retrieved successfully");
  })
);

// Activate/Deactivate user (Admin only)
router.patch(
  "/:id/status",
  authenticateToken,
  validateRequest(idParamSchema, "params"),
  adminOnly,
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const { status } = req.body;

    // Validate status
    if (!["ACTIVE", "INACTIVE", "SUSPENDED"].includes(status)) {
      return sendError(
        res,
        "Invalid status. Must be ACTIVE, INACTIVE, or SUSPENDED",
        400
      );
    }

    // Prevent admin from deactivating themselves
    if (id === req.user.id && status !== "ACTIVE") {
      return sendError(res, "Cannot deactivate your own account", 400);
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return sendError(res, "User not found", 404);
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    // If user is deactivated, remove all their refresh tokens
    if (status !== "ACTIVE") {
      await prisma.refreshToken.deleteMany({
        where: { userId: id },
      });
    }

    sendSuccess(res, updatedUser, `User status updated to ${status}`);
  })
);

module.exports = router;
