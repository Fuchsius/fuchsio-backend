const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Generate JWT token
const generateToken = (payload, type = "access") => {
  const secret =
    type === "refresh"
      ? process.env.JWT_REFRESH_SECRET
      : process.env.JWT_SECRET;
  const expiresIn =
    type === "refresh"
      ? process.env.JWT_REFRESH_EXPIRES_IN
      : process.env.JWT_EXPIRES_IN;

  return jwt.sign(payload, secret, { expiresIn });
};

// Verify JWT token
const verifyToken = (token, type = "access") => {
  const secret =
    type === "refresh"
      ? process.env.JWT_REFRESH_SECRET
      : process.env.JWT_SECRET;
  return jwt.verify(token, secret);
};

// Hash password
const hashPassword = async (password) => {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  return await bcrypt.hash(password, rounds);
};

// Compare password
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Generate tokens pair
const generateTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
  };

  const accessToken = generateToken(payload, "access");
  const refreshToken = generateToken({ id: user.id }, "refresh");

  return { accessToken, refreshToken };
};

// Store refresh token
const storeRefreshToken = async (userId, refreshToken) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt,
    },
  });
};

// Remove refresh token
const removeRefreshToken = async (token) => {
  await prisma.refreshToken.delete({
    where: { token },
  });
};

// Clean expired refresh tokens
const cleanExpiredTokens = async () => {
  await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
};

// Role hierarchy for permissions
const ROLE_HIERARCHY = {
  ADMIN: 3,
  TEAM_LEAD: 2,
  EMPLOYEE: 1,
};

// Check if user has required role or higher
const hasRole = (userRole, requiredRole) => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

// Check if user can access resource based on role
const canAccessResource = (userRole, requiredRole, isOwner = false) => {
  // Admin can access everything
  if (userRole === "ADMIN") return true;

  // Team leads can access their own resources and employee resources
  if (userRole === "TEAM_LEAD") {
    return requiredRole !== "ADMIN" || isOwner;
  }

  // Employees can only access their own resources
  if (userRole === "EMPLOYEE") {
    return isOwner;
  }

  return false;
};

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  generateTokens,
  storeRefreshToken,
  removeRefreshToken,
  cleanExpiredTokens,
  hasRole,
  canAccessResource,
  ROLE_HIERARCHY,
  prisma,
};
