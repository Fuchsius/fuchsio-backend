// Routes for file upload and management endpoints
const express = require("express");
const router = express.Router();

// Import controllers
const {
  uploadFile,
  uploadFiles,
  getFiles,
  getFile,
  downloadFile,
  updateFile,
  deleteFile,
  uploadScreenshot,
  bulkFileOperation,
} = require("../controllers/upload.controller");

// Import middleware
const { authenticateToken, validateRequest } = require("../middleware/auth");
const { uploadSingle, uploadMultiple } = require("../middleware/upload");
const { asyncHandler } = require("../utils/helpers");

// Import validation schemas
const uploadValidation = require("../validations/upload.validation");

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/v1/uploads/file
 * @desc    Upload a single file
 * @access  All authenticated users
 */
router.post(
  "/file",
  uploadSingle("file"),
  validateRequest(uploadValidation.uploadFile),
  asyncHandler(uploadFile)
);

/**
 * @route   POST /api/v1/uploads/files
 * @desc    Upload multiple files
 * @access  All authenticated users
 */
router.post(
  "/files",
  uploadMultiple("files", 10),
  validateRequest(uploadValidation.uploadFiles),
  asyncHandler(uploadFiles)
);

/**
 * @route   POST /api/v1/uploads/screenshot
 * @desc    Upload a screenshot
 * @access  All authenticated users
 */
router.post(
  "/screenshot",
  uploadSingle("screenshot"),
  validateRequest(uploadValidation.uploadScreenshot),
  asyncHandler(uploadScreenshot)
);

/**
 * @route   GET /api/v1/uploads
 * @desc    Get files with filtering and pagination
 * @access  All authenticated users (with access control)
 */
router.get(
  "/",
  validateRequest(uploadValidation.getFiles),
  asyncHandler(getFiles)
);

/**
 * @route   GET /api/v1/uploads/:id
 * @desc    Get file details by ID
 * @access  File owner, Project members, Admin
 */
router.get(
  "/:id",
  validateRequest(uploadValidation.getFile, "params"),
  asyncHandler(getFile)
);

/**
 * @route   GET /api/v1/uploads/:id/download
 * @desc    Download file by ID
 * @access  File owner, Project members, Admin
 */
router.get(
  "/:id/download",
  validateRequest(uploadValidation.getFile, "params"),
  asyncHandler(downloadFile)
);

/**
 * @route   PUT /api/v1/uploads/:id
 * @desc    Update file metadata
 * @access  File owner, Admin
 */
router.put(
  "/:id",
  validateRequest(uploadValidation.updateFile),
  asyncHandler(updateFile)
);

/**
 * @route   DELETE /api/v1/uploads/:id
 * @desc    Delete file
 * @access  File owner, Admin
 */
router.delete(
  "/:id",
  validateRequest(uploadValidation.deleteFile, "params"),
  asyncHandler(deleteFile)
);

/**
 * @route   POST /api/v1/uploads/bulk
 * @desc    Bulk file operations (delete, update, move)
 * @access  File owner, Admin
 */
router.post(
  "/bulk",
  validateRequest(uploadValidation.bulkFileOperation),
  asyncHandler(bulkFileOperation)
);

module.exports = router;
