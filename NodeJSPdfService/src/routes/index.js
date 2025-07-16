const express = require('express');
const pdfRoutes = require('./pdf.routes');
const barcodeRoutes = require('./barcode.routes');

const router = express.Router();

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
router.use('/pdf', barcodeRoutes);

module.exports = router;
