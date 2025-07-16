import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/app.config.js';

/**
 * Enterprise-grade File Manager
 * Handles secure file operations with proper isolation and cleanup
 */
export class FileManager {
  constructor() {
    this.activeFiles = new Map(); // Track active files for cleanup
    this.cleanupInterval = setInterval(() => this.cleanupOrphanedFiles(), 300000); // 5 min
  }

  /**
   * Generate cryptographically secure unique filename
   * Format: {pid}-{timestamp}-{uuid}.{ext}
   */
  generateSecureFilename(originalName = 'file', extension = '') {
    const timestamp = Date.now();
    const uuid = crypto.randomUUID();
    const pid = process.pid;
    const sessionId = crypto.randomBytes(8).toString('hex');

    const ext = extension || path.extname(originalName) || '.tmp';
    const baseName = path.basename(originalName, path.extname(originalName));

    return `${pid}-${timestamp}-${sessionId}-${uuid}-${baseName}${ext}`;
  }

  /**
   * Create secure temporary file with tracking
   */
  async createTempFile(originalName, data = null) {
    const filename = this.generateSecureFilename(originalName);
    const filepath = path.join(config.upload.tempDir, filename);

    // Ensure temp directory exists with secure permissions
    await this.ensureTempDir();

    // Track file for cleanup
    const fileInfo = {
      path: filepath,
      created: Date.now(),
      pid: process.pid,
      originalName,
      active: true
    };

    this.activeFiles.set(filename, fileInfo);

    // Write data if provided
    if (data) {
      await fs.writeFile(filepath, data, { mode: 0o600 }); // Owner read/write only
    }

    return {
      filename,
      path: filepath,
      cleanup: () => this.cleanupFile(filename)
    };
  }

  /**
   * Ensure temp directory exists with secure permissions
   */
  async ensureTempDir() {
    try {
      await fs.access(config.upload.tempDir);
    } catch {
      await fs.mkdir(config.upload.tempDir, {
        recursive: true,
        mode: 0o700 // Owner only
      });
    }
  }

  /**
   * Secure file cleanup with verification
   */
  async cleanupFile(filename) {
    try {
      const fileInfo = this.activeFiles.get(filename);
      if (!fileInfo) return false;

      // Verify file belongs to this process
      if (fileInfo.pid !== process.pid) {
        console.warn(`File ${filename} belongs to different process ${fileInfo.pid}`);
        return false;
      }

      // Check if file exists before deletion
      try {
        await fs.access(fileInfo.path);
        await fs.unlink(fileInfo.path);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(`Error deleting file ${filename}:`, error.message);
        }
      }

      // Remove from tracking
      this.activeFiles.delete(filename);
      return true;
    } catch (error) {
      console.error(`Cleanup error for ${filename}:`, error.message);
      return false;
    }
  }

  /**
   * Cleanup orphaned files (older than 1 hour)
   */
  async cleanupOrphanedFiles() {
    const maxAge = 60 * 60 * 1000; // 1 hour
    const now = Date.now();

    const orphanedFiles = [];

    for (const [filename, fileInfo] of this.activeFiles.entries()) {
      if (now - fileInfo.created > maxAge) {
        orphanedFiles.push(filename);
      }
    }

    if (orphanedFiles.length > 0) {
      console.log(`Cleaning up ${orphanedFiles.length} orphaned files`);

      for (const filename of orphanedFiles) {
        await this.cleanupFile(filename);
      }
    }
  }

  /**
   * Get file info safely
   */
  getFileInfo(filename) {
    const fileInfo = this.activeFiles.get(filename);
    if (!fileInfo || fileInfo.pid !== process.pid) {
      return null;
    }
    return { ...fileInfo };
  }

  /**
   * Graceful shutdown - cleanup all files
   */
  async shutdown() {
    console.log('FileManager: Starting graceful shutdown...');

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    const allFiles = Array.from(this.activeFiles.keys());
    console.log(`FileManager: Cleaning up ${allFiles.length} remaining files`);

    const cleanupPromises = allFiles.map(filename => this.cleanupFile(filename));
    await Promise.allSettled(cleanupPromises);

    console.log('FileManager: Shutdown complete');
  }

  /**
   * Get statistics
   */
  getStats() {
    const stats = {
      activeFiles: this.activeFiles.size,
      totalCreated: 0,
      byPid: {},
      oldestFile: null
    };

    let oldestTime = Date.now();

    for (const [filename, fileInfo] of this.activeFiles.entries()) {
      stats.totalCreated++;

      if (!stats.byPid[fileInfo.pid]) {
        stats.byPid[fileInfo.pid] = 0;
      }
      stats.byPid[fileInfo.pid]++;

      if (fileInfo.created < oldestTime) {
        oldestTime = fileInfo.created;
        stats.oldestFile = {
          filename,
          age: Date.now() - fileInfo.created,
          created: new Date(fileInfo.created).toISOString()
        };
      }
    }

    return stats;
  }
}

// Singleton instance
export const fileManager = new FileManager();

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  await fileManager.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await fileManager.shutdown();
  process.exit(0);
});
