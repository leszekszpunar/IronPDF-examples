import { config } from '../config/app.config.js';
import { ERROR_MESSAGES, HTTP_STATUS } from '../constants/index.js';
import { PdfService } from '../services/pdf.service.js';
import { ApiTypes } from '../types/api.types.js';

/**
 * High-performance PDF Controller with streaming support
 */
export class PdfController {
  constructor() {
    this.pdfService = new PdfService();
  }

  /**
   * Get supported file formats
   */
  async getSupportedFormats(req, res) {
    try {
      const formats = await this.pdfService.getSupportedFormats();
      res.json(ApiTypes.success('Supported formats retrieved', formats));
    } catch (error) {
      console.error('Error getting supported formats:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ApiTypes.error(ERROR_MESSAGES.PROCESSING_ERROR, error.message)
      );
    }
  }

  /**
   * Merge multiple PDFs with streaming support
   */
  async mergePdfs(req, res) {
    try {
      if (!req.files || req.files.length < 2) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          ApiTypes.error('At least 2 PDF files are required for merging')
        );
      }

      // Sprawdzaj Accept header - jeśli aplikacja/pdf, zwróć plik
      const acceptHeader = req.headers.accept || '';
      const wantsPdf = acceptHeader.includes('application/pdf') || req.body.streaming === 'true';

      const options = {
        quality: req.body.quality || 'high',
        compression: req.body.compression !== 'false',
        streaming: wantsPdf || req.useStreaming || req.body.streaming === 'true'
      };

      const result = await this.pdfService.mergePdfs(req.files, options);

      if (wantsPdf || options.streaming) {
        return res.streamBuffer(result.buffer, {
          filename: 'merged.pdf'
        });
      }

      res.json(ApiTypes.success('PDFs merged successfully', {
        filename: result.filename,
        size: result.size,
        pages: result.pages
      }));
    } catch (error) {
      console.error('Error merging PDFs:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ApiTypes.error(ERROR_MESSAGES.PROCESSING_ERROR, error.message)
      );
    }
  }

  /**
   * Split PDF into separate pages
   */
  async splitPdf(req, res) {
    try {
      if (!req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          ApiTypes.error(ERROR_MESSAGES.MISSING_FILE)
        );
      }

      const options = {
        startPage: parseInt(req.body.startPage) || 1,
        endPage: parseInt(req.body.endPage) || null,
        streaming: req.useStreaming || req.body.streaming === 'true'
      };

      const result = await this.pdfService.splitPdf(req.file, options);

      if (options.streaming) {
        // For multiple files, create a ZIP
        return res.streamBuffer(result.zipBuffer, {
          filename: 'split-pages.zip',
          mimetype: 'application/zip'
        });
      }

      res.json(ApiTypes.success('PDF split successfully', {
        files: result.files,
        totalPages: result.totalPages
      }));
    } catch (error) {
      console.error('Error splitting PDF:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ApiTypes.error(ERROR_MESSAGES.PROCESSING_ERROR, error.message)
      );
    }
  }

  /**
   * Convert images to PDF with batch processing
   */
  async imagesToPdf(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          ApiTypes.error('At least one image file is required')
        );
      }

      // Sprawdzaj Accept header - jeśli aplikacja/pdf, zwróć plik
      const acceptHeader = req.headers.accept || '';
      const wantsPdf = acceptHeader.includes('application/pdf') || req.body.streaming === 'true';

      const options = {
        format: req.body.format || 'A4',
        quality: req.body.quality || 'high',
        compression: req.body.compression !== 'false',
        margin: parseInt(req.body.margin) || 0,
        streaming: wantsPdf || req.useStreaming || req.body.streaming === 'true',
        parallel: req.body.parallel === 'true'
      };

      const result = await this.pdfService.imagesToPdf(req.files, options);

      if (wantsPdf || options.streaming) {
        return res.streamBuffer(result.buffer, {
          filename: 'images.pdf'
        });
      }

      res.json(ApiTypes.success('Images converted to PDF successfully', {
        filename: result.filename,
        size: result.size,
        pages: result.pages
      }));
    } catch (error) {
      console.error('Error converting images to PDF:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ApiTypes.error(ERROR_MESSAGES.PROCESSING_ERROR, error.message)
      );
    }
  }

  /**
   * Convert DOC/DOCX to PDF with enhanced content processing
   */
  async docToPdf(req, res) {
    try {
      if (!req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          ApiTypes.error(ERROR_MESSAGES.MISSING_FILE)
        );
      }

      // Sprawdzaj Accept header - jeśli aplikacja/pdf, zwróć plik
      const acceptHeader = req.headers.accept || '';
      const wantsPdf = acceptHeader.includes('application/pdf') || req.body.streaming === 'true';

      const options = {
        preserveFormatting: req.body.preserveFormatting !== 'false',
        includeImages: req.body.includeImages !== 'false',
        quality: req.body.quality || 'high',
        streaming: wantsPdf || req.useStreaming || req.body.streaming === 'true'
      };

      const result = await this.pdfService.docToPdf(req.file, options);

      if (wantsPdf || options.streaming) {
        return res.streamBuffer(result.buffer, {
          filename: `${req.file.originalname.replace(/\.[^/.]+$/, '')}.pdf`
        });
      }

      res.json(ApiTypes.success('Document converted to PDF successfully', {
        filename: result.filename,
        size: result.size,
        pages: result.pages
      }));
    } catch (error) {
      console.error('Error converting document to PDF:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ApiTypes.error(ERROR_MESSAGES.PROCESSING_ERROR, error.message)
      );
    }
  }

  /**
   * Extract text from PDF with advanced options
   */
  async extractText(req, res) {
    try {
      if (!req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          ApiTypes.error(ERROR_MESSAGES.MISSING_FILE)
        );
      }

      const options = {
        pages: req.body.pages ? req.body.pages.split(',').map(p => parseInt(p.trim())) : null,
        preserveFormatting: req.body.preserveFormatting === 'true',
        includeMetadata: req.body.includeMetadata === 'true'
      };

      const result = await this.pdfService.extractText(req.file, options);

      res.json(ApiTypes.success('Text extracted successfully', result));
    } catch (error) {
      console.error('Error extracting text:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ApiTypes.error(ERROR_MESSAGES.PROCESSING_ERROR, error.message)
      );
    }
  }

  /**
   * Add QR code to PDF
   */
  async addQrCode(req, res) {
    try {
      if (!req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          ApiTypes.error(ERROR_MESSAGES.MISSING_FILE)
        );
      }

      const { text, size = 100, position = 'bottom-right' } = req.body;

      if (!text) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          ApiTypes.error('QR code text is required')
        );
      }

      // Sprawdzaj Accept header - jeśli aplikacja/pdf, zwróć plik
      const acceptHeader = req.headers.accept || '';
      const wantsPdf = acceptHeader.includes('application/pdf') || req.body.streaming === 'true';

      const options = {
        text,
        size: parseInt(size),
        position,
        page: parseInt(req.body.page) || 1,
        streaming: wantsPdf || req.useStreaming || req.body.streaming === 'true'
      };

      const result = await this.pdfService.addQrCode(req.file, options);

      if (wantsPdf || options.streaming) {
        return res.streamBuffer(result.buffer, {
          filename: 'qr-code-added.pdf'
        });
      }

      res.json(ApiTypes.success('QR code added successfully', {
        filename: result.filename,
        qrData: options.text
      }));
    } catch (error) {
      console.error('Error adding QR code:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ApiTypes.error(ERROR_MESSAGES.PROCESSING_ERROR, error.message)
      );
    }
  }

  /**
   * Add watermark to PDF
   */
  async addWatermark(req, res) {
    try {
      if (!req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          ApiTypes.error(ERROR_MESSAGES.MISSING_FILE)
        );
      }

      // Sprawdzaj Accept header - jeśli aplikacja/pdf, zwróć plik
      const acceptHeader = req.headers.accept || '';
      const wantsPdf = acceptHeader.includes('application/pdf') || req.body.streaming === 'true';

      const options = {
        text: req.body.text || 'WATERMARK',
        fontSize: parseInt(req.body.fontSize) || 48,
        opacity: parseFloat(req.body.opacity) || 0.3,
        rotation: parseInt(req.body.rotation) || -45,
        position: req.body.position || 'center',
        color: req.body.color || '#FF0000',
        streaming: wantsPdf || req.useStreaming || req.body.streaming === 'true'
      };

      const result = await this.pdfService.addWatermark(req.file, options);

      if (wantsPdf || options.streaming) {
        return res.streamBuffer(result.buffer, {
          filename: `watermark-${req.file.originalname}`
        });
      }

      res.json(ApiTypes.success('Watermark added to PDF successfully', {
        filename: result.filename,
        size: result.size,
        watermarkData: result.watermarkData
      }));
    } catch (error) {
      console.error('Error adding watermark to PDF:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ApiTypes.error(ERROR_MESSAGES.PROCESSING_ERROR, error.message)
      );
    }
  }

  /**
   * Batch processing endpoint
   */
  async batchProcess(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          ApiTypes.error('At least one file is required for batch processing')
        );
      }

      const { operation, options = {} } = req.body;

      if (!operation) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          ApiTypes.error('Operation type is required')
        );
      }

      const batchOptions = {
        ...options,
        parallel: options.parallel !== 'false',
        maxConcurrent: parseInt(options.maxConcurrent) || config.pdf.concurrentProcessing
      };

      const result = await this.pdfService.batchProcess(req.files, operation, batchOptions);

      res.json(ApiTypes.success('Batch processing completed', {
        processedFiles: result.length,
        results: result
      }));
    } catch (error) {
      console.error('Error in batch processing:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ApiTypes.error(ERROR_MESSAGES.PROCESSING_ERROR, error.message)
      );
    }
  }

  /**
   * Get PDF metadata
   */
  async getMetadata(req, res) {
    try {
      if (!req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          ApiTypes.error(ERROR_MESSAGES.MISSING_FILE)
        );
      }

      const metadata = await this.pdfService.getMetadata(req.file);
      res.json(ApiTypes.success('Metadata retrieved successfully', metadata));
    } catch (error) {
      console.error('Error getting metadata:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ApiTypes.error(ERROR_MESSAGES.PROCESSING_ERROR, error.message)
      );
    }
  }
}

export default PdfController;
