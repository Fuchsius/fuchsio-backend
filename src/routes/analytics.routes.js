// Routes for analytics and reporting endpoints
const express = require("express");
const router = express.Router();

// Import controller
const {
  getDashboardStats,
  getProjectAnalytics,
  getTeamProductivity,
  getTimeTrackingAnalytics,
  generateCustomReport,
} = require("../controllers/analytics.controller");

// Import middleware
const { authenticateToken, validateRequest } = require("../middleware/auth");

// Import validation schemas
const {
  projectAnalyticsSchema,
  teamProductivitySchema,
  timeTrackingAnalyticsSchema,
  customReportSchema,
} = require("../validations/analytics.validation");

/**
 * @route   GET /api/v1/analytics/dashboard
 * @desc    Get dashboard overview statistics
 * @access  Private (All authenticated users)
 * @query   startDate, endDate (optional date filters)
 */
router.get("/dashboard", authenticateToken, getDashboardStats);

/**
 * @route   GET /api/v1/analytics/projects/:projectId
 * @desc    Get detailed analytics for a specific project
 * @access  Private (Project members, Admin)
 * @params  projectId (required)
 * @query   timeframe (week, month, quarter, year)
 */
router.get(
  "/projects/:projectId",
  authenticateToken,
  validateRequest(projectAnalyticsSchema, "params"),
  getProjectAnalytics
);

/**
 * @route   GET /api/v1/analytics/team/productivity
 * @desc    Get team productivity metrics
 * @access  Private (Admin, Team Lead only)
 * @query   startDate, endDate, teamMemberId (optional filters)
 */
router.get(
  "/team/productivity",
  authenticateToken,
  validateRequest(teamProductivitySchema, "query"),
  getTeamProductivity
);

/**
 * @route   GET /api/v1/analytics/time-tracking
 * @desc    Get time tracking analytics with various grouping options
 * @access  Private (Users see their data, Admin/Team Lead see team data)
 * @query   startDate, endDate, projectId, groupBy (day, week, month, user, project)
 */
router.get(
  "/time-tracking",
  authenticateToken,
  validateRequest(timeTrackingAnalyticsSchema, "query"),
  getTimeTrackingAnalytics
);

/**
 * @route   POST /api/v1/analytics/reports/custom
 * @desc    Generate custom report based on specified criteria
 * @access  Private (Admin, Team Lead only)
 * @body    reportType, dateRange, filters, includeOptions
 */
router.post(
  "/reports/custom",
  authenticateToken,
  validateRequest(customReportSchema, "body"),
  generateCustomReport
);

module.exports = router;
