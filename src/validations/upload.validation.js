// Validation schemas for file upload endpoints
const Joi = require("joi");

// Single file upload validation
const uploadFile = {
  body: Joi.object({
    description: Joi.string().max(500).allow("").messages({
      "string.max": "Description cannot exceed 500 characters",
    }),
    category: Joi.string()
      .valid(
        "GENERAL",
        "DOCUMENT",
        "IMAGE",
        "VIDEO",
        "AUDIO",
        "SCREENSHOT",
        "ARCHIVE",
        "CODE"
      )
      .default("GENERAL")
      .messages({
        "any.only":
          "Category must be one of: GENERAL, DOCUMENT, IMAGE, VIDEO, AUDIO, SCREENSHOT, ARCHIVE, CODE",
      }),
    isPublic: Joi.boolean().default(false).messages({
      "boolean.base": "isPublic must be a boolean value",
    }),
    projectId: Joi.string().uuid().allow("").messages({
      "string.guid": "Project ID must be a valid UUID",
    }),
    taskId: Joi.string().uuid().allow("").messages({
      "string.guid": "Task ID must be a valid UUID",
    }),
  }),
};

// Multiple files upload validation
const uploadFiles = {
  body: Joi.object({
    description: Joi.string().max(500).allow("").messages({
      "string.max": "Description cannot exceed 500 characters",
    }),
    category: Joi.string()
      .valid(
        "GENERAL",
        "DOCUMENT",
        "IMAGE",
        "VIDEO",
        "AUDIO",
        "SCREENSHOT",
        "ARCHIVE",
        "CODE"
      )
      .default("GENERAL")
      .messages({
        "any.only":
          "Category must be one of: GENERAL, DOCUMENT, IMAGE, VIDEO, AUDIO, SCREENSHOT, ARCHIVE, CODE",
      }),
    isPublic: Joi.boolean().default(false).messages({
      "boolean.base": "isPublic must be a boolean value",
    }),
    projectId: Joi.string().uuid().allow("").messages({
      "string.guid": "Project ID must be a valid UUID",
    }),
    taskId: Joi.string().uuid().allow("").messages({
      "string.guid": "Task ID must be a valid UUID",
    }),
  }),
};

// Get files validation
const getFiles = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      "number.integer": "Page must be an integer",
      "number.min": "Page must be at least 1",
    }),
    limit: Joi.number().integer().min(1).max(100).default(20).messages({
      "number.integer": "Limit must be an integer",
      "number.min": "Limit must be at least 1",
      "number.max": "Limit cannot exceed 100",
    }),
    category: Joi.string()
      .valid(
        "GENERAL",
        "DOCUMENT",
        "IMAGE",
        "VIDEO",
        "AUDIO",
        "SCREENSHOT",
        "ARCHIVE",
        "CODE"
      )
      .messages({
        "any.only":
          "Category must be one of: GENERAL, DOCUMENT, IMAGE, VIDEO, AUDIO, SCREENSHOT, ARCHIVE, CODE",
      }),
    projectId: Joi.string().uuid().messages({
      "string.guid": "Project ID must be a valid UUID",
    }),
    taskId: Joi.string().uuid().messages({
      "string.guid": "Task ID must be a valid UUID",
    }),
    search: Joi.string().max(100).messages({
      "string.max": "Search term cannot exceed 100 characters",
    }),
    sortBy: Joi.string()
      .valid("filename", "size", "category", "createdAt", "updatedAt")
      .default("createdAt")
      .messages({
        "any.only":
          "Sort by must be one of: filename, size, category, createdAt, updatedAt",
      }),
    sortOrder: Joi.string().valid("asc", "desc").default("desc").messages({
      "any.only": "Sort order must be either asc or desc",
    }),
  }),
};

// Get single file validation
const getFile = {
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.guid": "File ID must be a valid UUID",
      "any.required": "File ID is required",
    }),
  }),
};

// Update file validation
const updateFile = {
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.guid": "File ID must be a valid UUID",
      "any.required": "File ID is required",
    }),
  }),
  body: Joi.object({
    description: Joi.string().max(500).allow("").messages({
      "string.max": "Description cannot exceed 500 characters",
    }),
    isPublic: Joi.boolean().messages({
      "boolean.base": "isPublic must be a boolean value",
    }),
    category: Joi.string()
      .valid(
        "GENERAL",
        "DOCUMENT",
        "IMAGE",
        "VIDEO",
        "AUDIO",
        "SCREENSHOT",
        "ARCHIVE",
        "CODE"
      )
      .messages({
        "any.only":
          "Category must be one of: GENERAL, DOCUMENT, IMAGE, VIDEO, AUDIO, SCREENSHOT, ARCHIVE, CODE",
      }),
  })
    .min(1)
    .messages({
      "object.min": "At least one field must be provided for update",
    }),
};

// Delete file validation
const deleteFile = {
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.guid": "File ID must be a valid UUID",
      "any.required": "File ID is required",
    }),
  }),
};

// Screenshot upload validation
const uploadScreenshot = {
  body: Joi.object({
    description: Joi.string().max(500).allow("").messages({
      "string.max": "Description cannot exceed 500 characters",
    }),
    projectId: Joi.string().uuid().allow("").messages({
      "string.guid": "Project ID must be a valid UUID",
    }),
    taskId: Joi.string().uuid().allow("").messages({
      "string.guid": "Task ID must be a valid UUID",
    }),
    isPublic: Joi.boolean().default(false).messages({
      "boolean.base": "isPublic must be a boolean value",
    }),
  }),
};

// Bulk file operations validation
const bulkFileOperation = {
  body: Joi.object({
    operation: Joi.string()
      .valid("delete", "move", "update")
      .required()
      .messages({
        "any.only": "Operation must be one of: delete, move, update",
        "any.required": "Operation is required",
      }),
    fileIds: Joi.array()
      .items(Joi.string().uuid())
      .min(1)
      .max(50)
      .required()
      .messages({
        "array.min": "At least one file ID is required",
        "array.max": "Cannot process more than 50 files at once",
        "string.guid": "Each file ID must be a valid UUID",
        "any.required": "File IDs are required",
      }),
    data: Joi.object().when("operation", {
      is: "move",
      then: Joi.object({
        projectId: Joi.string().uuid().allow(null),
        taskId: Joi.string().uuid().allow(null),
      }),
      otherwise: Joi.object({
        isPublic: Joi.boolean(),
        category: Joi.string().valid(
          "GENERAL",
          "DOCUMENT",
          "IMAGE",
          "VIDEO",
          "AUDIO",
          "SCREENSHOT",
          "ARCHIVE",
          "CODE"
        ),
      }),
    }),
  }),
};

module.exports = {
  uploadFile,
  uploadFiles,
  getFiles,
  getFile,
  updateFile,
  deleteFile,
  uploadScreenshot,
  bulkFileOperation,
};
