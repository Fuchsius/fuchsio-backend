/**
 * Real-time Routes
 * API endpoints for WebSocket status and real-time features
 */

const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { notificationService } = require("../utils/realtime");

/**
 * GET /api/v1/realtime/status
 * Get real-time server status
 */
router.get("/status", authenticateToken, (req, res) => {
  try {
    const status = {
      websocketEnabled: true,
      onlineUsers: notificationService.getOnlineUsersCount(),
      serverTime: new Date().toISOString(),
      uptime: process.uptime(),
      features: [
        "Real-time notifications",
        "Project collaboration",
        "Typing indicators",
        "User presence tracking",
        "File upload notifications",
        "Task and project updates",
      ],
    };

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("❌ Error getting real-time status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get real-time status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * GET /api/v1/realtime/users/online
 * Get count of online users
 */
router.get("/users/online", authenticateToken, (req, res) => {
  try {
    const onlineCount = notificationService.getOnlineUsersCount();

    res.json({
      success: true,
      data: {
        onlineUsers: onlineCount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error getting online users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get online users count",
    });
  }
});

/**
 * GET /api/v1/realtime/projects/:projectId/users
 * Get users currently in a project room
 */
router.get("/projects/:projectId/users", authenticateToken, (req, res) => {
  try {
    const { projectId } = req.params;
    const projectUsers = notificationService.getProjectUsers(projectId);

    res.json({
      success: true,
      data: {
        projectId,
        users: projectUsers,
        count: projectUsers.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error getting project users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get project users",
    });
  }
});

/**
 * GET /api/v1/realtime/users/:userId/status
 * Check if a specific user is online
 */
router.get("/users/:userId/status", authenticateToken, (req, res) => {
  try {
    const { userId } = req.params;
    const isOnline = notificationService.isUserOnline(userId);

    res.json({
      success: true,
      data: {
        userId,
        isOnline,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error checking user status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check user status",
    });
  }
});

/**
 * POST /api/v1/realtime/notifications/broadcast
 * Send system-wide announcement (Admin only)
 */
router.post("/notifications/broadcast", authenticateToken, (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can send system broadcasts",
      });
    }

    const { message, type = "info", data = {} } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Broadcast message is required",
      });
    }

    // Send system announcement
    const { systemNotifications } = require("../utils/realtime");
    systemNotifications.announcement(message, { type, ...data });

    res.json({
      success: true,
      message: "System announcement sent successfully",
      data: {
        message,
        type,
        sentAt: new Date().toISOString(),
        sentBy: {
          id: req.user.userId,
          username: req.user.username,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error sending broadcast:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send system broadcast",
    });
  }
});

/**
 * GET /api/v1/realtime/health
 * Health check for real-time services
 */
router.get("/health", (req, res) => {
  try {
    const health = {
      status: "healthy",
      websocket: {
        enabled: true,
        onlineUsers: notificationService.getOnlineUsersCount(),
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      },
    };

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    console.error("❌ Real-time health check failed:", error);
    res.status(500).json({
      success: false,
      message: "Real-time services unhealthy",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
