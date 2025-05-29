const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./auth.routes");
const userRoutes = require("./users.routes");
const projectRoutes = require("./projects.routes");
const taskRoutes = require("./tasks.routes");
const messageRoutes = require("./messages.routes");
const timetrackingRoutes = require("./timetracking.routes");
const uploadRoutes = require("./upload.routes");
const realtimeRoutes = require("./realtime.routes");
const analyticsRoutes = require("./analytics.routes");

// Use route modules
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/projects", projectRoutes);
router.use("/tasks", taskRoutes);
router.use("/messages", messageRoutes);
router.use("/timetracking", timetrackingRoutes);
router.use("/upload", uploadRoutes);
router.use("/realtime", realtimeRoutes);
router.use("/analytics", analyticsRoutes);

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
      projects: {
        create: "POST /api/v1/projects (Admin/Team Lead)",
        list: "GET /api/v1/projects",
        get: "GET /api/v1/projects/:id",
        update: "PUT /api/v1/projects/:id (Admin/Creator)",
        delete: "DELETE /api/v1/projects/:id (Admin/Creator)",
        addMember:
          "POST /api/v1/projects/:id/members (Admin/Creator/Team Lead)",
        removeMember:
          "DELETE /api/v1/projects/:id/members/:userId (Admin/Creator)",
        stats: "GET /api/v1/projects/:id/stats",
      },
      tasks: {
        create: "POST /api/v1/tasks (Admin/Team Lead/Creator)",
        list: "GET /api/v1/tasks",
        myTasks: "GET /api/v1/tasks/my-tasks",
        get: "GET /api/v1/tasks/:id",
        update: "PUT /api/v1/tasks/:id",
        delete: "DELETE /api/v1/tasks/:id (Admin/Creator)",
        stats: "GET /api/v1/tasks/projects/:projectId/stats",
      },
      messages: {
        send: "POST /api/v1/messages",
        getProjectMessages: "GET /api/v1/messages/projects/:projectId",
        update: "PUT /api/v1/messages/:id (Sender only)",
        delete: "DELETE /api/v1/messages/:id (Sender/Creator/Admin)",
        stats: "GET /api/v1/messages/projects/:projectId/stats",
      },
      timetracking: {
        createEntry: "POST /api/v1/timetracking/entries",
        getEntries: "GET /api/v1/timetracking/entries",
        getEntry: "GET /api/v1/timetracking/entries/:id",
        updateEntry: "PUT /api/v1/timetracking/entries/:id",
        deleteEntry: "DELETE /api/v1/timetracking/entries/:id",
        submitEntry: "POST /api/v1/timetracking/entries/:id/submit",
        approveEntry:
          "POST /api/v1/timetracking/entries/:id/approve (Admin/Team Lead)",
        bulkOperations: "POST /api/v1/timetracking/entries/bulk",
        startTimer: "POST /api/v1/timetracking/timer/start",
        updateTimer: "PUT /api/v1/timetracking/timer/:id",
        getActiveTimer: "GET /api/v1/timetracking/timer/active",
        getReports: "GET /api/v1/timetracking/reports",
      },
      upload: {
        uploadFile: "POST /api/v1/upload/file",
        uploadFiles: "POST /api/v1/upload/files",
        uploadScreenshot: "POST /api/v1/upload/screenshot",
        getFiles: "GET /api/v1/upload",
        getFile: "GET /api/v1/upload/:id",
        downloadFile: "GET /api/v1/upload/:id/download",
        updateFile: "PUT /api/v1/upload/:id",
        deleteFile: "DELETE /api/v1/upload/:id",
        bulkDelete: "DELETE /api/v1/upload/bulk",
        bulkUpdate: "PUT /api/v1/upload/bulk",
      },
      realtime: {
        status: "GET /api/v1/realtime/status",
        onlineUsers: "GET /api/v1/realtime/users/online",
        projectUsers: "GET /api/v1/realtime/projects/:projectId/users",
        userStatus: "GET /api/v1/realtime/users/:userId/status",
        broadcast: "POST /api/v1/realtime/notifications/broadcast (Admin)",
        health: "GET /api/v1/realtime/health",
      },
      analytics: {
        dashboardStats: "GET /api/v1/analytics/dashboard",
        projectAnalytics: "GET /api/v1/analytics/projects/:projectId",
        teamProductivity:
          "GET /api/v1/analytics/team/productivity (Admin/Team Lead)",
        timeTrackingAnalytics: "GET /api/v1/analytics/time-tracking",
        customReport: "POST /api/v1/analytics/reports/custom",
      },
      health: "/health",
    },
    roles: ["ADMIN", "TEAM_LEAD", "EMPLOYEE"],
    documentation: "See API_DOCS.md for detailed documentation",
  });
});

module.exports = router;
