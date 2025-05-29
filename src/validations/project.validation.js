// Validation schemas for project management endpoints
const Joi = require("joi");

// Project creation validation
const createProject = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.min": "Project name must be at least 2 characters long",
    "string.max": "Project name cannot exceed 100 characters",
    "any.required": "Project name is required",
  }),
  description: Joi.string().max(1000).allow("").messages({
    "string.max": "Description cannot exceed 1000 characters",
  }),
  status: Joi.string()
    .valid("PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED")
    .default("PLANNING")
    .messages({
      "any.only":
        "Status must be one of: PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED",
    }),
  startDate: Joi.date().iso().messages({
    "date.format": "Start date must be in ISO format (YYYY-MM-DD)",
  }),
  endDate: Joi.date().iso().greater(Joi.ref("startDate")).messages({
    "date.format": "End date must be in ISO format (YYYY-MM-DD)",
    "date.greater": "End date must be after start date",
  }),
  budget: Joi.number().positive().precision(2).messages({
    "number.positive": "Budget must be a positive number",
    "number.precision": "Budget can have at most 2 decimal places",
  }),
  memberIds: Joi.array().items(Joi.string().uuid()).unique().messages({
    "array.unique": "Member IDs must be unique",
    "string.guid": "Each member ID must be a valid UUID",
  }),
});

// Project update validation
const updateProject = {
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.guid": "Project ID must be a valid UUID",
      "any.required": "Project ID is required",
    }),
  }),
  body: Joi.object({
    name: Joi.string().min(2).max(100).messages({
      "string.min": "Project name must be at least 2 characters long",
      "string.max": "Project name cannot exceed 100 characters",
    }),
    description: Joi.string().max(1000).allow("").messages({
      "string.max": "Description cannot exceed 1000 characters",
    }),
    status: Joi.string()
      .valid("PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED")
      .messages({
        "any.only":
          "Status must be one of: PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED",
      }),
    startDate: Joi.date().iso().messages({
      "date.format": "Start date must be in ISO format (YYYY-MM-DD)",
    }),
    endDate: Joi.date()
      .iso()
      .when("startDate", {
        is: Joi.exist(),
        then: Joi.date().greater(Joi.ref("startDate")),
        otherwise: Joi.date(),
      })
      .messages({
        "date.format": "End date must be in ISO format (YYYY-MM-DD)",
        "date.greater": "End date must be after start date",
      }),
    budget: Joi.number().positive().precision(2).messages({
      "number.positive": "Budget must be a positive number",
      "number.precision": "Budget can have at most 2 decimal places",
    }),
  })
    .min(1)
    .messages({
      "object.min": "At least one field must be provided for update",
    }),
};

// Get projects validation
const getProjects = {
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
      .valid("PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED")
      .messages({
        "any.only":
          "Status must be one of: PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED",
      }),
    search: Joi.string().max(100).messages({
      "string.max": "Search term cannot exceed 100 characters",
    }),
    sortBy: Joi.string()
      .valid("name", "status", "createdAt", "updatedAt", "startDate", "endDate")
      .default("createdAt")
      .messages({
        "any.only":
          "Sort by must be one of: name, status, createdAt, updatedAt, startDate, endDate",
      }),
    sortOrder: Joi.string().valid("asc", "desc").default("desc").messages({
      "any.only": "Sort order must be either asc or desc",
    }),
  }),
};

// Get single project validation
const getProject = {
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.guid": "Project ID must be a valid UUID",
      "any.required": "Project ID is required",
    }),
  }),
};

// Delete project validation
const deleteProject = {
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.guid": "Project ID must be a valid UUID",
      "any.required": "Project ID is required",
    }),
  }),
};

// Add project member validation
const addProjectMember = {
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.guid": "Project ID must be a valid UUID",
      "any.required": "Project ID is required",
    }),
  }),
  body: Joi.object({
    userId: Joi.string().uuid().required().messages({
      "string.guid": "User ID must be a valid UUID",
      "any.required": "User ID is required",
    }),
  }),
};

// Remove project member validation
const removeProjectMember = {
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.guid": "Project ID must be a valid UUID",
      "any.required": "Project ID is required",
    }),
    userId: Joi.string().uuid().required().messages({
      "string.guid": "User ID must be a valid UUID",
      "any.required": "User ID is required",
    }),
  }),
};

// Get project stats validation
const getProjectStats = {
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.guid": "Project ID must be a valid UUID",
      "any.required": "Project ID is required",
    }),
  }),
};

module.exports = {
  createProject,
  updateProject,
  getProjects,
  getProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  getProjectStats,
};
