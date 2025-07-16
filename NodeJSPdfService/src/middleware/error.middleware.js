const path = require('path');
const fs = require('fs');

// Cleanup temporary files
const cleanupTempFiles = (files) => {
  if (!files) return;

  const fileArray = Array.isArray(files) ? files : [files];
  fileArray.forEach(file => {
    if (file && file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error('Error cleaning up temp file:', file.path, error.message);
      }
    }
  });
};

// Global error handler
const errorHandler = (error, req, res, next) => {
  // Cleanup uploaded files on error
  cleanupTempFiles(req.file);
  cleanupTempFiles(req.files);

  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error response
  const errorResponse = {
    message: 'Wystąpił błąd wewnętrzny serwera',
    code: 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString()
  };

  // Handle specific error types
  if (error.message.includes('PDF')) {
    errorResponse.message = 'Błąd podczas przetwarzania PDF';
    errorResponse.code = 'PDF_PROCESSING_ERROR';
  } else if (error.message.includes('file') || error.message.includes('plik')) {
    errorResponse.message = 'Błąd podczas przetwarzania pliku';
    errorResponse.code = 'FILE_PROCESSING_ERROR';
  }

  res.status(500).json(errorResponse);
};

// 404 handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    message: 'Endpoint nie został znaleziony',
    code: 'NOT_FOUND',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  cleanupTempFiles
};
