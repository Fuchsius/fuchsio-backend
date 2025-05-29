// Routes for task management endpoints
const express = require("express");
const router = express.Router();

// Import controllers
const {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  getMyTasks,
  getTaskStats,
} = require("../controllers/task.controller");

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
const taskValidation = require("../validations/task.validation");

// All routes require authentication
router.use(asyncHandler(authenticateToken));

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Admin, Team Lead, Project Creator
 */
router.post(
  "/",
  teamLeadOrAdmin,
  validateRequest(taskValidation.createTask),
  asyncHandler(createTask)
);

/**
 * @route   GET /api/tasks
 /**
 * @route   GET /api/tasks
 * @desc    Get all tasks with filtering and pagination
 * @access  All authenticated users (with role-based filtering)
 */
router.get(
  "/",
  validateRequest(taskValidation.getTasks),
  asyncHandler(getTasks)
);

/**
 * @route   GET /api/tasks/my-tasks
 * @desc    Get tasks assigned to current user
 * @access  All authenticated users
 */
router.get(
  "/my-tasks",
  validateRequest(taskValidation.getMyTasks),
  asyncHandler(getMyTasks)
);

/**
 * @route   GET /api/tasks/:id
 * @desc    Get task by ID
 * @access  Task assignee, Project members, Creator, Admin
 */
router.get(
  "/:id",
  validateRequest(taskValidation.getTask, "params"),
  asyncHandler(getTask)
);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task
 * @access  Admin, Project Creator, Team Lead, Task Assignee (limited)
 */
router.put(
  "/:id",
  validateRequest(taskValidation.updateTask),
  asyncHandler(updateTask)
);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete task
 * @access  Admin, Project Creator, Task Creator
 */
router.delete(
  "/:id",
  validateRequest(taskValidation.deleteTask, "params"),
  asyncHandler(deleteTask)
);

/**
 * @route   GET /api/tasks/projects/:projectId/stats
 * @desc    Get task statistics for a project
 * @access  Project members, Creator, Admin
 */
router.get(
  "/projects/:projectId/stats",
  validateRequest(taskValidation.getTaskStats, "params"),
  asyncHandler(getTaskStats)
);

module.exports = router;
