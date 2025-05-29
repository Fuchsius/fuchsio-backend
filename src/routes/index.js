const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./auth.routes");
const userRoutes = require("./users.routes");

// Use route modules
router.use("/auth", authRoutes);
router.use("/users", userRoutes);

// API info endpoint
router.get("/", (req, res) => {
  res.json({
    message: "Fuchsio Backend API v1",
    version: "1.0.0",
    endpoints: {
      auth: {
        register: "POST /api/v1/auth/register",
        login: "POST /api/v1/auth/login",
        refresh: "POST /api/v1/auth/refresh",
        logout: "POST /api/v1/auth/logout",
        me: "GET /api/v1/auth/me",
        changePassword: "POST /api/v1/auth/change-password",
      },
      users: {
        profile: "PUT /api/v1/users/profile",
        list: "GET /api/v1/auth/users (Admin)",
        create: "POST /api/v1/users (Admin)",
        update: "PUT /api/v1/users/:id (Admin/Team Lead)",
        delete: "DELETE /api/v1/users/:id (Admin)",
        stats: "GET /api/v1/users/stats (Admin)",
      },
      health: "/health",
    },
    roles: ["ADMIN", "TEAM_LEAD", "EMPLOYEE"],
    documentation: "See API_DOCS.md for detailed documentation",
  });
});

module.exports = router;
