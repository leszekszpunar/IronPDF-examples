// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Error Messages
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'File size exceeds maximum allowed limit',
  INVALID_FILE_TYPE: 'Unsupported file type',
  MISSING_FILE: 'No file provided',
  PROCESSING_ERROR: 'Error processing file',
  INVALID_PARAMETERS: 'Invalid parameters provided',
  STREAM_ERROR: 'Error in file streaming',
  MEMORY_ERROR: 'Insufficient memory for operation',
  TIMEOUT_ERROR: 'Operation timed out'
};

// MIME Types
export const MIME_TYPES = {
  PDF: 'application/pdf',
  DOC: 'application/msword',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  TXT: 'text/plain',
  HTML: 'text/html',
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  GIF: 'image/gif',
  WEBP: 'image/webp',
  JSON: 'application/json'
};

// File Extensions
export const FILE_EXTENSIONS = {
  PDF: '.pdf',
  DOC: '.doc',
  DOCX: '.docx',
  TXT: '.txt',
  HTML: '.html',
  JPEG: '.jpg',
  JPG: '.jpg',
  PNG: '.png',
  GIF: '.gif',
  WEBP: '.webp'
};

// PDF Processing Constants
export const PDF_CONSTANTS = {
  MAX_PAGES_DEFAULT: 1000,
  QUALITY_HIGH: 'high',
  QUALITY_MEDIUM: 'medium',
  QUALITY_LOW: 'low',
  COMPRESSION_LEVEL: 6,
  DEFAULT_DPI: 300
};

// Streaming Constants
export const STREAM_CONSTANTS = {
  CHUNK_SIZE: 8192, // 8KB
  HIGH_WATER_MARK: 65536, // 64KB
  TIMEOUT: 30000 // 30 seconds
};

// API Routes
export const API_ROUTES = {
  HEALTH: '/api/health',
  SWAGGER: '/swagger',
  API_PREFIX: '/api',
  PDF_PREFIX: '/api/pdf',
  BARCODE_PREFIX: '/api/barcode'
};

// Service Features
export const FEATURES = {
  PDF_MERGE: 'pdf-merge',
  PDF_SPLIT: 'pdf-split',
  IMAGE_TO_PDF: 'image-to-pdf',
  DOC_TO_PDF: 'doc-to-pdf',
  TEXT_EXTRACTION: 'text-extraction',
  QR_CODE_GENERATION: 'qr-generation',
  BARCODE_GENERATION: 'barcode-generation',
  BARCODE_READING: 'barcode-reading',
  QR_CODE_READING: 'qr-reading',
  DIGITAL_SIGNATURE: 'digital-signature',
  SIGNATURE_VERIFICATION: 'signature-verification',
  STREAMING_UPLOAD: 'streaming-upload',
  BATCH_PROCESSING: 'batch-processing'
};

export default {
  HTTP_STATUS,
  ERROR_MESSAGES,
  MIME_TYPES,
  FILE_EXTENSIONS,
  PDF_CONSTANTS,
  STREAM_CONSTANTS,
  API_ROUTES,
  FEATURES
};
