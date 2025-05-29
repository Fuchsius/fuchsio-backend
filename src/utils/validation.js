const Joi = require("joi");

// User registration validation
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  username: Joi.string().alphanum().min(3).max(30).required().messages({
    "string.alphanum": "Username should contain only alphanumeric characters",
    "string.min": "Username should be at least 3 characters long",
    "string.max": "Username should not exceed 30 characters",
    "any.required": "Username is required",
  }),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])"))
    .required()
    .messages({
      "string.min": "Password should be at least 8 characters long",
      "string.pattern.base":
        "Password should contain at least one lowercase letter, one uppercase letter, one number, and one special character",
      "any.required": "Password is required",
    }),
  firstName: Joi.string().min(2).max(50).required().messages({
    "string.min": "First name should be at least 2 characters long",
    "string.max": "First name should not exceed 50 characters",
    "any.required": "First name is required",
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    "string.min": "Last name should be at least 2 characters long",
    "string.max": "Last name should not exceed 50 characters",
    "any.required": "Last name is required",
  }),
  role: Joi.string()
    .valid("ADMIN", "TEAM_LEAD", "EMPLOYEE")
    .optional()
    .default("EMPLOYEE"),
});

// User login validation
const loginSchema = Joi.object({
  identifier: Joi.string().required().messages({
    "any.required": "Email or username is required",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

// Password change validation
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "any.required": "Current password is required",
  }),
  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])"))
    .required()
    .messages({
      "string.min": "New password should be at least 8 characters long",
      "string.pattern.base":
        "New password should contain at least one lowercase letter, one uppercase letter, one number, and one special character",
      "any.required": "New password is required",
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Password confirmation does not match new password",
      "any.required": "Password confirmation is required",
    }),
});

// Profile update validation
const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional(),
  username: Joi.string().alphanum().min(3).max(30).optional(),
});

// Admin user update validation
const adminUpdateUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional(),
  username: Joi.string().alphanum().min(3).max(30).optional(),
  role: Joi.string().valid("ADMIN", "TEAM_LEAD", "EMPLOYEE").optional(),
  status: Joi.string().valid("ACTIVE", "INACTIVE", "SUSPENDED").optional(),
});

// Refresh token validation
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    "any.required": "Refresh token is required",
  }),
});

// ID parameter validation
const idParamSchema = Joi.object({
  id: Joi.string().required().messages({
    "any.required": "User ID is required",
  }),
});

// User status update validation
const userStatusSchema = Joi.object({
  status: Joi.string()
    .valid("ACTIVE", "INACTIVE", "SUSPENDED")
    .required()
    .messages({
      "any.required": "Status is required",
      "any.only": "Status must be ACTIVE, INACTIVE, or SUSPENDED",
    }),
});

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
  adminUpdateUserSchema,
  refreshTokenSchema,
  idParamSchema,
  userStatusSchema,
};
