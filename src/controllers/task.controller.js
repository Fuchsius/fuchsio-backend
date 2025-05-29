// Controller for task management routes
const { PrismaClient } = require("@prisma/client");
const { sendSuccess, sendError, sendPaginated } = require("../utils/helpers");
const { hasRole } = require("../utils/auth");
const { taskNotifications } = require("../utils/realtime");

const prisma = new PrismaClient();

// Create new task (Admin/Team Lead/Project Creator only)
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      projectId,
      assignedToId,
      priority = "MEDIUM",
      dueDate,
      estimatedHours,
    } = req.validatedBody;

    // Check if project exists and user has permission to create tasks
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR:
          req.user.role === "ADMIN"
            ? undefined
            : [
                { createdBy: req.user.id },
                // Team leads can create tasks in projects they're members of
                req.user.role === "TEAM_LEAD"
                  ? {
                      members: {
                        some: {
                          userId: req.user.id,
                        },
                      },
                    }
                  : {},
              ],
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return sendError(res, "Project not found or permission denied", 404);
    }

    // Validate assignee (must be project member or creator)
    if (assignedToId) {
      const validAssignee =
        project.createdBy === assignedToId ||
        project.members.some((member) => member.userId === assignedToId);

      if (!validAssignee) {
        return sendError(
          res,
          "Cannot assign task to user who is not a project member",
          400
        );
      }
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        title,
        description,
        projectId,
        assignedToId,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        createdBy: req.user.id,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Send real-time notification
    try {
      taskNotifications.created(task, {
        id: req.user.id,
        username:
          req.user.username || `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email,
      });
    } catch (notificationError) {
      console.error("Task creation notification error:", notificationError);
      // Don't fail the request if notification fails
    }

    sendSuccess(res, task, "Task created successfully", 201);
  } catch (error) {
    console.error("Create task error:", error);
    sendError(res, "Failed to create task", 500);
  }
};

// Get tasks with filtering and pagination
const getTasks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      projectId,
      assignedToId,
      status,
      priority,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.validatedQuery;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};

    // Filter by project if specified
    if (projectId) {
      // Check if user has access to this project
      const projectAccess = await prisma.project.findFirst({
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

      if (!projectAccess) {
        return sendError(res, "Project not found or access denied", 404);
      }

      where.projectId = projectId;
    } else {
      // If no specific project, filter by user's accessible projects
      if (req.user.role !== "ADMIN") {
        where.project = {
          OR: [
            { createdBy: req.user.id },
            {
              members: {
                some: {
                  userId: req.user.id,
                },
              },
            },
          ],
        };
      }
    }

    // Additional filters
    if (assignedToId) where.assignedToId = assignedToId;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    // Search functionality
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Execute query
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          creator: {
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
      prisma.task.count({ where }),
    ]);

    sendPaginated(res, tasks, total, page, limit);
  } catch (error) {
    console.error("Get tasks error:", error);
    sendError(res, "Failed to fetch tasks", 500);
  }
};

// Get single task by ID
const getTask = async (req, res) => {
  try {
    const { id } = req.validatedParams;

    const task = await prisma.task.findFirst({
      where: {
        id,
        // User must have access to the project containing this task
        project:
          req.user.role === "ADMIN"
            ? undefined
            : {
                OR: [
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
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
            createdBy: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!task) {
      return sendError(res, "Task not found or access denied", 404);
    }

    sendSuccess(res, task);
  } catch (error) {
    console.error("Get task error:", error);
    sendError(res, "Failed to fetch task", 500);
  }
};

// Update task
const updateTask = async (req, res) => {
  try {
    const { id } = req.validatedParams;
    const updates = req.validatedBody;

    // Find task and check permissions
    const task = await prisma.task.findFirst({
      where: {
        id,
        project:
          req.user.role === "ADMIN"
            ? undefined
            : {
                OR: [
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
      },
      include: {
        project: {
          select: {
            id: true,
            createdBy: true,
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!task) {
      return sendError(res, "Task not found or access denied", 404);
    }

    // Check update permissions
    const isAdmin = req.user.role === "ADMIN";
    const isProjectCreator = task.project.createdBy === req.user.id;
    const isTeamLead =
      req.user.role === "TEAM_LEAD" &&
      task.project.members.some((member) => member.userId === req.user.id);
    const isTaskAssignee = task.assignedToId === req.user.id;

    // Employees can only update status of their own tasks
    if (!isAdmin && !isProjectCreator && !isTeamLead) {
      if (!isTaskAssignee) {
        return sendError(res, "Permission denied", 403);
      }
      // Limit what employees can update
      const allowedFields = ["status", "actualHours"];
      const hasUnallowedFields = Object.keys(updates).some(
        (field) => !allowedFields.includes(field)
      );
      if (hasUnallowedFields) {
        return sendError(
          res,
          "Employees can only update task status and actual hours",
          403
        );
      }
    }

    // Validate assignee if being updated
    if (updates.assignedToId) {
      const validAssignee =
        task.project.createdBy === updates.assignedToId ||
        task.project.members.some(
          (member) => member.userId === updates.assignedToId
        );

      if (!validAssignee) {
        return sendError(
          res,
          "Cannot assign task to user who is not a project member",
          400
        );
      }
    }

    // Prepare update data
    const updateData = { ...updates };
    if (updateData.dueDate) updateData.dueDate = new Date(updateData.dueDate);
    if (updateData.estimatedHours)
      updateData.estimatedHours = parseFloat(updateData.estimatedHours);
    if (updateData.actualHours)
      updateData.actualHours = parseFloat(updateData.actualHours);

    // Update task
    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Send real-time notification for task update
    try {
      taskNotifications.updated(
        updatedTask,
        {
          id: req.user.id,
          username:
            req.user.username || `${req.user.firstName} ${req.user.lastName}`,
          email: req.user.email,
        },
        updates
      );
    } catch (notificationError) {
      console.error("Task update notification error:", notificationError);
      // Don't fail the request if notification fails
    }

    sendSuccess(res, updatedTask, "Task updated successfully");
  } catch (error) {
    console.error("Update task error:", error);
    sendError(res, "Failed to update task", 500);
  }
};

// Delete task (Admin/Project Creator/Team Lead only)
const deleteTask = async (req, res) => {
  try {
    const { id } = req.validatedParams;

    // Find task and check permissions
    const task = await prisma.task.findFirst({
      where: {
        id,
        project:
          req.user.role === "ADMIN"
            ? undefined
            : {
                OR: [
                  { createdBy: req.user.id },
                  req.user.role === "TEAM_LEAD"
                    ? {
                        members: {
                          some: {
                            userId: req.user.id,
                          },
                        },
                      }
                    : {},
                ],
              },
      },
      include: {
        project: {
          select: {
            createdBy: true,
          },
        },
      },
    });

    if (!task) {
      return sendError(res, "Task not found or access denied", 404);
    }

    // Check delete permissions
    const canDelete =
      req.user.role === "ADMIN" ||
      task.project.createdBy === req.user.id ||
      task.createdBy === req.user.id;

    if (!canDelete) {
      return sendError(res, "Permission denied", 403);
    }

    // Delete task
    await prisma.task.delete({
      where: { id },
    });

    sendSuccess(res, null, "Task deleted successfully");
  } catch (error) {
    console.error("Delete task error:", error);
    sendError(res, "Failed to delete task", 500);
  }
};

// Get my tasks (tasks assigned to current user)
const getMyTasks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      projectId,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.validatedQuery;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      assignedToId: req.user.id,
    };

    // Additional filters
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (projectId) where.projectId = projectId;

    // Search functionality
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Execute query
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          creator: {
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
      prisma.task.count({ where }),
    ]);

    sendPaginated(res, tasks, total, page, limit);
  } catch (error) {
    console.error("Get my tasks error:", error);
    sendError(res, "Failed to fetch your tasks", 500);
  }
};

// Get task statistics for a project
const getTaskStats = async (req, res) => {
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

    // Get task statistics
    const [statusStats, priorityStats, assigneeStats, overdueTasks] =
      await Promise.all([
        prisma.task.groupBy({
          by: ["status"],
          where: { projectId },
          _count: { id: true },
        }),
        prisma.task.groupBy({
          by: ["priority"],
          where: { projectId },
          _count: { id: true },
        }),
        prisma.task.groupBy({
          by: ["assignedToId"],
          where: {
            projectId,
            assignedToId: { not: null },
          },
          _count: { id: true },
        }),
        prisma.task.count({
          where: {
            projectId,
            dueDate: {
              lt: new Date(),
            },
            status: {
              not: "COMPLETED",
            },
          },
        }),
      ]);

    // Get assignee details
    const assigneeIds = assigneeStats
      .map((stat) => stat.assignedToId)
      .filter(Boolean);
    const assignees = await prisma.user.findMany({
      where: { id: { in: assigneeIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    // Format assignee stats with user details
    const assigneeStatsWithDetails = assigneeStats.map((stat) => ({
      ...stat,
      assignee: assignees.find((user) => user.id === stat.assignedToId),
    }));

    const totalTasks = statusStats.reduce(
      (sum, stat) => sum + stat._count.id,
      0
    );
    const completedTasks =
      statusStats.find((stat) => stat.status === "COMPLETED")?._count.id || 0;
    const completionPercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const stats = {
      total: totalTasks,
      completed: completedTasks,
      overdue: overdueTasks,
      completionPercentage,
      byStatus: statusStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.id;
        return acc;
      }, {}),
      byPriority: priorityStats.reduce((acc, stat) => {
        acc[stat.priority] = stat._count.id;
        return acc;
      }, {}),
      byAssignee: assigneeStatsWithDetails,
    };

    sendSuccess(res, stats);
  } catch (error) {
    console.error("Get task stats error:", error);
    sendError(res, "Failed to fetch task statistics", 500);
  }
};

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  getMyTasks,
  getTaskStats,
};
