/**
 * Real-time Integration Utilities
 * Helper functions to integrate real-time notifications with existing APIs
 */

const notificationService = require("../services/notification.service");

/**
 * Task-related real-time notifications
 */
const taskNotifications = {
  /**
   * Notify about task creation
   * @param {Object} task - Created task
   * @param {Object} creator - User who created the task
   */
  created: (task, creator) => {
    if (task.projectId) {
      notificationService.notifyProject(
        task.projectId,
        notificationService.TYPES.TASK_CREATED,
        {
          taskId: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          assigneeId: task.assigneeId,
          createdBy: {
            id: creator.id,
            username: creator.username,
            email: creator.email,
          },
          projectId: task.projectId,
        },
        creator.id
      );
    }

    // Notify assignee if different from creator
    if (task.assigneeId && task.assigneeId !== creator.id) {
      notificationService.notifyUser(
        task.assigneeId,
        notificationService.TYPES.TASK_ASSIGNED,
        {
          taskId: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          assignedBy: {
            id: creator.id,
            username: creator.username,
          },
          projectId: task.projectId,
        }
      );
    }
  },

  /**
   * Notify about task updates
   * @param {Object} task - Updated task
   * @param {Object} updater - User who updated the task
   * @param {Object} changes - Changed fields
   */
  updated: (task, updater, changes) => {
    if (task.projectId) {
      notificationService.notifyProject(
        task.projectId,
        notificationService.TYPES.TASK_UPDATED,
        {
          taskId: task.id,
          title: task.title,
          changes,
          updatedBy: {
            id: updater.id,
            username: updater.username,
          },
          projectId: task.projectId,
        },
        updater.id
      );
    }

    // Special notification for status changes to completed
    if (changes.status === "COMPLETED" && task.assigneeId) {
      notificationService.notifyUser(
        task.assigneeId,
        notificationService.TYPES.TASK_COMPLETED,
        {
          taskId: task.id,
          title: task.title,
          completedBy: {
            id: updater.id,
            username: updater.username,
          },
          projectId: task.projectId,
        }
      );
    }

    // Notification for assignment changes
    if (changes.assigneeId && changes.assigneeId !== updater.id) {
      notificationService.notifyUser(
        changes.assigneeId,
        notificationService.TYPES.TASK_ASSIGNED,
        {
          taskId: task.id,
          title: task.title,
          assignedBy: {
            id: updater.id,
            username: updater.username,
          },
          projectId: task.projectId,
        }
      );
    }
  },
};

/**
 * Project-related real-time notifications
 */
const projectNotifications = {
  /**
   * Notify about project creation
   * @param {Object} project - Created project
   * @param {Object} creator - User who created the project
   */
  created: (project, creator) => {
    // Notify all team members about new project
    if (project.members && project.members.length > 0) {
      const memberIds = project.members
        .map((member) => member.userId)
        .filter((id) => id !== creator.id);

      notificationService.notifyUsers(
        memberIds,
        notificationService.TYPES.PROJECT_CREATED,
        {
          projectId: project.id,
          name: project.name,
          description: project.description,
          createdBy: {
            id: creator.id,
            username: creator.username,
          },
        }
      );
    }
  },

  /**
   * Notify about project updates
   * @param {Object} project - Updated project
   * @param {Object} updater - User who updated the project
   * @param {Object} changes - Changed fields
   */
  updated: (project, updater, changes) => {
    notificationService.notifyProject(
      project.id,
      notificationService.TYPES.PROJECT_UPDATED,
      {
        projectId: project.id,
        name: project.name,
        changes,
        updatedBy: {
          id: updater.id,
          username: updater.username,
        },
      },
      updater.id
    );
  },

  /**
   * Notify about member addition
   * @param {Object} project - Project
   * @param {Object} newMember - New member user
   * @param {Object} addedBy - User who added the member
   */
  memberAdded: (project, newMember, addedBy) => {
    // Notify the new member
    notificationService.notifyUser(
      newMember.id,
      notificationService.TYPES.PROJECT_MEMBER_ADDED,
      {
        projectId: project.id,
        projectName: project.name,
        addedBy: {
          id: addedBy.id,
          username: addedBy.username,
        },
      }
    );

    // Notify other project members
    notificationService.notifyProject(
      project.id,
      notificationService.TYPES.PROJECT_MEMBER_ADDED,
      {
        projectId: project.id,
        projectName: project.name,
        newMember: {
          id: newMember.id,
          username: newMember.username,
          email: newMember.email,
        },
        addedBy: {
          id: addedBy.id,
          username: addedBy.username,
        },
      },
      addedBy.id
    );
  },

  /**
   * Notify about member removal
   * @param {Object} project - Project
   * @param {Object} removedMember - Removed member user
   * @param {Object} removedBy - User who removed the member
   */
  memberRemoved: (project, removedMember, removedBy) => {
    // Notify the removed member
    notificationService.notifyUser(
      removedMember.id,
      notificationService.TYPES.PROJECT_MEMBER_REMOVED,
      {
        projectId: project.id,
        projectName: project.name,
        removedBy: {
          id: removedBy.id,
          username: removedBy.username,
        },
      }
    );

    // Notify other project members
    notificationService.notifyProject(
      project.id,
      notificationService.TYPES.PROJECT_MEMBER_REMOVED,
      {
        projectId: project.id,
        projectName: project.name,
        removedMember: {
          id: removedMember.id,
          username: removedMember.username,
        },
        removedBy: {
          id: removedBy.id,
          username: removedBy.username,
        },
      },
      removedBy.id
    );
  },
};

/**
 * Message-related real-time notifications
 */
const messageNotifications = {
  /**
   * Notify about new message
   * @param {Object} message - Sent message
   * @param {Object} sender - User who sent the message
   */
  sent: (message, sender) => {
    notificationService.notifyProject(
      message.projectId,
      notificationService.TYPES.MESSAGE_SENT,
      {
        messageId: message.id,
        content: message.content,
        messageType: message.messageType,
        sender: {
          id: sender.id,
          username: sender.username,
          email: sender.email,
        },
        projectId: message.projectId,
        taskId: message.taskId,
        createdAt: message.createdAt,
      },
      sender.id
    );
  },

  /**
   * Notify about message update
   * @param {Object} message - Updated message
   * @param {Object} updater - User who updated the message
   */
  updated: (message, updater) => {
    notificationService.notifyProject(
      message.projectId,
      notificationService.TYPES.MESSAGE_UPDATED,
      {
        messageId: message.id,
        content: message.content,
        updatedBy: {
          id: updater.id,
          username: updater.username,
        },
        projectId: message.projectId,
        updatedAt: message.updatedAt,
      },
      updater.id
    );
  },

  /**
   * Notify about message deletion
   * @param {Object} message - Deleted message
   * @param {Object} deleter - User who deleted the message
   */
  deleted: (message, deleter) => {
    notificationService.notifyProject(
      message.projectId,
      notificationService.TYPES.MESSAGE_DELETED,
      {
        messageId: message.id,
        deletedBy: {
          id: deleter.id,
          username: deleter.username,
        },
        projectId: message.projectId,
      },
      deleter.id
    );
  },
};

/**
 * Time tracking related real-time notifications
 */
const timeTrackingNotifications = {
  /**
   * Notify about time entry submission
   * @param {Object} timeEntry - Submitted time entry
   * @param {Object} submitter - User who submitted the entry
   */
  submitted: (timeEntry, submitter) => {
    // Notify team leads and admins about submission
    notificationService.notifyProject(
      timeEntry.projectId,
      notificationService.TYPES.TIME_ENTRY_SUBMITTED,
      {
        timeEntryId: timeEntry.id,
        hours: timeEntry.hours,
        description: timeEntry.description,
        submittedBy: {
          id: submitter.id,
          username: submitter.username,
        },
        projectId: timeEntry.projectId,
        taskId: timeEntry.taskId,
      },
      submitter.id
    );
  },

  /**
   * Notify about time entry approval
   * @param {Object} timeEntry - Approved time entry
   * @param {Object} approver - User who approved the entry
   */
  approved: (timeEntry, approver) => {
    notificationService.notifyUser(
      timeEntry.userId,
      notificationService.TYPES.TIME_ENTRY_APPROVED,
      {
        timeEntryId: timeEntry.id,
        hours: timeEntry.hours,
        approvedBy: {
          id: approver.id,
          username: approver.username,
        },
        projectId: timeEntry.projectId,
        approvalNotes: timeEntry.approvalNotes,
      }
    );
  },

  /**
   * Notify about time entry rejection
   * @param {Object} timeEntry - Rejected time entry
   * @param {Object} rejector - User who rejected the entry
   */
  rejected: (timeEntry, rejector) => {
    notificationService.notifyUser(
      timeEntry.userId,
      notificationService.TYPES.TIME_ENTRY_REJECTED,
      {
        timeEntryId: timeEntry.id,
        hours: timeEntry.hours,
        rejectedBy: {
          id: rejector.id,
          username: rejector.username,
        },
        projectId: timeEntry.projectId,
        rejectionReason: timeEntry.approvalNotes,
      }
    );
  },
};

/**
 * File-related real-time notifications
 */
const fileNotifications = {
  /**
   * Notify about file upload
   * @param {Object} file - Uploaded file
   * @param {Object} uploader - User who uploaded the file
   */
  uploaded: (file, uploader) => {
    if (file.projectId) {
      notificationService.notifyProject(
        file.projectId,
        notificationService.TYPES.FILE_UPLOADED,
        {
          fileId: file.id,
          filename: file.filename,
          category: file.category,
          size: file.size,
          uploadedBy: {
            id: uploader.id,
            username: uploader.username,
          },
          projectId: file.projectId,
          taskId: file.taskId,
        },
        uploader.id
      );
    }
  },

  /**
   * Notify about file sharing
   * @param {Object} file - Shared file
   * @param {Object} sharer - User who shared the file
   * @param {Array} recipients - Array of recipient user IDs
   */
  shared: (file, sharer, recipients) => {
    notificationService.notifyUsers(
      recipients,
      notificationService.TYPES.FILE_SHARED,
      {
        fileId: file.id,
        filename: file.filename,
        category: file.category,
        sharedBy: {
          id: sharer.id,
          username: sharer.username,
        },
        projectId: file.projectId,
      }
    );
  },
};

/**
 * System-wide notifications
 */
const systemNotifications = {
  /**
   * Send system announcement to all users
   * @param {string} message - Announcement message
   * @param {Object} data - Additional data
   */
  announcement: (message, data = {}) => {
    notificationService.broadcast(
      notificationService.TYPES.SYSTEM_ANNOUNCEMENT,
      {
        message,
        ...data,
        timestamp: new Date().toISOString(),
      }
    );
  },
};

module.exports = {
  taskNotifications,
  projectNotifications,
  messageNotifications,
  timeTrackingNotifications,
  fileNotifications,
  systemNotifications,
  notificationService,
};
