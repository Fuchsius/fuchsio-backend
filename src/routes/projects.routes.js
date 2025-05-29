// Routes for project management endpoints
const express = require("express");
const router = express.Router();

// Import controllers
const {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  getProjectStats,
} = require("../controllers/project.controller");

// Import middleware
const {
  authenticateToken,
  authorize,
  validateRequest,
  adminOnly,
  teamLeadOrAdmin,
} = require("../middleware/auth");
const { asyncHandler } = require("../utils/helpers");

// Import validation schemas
const projectValidation = require("../validations/project.validation");

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/projects
 * @desc    Create a new project
 * @access  Admin, Team Lead
 */
router.post(
  "/",
  teamLeadOrAdmin,
  validateRequest(projectValidation.createProject),
  asyncHandler(createProject)
);

/**
 * @route   GET /api/projects
 * @desc    Get all projects with filtering and pagination
 * @access  All authenticated users (with role-based filtering)
 */
router.get(
  "/",
  validateRequest(projectValidation.getProjects),
  asyncHandler(getProjects)
);

/**
 * @route   GET /api/projects/:id
 * @desc    Get project by ID
 * @access  Project members, Creator, Admin
 */
router.get(
  "/:id",
  validateRequest(projectValidation.getProject, "params"),
  asyncHandler(getProject)
);

/**
 * @route   PUT /api/projects/:id
 * @desc    Update project
 * @access  Admin, Project Creator
 */
router.put(
  "/:id",
  validateRequest(projectValidation.updateProject),
  asyncHandler(updateProject)
);

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete project
 * @access  Admin, Project Creator
 */
router.delete(
  "/:id",
  validateRequest(projectValidation.deleteProject, "params"),
  asyncHandler(deleteProject)
);

/**
 * @route   POST /api/projects/:id/members
 * @desc    Add member to project
 * @access  Admin, Project Creator, Team Lead (project member)
 */
router.post(
  "/:id/members",
  validateRequest(projectValidation.addProjectMember),
  asyncHandler(addProjectMember)
);

/**
 * @route   DELETE /api/projects/:id/members/:userId
 * @desc    Remove member from project
 * @access  Admin, Project Creator
 */
router.delete(
  "/:id/members/:userId",
  validateRequest(projectValidation.removeProjectMember, "params"),
  asyncHandler(removeProjectMember)
);

/**
 * @route   GET /api/projects/:id/stats
 * @desc    Get project statistics
 * @access  Project members, Creator, Admin
 */
router.get(
  "/:id/stats",
  validateRequest(projectValidation.getProjectStats, "params"),
  asyncHandler(getProjectStats)
);

module.exports = router;
