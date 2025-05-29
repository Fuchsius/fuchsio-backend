// Controllers for file upload and management endpoints
const { PrismaClient } = require("@prisma/client");
const { sendSuccess, sendError, sendPaginated } = require("../utils/helpers");
const { cleanupFile, getFileCategory } = require("../middleware/upload");
const { fileNotifications } = require("../utils/realtime");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

// Upload single file
const uploadFile = async (req, res) => {
  const { description, category, isPublic, projectId, taskId } =
    req.validatedBody;
  const file = req.file;

  // Validate project/task access if provided
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdBy: req.user.id },
          { members: { some: { userId: req.user.id } } },
          ...(req.user.role === "ADMIN" ? [{}] : []),
        ],
      },
    });

    if (!project) {
      cleanupFile(file.path);
      return sendError(res, "Project not found or access denied", 404);
    }
  }

  if (taskId) {
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { createdBy: req.user.id },
          { assigneeId: req.user.id },
          { project: { createdBy: req.user.id } },
          { project: { members: { some: { userId: req.user.id } } } },
          ...(req.user.role === "ADMIN" ? [{}] : []),
        ],
      },
    });

    if (!task) {
      cleanupFile(file.path);
      return sendError(res, "Task not found or access denied", 404);
    }
  }

  try {
    // Generate public URL if needed
    const publicUrl = isPublic
      ? `/uploads/${path.basename(path.dirname(file.path))}/${file.filename}`
      : null;

    // Create file record in database
    const fileUpload = await prisma.fileUpload.create({
      data: {
        filename: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        url: publicUrl,
        description: description || null,
        isPublic: isPublic || false,
        category: category || getFileCategory(file.mimetype).toUpperCase(),
        uploadedBy: req.user.id,
        projectId: projectId || null,
        taskId: taskId || null,
      },
      include: {
        uploader: {
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

    // Send real-time notification for file upload
    try {
      fileNotifications.uploaded(fileUpload, {
        id: req.user.id,
        username:
          req.user.username || `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email,
      });
    } catch (notificationError) {
      console.error("File upload notification error:", notificationError);
      // Don't fail the request if notification fails
    }

    sendSuccess(res, fileUpload, "File uploaded successfully", 201);
  } catch (error) {
    // Cleanup file if database operation fails
    cleanupFile(file.path);
    console.error("File upload error:", error);
    sendError(res, "Failed to save file information", 500);
  }
};

// Upload multiple files
const uploadFiles = async (req, res) => {
  const { description, category, isPublic, projectId, taskId } =
    req.validatedBody;
  const files = req.files;

  // Validate project/task access if provided
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdBy: req.user.id },
          { members: { some: { userId: req.user.id } } },
          ...(req.user.role === "ADMIN" ? [{}] : []),
        ],
      },
    });

    if (!project) {
      // Cleanup all files
      files.forEach((file) => cleanupFile(file.path));
      return sendError(res, "Project not found or access denied", 404);
    }
  }

  if (taskId) {
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { createdBy: req.user.id },
          { assigneeId: req.user.id },
          { project: { createdBy: req.user.id } },
          { project: { members: { some: { userId: req.user.id } } } },
          ...(req.user.role === "ADMIN" ? [{}] : []),
        ],
      },
    });

    if (!task) {
      // Cleanup all files
      files.forEach((file) => cleanupFile(file.path));
      return sendError(res, "Task not found or access denied", 404);
    }
  }

  try {
    // Create file records in database
    const fileUploads = await Promise.all(
      files.map(async (file) => {
        const publicUrl = isPublic
          ? `/uploads/${path.basename(path.dirname(file.path))}/${
              file.filename
            }`
          : null;

        return prisma.fileUpload.create({
          data: {
            filename: file.originalname,
            storedName: file.filename,
            mimeType: file.mimetype,
            size: file.size,
            path: file.path,
            url: publicUrl,
            description: description || null,
            isPublic: isPublic || false,
            category: category || getFileCategory(file.mimetype).toUpperCase(),
            uploadedBy: req.user.id,
            projectId: projectId || null,
            taskId: taskId || null,
          },
          include: {
            uploader: {
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
      })
    );

    sendSuccess(
      res,
      fileUploads,
      `${files.length} files uploaded successfully`,
      201
    );
  } catch (error) {
    // Cleanup files if database operation fails
    files.forEach((file) => cleanupFile(file.path));
    console.error("Multiple file upload error:", error);
    sendError(res, "Failed to save file information", 500);
  }
};

// Get files with filtering and pagination
const getFiles = async (req, res) => {
  const {
    page,
    limit,
    category,
    projectId,
    taskId,
    search,
    sortBy,
    sortOrder,
  } = req.validatedBody;

  // Build where clause based on user role and access
  const whereClause = {
    OR: [
      { uploadedBy: req.user.id },
      { isPublic: true },
      ...(req.user.role === "ADMIN" ? [{}] : []),
      ...(req.user.role === "TEAM_LEAD"
        ? [
            { project: { members: { some: { userId: req.user.id } } } },
            {
              task: { project: { members: { some: { userId: req.user.id } } } },
            },
          ]
        : []),
    ],
    ...(category && { category }),
    ...(projectId && { projectId }),
    ...(taskId && { taskId }),
    ...(search && {
      OR: [
        { filename: { contains: search } },
        { description: { contains: search } },
      ],
    }),
  };

  const skip = (page - 1) * limit;

  try {
    const [files, total] = await Promise.all([
      prisma.fileUpload.findMany({
        where: whereClause,
        include: {
          uploader: {
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
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.fileUpload.count({ where: whereClause }),
    ]);

    sendPaginated(res, files, page, limit, total);
  } catch (error) {
    console.error("Get files error:", error);
    sendError(res, "Failed to retrieve files", 500);
  }
};

// Get single file
const getFile = async (req, res) => {
  const { id } = req.validatedParams;

  try {
    const file = await prisma.fileUpload.findFirst({
      where: {
        id,
        OR: [
          { uploadedBy: req.user.id },
          { isPublic: true },
          ...(req.user.role === "ADMIN" ? [{}] : []),
          ...(req.user.role === "TEAM_LEAD"
            ? [
                { project: { members: { some: { userId: req.user.id } } } },
                {
                  task: {
                    project: { members: { some: { userId: req.user.id } } },
                  },
                },
              ]
            : []),
        ],
      },
      include: {
        uploader: {
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

    if (!file) {
      return sendError(res, "File not found or access denied", 404);
    }

    sendSuccess(res, file);
  } catch (error) {
    console.error("Get file error:", error);
    sendError(res, "Failed to retrieve file", 500);
  }
};

// Download file
const downloadFile = async (req, res) => {
  const { id } = req.validatedParams;

  try {
    const file = await prisma.fileUpload.findFirst({
      where: {
        id,
        OR: [
          { uploadedBy: req.user.id },
          { isPublic: true },
          ...(req.user.role === "ADMIN" ? [{}] : []),
          ...(req.user.role === "TEAM_LEAD"
            ? [
                { project: { members: { some: { userId: req.user.id } } } },
                {
                  task: {
                    project: { members: { some: { userId: req.user.id } } },
                  },
                },
              ]
            : []),
        ],
      },
    });

    if (!file) {
      return sendError(res, "File not found or access denied", 404);
    }

    // Check if file exists on disk
    if (!fs.existsSync(file.path)) {
      return sendError(res, "File not found on server", 404);
    }

    // Set headers for file download
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.filename}"`
    );
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Length", file.size);

    // Stream file to response
    const fileStream = fs.createReadStream(file.path);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Download file error:", error);
    sendError(res, "Failed to download file", 500);
  }
};

// Update file metadata
const updateFile = async (req, res) => {
  const { id } = req.validatedParams;
  const { description, isPublic, category } = req.validatedBody;

  try {
    // Check if file exists and user has permission
    const existingFile = await prisma.fileUpload.findFirst({
      where: {
        id,
        OR: [
          { uploadedBy: req.user.id },
          ...(req.user.role === "ADMIN" ? [{}] : []),
        ],
      },
    });

    if (!existingFile) {
      return sendError(res, "File not found or access denied", 404);
    }

    // Update file metadata
    const updatedFile = await prisma.fileUpload.update({
      where: { id },
      data: {
        ...(description !== undefined && { description }),
        ...(isPublic !== undefined && { isPublic }),
        ...(category !== undefined && { category }),
        // Update URL if isPublic status changes
        ...(isPublic !== undefined && {
          url: isPublic
            ? `/uploads/${path.basename(path.dirname(existingFile.path))}/${
                existingFile.storedName
              }`
            : null,
        }),
      },
      include: {
        uploader: {
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

    sendSuccess(res, updatedFile, "File updated successfully");
  } catch (error) {
    console.error("Update file error:", error);
    sendError(res, "Failed to update file", 500);
  }
};

// Delete file
const deleteFile = async (req, res) => {
  const { id } = req.validatedParams;

  try {
    // Check if file exists and user has permission
    const existingFile = await prisma.fileUpload.findFirst({
      where: {
        id,
        OR: [
          { uploadedBy: req.user.id },
          ...(req.user.role === "ADMIN" ? [{}] : []),
        ],
      },
    });

    if (!existingFile) {
      return sendError(res, "File not found or access denied", 404);
    }

    // Delete file from database
    await prisma.fileUpload.delete({
      where: { id },
    });

    // Delete file from disk
    cleanupFile(existingFile.path);

    sendSuccess(res, null, "File deleted successfully");
  } catch (error) {
    console.error("Delete file error:", error);
    sendError(res, "Failed to delete file", 500);
  }
};

// Upload screenshot
const uploadScreenshot = async (req, res) => {
  const { description, projectId, taskId, isPublic } = req.validatedBody;
  const file = req.file;

  // Validate that uploaded file is an image
  if (!file.mimetype.startsWith("image/")) {
    cleanupFile(file.path);
    return sendError(res, "File must be an image", 400);
  }

  // Validate project/task access if provided
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdBy: req.user.id },
          { members: { some: { userId: req.user.id } } },
          ...(req.user.role === "ADMIN" ? [{}] : []),
        ],
      },
    });

    if (!project) {
      cleanupFile(file.path);
      return sendError(res, "Project not found or access denied", 404);
    }
  }

  if (taskId) {
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { createdBy: req.user.id },
          { assigneeId: req.user.id },
          { project: { createdBy: req.user.id } },
          { project: { members: { some: { userId: req.user.id } } } },
          ...(req.user.role === "ADMIN" ? [{}] : []),
        ],
      },
    });

    if (!task) {
      cleanupFile(file.path);
      return sendError(res, "Task not found or access denied", 404);
    }
  }

  try {
    // Generate public URL if needed
    const publicUrl = isPublic ? `/uploads/screenshot/${file.filename}` : null;

    // Create screenshot record in database
    const screenshot = await prisma.fileUpload.create({
      data: {
        filename: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        url: publicUrl,
        description:
          description || `Screenshot taken on ${new Date().toLocaleString()}`,
        isPublic: isPublic || false,
        category: "SCREENSHOT",
        uploadedBy: req.user.id,
        projectId: projectId || null,
        taskId: taskId || null,
      },
      include: {
        uploader: {
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

    // Send real-time notification for screenshot upload
    try {
      fileNotifications.uploaded(screenshot, {
        id: req.user.id,
        username:
          req.user.username || `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email,
      });
    } catch (notificationError) {
      console.error("Screenshot upload notification error:", notificationError);
      // Don't fail the request if notification fails
    }

    sendSuccess(res, screenshot, "Screenshot uploaded successfully", 201);
  } catch (error) {
    // Cleanup file if database operation fails
    cleanupFile(file.path);
    console.error("Screenshot upload error:", error);
    sendError(res, "Failed to save screenshot", 500);
  }
};

// Bulk file operations
const bulkFileOperation = async (req, res) => {
  const { operation, fileIds, data } = req.validatedBody;

  try {
    // Verify user has access to all files
    const files = await prisma.fileUpload.findMany({
      where: {
        id: { in: fileIds },
        OR: [
          { uploadedBy: req.user.id },
          ...(req.user.role === "ADMIN" ? [{}] : []),
        ],
      },
    });

    if (files.length !== fileIds.length) {
      return sendError(
        res,
        "One or more files not found or access denied",
        404
      );
    }

    let result;
    switch (operation) {
      case "delete":
        // Delete files from database
        await prisma.fileUpload.deleteMany({
          where: { id: { in: fileIds } },
        });

        // Delete files from disk
        files.forEach((file) => cleanupFile(file.path));
        result = `${files.length} files deleted successfully`;
        break;

      case "update":
        // Update file metadata
        await prisma.fileUpload.updateMany({
          where: { id: { in: fileIds } },
          data: {
            ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
            ...(data.category && { category: data.category }),
          },
        });
        result = `${files.length} files updated successfully`;
        break;

      case "move":
        // Move files to different project/task
        await prisma.fileUpload.updateMany({
          where: { id: { in: fileIds } },
          data: {
            projectId: data.projectId,
            taskId: data.taskId,
          },
        });
        result = `${files.length} files moved successfully`;
        break;

      default:
        return sendError(res, "Invalid operation", 400);
    }

    sendSuccess(res, { processedCount: files.length }, result);
  } catch (error) {
    console.error("Bulk file operation error:", error);
    sendError(res, "Failed to perform bulk operation", 500);
  }
};

module.exports = {
  uploadFile,
  uploadFiles,
  getFiles,
  getFile,
  downloadFile,
  updateFile,
  deleteFile,
  uploadScreenshot,
  bulkFileOperation,
};
