const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/app.config');

// Ensure temp directory exists
if (!fs.existsSync(config.upload.tempDir)) {
  fs.mkdirSync(config.upload.tempDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()  }-${  Math.round(Math.random() * 1E9)}`;
    cb(null, `${file.fieldname  }-${  uniqueSuffix  }${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedFormats = [
    ...config.upload.allowedImageFormats,
    ...config.upload.allowedPdfFormats,
    ...config.upload.allowedDocumentFormats
  ];

  if (allowedFormats.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Nieobsługiwany format pliku: ${ext}. Obsługiwane formaty: ${allowedFormats.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: config.upload.maxFiles
  },
  fileFilter
});

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        message: `Plik przekracza maksymalny rozmiar ${config.upload.maxFileSize / (1024 * 1024)}MB`,
        code: 'FILE_TOO_LARGE',
        timestamp: new Date().toISOString()
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: `Maksymalna liczba plików: ${config.upload.maxFiles}`,
        code: 'TOO_MANY_FILES',
        timestamp: new Date().toISOString()
      });
    }
  }

  if (error.message.includes('Nieobsługiwany format')) {
    return res.status(415).json({
      message: error.message,
      code: 'UNSUPPORTED_MEDIA_TYPE',
      timestamp: new Date().toISOString()
    });
  }

  next(error);
};

module.exports = {
  upload,
  handleUploadError
};
