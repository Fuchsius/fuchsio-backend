// Validation schemas for time tracking endpoints
const Joi = require("joi");

// Time entry creation validation
const createTimeEntry = {
  body: Joi.object({
    description: Joi.string().max(1000).allow("").messages({
      "string.max": "Description cannot exceed 1000 characters",
    }),
    hours: Joi.number().positive().precision(2).max(24).required().messages({
      "number.positive": "Hours must be a positive number",
      "number.precision": "Hours can have at most 2 decimal places",
      "number.max": "Hours cannot exceed 24 for a single entry",
      "any.required": "Hours is required",
    }),
    date: Joi.date().iso().max("now").required().messages({
      "date.format": "Date must be in ISO format (YYYY-MM-DD)",
      "date.max": "Date cannot be in the future",
      "any.required": "Date is required",
    }),
    taskId: Joi.string().uuid().messages({
      "string.guid": "Task ID must be a valid UUID",
    }),
    projectId: Joi.string().uuid().required().messages({
      "string.guid": "Project ID must be a valid UUID",
      "any.required": "Project ID is required",
    }),
    billable: Joi.boolean().default(true),
    notes: Joi.string().max(2000).allow("").messages({
      "string.max": "Notes cannot exceed 2000 characters",
    }),
  }),
};

// Time entry update validation
const updateTimeEntry = {
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.guid": "Time entry ID must be a valid UUID",
      "any.required": "Time entry ID is required",
    }),
  }),
  body: Joi.object({
    description: Joi.string().max(1000).allow("").messages({
      "string.max": "Description cannot exceed 1000 characters",
    }),
    hours: Joi.number().positive().precision(2).max(24).messages({
      "number.positive": "Hours must be a positive number",
      "number.precision": "Hours can have at most 2 decimal places",
      "number.max": "Hours cannot exceed 24 for a single entry",
    }),
    date: Joi.date().iso().max("now").messages({
      "date.format": "Date must be in ISO format (YYYY-MM-DD)",
      "date.max": "Date cannot be in the future",
    }),
    taskId: Joi.string().uuid().allow(null).messages({
      "string.guid": "Task ID must be a valid UUID",
    }),
    billable: Joi.boolean(),
    notes: Joi.string().max(2000).allow("").messages({
      "string.max": "Notes cannot exceed 2000 characters",
    }),
  }).min(1),
};

// Get time entries validation
const getTimeEntries = {
  query: Joi.object({
    page: Joi.number().positive().default(1).messages({
      "number.positive": "Page must be a positive number",
    }),
    limit: Joi.number().positive().max(100).default(20).messages({
      "number.positive": "Limit must be a positive number",
      "number.max": "Limit cannot exceed 100",
    }),
    projectId: Joi.string().uuid().messages({
      "string.guid": "Project ID must be a valid UUID",
    }),
    taskId: Joi.string().uuid().messages({
      "string.guid": "Task ID must be a valid UUID",
    }),
    userId: Joi.string().uuid().messages({
      "string.guid": "User ID must be a valid UUID",
    }),
    status: Joi.string()
      .valid("DRAFT", "SUBMITTED", "APPROVED", "REJECTED")
      .messages({
        "any.only":
          "Status must be one of: DRAFT, SUBMITTED, APPROVED, REJECTED",
      }),
    startDate: Joi.date().iso().messages({
      "date.format": "Start date must be in ISO format (YYYY-MM-DD)",
    }),
    endDate: Joi.date().iso().min(Joi.ref("startDate")).messages({
      "date.format": "End date must be in ISO format (YYYY-MM-DD)",
      "date.min": "End date must be after start date",
    }),
    billable: Joi.boolean(),
    sortBy: Joi.string()
      .valid("date", "hours", "createdAt", "updatedAt")
      .default("date")
      .messages({
        "any.only": "Sort by must be one of: date, hours, createdAt, updatedAt",
      }),
    sortOrder: Joi.string().valid("asc", "desc").default("desc").messages({
      "any.only": "Sort order must be either 'asc' or 'desc'",
    }),
  }),
};

// Timer session start validation
const startTimer = {
  body: Joi.object({
    description: Joi.string().max(1000).allow("").messages({
      "string.max": "Description cannot exceed 1000 characters",
    }),
    taskId: Joi.string().uuid().messages({
      "string.guid": "Task ID must be a valid UUID",
    }),
    projectId: Joi.string().uuid().required().messages({
      "string.guid": "Project ID must be a valid UUID",
      "any.required": "Project ID is required",
    }),
  }),
};

// Timer session update validation
const updateTimer = {
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.guid": "Timer session ID must be a valid UUID",
      "any.required": "Timer session ID is required",
    }),
  }),
  body: Joi.object({
    description: Joi.string().max(1000).allow("").messages({
      "string.max": "Description cannot exceed 1000 characters",
    }),
    action: Joi.string().valid("pause", "resume", "stop").required().messages({
      "any.only": "Action must be one of: pause, resume, stop",
      "any.required": "Action is required",
    }),
  }),
};

// Time entry approval validation
const approveTimeEntry = {
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.guid": "Time entry ID must be a valid UUID",
      "any.required": "Time entry ID is required",
    }),
  }),
  body: Joi.object({
    action: Joi.string().valid("approve", "reject").required().messages({
      "any.only": "Action must be either 'approve' or 'reject'",
      "any.required": "Action is required",
    }),
    notes: Joi.string().max(500).allow("").messages({
      "string.max": "Notes cannot exceed 500 characters",
    }),
  }),
};

// Time entry submission validation
const submitTimeEntry = {
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.guid": "Time entry ID must be a valid UUID",
      "any.required": "Time entry ID is required",
    }),
  }),
};

// Bulk time entry operations validation
const bulkTimeEntryOperation = {
  body: Joi.object({
    timeEntryIds: Joi.array()
      .items(Joi.string().uuid())
      .min(1)
      .max(50)
      .required()
      .messages({
        "array.min": "At least one time entry ID is required",
        "array.max": "Cannot process more than 50 time entries at once",
        "any.required": "Time entry IDs are required",
      }),
    action: Joi.string()
      .valid("submit", "approve", "reject", "delete")
      .required()
      .messages({
        "any.only": "Action must be one of: submit, approve, reject, delete",
        "any.required": "Action is required",
      }),
    notes: Joi.string().max(500).allow("").messages({
      "string.max": "Notes cannot exceed 500 characters",
    }),
  }),
};

// Time reporting validation
const getTimeReport = {
  query: Joi.object({
    startDate: Joi.date().iso().required().messages({
      "date.format": "Start date must be in ISO format (YYYY-MM-DD)",
      "any.required": "Start date is required",
    }),
    endDate: Joi.date().iso().min(Joi.ref("startDate")).required().messages({
      "date.format": "End date must be in ISO format (YYYY-MM-DD)",
      "date.min": "End date must be after start date",
      "any.required": "End date is required",
    }),
    projectId: Joi.string().uuid().messages({
      "string.guid": "Project ID must be a valid UUID",
    }),
    userId: Joi.string().uuid().messages({
      "string.guid": "User ID must be a valid UUID",
    }),
    groupBy: Joi.string()
      .valid("user", "project", "task", "date")
      .default("date")
      .messages({
        "any.only": "Group by must be one of: user, project, task, date",
      }),
    includeBreakdown: Joi.boolean().default(false),
    billableOnly: Joi.boolean().default(false),
  }),
};

module.exports = {
  createTimeEntry,
  updateTimeEntry,
  getTimeEntries,
  startTimer,
  updateTimer,
  approveTimeEntry,
  submitTimeEntry,
  bulkTimeEntryOperation,
  getTimeReport,
};
