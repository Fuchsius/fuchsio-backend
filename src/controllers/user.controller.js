// Controller for user routes
const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("../utils/auth");
const { sendSuccess, sendError } = require("../utils/helpers");

const prisma = new PrismaClient();

// Update own profile
const updateProfile = async (req, res) => {
  const { firstName, lastName, email, username, avatar, position } =
    req.validatedBody;

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
      ...(avatar !== undefined && { avatar }),
      ...(position !== undefined && { position }),
    },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      avatar: true,
      position: true,
      accessToOthers: true,
      updatedAt: true,
    },
  });

  sendSuccess(res, updatedUser, "Profile updated successfully");
};

// Admin: Create new user
const createUser = async (req, res) => {
  const {
    email,
    username,
    password,
    firstName,
    lastName,
    role,
    avatar,
    position,
    accessToOthers,
  } = req.validatedBody;

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
      ...(avatar !== undefined && { avatar }),
      ...(position !== undefined && { position }),
      ...(accessToOthers !== undefined && { accessToOthers }),
    },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      avatar: true,
      position: true,
      accessToOthers: true,
      createdAt: true,
    },
  });

  sendSuccess(res, user, "User created successfully", 201);
};

// Admin: Update any user / Team Lead: Update employees only
const updateUser = async (req, res) => {
  const { id } = req.validatedParams;
  const {
    firstName,
    lastName,
    email,
    username,
    role,
    status,
    avatar,
    position,
    accessToOthers,
  } = req.validatedBody;

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
      ...(avatar !== undefined && { avatar }),
      ...(position !== undefined && { position }),
      ...(accessToOthers !== undefined && { accessToOthers }),
    },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      avatar: true,
      position: true,
      accessToOthers: true,
      updatedAt: true,
    },
  });

  sendSuccess(res, updatedUser, "User updated successfully");
};

// Admin: Delete user
const deleteUser = async (req, res) => {
  const { id } = req.validatedParams;

  // Get target user
  const targetUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!targetUser) {
    return sendError(res, "User not found", 404);
  }

  // Cannot delete self
  if (id === req.user.id) {
    return sendError(res, "Cannot delete your own account", 403);
  }

  // Delete user
  await prisma.user.delete({
    where: { id },
  });

  sendSuccess(res, null, "User deleted successfully");
};

// Get users by role (Admin/Team Lead)
const getUsersByRole = async (req, res) => {
  const { role } = req.params;

  // Validate role
  if (!["ADMIN", "TEAM_LEAD", "EMPLOYEE"].includes(role)) {
    return sendError(res, "Invalid role", 400);
  }
  // Get users by role
  const users = await prisma.user.findMany({
    where: { role },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      avatar: true,
      position: true,
      accessToOthers: true,
      createdAt: true,
      lastLogin: true,
    },
    orderBy: { createdAt: "desc" },
  });

  sendSuccess(res, users, `${users.length} users found`);
};

// Get user statistics (Admin only)
const getUserStats = async (req, res) => {
  // Get counts by role and status
  const roleCounts = await prisma.$queryRaw`
    SELECT role, COUNT(*) as count
    FROM users
    GROUP BY role
    ORDER BY count DESC
  `;

  const statusCounts = await prisma.$queryRaw`
    SELECT status, COUNT(*) as count
    FROM users
    GROUP BY status
    ORDER BY count DESC
  `;

  // Get total users count
  const totalUsers = await prisma.user.count();
  // Get recently created users
  const recentUsers = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      avatar: true,
      position: true,
      accessToOthers: true,
      createdAt: true,
    },
  });

  // Get recently active users
  const activeUsers = await prisma.user.findMany({
    where: { lastLogin: { not: null } },
    take: 5,
    orderBy: { lastLogin: "desc" },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      avatar: true,
      position: true,
      accessToOthers: true,
      lastLogin: true,
    },
  });

  sendSuccess(res, {
    totalUsers,
    roleCounts,
    statusCounts,
    recentUsers,
    activeUsers,
  });
};

// Activate/Deactivate user (Admin only)
const toggleUserStatus = async (req, res) => {
  const { id } = req.validatedParams;
  const { status } = req.validatedBody;

  // Get target user
  const targetUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!targetUser) {
    return sendError(res, "User not found", 404);
  }

  // Cannot change own status
  if (id === req.user.id) {
    return sendError(res, "Cannot change your own status", 403);
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

  sendSuccess(
    res,
    updatedUser,
    `User ${status === "ACTIVE" ? "activated" : "deactivated"} successfully`
  );
};

module.exports = {
  updateProfile,
  createUser,
  updateUser,
  deleteUser,
  getUsersByRole,
  getUserStats,
  toggleUserStatus,
};
