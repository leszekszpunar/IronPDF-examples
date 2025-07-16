import { Router } from 'express';
import { promises as fs } from 'fs';
import { config } from '../config/app.config.js';
import { HTTP_STATUS } from '../constants/index.js';
import { ApiTypes } from '../types/api.types.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: Service health monitoring and metrics
 */

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Get service health status with detailed metrics
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: number
 *                 version:
 *                   type: string
 *                 uptime:
 *                   type: number
 *                 memory:
 *                   type: object
 *                 performance:
 *                   type: object
 */
router.get('/health', async (req, res) => {
  try {
    const healthCheck = await performHealthCheck();

    if (healthCheck.status === 'healthy') {
      res.status(HTTP_STATUS.OK).json(ApiTypes.success('Service is healthy', healthCheck));
    } else {
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(
        ApiTypes.error('Service is unhealthy', healthCheck)
      );
    }
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      ApiTypes.error('Health check failed', error.message)
    );
  }
});

/**
 * @swagger
 * /api/metrics:
 *   get:
 *     tags: [Health]
 *     summary: Get detailed performance metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await getPerformanceMetrics();
    res.json(ApiTypes.success('Performance metrics retrieved', metrics));
  } catch (error) {
    console.error('Metrics collection failed:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      ApiTypes.error('Failed to collect metrics', error.message)
    );
  }
});

/**
 * Perform comprehensive health check
 */
async function performHealthCheck() {
  const start = Date.now();
  const checks = {};
  let overallStatus = 'healthy';

  // Memory check
  try {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    const memoryHealth = memUsageMB.heapUsed < 1000 ? 'healthy' : 'warning';
    if (memUsageMB.heapUsed > 1500) {
      overallStatus = 'unhealthy';
    }

    checks.memory = {
      status: memoryHealth,
      usage: memUsageMB,
      threshold: '1GB'
    };
  } catch (error) {
    checks.memory = { status: 'error', error: error.message };
    overallStatus = 'unhealthy';
  }

  // Disk space check
  try {
    const tempStats = await fs.stat(config.upload.tempDir).catch(() => null);
    const uploadsStats = await fs.stat(config.upload.uploadsDir).catch(() => null);

    checks.disk = {
      status: 'healthy',
      tempDir: tempStats ? 'accessible' : 'inaccessible',
      uploadsDir: uploadsStats ? 'accessible' : 'inaccessible'
    };

    if (!tempStats || !uploadsStats) {
      checks.disk.status = 'warning';
    }
  } catch (error) {
    checks.disk = { status: 'error', error: error.message };
    overallStatus = 'unhealthy';
  }

  // Dependencies check
  try {
    checks.dependencies = {
      status: 'healthy',
      versions: {
        node: process.version,
        npm: process.env.npm_version || 'unknown'
      }
    };
  } catch (error) {
    checks.dependencies = { status: 'error', error: error.message };
    overallStatus = 'unhealthy';
  }

  const responseTime = Date.now() - start;

  return {
    status: overallStatus,
    timestamp: Date.now(),
    version: '2.0.0',
    uptime: Math.floor(process.uptime()),
    responseTime,
    environment: config.server.environment,
    checks,
    endpoints: {
      pdf: '/api/pdf',
      barcode: '/api/barcode',
      documentation: '/swagger'
    }
  };
}

/**
 * Get detailed performance metrics
 */
async function getPerformanceMetrics() {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return {
    timestamp: Date.now(),
    uptime: process.uptime(),
    memory: {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    process: {
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch
    },
    performance: {
      maxFileSize: config.upload.maxFileSize,
      streamingThreshold: config.pdf.streamingThreshold,
      concurrentProcessing: config.pdf.concurrentProcessing,
      chunkSize: config.streaming.chunkSize
    }
  };
}

export { router as healthRoutes };
export default router;
