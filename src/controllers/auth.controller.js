// Controller for authentication routes
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
const { sendSuccess, sendError } = require("../utils/helpers");

const prisma = new PrismaClient();

// Register new user
const registerUser = async (req, res) => {
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
};

// Login user
const loginUser = async (req, res) => {
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
};

// Refresh access token
const refreshToken = async (req, res) => {
  const { refreshToken: token } = req.validatedBody;

  try {
    // Verify refresh token
    const decoded = verifyToken(token, "refresh");

    // Check if token exists in database
    const tokenRecord = await prisma.refreshToken.findFirst({
      where: {
        token,
        userId: decoded.id,
      },
      include: {
        user: true,
      },
    });

    if (!tokenRecord) {
      return sendError(res, "Invalid refresh token", 401);
    }

    // Check if token is expired
    if (new Date(tokenRecord.expiresAt) < new Date()) {
      // Delete expired token
      await prisma.refreshToken.delete({
        where: { id: tokenRecord.id },
      });
      return sendError(res, "Refresh token expired", 401);
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      tokenRecord.user
    );

    // Delete old token and store new one
    await prisma.refreshToken.delete({
      where: { id: tokenRecord.id },
    });
    await storeRefreshToken(tokenRecord.user.id, newRefreshToken);

    sendSuccess(
      res,
      {
        accessToken,
        refreshToken: newRefreshToken,
      },
      "Token refreshed successfully"
    );
  } catch (error) {
    return sendError(res, "Invalid refresh token", 401);
  }
};

// Logout user
const logoutUser = async (req, res) => {
  const { refreshToken: token } = req.validatedBody;

  // Remove refresh token from database
  await removeRefreshToken(token);

  sendSuccess(res, null, "Logged out successfully");
};

// Logout from all devices
const logoutFromAllDevices = async (req, res) => {
  // Delete all refresh tokens for this user
  await prisma.refreshToken.deleteMany({
    where: {
      userId: req.user.id,
    },
  });

  sendSuccess(res, null, "Logged out from all devices");
};

// Change password
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.validatedBody;

  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  // Verify current password
  const isPasswordValid = await comparePassword(currentPassword, user.password);
  if (!isPasswordValid) {
    return sendError(res, "Current password is incorrect", 400);
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password
  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedPassword },
  });

  // Logout from all devices (optional)
  await prisma.refreshToken.deleteMany({
    where: {
      userId: req.user.id,
    },
  });

  sendSuccess(res, null, "Password changed successfully");
};

// Get current user profile
const getCurrentUser = async (req, res) => {
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
      lastLogin: true,
    },
  });

  sendSuccess(res, user);
};

module.exports = {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  logoutFromAllDevices,
  changePassword,
  getCurrentUser,
  cleanExpiredTokens,
};
