// Routes for project messaging endpoints
const express = require("express");
const router = express.Router();

// Import controllers
const {
  sendMessage,
  getProjectMessages,
  updateMessage,
  deleteMessage,
  getMessageStats,
} = require("../controllers/message.controller");

// Import middleware
const { authenticateToken, validateRequest } = require("../middleware/auth");
const { asyncHandler } = require("../utils/helpers");

// Import validation schemas
const messageValidation = require("../validations/message.validation");

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/messages
 /**
 * @route   POST /api/messages
 * @desc    Send a message to project chat
 * @access  Project members, Creator, Admin
 */
router.post(
  "/",
  validateRequest(messageValidation.sendMessage),
  asyncHandler(sendMessage)
);

/**
 * @route   GET /api/messages/projects/:projectId
 * @desc    Get messages for a project with pagination
 * @access  Project members, Creator, Admin
 */
router.get(
  "/projects/:projectId",
  validateRequest(messageValidation.getProjectMessages, "params"),
  asyncHandler(getProjectMessages)
);

/**
 * @route   PUT /api/messages/:id
 * @desc    Update a message (sender only, within time limit)
 * @access  Message sender
 */
router.put(
  "/:id",
  validateRequest(messageValidation.updateMessage),
  asyncHandler(updateMessage)
);

/**
 * @route   DELETE /api/messages/:id
 * @desc    Delete a message
 * @access  Message sender, Project Creator, Admin
 */
router.delete(
  "/:id",
  validateRequest(messageValidation.deleteMessage, "params"),
  asyncHandler(deleteMessage)
);

/**
 * @route   GET /api/messages/projects/:projectId/stats
 * @desc    Get message statistics for a project
 * @access  Project members, Creator, Admin
 */
router.get(
  "/projects/:projectId/stats",
  validateRequest(messageValidation.getMessageStats, "params"),
  asyncHandler(getMessageStats)
);

module.exports = router;
