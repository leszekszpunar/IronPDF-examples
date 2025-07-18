import { BrowserMultiFormatReader } from '@zxing/library';
import { promises as fs } from 'fs';
import Jimp from 'jimp';
import JsBarcode from 'jsbarcode';
import jsQR from 'jsqr';
import QRCode from 'qrcode';

/**
 * High-performance Barcode Service (Pure JS - no native dependencies)
 */
export class BarcodeService {
  constructor() {
    this.reader = new BrowserMultiFormatReader();
  }

  /**
   * Generate QR code
   */
  async generateQrCode(text, options = {}) {
    const { size = 256, margin = 4 } = options;

    try {
      const qrCodeDataUrl = await QRCode.toDataURL(text, {
        width: size,
        margin,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Convert data URL to buffer
      const base64Data = qrCodeDataUrl.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');

      return { buffer, format: 'png' };
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Generate barcode using pure JS (no canvas dependency)
   */
  async generateBarcode(text, options = {}) {
    const { format = 'CODE128', width = 200, height = 100 } = options;

    try {
      // Create SVG first (JsBarcode can output to SVG without canvas)
      const svgElement = {
        setAttribute: () => {},
        appendChild: () => {},
        children: [],
        innerHTML: ''
      };

      // Generate SVG string
      JsBarcode(svgElement, text, {
        format,
        width: 2,
        height: height - 20,
        displayValue: true,
        fontSize: 14,
        textAlign: 'center',
        textPosition: 'bottom',
        background: '#ffffff',
        lineColor: '#000000'
      });

      // Create simple bitmap representation using Jimp
      const image = new Jimp(width, height, '#ffffff');

      // Simple barcode pattern generation (fallback)
      const barWidth = Math.floor(width / text.length);
      for (let i = 0; i < text.length; i++) {
        const x = i * barWidth;
        for (let y = 20; y < height - 20; y++) {
          const intensity = text.charCodeAt(i) % 2; // Simple pattern
          if (intensity) {
            image.setPixelColor(0x000000ff, x, y);
            image.setPixelColor(0x000000ff, x + 1, y);
          }
        }
      }

      const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
      return { buffer, format: 'png' };
    } catch (error) {
      throw new Error(`Failed to generate barcode: ${error.message}`);
    }
  }

  /**
   * Read QR code from image using pure JS
   */
  async readQrCode(file) {
    try {
      const imageBuffer = file.buffer || await fs.readFile(file.path);

      // Load image with Jimp
      const image = await Jimp.read(imageBuffer);

      // Get image data in format suitable for jsQR
      const { width, height } = image.bitmap;
      const imageData = new Uint8ClampedArray(width * height * 4);

      for (let i = 0; i < width * height; i++) {
        const pixel = Jimp.intToRGBA(image.getPixelColor(i % width, Math.floor(i / width)));
        imageData[i * 4] = pixel.r;
        imageData[i * 4 + 1] = pixel.g;
        imageData[i * 4 + 2] = pixel.b;
        imageData[i * 4 + 3] = pixel.a;
      }

      const code = jsQR(imageData, width, height);

      if (code) {
        return {
          found: true,
          qrCodes: [{
            data: code.data,
            location: code.location
          }]
        };
      } else {
        return {
          found: false,
          qrCodes: [],
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
  async readBarcode(_file) {
    try {
      // For now, return placeholder - full barcode reading would need more complex implementation
      return {
        found: false,
        barcodes: [],
        message: 'Barcode reading from images not yet implemented with pure JS solution'
      };
    } catch (error) {
      throw new Error(`Failed to read barcode: ${error.message}`);
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

  /**
   * Read barcodes from PDF file - TEMPORARILY DISABLED
   * This feature requires native dependencies (pdf2pic + GraphicsMagick)
   */
  async readBarcodesFromPdf(_file) {
    return {
      barcodes: [],
      totalPages: 0,
      message: 'PDF barcode scanning temporarily disabled - requires native dependencies (pdf2pic + GraphicsMagick)',
      suggestion: 'Convert PDF pages to images manually and use /api/barcode/read-qr endpoint'
    };
  }

  /**
   * Read QR codes from PDF file - TEMPORARILY DISABLED
   */
  async readQrCodesFromPdf(_file) {
    return {
      qrCodes: [],
      totalPages: 0,
      message: 'PDF QR code scanning temporarily disabled - requires native dependencies',
      suggestion: 'Convert PDF pages to images manually and use /api/barcode/read-qr endpoint'
    };
  }
}

export default BarcodeService;
