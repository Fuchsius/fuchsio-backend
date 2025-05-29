/**
 * Socket.io Configuration
 * Handles WebSocket setup and event management
 */

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const notificationService = require("../services/notification.service");

/**
 * Initialize Socket.io server
 * @param {Object} server - HTTP server instance
 * @returns {Object} Socket.io instance
 */
function initializeSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",")
        : ["http://localhost:3000", "http://localhost:3001"],
      credentials: true,
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Initialize notification service
  notificationService.initialize(io);

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token || socket.handshake.headers.authorization;

      if (!token) {
        throw new Error("Authentication token missing");
      }

      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace("Bearer ", "");

      // Verify JWT token
      const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);

      // Attach user info to socket
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;

      console.log(`🔐 Socket authenticated for user ${decoded.userId}`);
      next();
    } catch (error) {
      console.error("❌ Socket authentication failed:", error.message);
      next(new Error("Authentication failed"));
    }
  });

  // Connection event handler
  io.on("connection", (socket) => {
    const userId = socket.userId;
    console.log(`🔌 User ${userId} connected to WebSocket`);

    // Add user to notification service
    notificationService.addUserSocket(userId, socket.id);

    // Handle user joining project rooms
    socket.on("join_project", (projectId) => {
      try {
        notificationService.joinProjectRoom(userId, projectId);

        // Notify other project members about user presence
        notificationService.notifyProject(
          projectId,
          notificationService.TYPES.USER_PRESENCE,
          {
            userId,
            action: "joined",
            timestamp: new Date().toISOString(),
          },
          userId
        );

        socket.emit("joined_project", { projectId, success: true });
      } catch (error) {
        console.error("❌ Error joining project room:", error);
        socket.emit("error", { message: "Failed to join project room" });
      }
    });

    // Handle user leaving project rooms
    socket.on("leave_project", (projectId) => {
      try {
        notificationService.leaveProjectRoom(userId, projectId);

        // Notify other project members about user leaving
        notificationService.notifyProject(
          projectId,
          notificationService.TYPES.USER_PRESENCE,
          {
            userId,
            action: "left",
            timestamp: new Date().toISOString(),
          },
          userId
        );

        socket.emit("left_project", { projectId, success: true });
      } catch (error) {
        console.error("❌ Error leaving project room:", error);
        socket.emit("error", { message: "Failed to leave project room" });
      }
    });

    // Handle typing indicators for project chat
    socket.on("typing_start", (data) => {
      const { projectId } = data;
      socket.to(`project_${projectId}`).emit("user_typing", {
        userId,
        projectId,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("typing_stop", (data) => {
      const { projectId } = data;
      socket.to(`project_${projectId}`).emit("user_stopped_typing", {
        userId,
        projectId,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle custom events from client
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: new Date().toISOString() });
    });

    // Handle getting online users for a project
    socket.on("get_project_users", (projectId) => {
      const projectUsers = notificationService.getProjectUsers(projectId);
      socket.emit("project_users", {
        projectId,
        users: projectUsers,
        count: projectUsers.length,
      });
    });

    // Handle getting system status
    socket.on("get_system_status", () => {
      socket.emit("system_status", {
        onlineUsers: notificationService.getOnlineUsersCount(),
        serverTime: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`🔌 User ${userId} disconnected: ${reason}`);

      // Remove user from notification service
      notificationService.removeUserSocket(userId);

      // Notify all project rooms where user was present about disconnection
      // This could be optimized by tracking which projects user was in
      console.log(`👋 User ${userId} has gone offline`);
    });

    // Handle connection errors
    socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
    });

    // Send initial connection success message
    socket.emit("connected", {
      message: "Successfully connected to Fuchsio real-time service",
      userId,
      timestamp: new Date().toISOString(),
      features: [
        "Real-time notifications",
        "Project collaboration",
        "Typing indicators",
        "User presence tracking",
      ],
    });
  });

  // Global error handler
  io.engine.on("connection_error", (err) => {
    console.error("❌ Socket.io connection error:", {
      message: err.message,
      description: err.description,
      context: err.context,
      type: err.type,
    });
  });

  console.log("🚀 Socket.io server initialized with real-time features");
  return io;
}

module.exports = { initializeSocketIO };
