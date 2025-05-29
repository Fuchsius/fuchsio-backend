// Controller for analytics and reporting endpoints
const { PrismaClient } = require("@prisma/client");
const { sendSuccess, sendError } = require("../utils/helpers");
const { hasRole } = require("../utils/auth");

const prisma = new PrismaClient();

// Get dashboard overview statistics
const getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Base where clause for date filtering
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Get user-specific data or all data for admins
    const userFilter =
      req.user.role === "ADMIN"
        ? {}
        : {
            OR: [
              { createdBy: req.user.id },
              { assignedToId: req.user.id },
              { userId: req.user.id },
              {
                project: {
                  OR: [
                    { createdBy: req.user.id },
                    { members: { some: { userId: req.user.id } } },
                  ],
                },
              },
            ],
          };

    // Parallel queries for better performance
    const [
      totalProjects,
      totalTasks,
      completedTasks,
      totalTimeEntries,
      totalHours,
      totalFiles,
      totalMessages,
      activeUsers,
    ] = await Promise.all([
      // Total projects
      prisma.project.count({
        where: {
          ...userFilter,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      }),

      // Total tasks
      prisma.task.count({
        where: {
          ...userFilter,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      }),

      // Completed tasks
      prisma.task.count({
        where: {
          ...userFilter,
          status: "COMPLETED",
          ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter }),
        },
      }),

      // Total time entries
      prisma.timeEntry.count({
        where: {
          ...userFilter,
          ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        },
      }),

      // Total hours worked
      prisma.timeEntry.aggregate({
        where: {
          ...userFilter,
          status: "APPROVED",
          ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        },
        _sum: {
          hours: true,
        },
      }),

      // Total files uploaded
      prisma.fileUpload.count({
        where: {
          ...userFilter,
          ...(Object.keys(dateFilter).length > 0 && { uploadedAt: dateFilter }),
        },
      }),

      // Total messages
      prisma.projectMessage.count({
        where: {
          ...userFilter,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      }),

      // Active users (if admin)
      req.user.role === "ADMIN"
        ? prisma.user.count({
            where: {
              status: "ACTIVE",
              ...(Object.keys(dateFilter).length > 0 && {
                OR: [{ lastLoginAt: dateFilter }, { createdAt: dateFilter }],
              }),
            },
          })
        : 0,
    ]);

    const stats = {
      overview: {
        totalProjects,
        totalTasks,
        completedTasks,
        taskCompletionRate:
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        totalTimeEntries,
        totalHours: totalHours._sum.hours || 0,
        totalFiles,
        totalMessages,
        ...(req.user.role === "ADMIN" && { activeUsers }),
      },
      productivity: {
        avgTasksPerProject:
          totalProjects > 0
            ? Math.round((totalTasks / totalProjects) * 100) / 100
            : 0,
        avgHoursPerTask:
          completedTasks > 0
            ? Math.round(
                ((totalHours._sum.hours || 0) / completedTasks) * 100
              ) / 100
            : 0,
      },
    };

    sendSuccess(res, stats, "Dashboard statistics retrieved successfully");
  } catch (error) {
    console.error("Dashboard stats error:", error);
    sendError(res, "Failed to retrieve dashboard statistics", 500);
  }
};

// Get project analytics
const getProjectAnalytics = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { timeframe = "month" } = req.query;

    // Check project access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR:
          req.user.role === "ADMIN"
            ? undefined
            : [
                { createdBy: req.user.id },
                { members: { some: { userId: req.user.id } } },
              ],
      },
    });

    if (!project) {
      return sendError(res, "Project not found or access denied", 404);
    }

    // Calculate date range based on timeframe
    const endDate = new Date();
    const startDate = new Date();
    switch (timeframe) {
      case "week":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case "year":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 1);
    }

    // Get project analytics
    const [taskStats, timeStats, memberActivity, recentActivity] =
      await Promise.all([
        // Task statistics
        prisma.task.groupBy({
          by: ["status"],
          where: {
            projectId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _count: {
            status: true,
          },
        }),

        // Time tracking statistics
        prisma.timeEntry.aggregate({
          where: {
            projectId,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            hours: true,
          },
          _count: {
            id: true,
          },
          _avg: {
            hours: true,
          },
        }),

        // Member activity
        prisma.user.findMany({
          where: {
            OR: [
              {
                projectMembers: {
                  some: { projectId },
                },
              },
              {
                createdProjects: {
                  some: { id: projectId },
                },
              },
            ],
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            _count: {
              select: {
                assignedTasks: {
                  where: {
                    projectId,
                    updatedAt: {
                      gte: startDate,
                      lte: endDate,
                    },
                  },
                },
                timeEntries: {
                  where: {
                    projectId,
                    date: {
                      gte: startDate,
                      lte: endDate,
                    },
                  },
                },
                sentMessages: {
                  where: {
                    projectId,
                    createdAt: {
                      gte: startDate,
                      lte: endDate,
                    },
                  },
                },
              },
            },
          },
        }),

        // Recent activity
        prisma.task.findMany({
          where: {
            projectId,
            updatedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            id: true,
            title: true,
            status: true,
            updatedAt: true,
            assignedTo: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 10,
        }),
      ]);

    const analytics = {
      project: {
        id: project.id,
        name: project.name,
        timeframe,
      },
      taskBreakdown: taskStats.reduce((acc, stat) => {
        acc[stat.status.toLowerCase()] = stat._count.status;
        return acc;
      }, {}),
      timeTracking: {
        totalHours: timeStats._sum.hours || 0,
        totalEntries: timeStats._count || 0,
        avgHoursPerEntry: timeStats._avg.hours || 0,
      },
      memberActivity: memberActivity
        .map((member) => ({
          id: member.id,
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          tasksWorked: member._count.assignedTasks,
          timeEntries: member._count.timeEntries,
          messagesPosted: member._count.sentMessages,
          activityScore:
            member._count.assignedTasks +
            member._count.timeEntries +
            member._count.sentMessages,
        }))
        .sort((a, b) => b.activityScore - a.activityScore),
      recentActivity: recentActivity.map((task) => ({
        type: "task_update",
        taskId: task.id,
        taskTitle: task.title,
        status: task.status,
        assignee: task.assignedTo
          ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
          : null,
        timestamp: task.updatedAt,
      })),
    };

    sendSuccess(res, analytics, "Project analytics retrieved successfully");
  } catch (error) {
    console.error("Project analytics error:", error);
    sendError(res, "Failed to retrieve project analytics", 500);
  }
};

// Get team productivity metrics (Admin/Team Lead only)
const getTeamProductivity = async (req, res) => {
  try {
    if (!hasRole(req.user, ["ADMIN", "TEAM_LEAD"])) {
      return sendError(res, "Access denied", 403);
    }

    const { startDate, endDate, teamMemberId } = req.query;

    // Calculate date range
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    if (!startDate && !endDate) {
      // Default to last 30 days
      dateFilter.gte = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      dateFilter.lte = new Date();
    }

    // User filter for team leads (only their team members)
    const userFilter =
      req.user.role === "ADMIN"
        ? teamMemberId
          ? { id: teamMemberId }
          : {}
        : {
            role: "EMPLOYEE",
            ...(teamMemberId && { id: teamMemberId }),
          };

    // Get productivity metrics
    const teamMembers = await prisma.user.findMany({
      where: {
        ...userFilter,
        status: "ACTIVE",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        _count: {
          select: {
            assignedTasks: {
              where: {
                updatedAt: dateFilter,
              },
            },
            createdTasks: {
              where: {
                createdAt: dateFilter,
              },
            },
          },
        },
      },
    });

    // Get detailed metrics for each team member
    const productivityData = await Promise.all(
      teamMembers.map(async (member) => {
        const [
          completedTasks,
          totalTimeLogged,
          avgTaskCompletionTime,
          projectsWorkedOn,
        ] = await Promise.all([
          // Completed tasks
          prisma.task.count({
            where: {
              assignedToId: member.id,
              status: "COMPLETED",
              updatedAt: dateFilter,
            },
          }),

          // Total approved time
          prisma.timeEntry.aggregate({
            where: {
              userId: member.id,
              status: "APPROVED",
              date: dateFilter,
            },
            _sum: {
              hours: true,
            },
          }),

          // Average task completion time (days)
          prisma.task
            .findMany({
              where: {
                assignedToId: member.id,
                status: "COMPLETED",
                updatedAt: dateFilter,
              },
              select: {
                createdAt: true,
                updatedAt: true,
              },
            })
            .then((tasks) => {
              if (tasks.length === 0) return 0;
              const totalDays = tasks.reduce((sum, task) => {
                const days = Math.ceil(
                  (task.updatedAt - task.createdAt) / (1000 * 60 * 60 * 24)
                );
                return sum + days;
              }, 0);
              return Math.round((totalDays / tasks.length) * 100) / 100;
            }),

          // Projects worked on
          prisma.project.count({
            where: {
              OR: [
                {
                  tasks: {
                    some: {
                      assignedToId: member.id,
                      updatedAt: dateFilter,
                    },
                  },
                },
                {
                  timeEntries: {
                    some: {
                      userId: member.id,
                      date: dateFilter,
                    },
                  },
                },
              ],
            },
          }),
        ]);

        return {
          user: {
            id: member.id,
            name: `${member.firstName} ${member.lastName}`,
            email: member.email,
            role: member.role,
          },
          metrics: {
            tasksAssigned: member._count.assignedTasks,
            tasksCreated: member._count.createdTasks,
            tasksCompleted: completedTasks,
            completionRate:
              member._count.assignedTasks > 0
                ? Math.round(
                    (completedTasks / member._count.assignedTasks) * 100
                  )
                : 0,
            totalHoursLogged: totalTimeLogged._sum.hours || 0,
            avgTaskCompletionDays: avgTaskCompletionTime,
            projectsWorkedOn,
          },
        };
      })
    );

    // Calculate team averages
    const teamAverages = {
      avgCompletionRate: Math.round(
        productivityData.reduce(
          (sum, member) => sum + member.metrics.completionRate,
          0
        ) / (productivityData.length || 1)
      ),
      avgHoursPerMember:
        Math.round(
          (productivityData.reduce(
            (sum, member) => sum + member.metrics.totalHoursLogged,
            0
          ) /
            (productivityData.length || 1)) *
            100
        ) / 100,
      avgTaskCompletionDays:
        Math.round(
          (productivityData.reduce(
            (sum, member) => sum + member.metrics.avgTaskCompletionDays,
            0
          ) /
            (productivityData.length || 1)) *
            100
        ) / 100,
    };

    const result = {
      timeframe: {
        startDate: dateFilter.gte,
        endDate: dateFilter.lte,
      },
      teamAverages,
      memberProductivity: productivityData.sort(
        (a, b) => b.metrics.completionRate - a.metrics.completionRate
      ),
    };

    sendSuccess(
      res,
      result,
      "Team productivity metrics retrieved successfully"
    );
  } catch (error) {
    console.error("Team productivity error:", error);
    sendError(res, "Failed to retrieve team productivity metrics", 500);
  }
};

// Get time tracking analytics
const getTimeTrackingAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, projectId, groupBy = "day" } = req.query;

    // Calculate date range
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    if (!startDate && !endDate) {
      // Default to last 30 days
      dateFilter.gte = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      dateFilter.lte = new Date();
    }

    // Project filter
    const projectFilter = projectId ? { projectId } : {};

    // User access filter
    const userFilter =
      req.user.role === "ADMIN"
        ? {}
        : {
            OR: [
              { userId: req.user.id },
              {
                project: {
                  OR: [
                    { createdBy: req.user.id },
                    { members: { some: { userId: req.user.id } } },
                  ],
                },
              },
            ],
          };

    // Get time entries with grouping
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        ...userFilter,
        ...projectFilter,
        date: dateFilter,
        status: "APPROVED",
      },
      select: {
        id: true,
        hours: true,
        date: true,
        billable: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    // Group data based on groupBy parameter
    const groupedData = {};
    const summary = {
      totalHours: 0,
      billableHours: 0,
      nonBillableHours: 0,
      totalEntries: timeEntries.length,
    };

    timeEntries.forEach((entry) => {
      summary.totalHours += entry.hours;
      if (entry.billable) {
        summary.billableHours += entry.hours;
      } else {
        summary.nonBillableHours += entry.hours;
      }

      // Group by specified parameter
      let groupKey;
      switch (groupBy) {
        case "day":
          groupKey = entry.date.toISOString().split("T")[0];
          break;
        case "week":
          const weekStart = new Date(entry.date);
          weekStart.setDate(entry.date.getDate() - entry.date.getDay());
          groupKey = weekStart.toISOString().split("T")[0];
          break;
        case "month":
          groupKey = `${entry.date.getFullYear()}-${String(
            entry.date.getMonth() + 1
          ).padStart(2, "0")}`;
          break;
        case "user":
          groupKey = `${entry.user.firstName} ${entry.user.lastName}`;
          break;
        case "project":
          groupKey = entry.project?.name || "No Project";
          break;
        default:
          groupKey = entry.date.toISOString().split("T")[0];
      }

      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          totalHours: 0,
          billableHours: 0,
          nonBillableHours: 0,
          entries: 0,
        };
      }

      groupedData[groupKey].totalHours += entry.hours;
      groupedData[groupKey].entries += 1;
      if (entry.billable) {
        groupedData[groupKey].billableHours += entry.hours;
      } else {
        groupedData[groupKey].nonBillableHours += entry.hours;
      }
    });

    // Convert to array and sort
    const chartData = Object.entries(groupedData)
      .map(([key, data]) => ({
        label: key,
        ...data,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const result = {
      timeframe: {
        startDate: dateFilter.gte,
        endDate: dateFilter.lte,
      },
      groupBy,
      summary: {
        ...summary,
        billablePercentage:
          summary.totalHours > 0
            ? Math.round((summary.billableHours / summary.totalHours) * 100)
            : 0,
      },
      chartData,
    };

    sendSuccess(res, result, "Time tracking analytics retrieved successfully");
  } catch (error) {
    console.error("Time tracking analytics error:", error);
    sendError(res, "Failed to retrieve time tracking analytics", 500);
  }
};

// Generate custom report
const generateCustomReport = async (req, res) => {
  try {
    const {
      reportType,
      startDate,
      endDate,
      includeProjects = true,
      includeTasks = true,
      includeTimeTracking = true,
      includeUsers = false,
      projectIds = [],
      userIds = [],
    } = req.validatedBody;

    // Date filter
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Access control
    const isAdmin = req.user.role === "ADMIN";
    const isTeamLead = req.user.role === "TEAM_LEAD";

    const report = {
      metadata: {
        reportType,
        generatedAt: new Date(),
        generatedBy: {
          id: req.user.id,
          name: `${req.user.firstName} ${req.user.lastName}`,
          email: req.user.email,
        },
        timeframe: {
          startDate: dateFilter.gte,
          endDate: dateFilter.lte,
        },
      },
      data: {},
    };

    // Projects data
    if (includeProjects && (isAdmin || isTeamLead)) {
      const projectWhere = {
        ...(projectIds.length > 0 && { id: { in: projectIds } }),
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        ...(!isAdmin && {
          OR: [
            { createdBy: req.user.id },
            { members: { some: { userId: req.user.id } } },
          ],
        }),
      };

      report.data.projects = await prisma.project.findMany({
        where: projectWhere,
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true, email: true },
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
              tasks: true,
              timeEntries: true,
              messages: true,
              files: true,
            },
          },
        },
      });
    }

    // Tasks data
    if (includeTasks) {
      const taskWhere = {
        ...(projectIds.length > 0 && { projectId: { in: projectIds } }),
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        ...(!isAdmin && {
          OR: [
            { createdBy: req.user.id },
            { assignedToId: req.user.id },
            {
              project: {
                OR: [
                  { createdBy: req.user.id },
                  { members: { some: { userId: req.user.id } } },
                ],
              },
            },
          ],
        }),
      };

      report.data.tasks = await prisma.task.findMany({
        where: taskWhere,
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          assignedTo: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          project: {
            select: { id: true, name: true, status: true },
          },
        },
      });
    }

    // Time tracking data
    if (includeTimeTracking) {
      const timeWhere = {
        ...(projectIds.length > 0 && { projectId: { in: projectIds } }),
        ...(userIds.length > 0 && { userId: { in: userIds } }),
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        ...(!isAdmin && {
          OR: [
            { userId: req.user.id },
            {
              project: {
                OR: [
                  { createdBy: req.user.id },
                  { members: { some: { userId: req.user.id } } },
                ],
              },
            },
          ],
        }),
      };

      report.data.timeEntries = await prisma.timeEntry.findMany({
        where: timeWhere,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          project: {
            select: { id: true, name: true },
          },
          task: {
            select: { id: true, title: true },
          },
        },
      });
    }

    // Users data (Admin only)
    if (includeUsers && isAdmin) {
      const userWhere = {
        ...(userIds.length > 0 && { id: { in: userIds } }),
        status: "ACTIVE",
      };

      report.data.users = await prisma.user.findMany({
        where: userWhere,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              assignedTasks: true,
              createdTasks: true,
              timeEntries: true,
              sentMessages: true,
              uploads: true,
            },
          },
        },
      });
    }

    sendSuccess(res, report, "Custom report generated successfully");
  } catch (error) {
    console.error("Generate custom report error:", error);
    sendError(res, "Failed to generate custom report", 500);
  }
};

module.exports = {
  getDashboardStats,
  getProjectAnalytics,
  getTeamProductivity,
  getTimeTrackingAnalytics,
  generateCustomReport,
};
