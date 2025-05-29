// Controller for project management routes
const { PrismaClient } = require("@prisma/client");
const { sendSuccess, sendError, sendPaginated } = require("../utils/helpers");
const { hasRole } = require("../utils/auth");
const { projectNotifications } = require("../utils/realtime");

const prisma = new PrismaClient();

// Create new project (Admin/Team Lead only)
const createProject = async (req, res) => {
  try {
    const { name, description, startDate, endDate, budget, memberIds } =
      req.validatedBody;

    // Create project
    const project = await prisma.project.create({
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        budget: budget ? parseFloat(budget) : null,
        createdBy: req.user.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
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
        _count: {
          select: {
            members: true,
            tasks: true,
          },
        },
      },
    });

    // Add project members if provided
    if (memberIds && memberIds.length > 0) {
      // Validate member IDs exist and are employees if user is team lead
      const memberValidationWhere = {
        id: { in: memberIds },
        status: "ACTIVE",
      };

      // Team leads can only add employees to projects
      if (req.user.role === "TEAM_LEAD") {
        memberValidationWhere.role = "EMPLOYEE";
      }

      const validMembers = await prisma.user.findMany({
        where: memberValidationWhere,
        select: { id: true },
      });

      if (validMembers.length !== memberIds.length) {
        return sendError(
          res,
          "Some member IDs are invalid or inaccessible",
          400
        );
      }

      // Add members to project
      const memberData = memberIds.map((userId) => ({
        projectId: project.id,
        userId,
      }));

      await prisma.projectMember.createMany({
        data: memberData,
        skipDuplicates: true,
      });

      // Fetch updated project with members for notifications
      const updatedProject = await prisma.project.findUnique({
        where: { id: project.id },
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

      // Send real-time notification
      try {
        projectNotifications.created(updatedProject, {
          id: req.user.id,
          username:
            req.user.username || `${req.user.firstName} ${req.user.lastName}`,
          email: req.user.email,
        });
      } catch (notificationError) {
        console.error(
          "Project creation notification error:",
          notificationError
        );
        // Don't fail the request if notification fails
      }
    }

    sendSuccess(res, project, "Project created successfully", 201);
  } catch (error) {
    console.error("Create project error:", error);
    sendError(res, "Failed to create project", 500);
  }
};

// Get all projects (with filtering and pagination)
const getProjects = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    search,
    createdBy,
    memberOnly = false,
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build where clause
  const where = {};

  // Filter by status
  if (status) {
    where.status = status;
  }

  // Search in name and description
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }

  // Filter by creator
  if (createdBy) {
    where.createdBy = createdBy;
  }

  // If memberOnly is true, only show projects user is a member of
  if (memberOnly === "true") {
    where.OR = [
      { createdBy: req.user.id },
      {
        members: {
          some: {
            userId: req.user.id,
          },
        },
      },
    ];
  } else if (req.user.role === "EMPLOYEE") {
    // Employees can only see projects they're members of or created
    where.OR = [
      { createdBy: req.user.id },
      {
        members: {
          some: {
            userId: req.user.id,
          },
        },
      },
    ];
  }

  // Get projects with pagination
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            members: true,
            tasks: true,
            messages: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit),
    }),
    prisma.project.count({ where }),
  ]);

  sendPaginated(res, projects, page, limit, total);
};

// Get specific project by ID
const getProject = async (req, res) => {
  const { id } = req.validatedParams;

  // Check if user has access to this project
  const project = await prisma.project.findFirst({
    where: {
      id,
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
    include: {
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              avatar: true,
              position: true,
            },
          },
        },
      },
      tasks: {
        include: {
          assignee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
  });

  if (!project) {
    return sendError(res, "Project not found or access denied", 404);
  }

  sendSuccess(res, project);
};

// Update project (Admin/Team Lead/Creator only)
const updateProject = async (req, res) => {
  const { id } = req.validatedParams;
  const { name, description, status, startDate, endDate, budget } =
    req.validatedBody;

  // Check if project exists and user has permission
  const existingProject = await prisma.project.findUnique({
    where: { id },
  });

  if (!existingProject) {
    return sendError(res, "Project not found", 404);
  }

  // Check permissions
  const canUpdate =
    req.user.role === "ADMIN" ||
    existingProject.createdBy === req.user.id ||
    (req.user.role === "TEAM_LEAD" &&
      existingProject.createdBy === req.user.id);

  if (!canUpdate) {
    return sendError(res, "Permission denied", 403);
  }

  // Update project
  const updatedProject = await prisma.project.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(status && { status }),
      ...(startDate !== undefined && {
        startDate: startDate ? new Date(startDate) : null,
      }),
      ...(endDate !== undefined && {
        endDate: endDate ? new Date(endDate) : null,
      }),
      ...(budget !== undefined && {
        budget: budget ? parseFloat(budget) : null,
      }),
    },
    include: {
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
      _count: {
        select: {
          members: true,
          tasks: true,
        },
      },
    },
  });

  sendSuccess(res, updatedProject, "Project updated successfully");
};

// Delete project (Admin/Creator only)
const deleteProject = async (req, res) => {
  const { id } = req.validatedParams;

  // Check if project exists
  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) {
    return sendError(res, "Project not found", 404);
  }

  // Check permissions
  const canDelete =
    req.user.role === "ADMIN" || project.createdBy === req.user.id;

  if (!canDelete) {
    return sendError(res, "Permission denied", 403);
  }

  // Delete project (will cascade delete members, tasks, messages)
  await prisma.project.delete({
    where: { id },
  });

  sendSuccess(res, null, "Project deleted successfully");
};

// Add members to project
const addProjectMember = async (req, res) => {
  const { id } = req.validatedParams;
  const { userIds } = req.validatedBody;

  // Check if project exists and user has permission
  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) {
    return sendError(res, "Project not found", 404);
  }

  // Check permissions
  const canAddMembers =
    req.user.role === "ADMIN" || project.createdBy === req.user.id;

  if (!canAddMembers) {
    return sendError(res, "Permission denied", 403);
  }

  // Validate user IDs
  const memberValidationWhere = {
    id: { in: userIds },
    status: "ACTIVE",
  };

  // Team leads can only add employees
  if (req.user.role === "TEAM_LEAD") {
    memberValidationWhere.role = "EMPLOYEE";
  }

  const validUsers = await prisma.user.findMany({
    where: memberValidationWhere,
    select: { id: true },
  });

  if (validUsers.length !== userIds.length) {
    return sendError(res, "Some user IDs are invalid or inaccessible", 400);
  }

  // Add members to project
  const memberData = userIds.map((userId) => ({
    projectId: id,
    userId,
  }));

  await prisma.projectMember.createMany({
    data: memberData,
    skipDuplicates: true,
  });

  sendSuccess(res, null, "Members added to project successfully");
};

// Remove member from project
const removeProjectMember = async (req, res) => {
  const { id, userId } = req.validatedParams;

  // Check if project exists and user has permission
  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) {
    return sendError(res, "Project not found", 404);
  }

  // Check permissions
  const canRemoveMembers =
    req.user.role === "ADMIN" || project.createdBy === req.user.id;

  if (!canRemoveMembers) {
    return sendError(res, "Permission denied", 403);
  }

  // Remove member from project
  const deletedMember = await prisma.projectMember.deleteMany({
    where: {
      projectId: id,
      userId: userId,
    },
  });

  if (deletedMember.count === 0) {
    return sendError(res, "User is not a member of this project", 404);
  }

  sendSuccess(res, null, "Member removed from project successfully");
};

// Get project statistics
const getProjectStats = async (req, res) => {
  const { id } = req.validatedParams;

  // Check if user has access to this project
  const project = await prisma.project.findFirst({
    where: {
      id,
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

  // Get project statistics
  const [taskStats, memberCount, messageCount] = await Promise.all([
    prisma.task.groupBy({
      by: ["status"],
      where: { projectId: id },
      _count: { id: true },
    }),
    prisma.projectMember.count({
      where: { projectId: id },
    }),
    prisma.projectMessage.count({
      where: { projectId: id },
    }),
  ]);

  // Calculate task completion percentage
  const totalTasks = taskStats.reduce((sum, stat) => sum + stat._count.id, 0);
  const completedTasks =
    taskStats.find((stat) => stat.status === "COMPLETED")?._count.id || 0;
  const completionPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const stats = {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
    },
    tasks: {
      total: totalTasks,
      byStatus: taskStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.id;
        return acc;
      }, {}),
      completionPercentage,
    },
    members: memberCount,
    messages: messageCount,
  };

  sendSuccess(res, stats);
};

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  getProjectStats,
};
