import { Router } from 'express';
import barcodeRoutes from './barcode.routes.js';
import pdfRoutes from './pdf.routes.js';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'NodeJS PDF Service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Mount route modules
router.use('/pdf', pdfRoutes);
router.use('/barcode', barcodeRoutes);  // Naprawiam konflikt - oddzielna ścieżka

export default router;
