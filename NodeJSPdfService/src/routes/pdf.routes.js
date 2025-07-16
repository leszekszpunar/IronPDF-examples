import { Router } from 'express';
import PdfController from '../controllers/pdf.controller.js';
import { streamingMiddleware } from '../middleware/streaming.middleware.js';

const router = Router();
const pdfController = new PdfController();

/**
 * @swagger
 * tags:
 *   name: PDF Operations
 *   description: High-performance PDF processing with streaming support
 */

/**
 * @swagger
 * /api/pdf/supported-formats:
 *   get:
 *     tags: [PDF Operations]
 *     summary: Get supported file formats
 *     responses:
 *       200:
 *         description: List of supported formats
 */
router.get('/supported-formats', pdfController.getSupportedFormats.bind(pdfController));

/**
 * @swagger
 * /api/pdf/merge:
 *   post:
 *     tags: [PDF Operations]
 *     summary: Merge multiple PDF files with streaming support
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: files
 *         type: array
 *         items:
 *           type: file
 *         required: true
 *         description: PDF files to merge (minimum 2)
 *       - in: formData
 *         name: quality
 *         type: string
 *         enum: [high, medium, low]
 *         default: high
 *       - in: formData
 *         name: compression
 *         type: boolean
 *         default: true
 *       - in: formData
 *         name: streaming
 *         type: boolean
 *         default: false
 *         description: Enable streaming for large files
 */
router.post('/merge',
  streamingMiddleware.array('files'),
  pdfController.mergePdfs.bind(pdfController)
);

/**
 * @swagger
 * /api/pdf/split:
 *   post:
 *     tags: [PDF Operations]
 *     summary: Split PDF into separate pages
 */
router.post('/split',
  streamingMiddleware.single('file'),
  pdfController.splitPdf.bind(pdfController)
);

/**
 * @swagger
 * /api/pdf/images-to-pdf:
 *   post:
 *     tags: [PDF Operations]
 *     summary: Convert images to PDF with batch processing
 */
router.post('/images-to-pdf',
  streamingMiddleware.array('files'),
  pdfController.imagesToPdf.bind(pdfController)
);

/**
 * @swagger
 * /api/pdf/doc-to-pdf:
 *   post:
 *     tags: [PDF Operations]
 *     summary: Convert DOC/DOCX to PDF with enhanced processing
 */
router.post('/doc-to-pdf',
  streamingMiddleware.single('file'),
  pdfController.docToPdf.bind(pdfController)
);

/**
 * @swagger
 * /api/pdf/extract-text:
 *   post:
 *     tags: [PDF Operations]
 *     summary: Extract text from PDF with advanced options
 */
router.post('/extract-text',
  streamingMiddleware.single('file'),
  pdfController.extractText.bind(pdfController)
);

/**
 * @swagger
 * /api/pdf/add-qr-code:
 *   post:
 *     tags: [PDF Operations]
 *     summary: Add QR code to PDF
 */
router.post('/add-qr-code',
  streamingMiddleware.single('file'),
  pdfController.addQrCode.bind(pdfController)
);

/**
 * @swagger
 * /api/pdf/batch-process:
 *   post:
 *     tags: [PDF Operations]
 *     summary: Batch process multiple files
 *     description: Process multiple files in parallel with configurable concurrency
 */
router.post('/batch-process',
  streamingMiddleware.array('files'),
  pdfController.batchProcess.bind(pdfController)
);

/**
 * @swagger
 * /api/pdf/metadata:
 *   post:
 *     tags: [PDF Operations]
 *     summary: Get PDF metadata and properties
 */
router.post('/metadata',
  streamingMiddleware.single('file'),
  pdfController.getMetadata.bind(pdfController)
);

export { router as pdfRoutes };
export default router;
