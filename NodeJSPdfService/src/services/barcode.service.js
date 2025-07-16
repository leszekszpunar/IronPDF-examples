import { BrowserMultiFormatReader } from '@zxing/library';
import { createCanvas } from 'canvas';
import { promises as fs } from 'fs';
import JsBarcode from 'jsbarcode';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import sharp from 'sharp';

/**
 * High-performance Barcode Service
 */
export class BarcodeService {
  constructor() {
    this.reader = new BrowserMultiFormatReader();
  }

  /**
   * Generate QR code
   */
  async generateQrCode(text, options = {}) {
    const { size = 200, format = 'png' } = options;

    try {
      if (format === 'png') {
        const buffer = await QRCode.toBuffer(text, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        return { buffer, format: 'png' };
      } else if (format === 'svg') {
        const svg = await QRCode.toString(text, {
          type: 'svg',
          width: size,
          margin: 2
        });

        return { svg, format: 'svg' };
      }
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Generate barcode
   */
  async generateBarcode(text, options = {}) {
    const { format = 'CODE128', width = 200, height = 100 } = options;

    try {
      const canvas = createCanvas(width, height);

      JsBarcode(canvas, text, {
        format,
        width: 2,
        height: height - 20,
        displayValue: true,
        fontSize: 14,
        textAlign: 'center',
        textPosition: 'bottom'
      });

      const buffer = canvas.toBuffer('image/png');
      return { buffer, format: 'png' };
    } catch (error) {
      throw new Error(`Failed to generate barcode: ${error.message}`);
    }
  }

  /**
   * Read QR code from image
   */
  async readQrCode(file) {
    try {
      const imageBuffer = file.buffer || await fs.readFile(file.path);

      // Convert to RGBA format for jsQR
      const { data, info } = await sharp(imageBuffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);

      if (code) {
        return {
          found: true,
          data: code.data,
          location: code.location
        };
      } else {
        return {
          found: false,
          message: 'No QR code found in image'
        };
      }
    } catch (error) {
      throw new Error(`Failed to read QR code: ${error.message}`);
    }
  }

  /**
   * Read barcode from image
   */
  async readBarcode(file) {
    try {
      const imageBuffer = file.buffer || await fs.readFile(file.path);

      // Convert image to base64 data URL
      const base64 = imageBuffer.toString('base64');
      const dataUrl = `data:${file.mimetype};base64,${base64}`;

      const result = await this.reader.decodeFromImageUrl(dataUrl);

      if (result) {
        return {
          found: true,
          data: result.getText(),
          format: result.getBarcodeFormat()
        };
      } else {
        return {
          found: false,
          message: 'No barcode found in image'
        };
      }
    } catch (error) {
      return {
        found: false,
        message: 'No barcode found in image',
        error: error.message
      };
    }
  }

  /**
   * Check if file is supported
   */
  isFileSupported(file) {
    const supportedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    return supportedTypes.includes(file.mimetype);
  }
}

export default BarcodeService;
