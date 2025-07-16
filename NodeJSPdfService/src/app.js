import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerDefinition from '../swagger-definition.js';
import { config } from './config/app.config.js';
import SecurityMiddleware from './middleware/security.middleware.js';
import barcodeRoutes from './routes/barcode.routes.js';
import healthRoutes from './routes/health.routes.js';
import pdfRoutes from './routes/pdf.routes.js';
import securityRoutes from './routes/security.routes.js';

/**
 * Advanced NodeJS PDF Service Application
 * Enterprise-grade PDF processing with digital signature verification and security analysis
 */
class PdfServiceApplication {
  constructor() {
    this.app = express();
    this.server = null;
    this.isShuttingDown = false;
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      this.setupMiddleware();
      this.setupRoutes();
      this.setupSwagger();
      this.setupErrorHandling();
      this.setupGracefulShutdown();

      console.log('✅ PDF Service application initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      process.exit(1);
    }
  }

  /**
   * Setup middleware
   */
  setupMiddleware() {
    // Security middleware (CORS, Helmet, Rate limiting, etc.)
    this.app.use(SecurityMiddleware.cors());
    this.app.use(SecurityMiddleware.helmet());
    this.app.use(SecurityMiddleware.compression());
    this.app.use(SecurityMiddleware.rateLimit());
    this.app.use(SecurityMiddleware.speedLimit());

    // Body parsing middleware
    this.app.use(express.json({ limit: config.upload.maxFileSize }));
    this.app.use(express.urlencoded({ extended: true, limit: config.upload.maxFileSize }));

    // Request logging
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Add request ID to headers
      req.requestId = requestId;
      res.setHeader('x-request-id', requestId);

      console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip} (${requestId})`);
      next();
    });

    // Health check middleware (before rate limiting)
    this.app.use('/api/health', (req, res, next) => {
      // Skip rate limiting for health checks
      req.skipRateLimit = true;
      next();
    });
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // API routes
    this.app.use('/api/pdf', pdfRoutes);
    this.app.use('/api/barcode', barcodeRoutes);
    this.app.use('/api/security', securityRoutes);  // Enhanced security routes
    this.app.use('/api', healthRoutes);

    // Root endpoint with enhanced info
    this.app.get('/', (req, res) => {
      res.json({
        service: 'NodeJS PDF Service',
        version: '2.0.0',
        status: 'operational',
        features: [
          'PDF creation and manipulation',
          'Digital signature verification',
          'Certificate validation',
          'Security analysis',
          'Barcode generation and reading',
          'Document conversion',
          'Batch processing',
          'Real-time streaming',
          'Certificate Authority management'
        ],
        endpoints: {
          swagger: '/swagger',
          health: '/api/health',
          metrics: '/api/metrics',
          pdf: '/api/pdf',
          barcode: '/api/barcode',
          security: '/api/security'
        },
        security: {
          signatureVerification: true,
          certificateValidation: true,
          trustedCAManagement: true,
          complianceChecking: ['ISO 32000', 'ETSI EN 319 142', 'PAdES']
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        availableEndpoints: [
          'GET /',
          'GET /swagger',
          'GET /api/health',
          'GET /api/metrics',
          'POST /api/pdf/*',
          'POST /api/barcode/*',
          'POST /api/security/*'
        ],
        requestId: req.requestId
      });
    });
  }

  /**
   * Setup Swagger documentation
   */
  setupSwagger() {
    // Update swagger definition with security endpoints
    const updatedSwaggerDef = {
      ...swaggerDefinition,
      info: {
        ...swaggerDefinition.info,
        version: '2.0.0',
        description: `
          Advanced NodeJS PDF Service with digital signature verification, certificate validation, 
          and comprehensive security analysis. Features enterprise-grade PDF processing, 
          high-performance streaming, and professional security assessment capabilities.
          
          ## 🔒 Security Features
          - Digital signature verification (PKCS#7/CMS)
          - Certificate chain validation
          - Trust store management
          - PDF security analysis
          - Compliance checking (ISO 32000, ETSI EN 319 142, PAdES)
          
          ## ⚡ Performance
          - High-performance streaming
          - Batch processing
          - Memory optimization
          - Concurrent operations
        `
      },
      tags: [
        ...swaggerDefinition.tags,
        {
          name: 'Security',
          description: 'Digital signature verification, certificate validation, and PDF security analysis'
        }
      ],
      servers: [
        {
          url: `http://localhost:${config.server.port}`,
          description: 'Development server'
        },
        {
          url: 'https://your-production-domain.com',
          description: 'Production server'
        }
      ]
    };

    this.app.use('/swagger', swaggerUi.serve, swaggerUi.setup(updatedSwaggerDef, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'NodeJS PDF Service API - Advanced Security & Processing',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        showExtensions: true,
        tryItOutEnabled: true,
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2
      }
    }));

    console.log(`📚 Swagger documentation available at: http://localhost:${config.server.port}/swagger`);
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error(`❌ Unhandled error in ${req.method} ${req.path}:`, error);

      // Don't leak error details in production
      const isDevelopment = process.env.NODE_ENV === 'development';

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: isDevelopment ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      this.gracefulShutdown('SIGTERM');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown('SIGTERM');
    });
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      if (this.isShuttingDown) return;

      console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
      this.isShuttingDown = true;

      try {
        // Stop accepting new connections
        if (this.server) {
          this.server.close(() => {
            console.log('✅ HTTP server closed');
          });
        }

        // Wait for existing connections to close
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  /**
   * Start the server
   */
  async start() {
    try {
      await this.initialize();

      this.server = this.app.listen(config.server.port, config.server.host, () => {
        console.log('\n🚀 Advanced NodeJS PDF Service Started Successfully!');
        console.log('=====================================');
        console.log(`📍 Server: http://localhost:${config.server.port}`);
        console.log(`📚 Swagger: http://localhost:${config.server.port}/swagger`);
        console.log(`💊 Health: http://localhost:${config.server.port}/api/health`);
        console.log(`📊 Metrics: http://localhost:${config.server.port}/api/metrics`);
        console.log('=====================================');
        console.log('🔒 Security Features:');
        console.log('  • Digital signature verification (PKCS#7/CMS)');
        console.log('  • Certificate validation (X.509)');
        console.log('  • PDF security analysis');
        console.log('  • Encryption strength assessment');
        console.log('  • Vulnerability detection');
        console.log('  • Compliance checking (ISO 32000, ETSI EN 319 142, PAdES)');
        console.log('  • Certificate Authority management');
        console.log('=====================================');
        console.log('⚡ Performance Features:');
        console.log('  • High-performance streaming');
        console.log('  • Batch processing');
        console.log('  • Memory optimization');
        console.log('  • Real-time monitoring');
        console.log('=====================================');
        console.log(`🕒 Started at: ${new Date().toISOString()}`);
        console.log(`🏗️  Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📦 Node.js: ${process.version}`);
        console.log('=====================================\n');
      });

      // Handle server errors
      this.server.on('error', (error) => {
        console.error('❌ Server error:', error);
        process.exit(1);
      });

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Create and start the application
const app = new PdfServiceApplication();
app.start().catch((error) => {
  console.error('💥 Fatal error during startup:', error);
  process.exit(1);
});

export default app;
