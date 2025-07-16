import { Router } from 'express';
import BarcodeController from '../controllers/barcode.controller.js';
import { streamingMiddleware } from '../middleware/streaming.middleware.js';

const router = Router();
const barcodeController = new BarcodeController();

/**
 * @swagger
 * tags:
 *   name: Barcode Operations
 *   description: QR codes and barcode generation/reading operations
 */

/**
 * @swagger
 * /api/barcode/generate-qr:
 *   post:
 *     tags: [Barcode Operations]
 *     summary: Generate QR code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to encode in QR code
 *               size:
 *                 type: integer
 *                 default: 200
 *               format:
 *                 type: string
 *                 enum: [png, svg]
 *                 default: png
 */
router.post('/generate-qr', barcodeController.generateQrCode.bind(barcodeController));

/**
 * @swagger
 * /api/barcode/generate-barcode:
 *   post:
 *     tags: [Barcode Operations]
 *     summary: Generate barcode
 */
router.post('/generate-barcode', barcodeController.generateBarcode.bind(barcodeController));

/**
 * @swagger
 * /api/barcode/read-qr:
 *   post:
 *     tags: [Barcode Operations]
 *     summary: Read QR code from image
 */
router.post('/read-qr',
  streamingMiddleware.single('file'),
  barcodeController.readQrCode.bind(barcodeController)
);

/**
 * @swagger
 * /api/barcode/read-barcode:
 *   post:
 *     tags: [Barcode Operations]
 *     summary: Read barcode from image
 */
router.post('/read-barcode',
  streamingMiddleware.single('file'),
  barcodeController.readBarcode.bind(barcodeController)
);

export { router as barcodeRoutes };
export default router;
