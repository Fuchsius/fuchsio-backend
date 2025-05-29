// Controller for project messaging/chat system
const { PrismaClient } = require("@prisma/client");
const { sendSuccess, sendError, sendPaginated } = require("../utils/helpers");

const prisma = new PrismaClient();

// Send message to project chat
const sendMessage = async (req, res) => {
  try {
    const { projectId, content } = req.validatedBody;

    // Check if user has access to this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR:
          req.user.role === "ADMIN"
            ? undefined
            : [
                { createdBy: req.user.id },
                {
                  members: {
                    some: {
                      userId: req.user.id,
                    },
                  },
                },
              ],
      },
    });

    if (!project) {
      return sendError(res, "Project not found or access denied", 404);
    }

    // Create message
    const message = await prisma.projectMessage.create({
      data: {
        content,
        projectId,
        sentBy: req.user.id,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    sendSuccess(res, message, "Message sent successfully", 201);
  } catch (error) {
    console.error("Send message error:", error);
    sendError(res, "Failed to send message", 500);
  }
};

// Get project messages with pagination
const getProjectMessages = async (req, res) => {
  try {
    const { projectId } = req.validatedParams;
    const { page = 1, limit = 20, sortOrder = "desc" } = req.validatedQuery;

    const skip = (page - 1) * limit;

    // Check if user has access to this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR:
          req.user.role === "ADMIN"
            ? undefined
            : [
                { createdBy: req.user.id },
                {
                  members: {
                    some: {
                      userId: req.user.id,
                    },
                  },
                },
              ],
      },
    });

    if (!project) {
      return sendError(res, "Project not found or access denied", 404);
    }

    // Get messages
    const [messages, total] = await Promise.all([
      prisma.projectMessage.findMany({
        where: { projectId },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: sortOrder },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.projectMessage.count({
        where: { projectId },
      }),
    ]);

    sendPaginated(res, messages, total, page, limit);
  } catch (error) {
    console.error("Get messages error:", error);
    sendError(res, "Failed to fetch messages", 500);
  }
};

// Update message (sender only, within edit time limit)
const updateMessage = async (req, res) => {
  try {
    const { id } = req.validatedParams;
    const { content } = req.validatedBody;

    // Find message
    const message = await prisma.projectMessage.findFirst({
      where: {
        id,
        sentBy: req.user.id, // Only sender can edit
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!message) {
      return sendError(res, "Message not found or permission denied", 404);
    }

    // Check if message is within edit time limit (e.g., 15 minutes)
    const editTimeLimit = 15 * 60 * 1000; // 15 minutes in milliseconds
    const messageAge = Date.now() - new Date(message.createdAt).getTime();

    if (messageAge > editTimeLimit) {
      return sendError(
        res,
        "Message can only be edited within 15 minutes of sending",
        400
      );
    }

    // Update message
    const updatedMessage = await prisma.projectMessage.update({
      where: { id },
      data: {
        content,
        isEdited: true,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    sendSuccess(res, updatedMessage, "Message updated successfully");
  } catch (error) {
    console.error("Update message error:", error);
    sendError(res, "Failed to update message", 500);
  }
};

// Delete message (sender, project creator, or admin)
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.validatedParams;

    // Find message with project info
    const message = await prisma.projectMessage.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            createdBy: true,
          },
        },
      },
    });

    if (!message) {
      return sendError(res, "Message not found", 404);
    }

    // Check permissions
    const canDelete =
      req.user.role === "ADMIN" ||
      message.sentBy === req.user.id ||
      message.project.createdBy === req.user.id;

    if (!canDelete) {
      return sendError(res, "Permission denied", 403);
    }

    // Delete message
    await prisma.projectMessage.delete({
      where: { id },
    });

    sendSuccess(res, null, "Message deleted successfully");
  } catch (error) {
    console.error("Delete message error:", error);
    sendError(res, "Failed to delete message", 500);
  }
};

// Get message statistics for a project
const getMessageStats = async (req, res) => {
  try {
    const { projectId } = req.validatedParams;

    // Check if user has access to this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR:
          req.user.role === "ADMIN"
            ? undefined
            : [
                { createdBy: req.user.id },
                {
                  members: {
                    some: {
                      userId: req.user.id,
                    },
                  },
                },
              ],
      },
    });

    if (!project) {
      return sendError(res, "Project not found or access denied", 404);
    }

    // Get message statistics
    const [totalMessages, todayMessages, senderStats] = await Promise.all([
      prisma.projectMessage.count({
        where: { projectId },
      }),
      prisma.projectMessage.count({
        where: {
          projectId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.projectMessage.groupBy({
        by: ["sentBy"],
        where: { projectId },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10, // Top 10 most active users
      }),
    ]);

    // Get sender details
    const senderIds = senderStats.map((stat) => stat.sentBy);
    const senders = await prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    // Combine sender stats with user details
    const senderStatsWithDetails = senderStats.map((stat) => ({
      ...stat,
      sender: senders.find((user) => user.id === stat.sentBy),
    }));

    const stats = {
      total: totalMessages,
      today: todayMessages,
      topSenders: senderStatsWithDetails,
    };

    sendSuccess(res, stats);
  } catch (error) {
    console.error("Get message stats error:", error);
    sendError(res, "Failed to fetch message statistics", 500);
  }
};

module.exports = {
  sendMessage,
  getProjectMessages,
  updateMessage,
  deleteMessage,
  getMessageStats,
};
