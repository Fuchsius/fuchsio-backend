// Validation schemas for analytics endpoints
const Joi = require("joi");

// Project analytics validation
const projectAnalyticsSchema = {
  params: Joi.object({
    projectId: Joi.string().uuid().required(),
  }),
  query: Joi.object({
    timeframe: Joi.string()
      .valid("week", "month", "quarter", "year")
      .default("month"),
  }),
};

// Team productivity validation
const teamProductivitySchema = {
  query: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref("startDate")).optional(),
    teamMemberId: Joi.string().uuid().optional(),
  }),
};

// Time tracking analytics validation
const timeTrackingAnalyticsSchema = {
  query: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref("startDate")).optional(),
    projectId: Joi.string().uuid().optional(),
    groupBy: Joi.string()
      .valid("day", "week", "month", "user", "project")
      .default("day"),
  }),
};

// Custom report validation
const customReportSchema = {
  body: Joi.object({
    reportType: Joi.string()
      .valid(
        "overview",
        "productivity",
        "project_summary",
        "time_analysis",
        "team_performance",
        "custom"
      )
      .required(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref("startDate")).optional(),
    includeProjects: Joi.boolean().default(true),
    includeTasks: Joi.boolean().default(true),
    includeTimeTracking: Joi.boolean().default(true),
    includeUsers: Joi.boolean().default(false),
    projectIds: Joi.array().items(Joi.string().uuid()).default([]),
    userIds: Joi.array().items(Joi.string().uuid()).default([]),
  }),
};

module.exports = {
  projectAnalyticsSchema,
  teamProductivitySchema,
  timeTrackingAnalyticsSchema,
  customReportSchema,
};
