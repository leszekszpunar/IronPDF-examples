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

// ========== BRAKUJĄCE ENDPOINTY Z DOKUMENTACJI SWAGGER ==========

/**
 * @swagger
 * /api/pdf/merge-pdfs:
 *   post:
 *     tags: [PDF Operations]
 *     summary: Łączy kilka plików PDF w jeden dokument
 */
router.post('/merge-pdfs',
  streamingMiddleware.array('files'),
  pdfController.mergePdfs.bind(pdfController)
);

/**
 * @swagger
 * /api/pdf/add-barcode:
 *   post:
 *     tags: [PDF Operations]
 *     summary: Dodaje kod kreskowy do PDF
 *     description: |
 *       Dodaje kod kreskowy do wskazanej strony pliku PDF.
 *       Obsługuje różne formaty kodów kreskowych (CODE128, CODE39, EAN13, itd.)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PDF file to modify
 *               text:
 *                 type: string
 *                 description: Text to encode in barcode
 *               format:
 *                 type: string
 *                 description: Barcode format (CODE128, CODE39, EAN13, etc.)
 *                 default: CODE128
 *               width:
 *                 type: integer
 *                 description: Barcode width in pixels
 *                 default: 200
 *               height:
 *                 type: integer
 *                 description: Barcode height in pixels
 *                 default: 50
 *               position:
 *                 type: string
 *                 description: Position on page
 *                 enum: [top-left, top-right, bottom-left, bottom-right, center]
 *                 default: bottom-right
 *               page:
 *                 type: integer
 *                 description: Page number (1-based)
 *                 default: 1
 *     responses:
 *       200:
 *         description: Barcode added successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 */
router.post('/add-barcode',
  streamingMiddleware.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'PDF file is required',
          message: 'Please provide a PDF file to modify'
        });
      }

      const { text, format = 'CODE128', width = 200, height = 50, position = 'bottom-right', page = 1 } = req.body;

      if (!text) {
        return res.status(400).json({
          success: false,
          error: 'Text is required for barcode generation',
          message: 'Please provide text to encode in the barcode'
        });
      }

      // Sprawdzaj Accept header - jeśli aplikacja/pdf, zwróć plik
      const acceptHeader = req.headers.accept || '';
      const wantsPdf = acceptHeader.includes('application/pdf') || req.body.streaming === 'true';

      const options = {
        text,
        format,
        width: parseInt(width),
        height: parseInt(height),
        position,
        page: parseInt(page),
        streaming: wantsPdf || req.useStreaming || req.body.streaming === 'true'
      };

      console.log(`🔧 Adding ${format} barcode "${text}" to page ${page}`);

      const result = await pdfController.pdfService.addBarcode(req.file, options);

      console.log('✅ Barcode added successfully');

      if (wantsPdf || options.streaming) {
        return res.streamBuffer(result.buffer, {
          filename: 'barcode-added.pdf'
        });
      }

      res.json({
        success: true,
        message: 'Barcode added to PDF successfully',
        data: {
          filename: result.filename,
          size: result.size,
          barcodeData: result.barcodeData
        }
      });
    } catch (error) {
      console.error('❌ Error adding barcode to PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add barcode',
        message: error.message,
        suggestions: [
          'Ensure the PDF file is valid and not corrupted',
          'Check that the barcode text is compatible with the selected format',
          'Try using /api/barcode/generate-barcode for standalone barcode generation'
        ]
      });
    }
  }
);

/**
 * @swagger
 * /api/pdf/read-barcodes:
 *   post:
 *     tags: [PDF Operations]
 *     summary: Odczytuje kody kreskowe z pliku PDF
 *     description: |
 *       Skanuje pliki PDF w poszukiwaniu kodów kreskowych i QR kodów.
 *       Konwertuje strony PDF na obrazy i analizuje je pod kątem kodów.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PDF file to scan for barcodes
 *     responses:
 *       200:
 *         description: Barcodes detected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     barcodes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           page:
 *                             type: integer
 *                           type:
 *                             type: string
 *                           value:
 *                             type: string
 *                           position:
 *                             type: object
 */
router.post('/read-barcodes',
  streamingMiddleware.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'PDF file is required',
          message: 'Please provide a PDF file to scan for barcodes'
        });
      }

      // Importuj BarcodeService
      const BarcodeService = await import('../services/barcode.service.js');
      const barcodeService = new BarcodeService.BarcodeService();

      console.log('🔍 Scanning PDF for barcodes...');

      // Odczytaj kody kreskowe z PDF
      const result = await barcodeService.readBarcodesFromPdf(req.file);

      console.log(`✅ Found ${result.barcodes.length} barcodes in PDF`);

      res.json({
        success: true,
        message: `Found ${result.barcodes.length} barcodes in PDF`,
        data: {
          filename: req.file.originalname,
          totalPages: result.totalPages,
          barcodes: result.barcodes,
          summary: {
            qrCodes: result.barcodes.filter(b => b.type === 'QR_CODE').length,
            barcodes: result.barcodes.filter(b => b.type !== 'QR_CODE').length,
            pages: result.barcodes.map(b => b.page).filter((page, index, arr) => arr.indexOf(page) === index).length
          }
        }
      });
    } catch (error) {
      console.error('❌ Error reading barcodes from PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to read barcodes from PDF',
        message: error.message,
        suggestions: [
          'Ensure the PDF contains visible barcodes or QR codes',
          'Try using /api/barcode/read-qr for QR code specific scanning',
          'Check if the PDF file is not corrupted'
        ]
      });
    }
  }
);

/**
 * @swagger
 * /api/pdf/read-qr-codes:
 *   post:
 *     tags: [PDF Operations]
 *     summary: Odczytuje kody QR z pliku PDF
 *     description: |
 *       Skanuje pliki PDF w poszukiwaniu kodów QR.
 *       Konwertuje strony PDF na obrazy i analizuje je pod kątem kodów QR.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PDF file to scan for QR codes
 *     responses:
 *       200:
 *         description: QR codes detected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     qrCodes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           page:
 *                             type: integer
 *                           value:
 *                             type: string
 *                           position:
 *                             type: object
 */
router.post('/read-qr-codes',
  streamingMiddleware.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'PDF file is required',
          message: 'Please provide a PDF file to scan for QR codes'
        });
      }

      // Importuj BarcodeService
      const BarcodeService = await import('../services/barcode.service.js');
      const barcodeService = new BarcodeService.BarcodeService();

      console.log('🔍 Scanning PDF for QR codes...');

      // Odczytaj QR kody z PDF
      const result = await barcodeService.readQrCodesFromPdf(req.file);

      console.log(`✅ Found ${result.qrCodes.length} QR codes in PDF`);

      res.json({
        success: true,
        message: `Found ${result.qrCodes.length} QR codes in PDF`,
        data: {
          filename: req.file.originalname,
          totalPages: result.totalPages,
          qrCodes: result.qrCodes,
          summary: {
            totalFound: result.qrCodes.length,
            pages: result.qrCodes.map(qr => qr.page).filter((page, index, arr) => arr.indexOf(page) === index).length
          }
        }
      });
    } catch (error) {
      console.error('❌ Error reading QR codes from PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to read QR codes from PDF',
        message: error.message,
        suggestions: [
          'Ensure the PDF contains visible QR codes',
          'Try using /api/barcode/read-qr for QR code specific scanning of images',
          'Check if the PDF file is not corrupted'
        ]
      });
    }
  }
);

/**
 * @swagger
 * /api/pdf/read-all-codes:
 *   post:
 *     tags: [PDF Operations]
 *     summary: Odczytuje wszystkie kody (kreskowe i QR) z pliku PDF
 *     description: |
 *       Uniwersalny endpoint do skanowania plików PDF w poszukiwaniu wszystkich typów kodów.
 *       Łączy funkcjonalność read-barcodes i read-qr-codes w jednym endpoincie.
 *       Konwertuje strony PDF na obrazy i analizuje je pod kątem wszystkich typów kodów.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PDF file to scan for all types of codes
 *     responses:
 *       200:
 *         description: All codes detected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     allCodes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           page:
 *                             type: integer
 *                           type:
 *                             type: string
 *                           value:
 *                             type: string
 *                           position:
 *                             type: object
 */
router.post('/read-all-codes',
  streamingMiddleware.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'PDF file is required',
          message: 'Please provide a PDF file to scan for all types of codes'
        });
      }

      // Importuj BarcodeService
      const BarcodeService = await import('../services/barcode.service.js');
      const barcodeService = new BarcodeService.BarcodeService();

      console.log('🔍 Scanning PDF for all types of codes (QR + Barcodes)...');

      // Użyj istniejącej metody readBarcodesFromPdf, która już skanuje wszystkie typy
      const result = await barcodeService.readBarcodesFromPdf(req.file);

      console.log(`✅ Found ${result.barcodes.length} codes in PDF`);

      // Przygotuj strukturę odpowiedzi z podziałem na typy
      const qrCodes = result.barcodes.filter(code => code.type === 'QR_CODE');
      const barcodes = result.barcodes.filter(code => code.type !== 'QR_CODE');

      res.json({
        success: true,
        message: `Found ${result.barcodes.length} codes in PDF (${qrCodes.length} QR codes, ${barcodes.length} barcodes)`,
        data: {
          filename: req.file.originalname,
          totalPages: result.totalPages,
          allCodes: result.barcodes,
          summary: {
            totalFound: result.barcodes.length,
            qrCodes: qrCodes.length,
            barcodes: barcodes.length,
            byType: result.summary.byType || {},
            byPage: result.summary.byPage || {},
            pages: result.barcodes.map(code => code.page).filter((page, index, arr) => arr.indexOf(page) === index).length
          },
          breakdown: {
            qrCodes,
            barcodes
          }
        }
      });
    } catch (error) {
      console.error('❌ Error reading all codes from PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to read codes from PDF',
        message: error.message,
        suggestions: [
          'Ensure the PDF contains visible barcodes or QR codes',
          'Try using /api/pdf/read-qr-codes for QR codes only',
          'Try using /api/pdf/read-barcodes for all barcode types',
          'Check if the PDF file is not corrupted'
        ]
      });
    }
  }
);

/**
 * @swagger
 * /api/pdf/merge-all:
 *   post:
 *     tags: [PDF Operations]
 *     summary: Łączy pliki PDF i obrazy w jeden dokument
 */
router.post('/merge-all',
  streamingMiddleware.array('files'),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one file is required'
        });
      }

      // Rozdziel pliki na PDF i obrazy
      const pdfFiles = req.files.filter(file =>
        file.mimetype === 'application/pdf'
      );
      const imageFiles = req.files.filter(file =>
        file.mimetype.startsWith('image/')
      );

      const results = [];

      // Konwertuj obrazy do PDF jeśli są
      if (imageFiles.length > 0) {
        const convertedPdf = await pdfController.pdfService.imagesToPdf(imageFiles, {
          streaming: true
        });
        results.push({ buffer: convertedPdf.buffer });
      }

      // Dodaj istniejące PDFy
      results.push(...pdfFiles);

      // Merge wszystkie PDFy
      const finalResult = await pdfController.pdfService.mergePdfs(results, {
        streaming: req.body.streaming === 'true'
      });

      if (req.body.streaming === 'true') {
        return res.streamBuffer(finalResult.buffer, {
          filename: 'merged-all.pdf'
        });
      }

      res.json({
        success: true,
        message: 'Files merged successfully',
        data: finalResult
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to merge files',
        message: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/pdf/verify-signature:
 *   post:
 *     tags: [Digital Signatures]
 *     summary: Weryfikuje podpis cyfrowy w PDF
 */
router.post('/verify-signature',
  streamingMiddleware.single('file'),
  async (req, res) => {
    try {
      // Import SecurityController dynamically
      const { default: SecurityController } = await import('../controllers/security.controller.js');
      const securityController = new SecurityController();

      // Use the same logic as security endpoint
      await securityController.verifySignatures(req, res);
    } catch (error) {
      console.error('Error in verify-signature:', error);
      res.status(500).json({
        success: false,
        error: 'Signature verification failed',
        message: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/pdf/sign:
 *   post:
 *     tags: [Digital Signatures]
 *     summary: Podpisuje PDF cyfrowo
 *     description: |
 *       Tworzy cyfrowy podpis PDF używając certyfikatu P12/PFX.
 *       Wymagane pliki: PDF do podpisania + certyfikat P12
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PDF file to sign
 *               certificate:
 *                 type: string
 *                 format: binary
 *                 description: P12/PFX certificate file
 *               password:
 *                 type: string
 *                 description: Certificate password
 *               reason:
 *                 type: string
 *                 description: Reason for signing
 *               location:
 *                 type: string
 *                 description: Location of signing
 *               contactInfo:
 *                 type: string
 *                 description: Contact information
 *     responses:
 *       200:
 *         description: PDF signed successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 */
router.post('/sign',
  streamingMiddleware.single('file'),
  async (req, res) => {
    try {
      // Sprawdź czy plik PDF został przesłany
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'PDF file is required',
          message: 'Please provide a PDF file to sign'
        });
      }

      const { password, reason, location, contactInfo, certificateBase64 } = req.body;

      // Tymczasowo: komunikat że funkcja wymaga certyfikatu
      if (!certificateBase64) {
        return res.status(400).json({
          success: false,
          error: 'Certificate data is required',
          message: 'Please provide certificate data as base64 in "certificateBase64" field. Full implementation with certificate file upload will be available soon.',
          example: {
            certificateBase64: 'base64_encoded_p12_certificate_data',
            password: 'certificate_password',
            reason: 'Document signing',
            location: 'Digital signature',
            contactInfo: 'signer@example.com'
          }
        });
      }

      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Certificate password is required',
          message: 'Please provide the certificate password'
        });
      }

      // Konwertuj base64 certyfikat na buffer
      let certificateBuffer;
      try {
        certificateBuffer = Buffer.from(certificateBase64, 'base64');
      } catch (_error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid certificate format',
          message: 'Certificate must be valid base64 encoded data'
        });
      }

      // Utwórz obiekt certyfikatu
      const certificateFile = {
        buffer: certificateBuffer,
        originalname: 'certificate.p12',
        mimetype: 'application/x-pkcs12'
      };

      // Sprawdzaj Accept header - jeśli aplikacja/pdf, zwróć plik
      const acceptHeader = req.headers.accept || '';
      const wantsPdf = acceptHeader.includes('application/pdf') || req.body.streaming === 'true';

      const options = {
        reason: reason || 'Document signing',
        location: location || 'Digital signature',
        contactInfo: contactInfo || '',
        streaming: wantsPdf || req.useStreaming || req.body.streaming === 'true'
      };

      const result = await pdfController.pdfService.signPdf(
        req.file,
        certificateFile,
        password,
        options
      );

      if (wantsPdf || options.streaming) {
        return res.streamBuffer(result.buffer, {
          filename: 'signed.pdf'
        });
      }

      res.json({
        success: true,
        message: 'PDF signed successfully',
        data: {
          filename: result.filename,
          size: result.size,
          signatureInfo: {
            reason: options.reason,
            location: options.location,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Error signing PDF:', error);
      res.status(500).json({
        success: false,
        error: 'PDF signing failed',
        message: error.message
      });
    }
  }
);

export default router;
