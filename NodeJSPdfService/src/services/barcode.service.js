import { BrowserMultiFormatReader } from '@zxing/library';
import { createCanvas } from 'canvas';
import { promises as fs } from 'fs';
import JsBarcode from 'jsbarcode';
import jsQR from 'jsqr';
import { fromPath } from 'pdf2pic';
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

  /**
   * Read barcodes from PDF file
   * Converts PDF pages to images and scans for barcodes
   */
  async readBarcodesFromPdf(file) {
    try {
      console.log('🔍 Converting PDF to images for barcode scanning...');

      // Get PDF buffer
      const pdfBuffer = file.buffer || await fs.readFile(file.path);

      // Create temporary file for pdf2pic
      const tempPath = `/tmp/${Date.now()}-${file.originalname}`;
      await fs.writeFile(tempPath, pdfBuffer);

      // Convert PDF to images
      const convert = fromPath(tempPath, {
        density: 200,           // Higher density for better barcode detection
        saveFilename: 'page',
        savePath: '/tmp',
        format: 'png',
        width: 1200,           // High resolution for barcode detection
        height: 1600
      });

      const results = await convert.bulk(-1); // Convert all pages

      const allBarcodes = [];
      let totalPages = 0;

      for (const [index, result] of results.entries()) {
        totalPages++;
        const pageNumber = index + 1;

        console.log(`🔍 Scanning page ${pageNumber} for barcodes...`);

        try {
          // Create temporary file object for the image
          const imageFile = {
            buffer: await fs.readFile(result.path),
            mimetype: 'image/png',
            originalname: `page-${pageNumber}.png`
          };

          // Try to read QR codes first
          try {
            const qrResult = await this.readQrCode(imageFile);
            if (qrResult.qrCodes && qrResult.qrCodes.length > 0) {
              for (const qr of qrResult.qrCodes) {
                allBarcodes.push({
                  page: pageNumber,
                  type: 'QR_CODE',
                  value: qr.data,
                  position: qr.location || null
                });
              }
            }
          } catch (_qrError) {
            console.log(`📄 No QR codes found on page ${pageNumber}`);
          }

          // Try to read regular barcodes
          try {
            const barcodeResult = await this.readBarcode(imageFile);
            if (barcodeResult.barcodes && barcodeResult.barcodes.length > 0) {
              for (const barcode of barcodeResult.barcodes) {
                allBarcodes.push({
                  page: pageNumber,
                  type: barcode.format || 'BARCODE',
                  value: barcode.text,
                  position: barcode.position || null
                });
              }
            }
          } catch (_barcodeError) {
            console.log(`📄 No barcodes found on page ${pageNumber}`);
          }

          // Clean up temporary image file
          await fs.unlink(result.path).catch(() => {});

        } catch (pageError) {
          console.error(`❌ Error processing page ${pageNumber}:`, pageError.message);
        }
      }

      // Clean up temporary PDF file
      await fs.unlink(tempPath).catch(() => {});

      console.log(`✅ PDF scanning complete. Found ${allBarcodes.length} barcodes across ${totalPages} pages`);

      return {
        totalPages,
        barcodes: allBarcodes,
        summary: {
          totalFound: allBarcodes.length,
          byType: allBarcodes.reduce((acc, barcode) => {
            acc[barcode.type] = (acc[barcode.type] || 0) + 1;
            return acc;
          }, {}),
          byPage: allBarcodes.reduce((acc, barcode) => {
            acc[barcode.page] = (acc[barcode.page] || 0) + 1;
            return acc;
          }, {})
        }
      };

    } catch (error) {
      console.error('❌ Error reading barcodes from PDF:', error);
      throw new Error(`Failed to read barcodes from PDF: ${error.message}`);
    }
  }

  /**
   * Read QR codes from PDF file (specialized version focusing only on QR codes)
   * Converts PDF pages to images and scans for QR codes only
   */
  async readQrCodesFromPdf(file) {
    try {
      console.log('🔍 Converting PDF to images for QR code scanning...');

      // Get PDF buffer
      const pdfBuffer = file.buffer || await fs.readFile(file.path);

      // Create temporary file for pdf2pic
      const tempPath = `/tmp/${Date.now()}-${file.originalname}`;
      await fs.writeFile(tempPath, pdfBuffer);

      // Convert PDF to images
      const convert = fromPath(tempPath, {
        density: 200,           // Higher density for better QR detection
        saveFilename: 'qr-page',
        savePath: '/tmp',
        format: 'png',
        width: 1200,           // High resolution for QR detection
        height: 1600
      });

      const results = await convert.bulk(-1); // Convert all pages

      const allQrCodes = [];
      let totalPages = 0;

      for (const [index, result] of results.entries()) {
        totalPages++;
        const pageNumber = index + 1;

        console.log(`🔍 Scanning page ${pageNumber} for QR codes...`);

        try {
          // Create temporary file object for the image
          const imageFile = {
            buffer: await fs.readFile(result.path),
            mimetype: 'image/png',
            originalname: `qr-page-${pageNumber}.png`
          };

          // Read QR codes from this page
          try {
            const qrResult = await this.readQrCode(imageFile);
            if (qrResult.qrCodes && qrResult.qrCodes.length > 0) {
              for (const qr of qrResult.qrCodes) {
                allQrCodes.push({
                  page: pageNumber,
                  value: qr.data,
                  position: qr.location || null,
                  confidence: qr.confidence || null
                });
              }
              console.log(`✅ Found ${qrResult.qrCodes.length} QR codes on page ${pageNumber}`);
            } else {
              console.log(`📄 No QR codes found on page ${pageNumber}`);
            }
          } catch (_qrError) {
            console.log(`📄 No QR codes found on page ${pageNumber}`);
          }

          // Clean up temporary image file
          await fs.unlink(result.path).catch(() => {});

        } catch (pageError) {
          console.error(`❌ Error processing page ${pageNumber}:`, pageError.message);
        }
      }

      // Clean up temporary PDF file
      await fs.unlink(tempPath).catch(() => {});

      console.log(`✅ QR code scanning complete. Found ${allQrCodes.length} QR codes across ${totalPages} pages`);

      return {
        totalPages,
        qrCodes: allQrCodes,
        summary: {
          totalFound: allQrCodes.length,
          byPage: allQrCodes.reduce((acc, qr) => {
            acc[qr.page] = (acc[qr.page] || 0) + 1;
            return acc;
          }, {}),
          pages: allQrCodes.map(qr => qr.page).filter((page, index, arr) => arr.indexOf(page) === index)
        }
      };

    } catch (error) {
      console.error('❌ Error reading QR codes from PDF:', error);
      throw new Error(`Failed to read QR codes from PDF: ${error.message}`);
    }
  }
}

export default BarcodeService;
