import busboy from 'busboy';
import { createReadStream, createWriteStream } from 'fs';
import multer from 'multer';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { config } from '../config/app.config.js';
import { ERROR_MESSAGES, HTTP_STATUS, MIME_TYPES } from '../constants/index.js';
import { ApiTypes } from '../types/api.types.js';

/**
 * High-performance streaming upload middleware
 */
export class StreamingMiddleware {
  constructor() {
    this.setupMulter();
  }

  setupMulter() {
    const storage = multer.memoryStorage();

    this.upload = multer({
      storage,
      limits: {
        fileSize: config.upload.maxFileSize,
        files: config.upload.maxFiles,
        parts: config.upload.maxFiles + 10 // Allow for form fields
      },
      fileFilter: this.fileFilter.bind(this)
    });
  }

  fileFilter(req, file, cb) {
    if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(ERROR_MESSAGES.INVALID_FILE_TYPE), false);
    }
  }

  /**
   * Single file upload middleware
   */
  single(fieldName = 'file') {
    return (req, res, next) => {
      this.upload.single(fieldName)(req, res, (err) => {
        if (err) {
          return this.handleUploadError(err, res);
        }

        if (!req.file) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json(
            ApiTypes.error(ERROR_MESSAGES.MISSING_FILE)
          );
        }

        // Add streaming support for large files
        if (req.file.size > config.pdf.streamingThreshold) {
          req.useStreaming = true;
        }

        next();
      });
    };
  }

  /**
   * Multiple files upload middleware
   */
  array(fieldName = 'files', maxCount = config.upload.maxFiles) {
    return (req, res, next) => {
      this.upload.array(fieldName, maxCount)(req, res, (err) => {
        if (err) {
          return this.handleUploadError(err, res);
        }

        if (!req.files || req.files.length === 0) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json(
            ApiTypes.error(ERROR_MESSAGES.MISSING_FILE)
          );
        }

        // Check if any file requires streaming
        req.useStreaming = req.files.some(file =>
          file.size > config.pdf.streamingThreshold
        );

        next();
      });
    };
  }

  /**
   * High-performance streaming upload using busboy
   */
  streamingUpload() {
    return async (req, res, next) => {
      if (req.method !== 'POST') {
        return next();
      }

      const contentType = req.headers['content-type'];
      if (!contentType || !contentType.includes('multipart/form-data')) {
        return next();
      }

      try {
        const files = [];
        const fields = {};

        const bb = busboy({
          headers: req.headers,
          limits: {
            fileSize: config.upload.maxFileSize,
            files: config.upload.maxFiles
          }
        });

        bb.on('file', async (fieldname, file, info) => {
          const { filename, encoding, mimeType } = info;

          if (!config.upload.allowedMimeTypes.includes(mimeType)) {
            file.resume(); // Drain the stream
            return;
          }

          const tempPath = join(config.upload.tempDir,
            `${Date.now()}-${Math.random().toString(36).substring(7)}-${filename}`);

          try {
            await pipeline(file, createWriteStream(tempPath));

            files.push({
              fieldname,
              originalname: filename,
              encoding,
              mimetype: mimeType,
              path: tempPath,
              filename: tempPath.split('/').pop()
            });
          } catch (error) {
            console.error('Streaming upload error:', error);
          }
        });

        bb.on('field', (fieldname, value) => {
          fields[fieldname] = value;
        });

        bb.on('finish', () => {
          req.files = files;
          req.body = fields;
          req.useStreaming = true;
          next();
        });

        bb.on('error', (err) => {
          console.error('Busboy error:', err);
          this.handleUploadError(err, res);
        });

        req.pipe(bb);
      } catch (error) {
        console.error('Streaming middleware error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          ApiTypes.error(ERROR_MESSAGES.STREAM_ERROR, error.message)
        );
      }
    };
  }

  /**
   * Streaming download middleware
   */
  streamingDownload() {
    return (req, res, next) => {
      const originalSend = res.send;
      const originalJson = res.json;

      res.streamFile = (filePath, options = {}) => {
        const {
          filename = 'download',
          mimetype = MIME_TYPES.PDF,
          deleteAfter = false
        } = options;

        res.setHeader('Content-Type', mimetype);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const stream = createReadStream(filePath, {
          highWaterMark: config.streaming.highWaterMark
        });

        stream.on('error', (error) => {
          console.error('Stream error:', error);
          if (!res.headersSent) {
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
              ApiTypes.error(ERROR_MESSAGES.STREAM_ERROR)
            );
          }
        });

        stream.on('end', () => {
          if (deleteAfter) {
            // Clean up temp file
            import('fs').then(fs => {
              fs.unlink(filePath, () => {});
            });
          }
        });

        pipeline(stream, res).catch(error => {
          console.error('Pipeline error:', error);
        });
      };

      res.streamBuffer = (buffer, options = {}) => {
        const {
          filename = 'download.pdf',
          mimetype = MIME_TYPES.PDF
        } = options;

        res.setHeader('Content-Type', mimetype);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);

        res.end(buffer);
      };

      next();
    };
  }

  handleUploadError(err, res) {
    console.error('Upload error:', err);

    let status = HTTP_STATUS.BAD_REQUEST;
    let message = err.message;

    if (err.code === 'LIMIT_FILE_SIZE') {
      status = HTTP_STATUS.PAYLOAD_TOO_LARGE;
      message = ERROR_MESSAGES.FILE_TOO_LARGE;
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files uploaded';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field';
    }

    res.status(status).json(ApiTypes.error(message, err.code));
  }
}

export const streamingMiddleware = new StreamingMiddleware();
export default streamingMiddleware;
