/**
 * Notification Service
 * Handles real-time notifications using Socket.io
 */

class NotificationService {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // userId -> socketId mapping
    this.projectRooms = new Map(); // projectId -> Set of userIds
  }

  /**
   * Initialize Socket.io instance
   * @param {Object} io - Socket.io instance
   */
  initialize(io) {
    this.io = io;
    console.log("✅ Notification Service initialized");
  }

  /**
   * Add user to socket mapping
   * @param {string} userId - User ID
   * @param {string} socketId - Socket ID
   */
  addUserSocket(userId, socketId) {
    this.userSockets.set(userId.toString(), socketId);
    console.log(`🔌 User ${userId} connected with socket ${socketId}`);
  }

  /**
   * Remove user from socket mapping
   * @param {string} userId - User ID
   */
  removeUserSocket(userId) {
    const socketId = this.userSockets.get(userId.toString());
    if (socketId) {
      this.userSockets.delete(userId.toString());
      console.log(`🔌 User ${userId} disconnected from socket ${socketId}`);
    }
  }

  /**
   * Join user to project room
   * @param {string} userId - User ID
   * @param {string} projectId - Project ID
   */
  joinProjectRoom(userId, projectId) {
    const socketId = this.userSockets.get(userId.toString());
    if (socketId && this.io) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(`project_${projectId}`);

        // Track project room membership
        if (!this.projectRooms.has(projectId)) {
          this.projectRooms.set(projectId, new Set());
        }
        this.projectRooms.get(projectId).add(userId.toString());

        console.log(`👥 User ${userId} joined project room ${projectId}`);
      }
    }
  }

  /**
   * Leave user from project room
   * @param {string} userId - User ID
   * @param {string} projectId - Project ID
   */
  leaveProjectRoom(userId, projectId) {
    const socketId = this.userSockets.get(userId.toString());
    if (socketId && this.io) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.leave(`project_${projectId}`);

        // Remove from project room tracking
        if (this.projectRooms.has(projectId)) {
          this.projectRooms.get(projectId).delete(userId.toString());
          if (this.projectRooms.get(projectId).size === 0) {
            this.projectRooms.delete(projectId);
          }
        }

        console.log(`👥 User ${userId} left project room ${projectId}`);
      }
    }
  }

  /**
   * Send notification to specific user
   * @param {string} userId - Target user ID
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   */
  notifyUser(userId, type, data) {
    const socketId = this.userSockets.get(userId.toString());
    if (socketId && this.io) {
      this.io.to(socketId).emit("notification", {
        type,
        data,
        timestamp: new Date().toISOString(),
        userId,
      });
      console.log(`📢 Sent ${type} notification to user ${userId}`);
    }
  }

  /**
   * Send notification to all users in a project
   * @param {string} projectId - Project ID
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   * @param {string} excludeUserId - User ID to exclude (optional)
   */
  notifyProject(projectId, type, data, excludeUserId = null) {
    if (this.io) {
      const notification = {
        type,
        data,
        timestamp: new Date().toISOString(),
        projectId,
      };

      if (excludeUserId) {
        // Send to all users in project except the excluded one
        const projectUsers = this.projectRooms.get(projectId) || new Set();
        projectUsers.forEach((userId) => {
          if (userId !== excludeUserId.toString()) {
            this.notifyUser(userId, type, data);
          }
        });
      } else {
        // Send to all users in project room
        this.io.to(`project_${projectId}`).emit("notification", notification);
      }

      console.log(`📢 Sent ${type} notification to project ${projectId}`);
    }
  }

  /**
   * Send notification to multiple users
   * @param {Array} userIds - Array of user IDs
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   */
  notifyUsers(userIds, type, data) {
    userIds.forEach((userId) => {
      this.notifyUser(userId, type, data);
    });
  }

  /**
   * Broadcast to all connected users
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   */
  broadcast(type, data) {
    if (this.io) {
      this.io.emit("notification", {
        type,
        data,
        timestamp: new Date().toISOString(),
      });
      console.log(`📢 Broadcasted ${type} notification to all users`);
    }
  }

  /**
   * Get online users count
   * @returns {number} Number of connected users
   */
  getOnlineUsersCount() {
    return this.userSockets.size;
  }

  /**
   * Get users in project room
   * @param {string} projectId - Project ID
   * @returns {Array} Array of user IDs in the project room
   */
  getProjectUsers(projectId) {
    const projectUsers = this.projectRooms.get(projectId);
    return projectUsers ? Array.from(projectUsers) : [];
  }

  /**
   * Check if user is online
   * @param {string} userId - User ID
   * @returns {boolean} True if user is online
   */
  isUserOnline(userId) {
    return this.userSockets.has(userId.toString());
  }

  // Notification Types Constants
  static get TYPES() {
    return {
      // Task notifications
      TASK_CREATED: "task_created",
      TASK_UPDATED: "task_updated",
      TASK_ASSIGNED: "task_assigned",
      TASK_COMPLETED: "task_completed",
      TASK_COMMENT: "task_comment",

      // Project notifications
      PROJECT_CREATED: "project_created",
      PROJECT_UPDATED: "project_updated",
      PROJECT_MEMBER_ADDED: "project_member_added",
      PROJECT_MEMBER_REMOVED: "project_member_removed",

      // Message notifications
      MESSAGE_SENT: "message_sent",
      MESSAGE_UPDATED: "message_updated",
      MESSAGE_DELETED: "message_deleted",

      // Time tracking notifications
      TIME_ENTRY_SUBMITTED: "time_entry_submitted",
      TIME_ENTRY_APPROVED: "time_entry_approved",
      TIME_ENTRY_REJECTED: "time_entry_rejected",

      // File notifications
      FILE_UPLOADED: "file_uploaded",
      FILE_SHARED: "file_shared",

      // System notifications
      USER_PRESENCE: "user_presence",
      SYSTEM_ANNOUNCEMENT: "system_announcement",
    };
  }
}

module.exports = new NotificationService();
