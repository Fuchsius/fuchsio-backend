// Controller for time tracking management routes
const { PrismaClient } = require("@prisma/client");
const { sendSuccess, sendError, sendPaginated } = require("../utils/helpers");
const { hasRole } = require("../utils/auth");
const { timeTrackingNotifications } = require("../utils/realtime");

const prisma = new PrismaClient();

// Create new time entry (Manual entry)
const createTimeEntry = async (req, res) => {
  try {
    const {
      description,
      hours,
      date,
      taskId,
      projectId,
      billable = true,
      notes,
    } = req.validatedBody;

    // Check if project exists and user has access
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

    // If taskId is provided, validate it belongs to the project
    if (taskId) {
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          projectId,
        },
      });

      if (!task) {
        return sendError(
          res,
          "Task not found or doesn't belong to project",
          404
        );
      }
    }

    // Check for existing time entries on same date/project to prevent duplicates
    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: req.user.id,
        projectId,
        taskId: taskId || null,
        date: new Date(date),
      },
    });

    if (existingEntry) {
      return sendError(
        res,
        "Time entry already exists for this date, project, and task. Please update the existing entry instead.",
        409
      );
    }

    // Create time entry
    const timeEntry = await prisma.timeEntry.create({
      data: {
        description,
        hours: parseFloat(hours),
        date: new Date(date),
        taskId,
        projectId,
        userId: req.user.id,
        billable,
        notes,
        status: "DRAFT",
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    sendSuccess(res, timeEntry, "Time entry created successfully", 201);
  } catch (error) {
    console.error("Error creating time entry:", error);
    sendError(res, "Failed to create time entry", 500);
  }
};

// Get time entries with filtering and pagination
const getTimeEntries = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      projectId,
      taskId,
      userId,
      status,
      startDate,
      endDate,
      billable,
      sortBy = "date",
      sortOrder = "desc",
    } = req.validatedQuery;

    const skip = (page - 1) * limit;

    // Build where clause
    let where = {};

    // Access control
    if (req.user.role !== "ADMIN") {
      if (userId && userId !== req.user.id) {
        // Team leads can view their team members' time entries
        if (req.user.role === "TEAM_LEAD") {
          const userProjects = await prisma.project.findMany({
            where: {
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
            select: { id: true },
          });

          const projectIds = userProjects.map((p) => p.id);
          where.AND = [{ userId }, { projectId: { in: projectIds } }];
        } else {
          return sendError(res, "Access denied", 403);
        }
      } else {
        // Regular employees can only see their own entries
        where.userId = req.user.id;
      }
    } else {
      // Admin can filter by userId if provided
      if (userId) where.userId = userId;
    }

    // Apply filters
    if (projectId) where.projectId = projectId;
    if (taskId) where.taskId = taskId;
    if (status) where.status = status;
    if (billable !== undefined) where.billable = billable;

    // Date range filter
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    // Execute query
    const [timeEntries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.timeEntry.count({ where }),
    ]);

    sendPaginated(res, timeEntries, total, page, limit);
  } catch (error) {
    console.error("Error fetching time entries:", error);
    sendError(res, "Failed to fetch time entries", 500);
  }
};

// Get specific time entry
const getTimeEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        id,
        OR:
          req.user.role === "ADMIN"
            ? undefined
            : [
                { userId: req.user.id },
                // Team leads can view entries from their projects
                req.user.role === "TEAM_LEAD"
                  ? {
                      project: {
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
                    }
                  : {},
              ],
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        timerSession: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true,
          },
        },
      },
    });

    if (!timeEntry) {
      return sendError(res, "Time entry not found or access denied", 404);
    }

    sendSuccess(res, timeEntry, "Time entry retrieved successfully");
  } catch (error) {
    console.error("Error fetching time entry:", error);
    sendError(res, "Failed to fetch time entry", 500);
  }
};

// Update time entry
const updateTimeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.validatedBody;

    // Find time entry and check permissions
    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        id,
        OR:
          req.user.role === "ADMIN"
            ? undefined
            : [
                { userId: req.user.id },
                // Team leads can update entries from their projects if status is DRAFT
                req.user.role === "TEAM_LEAD"
                  ? {
                      status: "DRAFT",
                      project: {
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
                    }
                  : {},
              ],
      },
      include: {
        project: true,
      },
    });

    if (!timeEntry) {
      return sendError(res, "Time entry not found or cannot be updated", 404);
    }

    // Only allow updates to DRAFT entries (unless admin)
    if (timeEntry.status !== "DRAFT" && req.user.role !== "ADMIN") {
      return sendError(
        res,
        "Cannot update time entry that has been submitted or approved",
        400
      );
    }

    // If taskId is being updated, validate it belongs to the project
    if (updateData.taskId) {
      const task = await prisma.task.findFirst({
        where: {
          id: updateData.taskId,
          projectId: timeEntry.projectId,
        },
      });

      if (!task) {
        return sendError(
          res,
          "Task not found or doesn't belong to project",
          404
        );
      }
    }

    // Update time entry
    const updatedTimeEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        ...updateData,
        hours: updateData.hours ? parseFloat(updateData.hours) : undefined,
        date: updateData.date ? new Date(updateData.date) : undefined,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    sendSuccess(res, updatedTimeEntry, "Time entry updated successfully");
  } catch (error) {
    console.error("Error updating time entry:", error);
    sendError(res, "Failed to update time entry", 500);
  }
};

// Delete time entry
const deleteTimeEntry = async (req, res) => {
  try {
    const { id } = req.params;

    // Find time entry and check permissions
    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        id,
        OR:
          req.user.role === "ADMIN"
            ? undefined
            : [
                { userId: req.user.id },
                // Team leads can delete DRAFT entries from their projects
                req.user.role === "TEAM_LEAD"
                  ? {
                      status: "DRAFT",
                      project: {
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
                    }
                  : {},
              ],
      },
    });

    if (!timeEntry) {
      return sendError(res, "Time entry not found or cannot be deleted", 404);
    }

    // Only allow deletion of DRAFT entries (unless admin)
    if (timeEntry.status !== "DRAFT" && req.user.role !== "ADMIN") {
      return sendError(
        res,
        "Cannot delete time entry that has been submitted or approved",
        400
      );
    }

    await prisma.timeEntry.delete({
      where: { id },
    });

    sendSuccess(res, null, "Time entry deleted successfully");
  } catch (error) {
    console.error("Error deleting time entry:", error);
    sendError(res, "Failed to delete time entry", 500);
  }
};

// Submit time entry for approval
const submitTimeEntry = async (req, res) => {
  try {
    const { id } = req.params;

    // Find time entry (user can only submit their own entries)
    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        id,
        userId: req.user.id,
        status: "DRAFT",
      },
    });

    if (!timeEntry) {
      return sendError(res, "Time entry not found or cannot be submitted", 404);
    }

    const updatedTimeEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        status: "SUBMITTED",
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    // Send real-time notification for submission
    try {
      timeTrackingNotifications.submitted(updatedTimeEntry, {
        id: req.user.id,
        username:
          req.user.username || `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email,
      });
    } catch (notificationError) {
      console.error(
        "Time entry submission notification error:",
        notificationError
      );
      // Don't fail the request if notification fails
    }

    sendSuccess(res, updatedTimeEntry, "Time entry submitted for approval");
  } catch (error) {
    console.error("Error submitting time entry:", error);
    sendError(res, "Failed to submit time entry", 500);
  }
};

// Approve or reject time entry (Admin/Team Lead only)
const approveTimeEntry = async (req, res) => {
  try {
    if (!hasRole(req.user, ["ADMIN", "TEAM_LEAD"])) {
      return sendError(res, "Access denied", 403);
    }

    const { id } = req.params;
    const { action, notes } = req.validatedBody;

    // Find time entry
    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        id,
        status: "SUBMITTED",
        OR:
          req.user.role === "ADMIN"
            ? undefined
            : [
                // Team leads can approve entries from their projects
                {
                  project: {
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
              ],
      },
    });

    if (!timeEntry) {
      return sendError(
        res,
        "Time entry not found or cannot be approved/rejected",
        404
      );
    }

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    const updatedTimeEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        status: newStatus,
        approvedBy: req.user.id,
        approvedAt: new Date(),
        notes: notes || timeEntry.notes,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Send real-time notification for approval/rejection
    try {
      if (action === "approve") {
        timeTrackingNotifications.approved(updatedTimeEntry, {
          id: req.user.id,
          username:
            req.user.username || `${req.user.firstName} ${req.user.lastName}`,
          email: req.user.email,
        });
      } else {
        timeTrackingNotifications.rejected(updatedTimeEntry, {
          id: req.user.id,
          username:
            req.user.username || `${req.user.firstName} ${req.user.lastName}`,
          email: req.user.email,
        });
      }
    } catch (notificationError) {
      console.error(
        "Time entry approval notification error:",
        notificationError
      );
      // Don't fail the request if notification fails
    }

    sendSuccess(
      res,
      updatedTimeEntry,
      `Time entry ${
        action === "approve" ? "approved" : "rejected"
      } successfully`
    );
  } catch (error) {
    console.error("Error approving/rejecting time entry:", error);
    sendError(res, "Failed to process time entry approval", 500);
  }
};

// Start timer session
const startTimer = async (req, res) => {
  try {
    const { description, taskId, projectId } = req.validatedBody;

    // Check if user has an active timer session
    const activeTimer = await prisma.timerSession.findFirst({
      where: {
        userId: req.user.id,
        status: { in: ["RUNNING", "PAUSED"] },
      },
    });

    if (activeTimer) {
      return sendError(
        res,
        "You already have an active timer session. Please stop or complete it first.",
        400
      );
    }

    // Check if project exists and user has access
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

    // If taskId is provided, validate it belongs to the project
    if (taskId) {
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          projectId,
        },
      });

      if (!task) {
        return sendError(
          res,
          "Task not found or doesn't belong to project",
          404
        );
      }
    }

    // Create timer session
    const timerSession = await prisma.timerSession.create({
      data: {
        description,
        startTime: new Date(),
        status: "RUNNING",
        userId: req.user.id,
        projectId,
        taskId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    sendSuccess(res, timerSession, "Timer started successfully", 201);
  } catch (error) {
    console.error("Error starting timer:", error);
    sendError(res, "Failed to start timer", 500);
  }
};

// Update timer session (pause, resume, stop)
const updateTimer = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, description } = req.validatedBody;

    // Find timer session (user can only update their own timers)
    const timerSession = await prisma.timerSession.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!timerSession) {
      return sendError(res, "Timer session not found or access denied", 404);
    }

    let updateData = { updatedAt: new Date() };

    switch (action) {
      case "pause":
        if (timerSession.status !== "RUNNING") {
          return sendError(res, "Timer is not currently running", 400);
        }
        updateData.status = "PAUSED";
        break;

      case "resume":
        if (timerSession.status !== "PAUSED") {
          return sendError(res, "Timer is not currently paused", 400);
        }
        updateData.status = "RUNNING";
        break;

      case "stop":
        if (timerSession.status === "STOPPED") {
          return sendError(res, "Timer is already stopped", 400);
        }
        updateData.status = "STOPPED";
        updateData.endTime = new Date();

        // Calculate total hours
        const startTime = new Date(timerSession.startTime);
        const endTime = updateData.endTime;
        const totalHours = (endTime - startTime) / (1000 * 60 * 60); // Convert ms to hours
        updateData.totalHours = parseFloat(totalHours.toFixed(2));
        break;

      default:
        return sendError(res, "Invalid action", 400);
    }

    // Add description if provided
    if (description !== undefined) {
      updateData.description = description;
    }

    const updatedTimer = await prisma.timerSession.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    // If stopping timer, optionally create time entry
    if (action === "stop" && updatedTimer.totalHours > 0) {
      const timeEntry = await prisma.timeEntry.create({
        data: {
          description: updatedTimer.description || "Timer session",
          hours: updatedTimer.totalHours,
          date: new Date().toISOString().split("T")[0], // Today's date
          taskId: updatedTimer.taskId,
          projectId: updatedTimer.projectId,
          userId: updatedTimer.userId,
          billable: true,
          status: "DRAFT",
        },
      });

      // Link timer session to time entry
      await prisma.timerSession.update({
        where: { id },
        data: { timeEntryId: timeEntry.id },
      });

      updatedTimer.timeEntry = timeEntry;
    }

    sendSuccess(
      res,
      updatedTimer,
      `Timer ${action}${action === "stop" ? "ped" : "d"} successfully`
    );
  } catch (error) {
    console.error("Error updating timer:", error);
    sendError(res, "Failed to update timer", 500);
  }
};

// Get active timer session
const getActiveTimer = async (req, res) => {
  try {
    const activeTimer = await prisma.timerSession.findFirst({
      where: {
        userId: req.user.id,
        status: { in: ["RUNNING", "PAUSED"] },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!activeTimer) {
      return sendSuccess(res, null, "No active timer session");
    }

    // Calculate current elapsed time if running
    if (activeTimer.status === "RUNNING") {
      const startTime = new Date(activeTimer.startTime);
      const currentTime = new Date();
      const elapsedHours = (currentTime - startTime) / (1000 * 60 * 60);
      activeTimer.elapsedHours = parseFloat(elapsedHours.toFixed(2));
    }

    sendSuccess(res, activeTimer, "Active timer retrieved successfully");
  } catch (error) {
    console.error("Error fetching active timer:", error);
    sendError(res, "Failed to fetch active timer", 500);
  }
};

// Get time tracking analytics/reports
const getTimeReport = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      projectId,
      userId,
      groupBy = "date",
      includeBreakdown = false,
      billableOnly = false,
    } = req.validatedQuery;

    // Build where clause
    let where = {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      status: "APPROVED",
    };

    // Access control
    if (req.user.role !== "ADMIN") {
      if (userId && userId !== req.user.id) {
        if (req.user.role === "TEAM_LEAD") {
          // Team leads can view reports for their projects
          const userProjects = await prisma.project.findMany({
            where: {
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
            select: { id: true },
          });

          const projectIds = userProjects.map((p) => p.id);
          where.AND = [{ userId }, { projectId: { in: projectIds } }];
        } else {
          return sendError(res, "Access denied", 403);
        }
      } else {
        where.userId = req.user.id;
      }
    } else {
      if (userId) where.userId = userId;
    }

    if (projectId) where.projectId = projectId;
    if (billableOnly) where.billable = true;

    // Get aggregated data
    const timeEntries = await prisma.timeEntry.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
    });

    // Calculate totals
    const totalHours = timeEntries.reduce(
      (sum, entry) => sum + parseFloat(entry.hours),
      0
    );
    const billableHours = timeEntries
      .filter((entry) => entry.billable)
      .reduce((sum, entry) => sum + parseFloat(entry.hours), 0);

    // Group data based on groupBy parameter
    let groupedData = {};

    timeEntries.forEach((entry) => {
      let key;
      switch (groupBy) {
        case "user":
          key = `${entry.user.firstName} ${entry.user.lastName}`;
          break;
        case "project":
          key = entry.project.name;
          break;
        case "task":
          key = entry.task ? entry.task.title : "No Task";
          break;
        case "date":
        default:
          key = entry.date.toISOString().split("T")[0];
          break;
      }

      if (!groupedData[key]) {
        groupedData[key] = {
          totalHours: 0,
          billableHours: 0,
          entries: includeBreakdown ? [] : undefined,
        };
      }

      groupedData[key].totalHours += parseFloat(entry.hours);
      if (entry.billable) {
        groupedData[key].billableHours += parseFloat(entry.hours);
      }

      if (includeBreakdown) {
        groupedData[key].entries.push(entry);
      }
    });

    // Convert to array and sort
    const groupedArray = Object.entries(groupedData)
      .map(([key, data]) => ({
        [groupBy]: key,
        ...data,
        totalHours: parseFloat(data.totalHours.toFixed(2)),
        billableHours: parseFloat(data.billableHours.toFixed(2)),
      }))
      .sort((a, b) => b.totalHours - a.totalHours);

    const report = {
      summary: {
        totalHours: parseFloat(totalHours.toFixed(2)),
        billableHours: parseFloat(billableHours.toFixed(2)),
        nonBillableHours: parseFloat((totalHours - billableHours).toFixed(2)),
        totalEntries: timeEntries.length,
        dateRange: {
          startDate,
          endDate,
        },
      },
      groupedData: groupedArray,
      filters: {
        projectId,
        userId,
        groupBy,
        billableOnly,
      },
    };

    sendSuccess(res, report, "Time report generated successfully");
  } catch (error) {
    console.error("Error generating time report:", error);
    sendError(res, "Failed to generate time report", 500);
  }
};

// Bulk operations on time entries
const bulkTimeEntryOperation = async (req, res) => {
  try {
    const { timeEntryIds, action, notes } = req.validatedBody;

    if (
      !hasRole(req.user, ["ADMIN", "TEAM_LEAD"]) &&
      !["submit", "delete"].includes(action)
    ) {
      return sendError(res, "Access denied", 403);
    }

    // Find time entries
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        id: { in: timeEntryIds },
        OR:
          req.user.role === "ADMIN"
            ? undefined
            : action === "submit"
            ? [{ userId: req.user.id }] // Users can only submit their own entries
            : [
                { userId: req.user.id },
                // Team leads can approve/reject/delete entries from their projects
                req.user.role === "TEAM_LEAD"
                  ? {
                      project: {
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
                    }
                  : {},
              ],
      },
    });

    if (timeEntries.length === 0) {
      return sendError(res, "No time entries found or access denied", 404);
    }

    let updateData = {};
    let whereClause = { id: { in: timeEntries.map((entry) => entry.id) } };

    switch (action) {
      case "submit":
        updateData = { status: "SUBMITTED" };
        whereClause.status = "DRAFT";
        break;
      case "approve":
        updateData = {
          status: "APPROVED",
          approvedBy: req.user.id,
          approvedAt: new Date(),
          notes: notes || undefined,
        };
        whereClause.status = "SUBMITTED";
        break;
      case "reject":
        updateData = {
          status: "REJECTED",
          approvedBy: req.user.id,
          approvedAt: new Date(),
          notes: notes || undefined,
        };
        whereClause.status = "SUBMITTED";
        break;
      case "delete":
        // Delete only DRAFT entries
        whereClause.status = "DRAFT";
        const deleteResult = await prisma.timeEntry.deleteMany({
          where: whereClause,
        });
        return sendSuccess(
          res,
          { deletedCount: deleteResult.count },
          "Time entries deleted successfully"
        );
      default:
        return sendError(res, "Invalid action", 400);
    }

    const updateResult = await prisma.timeEntry.updateMany({
      where: whereClause,
      data: updateData,
    });

    sendSuccess(
      res,
      { updatedCount: updateResult.count },
      `Time entries ${action}${action === "submit" ? "ted" : "d"} successfully`
    );
  } catch (error) {
    console.error("Error performing bulk operation:", error);
    sendError(res, "Failed to perform bulk operation", 500);
  }
};

module.exports = {
  createTimeEntry,
  getTimeEntries,
  getTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  submitTimeEntry,
  approveTimeEntry,
  startTimer,
  updateTimer,
  getActiveTimer,
  getTimeReport,
  bulkTimeEntryOperation,
};
