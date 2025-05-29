// Validation schemas for task management endpoints
const Joi = require("joi");

// Task creation validation
const createTask = {
  body: Joi.object({
    title: Joi.string().min(2).max(200).required().messages({
      "string.min": "Task title must be at least 2 characters long",
      "string.max": "Task title cannot exceed 200 characters",
      "any.required": "Task title is required",
    }),
    description: Joi.string().max(2000).allow("").messages({
      "string.max": "Description cannot exceed 2000 characters",
    }),
    projectId: Joi.string().uuid().required().messages({
      "string.guid": "Project ID must be a valid UUID",
      "any.required": "Project ID is required",
    }),
    assignedToId: Joi.string().uuid().messages({
      "string.guid": "Assigned to ID must be a valid UUID",
    }),
    priority: Joi.string()
      .valid("LOW", "MEDIUM", "HIGH", "URGENT")
      .default("MEDIUM")
      .messages({
        "any.only": "Priority must be one of: LOW, MEDIUM, HIGH, URGENT",
      }),
    dueDate: Joi.date().iso().min("now").messages({
      "date.format": "Due date must be in ISO format (YYYY-MM-DD)",
      "date.min": "Due date cannot be in the past",
    }),
    estimatedHours: Joi.number().positive().precision(2).max(1000).messages({
      "number.positive": "Estimated hours must be a positive number",
      "number.precision": "Estimated hours can have at most 2 decimal places",
      "number.max": "Estimated hours cannot exceed 1000",
    }),
  }),
};

// Task update validation
const updateTask = {
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.guid": "Task ID must be a valid UUID",
      "any.required": "Task ID is required",
    }),
  }),
  body: Joi.object({
    title: Joi.string().min(2).max(200).messages({
      "string.min": "Task title must be at least 2 characters long",
      "string.max": "Task title cannot exceed 200 characters",
    }),
    description: Joi.string().max(2000).allow("").messages({
      "string.max": "Description cannot exceed 2000 characters",
    }),
    assignedToId: Joi.string().uuid().allow(null).messages({
      "string.guid": "Assigned to ID must be a valid UUID",
    }),
    status: Joi.string()
      .valid("TODO", "IN_PROGRESS", "REVIEW", "COMPLETED", "CANCELLED")
      .messages({
        "any.only":
          "Status must be one of: TODO, IN_PROGRESS, REVIEW, COMPLETED, CANCELLED",
      }),
    priority: Joi.string().valid("LOW", "MEDIUM", "HIGH", "URGENT").messages({
      "any.only": "Priority must be one of: LOW, MEDIUM, HIGH, URGENT",
    }),
    dueDate: Joi.date().iso().allow(null).messages({
      "date.format": "Due date must be in ISO format (YYYY-MM-DD)",
    }),
    estimatedHours: Joi.number()
      .positive()
      .precision(2)
      .max(1000)
      .allow(null)
      .messages({
        "number.positive": "Estimated hours must be a positive number",
        "number.precision": "Estimated hours can have at most 2 decimal places",
        "number.max": "Estimated hours cannot exceed 1000",
      }),
    actualHours: Joi.number()
      .min(0)
      .precision(2)
      .max(1000)
      .allow(null)
      .messages({
        "number.min": "Actual hours cannot be negative",
        "number.precision": "Actual hours can have at most 2 decimal places",
        "number.max": "Actual hours cannot exceed 1000",
      }),
  })
    .min(1)
    .messages({
      "object.min": "At least one field must be provided for update",
    }),
};

// Get tasks validation
const getTasks = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      "number.integer": "Page must be an integer",
      "number.min": "Page must be at least 1",
    }),
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
      "number.integer": "Limit must be an integer",
      "number.min": "Limit must be at least 1",
      "number.max": "Limit cannot exceed 100",
    }),
    projectId: Joi.string().uuid().messages({
      "string.guid": "Project ID must be a valid UUID",
    }),
    assignedToId: Joi.string().uuid().messages({
      "string.guid": "Assigned to ID must be a valid UUID",
    }),
    status: Joi.string()
      .valid("TODO", "IN_PROGRESS", "REVIEW", "COMPLETED", "CANCELLED")
      .messages({
        "any.only":
          "Status must be one of: TODO, IN_PROGRESS, REVIEW, COMPLETED, CANCELLED",
      }),
    priority: Joi.string().valid("LOW", "MEDIUM", "HIGH", "URGENT").messages({
      "any.only": "Priority must be one of: LOW, MEDIUM, HIGH, URGENT",
    }),
    search: Joi.string().max(100).messages({
      "string.max": "Search term cannot exceed 100 characters",
    }),
    sortBy: Joi.string()
      .valid("title", "status", "priority", "dueDate", "createdAt", "updatedAt")
      .default("createdAt")
      .messages({
        "any.only":
          "Sort by must be one of: title, status, priority, dueDate, createdAt, updatedAt",
      }),
    sortOrder: Joi.string().valid("asc", "desc").default("desc").messages({
      "any.only": "Sort order must be either asc or desc",
    }),
  }),
};

// Get single task validation
const getTask = {
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.guid": "Task ID must be a valid UUID",
      "any.required": "Task ID is required",
    }),
  }),
};

// Delete task validation
const deleteTask = {
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.guid": "Task ID must be a valid UUID",
      "any.required": "Task ID is required",
    }),
  }),
};

// Get my tasks validation
const getMyTasks = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      "number.integer": "Page must be an integer",
      "number.min": "Page must be at least 1",
    }),
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
      "number.integer": "Limit must be an integer",
      "number.min": "Limit must be at least 1",
      "number.max": "Limit cannot exceed 100",
    }),
    status: Joi.string()
      .valid("TODO", "IN_PROGRESS", "REVIEW", "COMPLETED", "CANCELLED")
      .messages({
        "any.only":
          "Status must be one of: TODO, IN_PROGRESS, REVIEW, COMPLETED, CANCELLED",
      }),
    priority: Joi.string().valid("LOW", "MEDIUM", "HIGH", "URGENT").messages({
      "any.only": "Priority must be one of: LOW, MEDIUM, HIGH, URGENT",
    }),
    projectId: Joi.string().uuid().messages({
      "string.guid": "Project ID must be a valid UUID",
    }),
    search: Joi.string().max(100).messages({
      "string.max": "Search term cannot exceed 100 characters",
    }),
    sortBy: Joi.string()
      .valid("title", "status", "priority", "dueDate", "createdAt", "updatedAt")
      .default("createdAt")
      .messages({
        "any.only":
          "Sort by must be one of: title, status, priority, dueDate, createdAt, updatedAt",
      }),
    sortOrder: Joi.string().valid("asc", "desc").default("desc").messages({
      "any.only": "Sort order must be either asc or desc",
    }),
  }),
};

// Get task stats validation
const getTaskStats = {
  params: Joi.object({
    projectId: Joi.string().uuid().required().messages({
      "string.guid": "Project ID must be a valid UUID",
      "any.required": "Project ID is required",
    }),
  }),
};

module.exports = {
  createTask,
  updateTask,
  getTasks,
  getTask,
  deleteTask,
  getMyTasks,
  getTaskStats,
};
