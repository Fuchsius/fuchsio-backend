const express = require("express");
const {
  updateProfile,
  createUser,
  updateUser,
  deleteUser,
  getUsersByRole,
  getUserStats,
  toggleUserStatus,
} = require("../controllers/user.controller");
const {
  updateProfileSchema,
  adminUpdateUserSchema,
  idParamSchema,
  registerSchema,
  userStatusSchema,
} = require("../utils/validation");
const {
  authenticateToken,
  validateRequest,
  adminOnly,
  teamLeadOrAdmin,
  checkResourceAccess,
} = require("../middleware/auth");
const { asyncHandler } = require("../utils/helpers");

const router = express.Router();

// Update own profile
router.put(
  "/profile",
  authenticateToken,
  validateRequest(updateProfileSchema),
  asyncHandler(updateProfile)
);

// Admin: Create new user
router.post(
  "/",
  authenticateToken,
  adminOnly,
  validateRequest(registerSchema),
  asyncHandler(createUser)
);

// Admin: Update any user / Team Lead: Update employees only
router.put(
  "/:id",
  authenticateToken,
  validateRequest(idParamSchema, "params"),
  validateRequest(adminUpdateUserSchema),
  teamLeadOrAdmin,
  asyncHandler(updateUser)
);

// Admin: Delete user
router.delete(
  "/:id",
  authenticateToken,
  validateRequest(idParamSchema, "params"),
  adminOnly,
  asyncHandler(deleteUser)
);

// Get users by role (Admin/Team Lead)
router.get(
  "/role/:role",
  authenticateToken,
  teamLeadOrAdmin,
  asyncHandler(getUsersByRole)
);

// Get user statistics (Admin only)
router.get("/stats", authenticateToken, adminOnly, asyncHandler(getUserStats));

// Activate/Deactivate user (Admin only)
router.patch(
  "/:id/status",
  authenticateToken,
  validateRequest(idParamSchema, "params"),
  validateRequest(userStatusSchema),
  adminOnly,
  asyncHandler(toggleUserStatus)
);

module.exports = router;
