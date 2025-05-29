// Validation schemas for project messaging endpoints
const Joi = require("joi");

// Send message validation
const sendMessage = {
  body: Joi.object({
    projectId: Joi.string().uuid().required().messages({
      "string.guid": "Project ID must be a valid UUID",
      "any.required": "Project ID is required",
    }),
    content: Joi.string().min(1).max(2000).required().messages({
      "string.min": "Message content cannot be empty",
      "string.max": "Message content cannot exceed 2000 characters",
      "any.required": "Message content is required",
    }),
  }),
};

// Get project messages validation
const getProjectMessages = {
  params: Joi.object({
    projectId: Joi.string().uuid().required().messages({
      "string.guid": "Project ID must be a valid UUID",
      "any.required": "Project ID is required",
    }),
  }),
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
    sortOrder: Joi.string().valid("asc", "desc").default("desc").messages({
      "any.only": "Sort order must be either asc or desc",
    }),
  }),
};

// Update message validation
const updateMessage = {
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.guid": "Message ID must be a valid UUID",
      "any.required": "Message ID is required",
    }),
  }),
  body: Joi.object({
    content: Joi.string().min(1).max(2000).required().messages({
      "string.min": "Message content cannot be empty",
      "string.max": "Message content cannot exceed 2000 characters",
      "any.required": "Message content is required",
    }),
  }),
};

// Delete message validation
const deleteMessage = {
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.guid": "Message ID must be a valid UUID",
      "any.required": "Message ID is required",
    }),
  }),
};

// Get message stats validation
const getMessageStats = {
  params: Joi.object({
    projectId: Joi.string().uuid().required().messages({
      "string.guid": "Project ID must be a valid UUID",
      "any.required": "Project ID is required",
    }),
  }),
};

module.exports = {
  sendMessage,
  getProjectMessages,
  updateMessage,
  deleteMessage,
  getMessageStats,
};
