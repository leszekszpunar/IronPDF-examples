import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || '0.0.0.0',
    environment: process.env.NODE_ENV || 'development'
  },

  // Performance & Security
  security: {
    // Rate limiting configuration
    rateLimit: {
      windowMs: (process.env.NODE_ENV === 'development') ? 1 * 60 * 1000 : 15 * 60 * 1000, // Dev: 1 min, Prod: 15 min
      max: (process.env.NODE_ENV === 'development') ? 1000 : 100, // Dev: 1000 requests, Prod: 100 requests
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    },

    // Speed limiting configuration
    speedLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: (process.env.NODE_ENV === 'development') ? 1000 : 50, // Dev: 1000 requests (prawie wyłączone), Prod: 50 requests
      delayMs: (process.env.NODE_ENV === 'development') ? () => 50 : () => 500, // Dev: 50ms, Prod: 500ms delay
      maxDelayMs: (process.env.NODE_ENV === 'development') ? 1000 : 20000, // Dev: max 1s, Prod: max 20s delay
      skipSuccessfulRequests: true,
      skipFailedRequests: false
    },

    // Helmet configuration
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ['\'self\''],
          styleSrc: ['\'self\'', '\'unsafe-inline\''],
          scriptSrc: ['\'self\''],
          imgSrc: ['\'self\'', 'data:', 'https:'],
          fontSrc: ['\'self\'', 'https:', 'data:'],
          connectSrc: ['\'self\''],
          frameSrc: ['\'none\''],
          objectSrc: ['\'none\''],
          mediaSrc: ['\'self\''],
          formAction: ['\'self\''],
          frameAncestors: ['\'none\''],
          baseUri: ['\'self\''],
          upgradeInsecureRequests: [],
          scriptSrcAttr: ['\'none\'']
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: 'no-referrer' },
      xssFilter: true
    }
  },

  // File Upload Configuration
  upload: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 10,
    allowedMimeTypes: [
      // PDF files
      'application/pdf',

      // Word documents
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx

      // Additional DOC MIME types (fallback)
      'application/x-msword',
      'application/doc',
      'application/ms-doc',
      'application/msword-document',

      // Text files
      'text/plain',
      'text/html',

      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',

      // Additional formats
      'application/octet-stream' // Fallback for binary files
    ],
    tempDir: join(__dirname, '../../temp'),
    uploadsDir: join(__dirname, '../../uploads')
  },

  // PDF Processing Configuration
  pdf: {
    maxPages: 1000,
    maxFileSize: 100 * 1024 * 1024, // 100MB
    quality: 'high',
    compression: true,
    streamingThreshold: 10 * 1024 * 1024, // 10MB - use streaming for files larger than this
    concurrentProcessing: 4 // max concurrent PDF operations
  },

  // Streaming Configuration
  streaming: {
    highWaterMark: 64 * 1024, // 64KB buffer
    enableCompression: true,
    chunkSize: 8 * 1024 // 8KB chunks
  },

  // API Documentation
  swagger: {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'High-Performance PDF Service API',
        version: '2.0.0',
        description: 'Enterprise-grade PDF processing service with streaming capabilities',
        contact: {
          name: 'API Support',
          email: 'support@pdfservice.com'
        }
      },
      servers: [
        {
          url: `http://localhost:${process.env.PORT || 3001}`,
          description: 'Development server'
        }
      ]
    },
    apis: ['./src/routes/*.js']
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
    skipSuccessfulRequests: process.env.NODE_ENV === 'production'
  },

  // Health Check Configuration
  health: {
    checks: [
      'memory',
      'disk',
      'dependencies'
    ]
  }
};

export default config;
