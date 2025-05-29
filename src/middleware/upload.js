const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { sendError } = require("../utils/helpers");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// File storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create subdirectories based on file category
    const category = req.body.category || "general";
    const categoryDir = path.join(uploadsDir, category);

    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }

    cb(null, categoryDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(file.originalname);
    const filename = `${timestamp}_${randomString}${extension}`;

    cb(null, filename);
  },
});

// File filter configuration
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = {
    general: /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/,
    document: /pdf|doc|docx|txt|xls|xlsx|ppt|pptx/,
    image: /jpeg|jpg|png|gif|bmp|svg|webp/,
    video: /mp4|avi|mov|wmv|flv|webm/,
    audio: /mp3|wav|aac|ogg|m4a/,
    screenshot: /jpeg|jpg|png|gif|bmp/,
    archive: /zip|rar|7z|tar|gz/,
    code: /js|ts|jsx|tsx|py|java|cpp|c|html|css|php|rb|go/,
  };

  const category = req.body.category || "general";
  const allowedPattern = allowedTypes[category] || allowedTypes.general;
  const extension = path.extname(file.originalname).toLowerCase().substring(1);

  if (allowedPattern.test(extension)) {
    cb(null, true);
  } else {
    cb(
      new Error(`File type .${extension} not allowed for category ${category}`),
      false
    );
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10, // Maximum 10 files at once
  },
});

// Upload middleware functions
const uploadSingle = (fieldName = "file") => {
  return (req, res, next) => {
    const singleUpload = upload.single(fieldName);

    singleUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return sendError(res, "File too large (max 50MB)", 400);
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return sendError(res, "Too many files (max 10)", 400);
        }
        return sendError(res, `Upload error: ${err.message}`, 400);
      } else if (err) {
        return sendError(res, err.message, 400);
      }

      if (!req.file) {
        return sendError(res, "No file uploaded", 400);
      }

      next();
    });
  };
};

const uploadMultiple = (fieldName = "files", maxCount = 10) => {
  return (req, res, next) => {
    const multipleUpload = upload.array(fieldName, maxCount);

    multipleUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return sendError(
            res,
            "One or more files too large (max 50MB each)",
            400
          );
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return sendError(res, `Too many files (max ${maxCount})`, 400);
        }
        return sendError(res, `Upload error: ${err.message}`, 400);
      } else if (err) {
        return sendError(res, err.message, 400);
      }

      if (!req.files || req.files.length === 0) {
        return sendError(res, "No files uploaded", 400);
      }

      next();
    });
  };
};

// File validation helpers
const validateFileType = (filename, allowedTypes) => {
  const extension = path.extname(filename).toLowerCase();
  return allowedTypes.includes(extension);
};

const getFileCategory = (mimeType) => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.includes("text")
  )
    return "document";
  if (mimeType.includes("zip") || mimeType.includes("compressed"))
    return "archive";
  return "general";
};

// File cleanup helper
const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.error("Error cleaning up file:", error);
  }
  return false;
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  validateFileType,
  getFileCategory,
  cleanupFile,
  uploadsDir,
};
