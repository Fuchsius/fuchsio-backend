const express = require("express");
const {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  logoutFromAllDevices,
  changePassword,
  getCurrentUser,
  cleanExpiredTokens,
} = require("../controllers/auth.controller");
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
} = require("../middleware/auth");
const { asyncHandler } = require("../utils/helpers");

const router = express.Router();

// Clean up expired tokens periodically
setInterval(cleanExpiredTokens, 24 * 60 * 60 * 1000); // Daily cleanup

// Register new user
router.post(
  "/register",
  authRateLimit(15 * 60 * 1000, 5), // 5 attempts per 15 minutes
  validateRequest(registerSchema),
  asyncHandler(registerUser)
);

// Login user
router.post(
  "/login",
  authRateLimit(15 * 60 * 1000, 5), // 5 attempts per 15 minutes
  validateRequest(loginSchema),
  asyncHandler(loginUser)
);

// Refresh access token
router.post(
  "/refresh",
  validateRequest(refreshTokenSchema),
  asyncHandler(refreshToken)
);

// Logout user
router.post(
  "/logout",
  authenticateToken,
  validateRequest(refreshTokenSchema),
  asyncHandler(logoutUser)
);

// Logout from all devices
router.post(
  "/logout-all",
  authenticateToken,
  asyncHandler(logoutFromAllDevices)
);

// Change password
router.post(
  "/change-password",
  authenticateToken,
  validateRequest(changePasswordSchema),
  asyncHandler(changePassword)
);

// Get current user profile
router.get("/me", authenticateToken, asyncHandler(getCurrentUser));

module.exports = router;
