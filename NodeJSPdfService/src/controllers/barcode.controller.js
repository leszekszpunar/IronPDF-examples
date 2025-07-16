import { ERROR_MESSAGES, HTTP_STATUS } from '../constants/index.js';
import { BarcodeService } from '../services/barcode.service.js';
import { ApiTypes } from '../types/api.types.js';

/**
 * Barcode and QR Code Controller
 */
export class BarcodeController {
  constructor() {
    this.barcodeService = new BarcodeService();
  }

  /**
   * Generate QR code
   */
  async generateQrCode(req, res) {
    try {
      const { text, size = 200, format = 'png' } = req.body;

      if (!text) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          ApiTypes.error('Text is required for QR code generation')
        );
      }

      const result = await this.barcodeService.generateQrCode(text, { size, format });

      if (format === 'png') {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', 'attachment; filename="qrcode.png"');
        res.send(result.buffer);
      } else {
        res.json(ApiTypes.success('QR code generated successfully', result));
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ApiTypes.error(ERROR_MESSAGES.PROCESSING_ERROR, error.message)
      );
    }
  }

  /**
   * Generate barcode
   */
  async generateBarcode(req, res) {
    try {
      const { text, format = 'CODE128', width = 200, height = 100 } = req.body;

      if (!text) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          ApiTypes.error('Text is required for barcode generation')
        );
      }

      const result = await this.barcodeService.generateBarcode(text, {
        format,
        width,
        height
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', 'attachment; filename="barcode.png"');
      res.send(result.buffer);
    } catch (error) {
      console.error('Error generating barcode:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ApiTypes.error(ERROR_MESSAGES.PROCESSING_ERROR, error.message)
      );
    }
  }

  /**
   * Read QR code from image
   */
  async readQrCode(req, res) {
    try {
      if (!req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          ApiTypes.error(ERROR_MESSAGES.MISSING_FILE)
        );
      }

      const result = await this.barcodeService.readQrCode(req.file);
      res.json(ApiTypes.success('QR code read successfully', result));
    } catch (error) {
      console.error('Error reading QR code:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ApiTypes.error(ERROR_MESSAGES.PROCESSING_ERROR, error.message)
      );
    }
  }

  /**
   * Read barcode from image
   */
  async readBarcode(req, res) {
    try {
      if (!req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          ApiTypes.error(ERROR_MESSAGES.MISSING_FILE)
        );
      }

      const result = await this.barcodeService.readBarcode(req.file);
      res.json(ApiTypes.success('Barcode read successfully', result));
    } catch (error) {
      console.error('Error reading barcode:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ApiTypes.error(ERROR_MESSAGES.PROCESSING_ERROR, error.message)
      );
    }
  }
}

export default BarcodeController;
