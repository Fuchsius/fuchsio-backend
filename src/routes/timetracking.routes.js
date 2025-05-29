// Routes for time tracking management
const express = require("express");
const router = express.Router();

// Import controllers
const {
  createTimeEntry: createTimeEntryController,
  getTimeEntries: getTimeEntriesController,
  getTimeEntry: getTimeEntryController,
  updateTimeEntry: updateTimeEntryController,
  deleteTimeEntry: deleteTimeEntryController,
  submitTimeEntry: submitTimeEntryController,
  approveTimeEntry: approveTimeEntryController,
  startTimer: startTimerController,
  updateTimer: updateTimerController,
  getActiveTimer: getActiveTimerController,
  getTimeReport: getTimeReportController,
  bulkTimeEntryOperation: bulkTimeEntryOperationController,
} = require("../controllers/timetracking.controller");

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
const timetrackingValidation = require("../validations/timetracking.validation");

// All routes require authentication
router.use(asyncHandler(authenticateToken));

// Time Entry Management Routes
router.post(
  "/entries",
  validateRequest(timetrackingValidation.createTimeEntry),
  asyncHandler(createTimeEntryController)
);
router.get(
  "/entries",
  validateRequest(timetrackingValidation.getTimeEntries),
  asyncHandler(getTimeEntriesController)
);
router.get("/entries/:id", asyncHandler(getTimeEntryController));
router.put(
  "/entries/:id",
  validateRequest(timetrackingValidation.updateTimeEntry),
  asyncHandler(updateTimeEntryController)
);
router.delete("/entries/:id", asyncHandler(deleteTimeEntryController));

// Time Entry Workflow Routes
router.post(
  "/entries/:id/submit",
  validateRequest(timetrackingValidation.submitTimeEntry),
  asyncHandler(submitTimeEntryController)
);
router.post(
  "/entries/:id/approve",
  teamLeadOrAdmin,
  validateRequest(timetrackingValidation.approveTimeEntry),
  asyncHandler(approveTimeEntryController)
);

// Bulk Operations
router.post(
  "/entries/bulk",
  validateRequest(timetrackingValidation.bulkTimeEntryOperation),
  asyncHandler(bulkTimeEntryOperationController)
);

// Timer Session Routes
router.post(
  "/timer/start",
  validateRequest(timetrackingValidation.startTimer),
  asyncHandler(startTimerController)
);
router.put(
  "/timer/:id",
  validateRequest(timetrackingValidation.updateTimer),
  asyncHandler(updateTimerController)
);
router.get("/timer/active", asyncHandler(getActiveTimerController));

// Reporting Routes
router.get(
  "/reports",
  validateRequest(timetrackingValidation.getTimeReport),
  asyncHandler(getTimeReportController)
);

module.exports = router;
