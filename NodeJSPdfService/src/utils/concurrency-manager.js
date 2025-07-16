import EventEmitter from 'events';

/**
 * Enterprise Concurrency Manager
 * Handles resource limiting, queuing, and load balancing
 */
export class ConcurrencyManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxConcurrent = options.maxConcurrent || 4;
    this.maxQueueSize = options.maxQueueSize || 100;
    this.timeout = options.timeout || 30000; // 30 seconds

    this.running = new Set();
    this.queue = [];
    this.stats = {
      processed: 0,
      failed: 0,
      timeout: 0,
      queueTime: 0,
      processingTime: 0
    };
  }

  /**
   * Acquire resource with queuing
   */
  async acquire(operationName = 'unknown') {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      // Check queue size limit
      if (this.queue.length >= this.maxQueueSize) {
        const error = new Error(`Queue full (${this.maxQueueSize}). Try again later.`);
        error.code = 'QUEUE_FULL';
        return reject(error);
      }

      const operation = {
        id: `${operationName}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: operationName,
        startTime,
        resolve,
        reject,
        timeout: setTimeout(() => {
          this.stats.timeout++;
          operation.reject(new Error(`Operation ${operationName} timed out after ${this.timeout}ms`));
          this.removeFromQueue(operation.id);
        }, this.timeout)
      };

      this.queue.push(operation);
      this.processQueue();
    });
  }

  /**
   * Release resource
   */
  release(resourceId) {
    if (this.running.has(resourceId)) {
      this.running.delete(resourceId);
      this.emit('released', resourceId);
      this.processQueue();
    }
  }

  /**
   * Process queue if resources available
   */
  processQueue() {
    while (this.running.size < this.maxConcurrent && this.queue.length > 0) {
      const operation = this.queue.shift();

      if (operation.timeout) {
        clearTimeout(operation.timeout);
      }

      this.running.add(operation.id);
      this.stats.queueTime += Date.now() - operation.startTime;

      const resource = {
        id: operation.id,
        name: operation.name,
        startTime: Date.now(),
        release: () => this.release(operation.id)
      };

      operation.resolve(resource);
      this.emit('acquired', operation.id);
    }
  }

  /**
   * Remove operation from queue
   */
  removeFromQueue(operationId) {
    const index = this.queue.findIndex(op => op.id === operationId);
    if (index > -1) {
      const operation = this.queue.splice(index, 1)[0];
      if (operation.timeout) {
        clearTimeout(operation.timeout);
      }
    }
  }

  /**
   * Execute with automatic resource management
   */
  async execute(operationName, asyncFunction, ...args) {
    let resource;
    const startTime = Date.now();

    try {
      resource = await this.acquire(operationName);
      const result = await asyncFunction(...args);

      this.stats.processed++;
      this.stats.processingTime += Date.now() - startTime;

      return result;
    } catch (error) {
      this.stats.failed++;
      throw error;
    } finally {
      if (resource) {
        resource.release();
      }
    }
  }

  /**
   * Batch execute with concurrency control
   */
  async executeBatch(operationName, asyncFunction, items, options = {}) {
    const {
      batchSize = this.maxConcurrent,
      progressive = false,
      onProgress = null
    } = options;

    const results = [];
    const errors = [];

    const processBatch = async (batch, batchIndex) => {
      const batchPromises = batch.map(async (item, itemIndex) => {
        try {
          const result = await this.execute(
            `${operationName}-batch-${batchIndex}`,
            asyncFunction,
            item,
            itemIndex + (batchIndex * batchSize)
          );

          if (onProgress) {
            onProgress({
              completed: results.length + 1,
              total: items.length,
              current: item,
              result
            });
          }

          return { success: true, result, item };
        } catch (error) {
          return { success: false, error, item };
        }
      });

      return Promise.all(batchPromises);
    };

    if (progressive) {
      // Process items in batches sequentially
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await processBatch(batch, Math.floor(i / batchSize));

        batchResults.forEach(result => {
          if (result.success) {
            results.push(result.result);
          } else {
            errors.push({ item: result.item, error: result.error });
          }
        });
      }
    } else {
      // Process all items with automatic batching
      const allBatches = [];
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        allBatches.push(processBatch(batch, Math.floor(i / batchSize)));
      }

      const allResults = await Promise.all(allBatches);

      allResults.flat().forEach(result => {
        if (result.success) {
          results.push(result.result);
        } else {
          errors.push({ item: result.item, error: result.error });
        }
      });
    }

    return {
      results,
      errors,
      stats: {
        total: items.length,
        successful: results.length,
        failed: errors.length,
        successRate: (results.length / items.length) * 100
      }
    };
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats,
      running: this.running.size,
      queued: this.queue.length,
      available: Math.max(0, this.maxConcurrent - this.running.size),
      load: (this.running.size / this.maxConcurrent) * 100,
      averageQueueTime: this.stats.processed > 0 ? this.stats.queueTime / this.stats.processed : 0,
      averageProcessingTime: this.stats.processed > 0 ? this.stats.processingTime / this.stats.processed : 0
    };
  }

  /**
   * Health check
   */
  isHealthy() {
    const stats = this.getStats();
    return {
      healthy: stats.load < 90 && this.queue.length < this.maxQueueSize * 0.8,
      load: stats.load,
      queueSize: this.queue.length,
      maxQueueSize: this.maxQueueSize,
      details: stats
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(timeoutMs = 30000) {
    console.log('ConcurrencyManager: Starting graceful shutdown...');

    // Stop accepting new requests
    this.maxConcurrent = 0;

    // Wait for running operations to complete
    const shutdownPromise = new Promise((resolve) => {
      if (this.running.size === 0) {
        resolve();
        return;
      }

      const checkCompletion = () => {
        if (this.running.size === 0) {
          resolve();
        }
      };

      this.on('released', checkCompletion);
    });

    // Race between graceful shutdown and timeout
    await Promise.race([
      shutdownPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Shutdown timeout')), timeoutMs)
      )
    ]);

    // Clear remaining queue
    this.queue.forEach(operation => {
      if (operation.timeout) {
        clearTimeout(operation.timeout);
      }
      operation.reject(new Error('Server shutting down'));
    });
    this.queue.length = 0;

    console.log('ConcurrencyManager: Shutdown complete');
  }
}

// Export singleton instance with default configuration
export const concurrencyManager = new ConcurrencyManager({
  maxConcurrent: parseInt(process.env.MAX_CONCURRENT) || 8,
  maxQueueSize: parseInt(process.env.MAX_QUEUE_SIZE) || 200,
  timeout: parseInt(process.env.OPERATION_TIMEOUT) || 60000
});
