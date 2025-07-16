/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Indicates if the operation was successful
 * @property {string} message - Response message
 * @property {*} data - Response data
 * @property {string} [error] - Error message if success is false
 * @property {number} timestamp - Unix timestamp
 */

/**
 * @typedef {Object} FileInfo
 * @property {string} originalName - Original filename
 * @property {string} filename - Stored filename
 * @property {string} path - File path
 * @property {number} size - File size in bytes
 * @property {string} mimetype - MIME type
 * @property {string} encoding - File encoding
 */

/**
 * @typedef {Object} PdfProcessingOptions
 * @property {string} [quality] - Quality level: 'high', 'medium', 'low'
 * @property {boolean} [compression] - Enable compression
 * @property {string} [format] - Page format: 'A4', 'A3', 'LETTER'
 * @property {number} [dpi] - DPI setting
 * @property {boolean} [streaming] - Enable streaming for large files
 */

/**
 * @typedef {Object} StreamingUploadOptions
 * @property {number} [maxFileSize] - Maximum file size in bytes
 * @property {number} [maxFiles] - Maximum number of files
 * @property {string[]} [allowedMimeTypes] - Allowed MIME types
 * @property {boolean} [preserveFilename] - Preserve original filename
 */

/**
 * @typedef {Object} BarcodeOptions
 * @property {string} format - Barcode format
 * @property {number} [width] - Barcode width
 * @property {number} [height] - Barcode height
 * @property {boolean} [displayValue] - Show text below barcode
 */

/**
 * @typedef {Object} QrCodeOptions
 * @property {number} [size] - QR code size
 * @property {string} [errorCorrectionLevel] - Error correction level
 * @property {string} [color] - Foreground color
 * @property {string} [background] - Background color
 */

/**
 * @typedef {Object} HealthCheckResult
 * @property {string} status - 'healthy' or 'unhealthy'
 * @property {Object} checks - Individual health check results
 * @property {number} timestamp - Unix timestamp
 * @property {string} version - Application version
 */

/**
 * @typedef {Object} ProcessingResult
 * @property {boolean} success - Processing success status
 * @property {string} [outputPath] - Path to processed file
 * @property {Buffer} [buffer] - File buffer for streaming
 * @property {Object} [metadata] - File metadata
 * @property {string} [error] - Error message if processing failed
 */

/**
 * @typedef {Object} BatchProcessingRequest
 * @property {FileInfo[]} files - Array of files to process
 * @property {string} operation - Processing operation type
 * @property {Object} [options] - Processing options
 * @property {boolean} [parallel] - Enable parallel processing
 */

export const ApiTypes = {
  // Response wrapper
  createApiResponse: (success, message, data = null, error = null) => ({
    success,
    message,
    data,
    error,
    timestamp: Date.now()
  }),

  // Success response
  success: (message, data = null) => ({
    success: true,
    message,
    data,
    timestamp: Date.now()
  }),

  // Error response
  error: (message, error = null) => ({
    success: false,
    message,
    error,
    timestamp: Date.now()
  })
};

export default ApiTypes;
