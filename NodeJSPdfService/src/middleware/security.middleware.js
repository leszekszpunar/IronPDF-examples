import compression from 'compression';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import { config } from '../config/app.config.js';
import { HTTP_STATUS } from '../constants/index.js';
import { ApiTypes } from '../types/api.types.js';

/**
 * Security middleware configuration
 */
export class SecurityMiddleware {
  /**
   * Rate limiting middleware
   */
  static rateLimit() {
    return rateLimit({
      windowMs: config.security.rateLimit.windowMs,
      max: config.security.rateLimit.max,
      standardHeaders: config.security.rateLimit.standardHeaders,
      legacyHeaders: config.security.rateLimit.legacyHeaders,
      message: {
        error: 'Too many requests from this IP, please try again later'
      },
      handler: (req, res) => {
        res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json(
          ApiTypes.error('Rate limit exceeded. Please try again later.')
        );
      }
    });
  }

  /**
   * Speed limiting middleware for high-load endpoints
   */
  static speedLimit() {
    return slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 50, // allow 50 requests per windowMs without delay
      delayMs: 500, // add 500ms delay per request after delayAfter
      maxDelayMs: 20000, // maximum delay of 20 seconds
      skipSuccessfulRequests: true,
      skipFailedRequests: false
    });
  }

  /**
   * Helmet security headers
   */
  static helmet() {
    return helmet({
      contentSecurityPolicy: config.security.helmet.contentSecurityPolicy,
      crossOriginEmbedderPolicy: false, // Needed for PDF processing
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  }

  /**
   * Compression middleware with PDF-specific optimizations
   */
  static compression() {
    return compression({
      filter: (req, res) => {
        // Don't compress if client doesn't support it
        if (req.headers['x-no-compression']) {
          return false;
        }

        // Don't compress binary files like PDFs
        const contentType = res.getHeader('content-type');
        if (contentType && contentType.includes('application/pdf')) {
          return false;
        }

        // Use compression for everything else
        return compression.filter(req, res);
      },
      level: 6, // Good balance between compression and speed
      threshold: 1024 // Only compress files larger than 1KB
    });
  }

  /**
   * CORS configuration for API access
   */
  static cors() {
    const corsOptions = {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        // In development, allow all origins
        if (config.server.environment === 'development') {
          return callback(null, true);
        }

        // In production, implement whitelist
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'Pragma'
      ]
    };

    return corsOptions;
  }

  /**
   * Request logging middleware
   */
  static requestLogger() {
    return (req, res, next) => {
      const start = Date.now();

      // Log request
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${req.ip}`);

      // Log response when finished
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(
          `[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`
        );
      });

      next();
    };
  }

  /**
   * Memory usage monitoring
   */
  static memoryMonitor() {
    return (req, res, next) => {
      const memUsage = process.memoryUsage();
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      };

      // Log memory warning if usage is high
      if (memUsageMB.heapUsed > 500) { // 500MB threshold
        console.warn(`High memory usage detected: ${JSON.stringify(memUsageMB)}`);
      }

      // Add memory info to response headers in development
      if (config.server.environment === 'development') {
        res.setHeader('X-Memory-Usage', JSON.stringify(memUsageMB));
      }

      next();
    };
  }

  /**
   * Error handling middleware
   */
  static errorHandler() {
    return (err, req, res, next) => {
      console.error('Error occurred:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Handle specific error types
      if (err.code === 'EBADCSRFTOKEN') {
        return res.status(HTTP_STATUS.FORBIDDEN).json(
          ApiTypes.error('Invalid CSRF token')
        );
      }

      if (err.type === 'entity.parse.failed') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          ApiTypes.error('Invalid JSON payload')
        );
      }

      if (err.type === 'entity.too.large') {
        return res.status(HTTP_STATUS.PAYLOAD_TOO_LARGE).json(
          ApiTypes.error('Request entity too large')
        );
      }

      // Default error response
      const status = err.status || err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
      const message = config.server.environment === 'production'
        ? 'Internal server error'
        : err.message;

      res.status(status).json(
        ApiTypes.error(message, config.server.environment === 'development' ? err.stack : undefined)
      );
    };
  }

  /**
   * Not found handler
   */
  static notFoundHandler() {
    return (req, res) => {
      res.status(HTTP_STATUS.NOT_FOUND).json(
        ApiTypes.error(`Route not found: ${req.method} ${req.url}`)
      );
    };
  }
}

export default SecurityMiddleware;
