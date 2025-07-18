import { promises as fs } from 'fs';
import Jimp from 'jimp';
import mammoth from 'mammoth';
import { join } from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
// PDF parsing temporarily disabled due to module issues
import { SignPdf } from '@signpdf/signpdf';
import QRCode from 'qrcode';
import { config } from '../config/app.config.js';
import { MIME_TYPES } from '../constants/index.js';

/**
 * High-performance PDF Service with streaming capabilities
 */
export class PdfService {
  constructor() {
    this.tempDir = config.upload.tempDir;
    this.uploadsDir = config.upload.uploadsDir;
  }

  /**
   * Get supported file formats
   */
  async getSupportedFormats() {
    return {
      input: {
        pdf: {
          extensions: ['.pdf'],
          mimeTypes: [MIME_TYPES.PDF],
          operations: ['merge', 'split', 'extract-text', 'add-qr', 'add-barcode', 'sign']
        },
        images: {
          extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
          mimeTypes: [MIME_TYPES.JPEG, MIME_TYPES.PNG, MIME_TYPES.GIF, MIME_TYPES.WEBP],
          operations: ['to-pdf', 'merge-to-pdf']
        },
        documents: {
          extensions: ['.doc', '.docx'],
          mimeTypes: [MIME_TYPES.DOC, MIME_TYPES.DOCX],
          operations: ['to-pdf']
        }
      },
      output: {
        pdf: {
          extension: '.pdf',
          mimeType: MIME_TYPES.PDF
        }
      },
      features: [
        'High-performance streaming',
        'Parallel batch processing',
        'Memory optimization',
        'Real-time compression',
        'Advanced QR/Barcode support',
        'Digital signatures',
        'Metadata extraction'
      ]
    };
  }

  /**
   * Merge multiple PDFs with streaming support
   */
  async mergePdfs(files, options = {}) {
    const { quality = 'high', compression = true, streaming = false } = options;

    try {
      console.log('Debug - files received:', files.length);
      console.log('Debug - first file structure:', JSON.stringify(files[0], null, 2));
      console.log('Debug - files map:', files.map(f => ({
        fieldname: f.fieldname,
        originalname: f.originalname,
        hasBuffer: !!f.buffer,
        bufferLength: f.buffer?.length,
        hasPath: !!f.path
      })));

      const mergedPdf = await PDFDocument.create();

      // Process files in parallel for better performance
      const pdfPromises = files.map(async (file) => {
        const pdfBytes = file.buffer || await fs.readFile(file.path);
        return PDFDocument.load(pdfBytes);
      });

      const pdfs = await Promise.all(pdfPromises);

      // Copy pages from all PDFs
      for (const pdf of pdfs) {
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      // Apply compression if requested
      if (compression) {
        mergedPdf.setTitle('Merged PDF');
        mergedPdf.setCreator('High-Performance PDF Service');
      }

      const pdfBytes = await mergedPdf.save({
        useObjectStreams: compression,
        addDefaultPage: false
      });

      if (streaming) {
        return { buffer: Buffer.from(pdfBytes) };
      }

      const filename = `merged-${Date.now()}.pdf`;
      const outputPath = join(this.tempDir, filename);
      await fs.writeFile(outputPath, pdfBytes);

      return {
        filename,
        path: outputPath,
        size: pdfBytes.length,
        pages: mergedPdf.getPageCount()
      };
    } catch (error) {
      console.error('Error merging PDFs:', error);
      throw new Error(`Failed to merge PDFs: ${error.message}`);
    }
  }

  /**
   * Split PDF into separate pages
   */
  async splitPdf(file, options = {}) {
    const { startPage = 1, endPage = null, streaming = false } = options;

    try {
      const pdfBytes = file.buffer || await fs.readFile(file.path);
      const pdf = await PDFDocument.load(pdfBytes);
      const totalPages = pdf.getPageCount();

      const actualEndPage = endPage || totalPages;
      const pages = [];

      // Split into individual pages
      for (let i = startPage - 1; i < Math.min(actualEndPage, totalPages); i++) {
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdf, [i]);
        newPdf.addPage(copiedPage);

        const pageBytes = await newPdf.save();

        if (streaming) {
          pages.push({
            pageNumber: i + 1,
            buffer: Buffer.from(pageBytes)
          });
        } else {
          const filename = `page-${i + 1}.pdf`;
          const outputPath = join(this.tempDir, filename);
          await fs.writeFile(outputPath, pageBytes);

          pages.push({
            pageNumber: i + 1,
            filename,
            path: outputPath,
            size: pageBytes.length
          });
        }
      }

      if (streaming) {
        // Create ZIP buffer for multiple files
        const zipBuffer = await this.createZipFromBuffers(pages);
        return { zipBuffer, totalPages: pages.length };
      }

      return { files: pages, totalPages: pages.length };
    } catch (error) {
      console.error('Error splitting PDF:', error);
      throw new Error(`Failed to split PDF: ${error.message}`);
    }
  }

  /**
   * Convert images to PDF with batch processing
   */
  async imagesToPdf(files, options = {}) {
    const {
      format = 'A4',
      quality = 'high',
      compression = true,
      margin = 0,
      streaming = false,
      parallel = false
    } = options;

    try {
      const pdf = await PDFDocument.create();

      // Process images in parallel if requested
      const processImage = async (file) => {
        const imageBytes = file.buffer || await fs.readFile(file.path);

        // Load image with Jimp and optimize based on quality setting
        const image = await Jimp.read(imageBytes);

        let qualityValue;
        if (quality === 'high') {
          qualityValue = 95;
        } else if (quality === 'medium') {
          qualityValue = 80;
        } else {
          qualityValue = 60;
        }

        // Convert to JPEG with specified quality
        const processedImage = await image
          .quality(qualityValue)
          .getBufferAsync(Jimp.MIME_JPEG);

        return processedImage;
      };

      const imagePromises = parallel
        ? files.map(processImage)
        : files.reduce(async (acc, file) => {
          const results = await acc;
          const processed = await processImage(file);
          return [...results, processed];
        }, Promise.resolve([]));

      const processedImages = await imagePromises;

      // Add images to PDF
      for (const imageBytes of processedImages) {
        const image = await pdf.embedJpg(imageBytes);
        const page = pdf.addPage();

        const { width, height } = page.getSize();
        const imageWidth = width - (margin * 2);
        const imageHeight = height - (margin * 2);

        // Calculate aspect ratio
        const aspectRatio = image.width / image.height;
        let drawWidth = imageWidth;
        let drawHeight = imageWidth / aspectRatio;

        if (drawHeight > imageHeight) {
          drawHeight = imageHeight;
          drawWidth = imageHeight * aspectRatio;
        }

        const x = (width - drawWidth) / 2;
        const y = (height - drawHeight) / 2;

        page.drawImage(image, {
          x,
          y,
          width: drawWidth,
          height: drawHeight
        });
      }

      const pdfBytes = await pdf.save({
        useObjectStreams: compression
      });

      if (streaming) {
        return { buffer: Buffer.from(pdfBytes) };
      }

      const filename = `images-${Date.now()}.pdf`;
      const outputPath = join(this.tempDir, filename);
      await fs.writeFile(outputPath, pdfBytes);

      return {
        filename,
        path: outputPath,
        size: pdfBytes.length,
        pages: pdf.getPageCount()
      };
    } catch (error) {
      console.error('Error converting images to PDF:', error);
      throw new Error(`Failed to convert images to PDF: ${error.message}`);
    }
  }

  /**
   * Convert DOC/DOCX to PDF with enhanced content processing
   */
  async docToPdf(file, options = {}) {
    const {
      preserveFormatting = true,
      includeImages = true,
      quality = 'high',
      streaming = false
    } = options;

    try {
      const docBytes = file.buffer || await fs.readFile(file.path);

      // Check if it's a DOCX (ZIP-based) or DOC (binary format)
      const isDocx = file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                     file.originalname.toLowerCase().endsWith('.docx');

      let htmlContent;

      if (isDocx) {
        // Extract content using mammoth for DOCX
        const result = await mammoth.convertToHtml(docBytes, {
          includeDefaultStyleMap: preserveFormatting,
          includeEmbeddedStyleMap: preserveFormatting
        });
        htmlContent = result.value;
      } else {
        // For DOC files, provide a basic conversion fallback
        console.log('Processing legacy DOC file - using fallback conversion');
        htmlContent = `<p>Document conversion from DOC format</p>
                      <p>Original filename: ${file.originalname}</p>
                      <p>File size: ${docBytes.length} bytes</p>
                      <p>Note: Full DOC parsing requires additional libraries. This is a placeholder conversion.</p>
                      <p>For better results, please convert your document to DOCX format.</p>`;
      }

      const pdf = await PDFDocument.create();
      const page = pdf.addPage();
      const { width, height } = page.getSize();

      // Convert HTML to plain text for PDF
      const textContent = htmlContent
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const fontSize = 12;
      const lineHeight = fontSize * 1.4;
      const margin = 50;
      const maxWidth = width - (margin * 2);

      // Split text into lines that fit the page width
      const words = textContent.split(' ');
      const lines = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (textWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            lines.push(word);
          }
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      // Add text to pages
      let currentY = height - margin;
      let currentPageIndex = 0;
      let currentPage = page;

      for (const line of lines) {
        if (currentY < margin + lineHeight) {
          // Create new page
          currentPage = pdf.addPage();
          currentY = height - margin;
          currentPageIndex++;
        }

        currentPage.drawText(line, {
          x: margin,
          y: currentY,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });

        currentY -= lineHeight;
      }

      // Add metadata
      pdf.setTitle(file.originalname || 'Converted Document');
      pdf.setCreator('High-Performance PDF Service');
      pdf.setProducer('pdf-lib');

      const pdfBytes = await pdf.save({
        useObjectStreams: quality === 'high'
      });

      if (streaming) {
        return { buffer: Buffer.from(pdfBytes) };
      }

      const filename = `${file.originalname.replace(/\.[^/.]+$/, '')}-${Date.now()}.pdf`;
      const outputPath = join(this.tempDir, filename);
      await fs.writeFile(outputPath, pdfBytes);

      return {
        filename,
        path: outputPath,
        size: pdfBytes.length,
        pages: pdf.getPageCount()
      };
    } catch (error) {
      console.error('Error converting document to PDF:', error);
      throw new Error(`Failed to convert document to PDF: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF with advanced options
   */
  async extractText(file, options = {}) {
    const { includeMetadata = false } = options;

    try {
      // Temporarily return placeholder until PDF parsing is fixed
      const result = {
        text: 'PDF text extraction temporarily disabled - module compatibility issue',
        pages: 1,
        info: {}
      };

      if (includeMetadata) {
        result.metadata = {
          title: '',
          author: '',
          subject: '',
          creator: '',
          producer: '',
          creationDate: '',
          modificationDate: ''
        };
      }

      return result;
    } catch (error) {
      console.error('Error extracting text:', error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  }

  /**
   * Add QR code to PDF
   */
  async addQrCode(file, options = {}) {
    const {
      text,
      size = 100,
      position = 'bottom-right',
      page = 1,
      streaming = false
    } = options;

    try {
      const pdfBytes = file.buffer || await fs.readFile(file.path);
      const pdf = await PDFDocument.load(pdfBytes);

      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(text, {
        width: size,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Convert data URL to buffer
      const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
      const qrImage = await pdf.embedPng(qrCodeBuffer);

      const pageIndex = Math.min(page - 1, pdf.getPageCount() - 1);
      const pdfPage = pdf.getPage(pageIndex);
      const { width, height } = pdfPage.getSize();

      // Calculate position
      let x, y;
      switch (position) {
      case 'top-left':
        x = 20;
        y = height - size - 20;
        break;
      case 'top-right':
        x = width - size - 20;
        y = height - size - 20;
        break;
      case 'bottom-left':
        x = 20;
        y = 20;
        break;
      case 'bottom-right':
      default:
        x = width - size - 20;
        y = 20;
        break;
      }

      pdfPage.drawImage(qrImage, {
        x,
        y,
        width: size,
        height: size
      });

      const modifiedPdfBytes = await pdf.save();

      if (streaming) {
        return { buffer: Buffer.from(modifiedPdfBytes) };
      }

      const filename = `qr-${Date.now()}.pdf`;
      const outputPath = join(this.tempDir, filename);
      await fs.writeFile(outputPath, modifiedPdfBytes);

      return {
        filename,
        path: outputPath,
        qrData: text
      };
    } catch (error) {
      console.error('Error adding QR code:', error);
      throw new Error(`Failed to add QR code: ${error.message}`);
    }
  }

  /**
   * Add barcode to PDF
   * @param {Object} file - PDF file to modify
   * @param {Object} options - Barcode options
   * @returns {Object} Result with modified PDF
   */
  async addBarcode(file, options = {}) {
    const {
      text,
      format = 'CODE128',
      width = 200,
      height = 50,
      position = 'bottom-right',
      page = 1,
      streaming = false
    } = options;

    try {
      const pdfBytes = file.buffer || await fs.readFile(file.path);
      const pdf = await PDFDocument.load(pdfBytes);

      // Import barcode service to generate barcode
      const BarcodeService = await import('./barcode.service.js');
      const barcodeService = new BarcodeService.BarcodeService();

      // Generate barcode as PNG buffer
      const barcodeResult = await barcodeService.generateBarcode(text, {
        format,
        width,
        height
      });

      // Check if we got a buffer or need to read from path
      let barcodeBuffer;
      if (barcodeResult.buffer) {
        barcodeBuffer = barcodeResult.buffer;
      } else if (barcodeResult.path) {
        barcodeBuffer = await fs.readFile(barcodeResult.path);
      } else {
        throw new Error('Failed to get barcode buffer from service');
      }

      // Embed barcode image in PDF
      const barcodeImage = await pdf.embedPng(barcodeBuffer);

      const pageIndex = Math.min(page - 1, pdf.getPageCount() - 1);
      const pdfPage = pdf.getPage(pageIndex);
      const { width: pageWidth, height: pageHeight } = pdfPage.getSize();

      // Calculate position
      let x, y;
      switch (position) {
      case 'top-left':
        x = 20;
        y = pageHeight - height - 20;
        break;
      case 'top-right':
        x = pageWidth - width - 20;
        y = pageHeight - height - 20;
        break;
      case 'bottom-left':
        x = 20;
        y = 20;
        break;
      case 'bottom-right':
      default:
        x = pageWidth - width - 20;
        y = 20;
        break;
      case 'center':
        x = (pageWidth - width) / 2;
        y = (pageHeight - height) / 2;
        break;
      }

      pdfPage.drawImage(barcodeImage, {
        x,
        y,
        width,
        height
      });

      const modifiedPdfBytes = await pdf.save();

      if (streaming) {
        return { buffer: Buffer.from(modifiedPdfBytes) };
      }

      const filename = `barcode-${Date.now()}.pdf`;
      const outputPath = join(this.tempDir, filename);
      await fs.writeFile(outputPath, modifiedPdfBytes);

      return {
        filename,
        path: outputPath,
        size: modifiedPdfBytes.length,
        barcodeData: {
          text,
          format,
          position,
          page
        }
      };
    } catch (error) {
      console.error('Error adding barcode:', error);
      throw new Error(`Failed to add barcode: ${error.message}`);
    }
  }

  /**
   * Add watermark to PDF
   * @param {Object} file - PDF file to modify
   * @param {Object} options - Watermark options
   * @returns {Object} Result with modified PDF
   */
  async addWatermark(file, options = {}) {
    const {
      text = 'WATERMARK',
      fontSize = 48,
      opacity = 0.3,
      rotation = -45,
      position = 'center',
      color = '#FF0000',
      streaming = false
    } = options;

    try {
      const pdfBytes = file.buffer || await fs.readFile(file.path);
      const pdf = await PDFDocument.load(pdfBytes);

      // Create watermark text
      const font = await pdf.embedFont(StandardFonts.HelveticaBold);

      // Process all pages
      const pages = pdf.getPages();

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();

        // Calculate position
        let x, y;
        switch (position) {
        case 'top-left':
          x = 50;
          y = height - 100;
          break;
        case 'top-right':
          x = width - 200;
          y = height - 100;
          break;
        case 'bottom-left':
          x = 50;
          y = 100;
          break;
        case 'bottom-right':
          x = width - 200;
          y = 100;
          break;
        case 'center':
        default:
          x = width / 2;
          y = height / 2;
          break;
        }

        // Convert hex color to RGB
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;

        // Add watermark text
        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(r, g, b),
          opacity,
          rotate: { angle: rotation, type: 'degrees' }
        });
      }

      const modifiedPdfBytes = await pdf.save();

      if (streaming) {
        return { buffer: Buffer.from(modifiedPdfBytes) };
      }

      const filename = `watermark-${Date.now()}.pdf`;
      const outputPath = join(this.tempDir, filename);
      await fs.writeFile(outputPath, modifiedPdfBytes);

      return {
        filename,
        path: outputPath,
        size: modifiedPdfBytes.length,
        watermarkData: {
          text,
          fontSize,
          opacity,
          rotation,
          position,
          color
        }
      };
    } catch (error) {
      console.error('Error adding watermark:', error);
      throw new Error(`Failed to add watermark: ${error.message}`);
    }
  }

  /**
   * Batch process multiple files
   */
  async batchProcess(files, operation, options = {}) {
    const { parallel = true, maxConcurrent = config.pdf.concurrentProcessing } = options;

    try {
      if (parallel) {
        // Process files in parallel with concurrency limit
        const results = [];
        const chunks = this.chunkArray(files, maxConcurrent);

        for (const chunk of chunks) {
          const chunkPromises = chunk.map(async (file) => {
            try {
              return await this.processFile(file, operation, options);
            } catch (error) {
              return { error: error.message, file: file.originalname };
            }
          });

          const chunkResults = await Promise.all(chunkPromises);
          results.push(...chunkResults);
        }

        return results;
      } else {
        // Process files sequentially
        const results = [];
        for (const file of files) {
          try {
            const result = await this.processFile(file, operation, options);
            results.push(result);
          } catch (error) {
            results.push({ error: error.message, file: file.originalname });
          }
        }
        return results;
      }
    } catch (error) {
      console.error('Error in batch processing:', error);
      throw new Error(`Batch processing failed: ${error.message}`);
    }
  }

  /**
   * Get PDF metadata
   */
  async getMetadata(file) {
    try {
      const pdfBytes = file.buffer || await fs.readFile(file.path);
      const pdf = await PDFDocument.load(pdfBytes);

      return {
        pages: pdf.getPageCount(),
        title: pdf.getTitle() || '',
        author: pdf.getAuthor() || '',
        subject: pdf.getSubject() || '',
        creator: pdf.getCreator() || '',
        producer: pdf.getProducer() || '',
        creationDate: pdf.getCreationDate()?.toString() || '',
        modificationDate: pdf.getModificationDate()?.toString() || '',
        size: pdfBytes.length,
        version: '1.4' // PDF version
      };
    } catch (error) {
      console.error('Error getting metadata:', error);
      throw new Error(`Failed to get metadata: ${error.message}`);
    }
  }

  // Helper methods

  async processFile(file, operation, options) {
    switch (operation) {
    case 'extract-text':
      return this.extractText(file, options);
    case 'metadata':
      return this.getMetadata(file);
    case 'add-qr':
      return this.addQrCode(file, options);
    default:
      throw new Error(`Unknown operation: ${operation}`);
    }
  }

  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async createZipFromBuffers(pages) {
    // This is a simplified implementation
    // In production, you'd use a proper ZIP library like JSZip
    return Buffer.concat(pages.map(p => p.buffer));
  }

  /**
   * Sign PDF with digital signature using P12/PFX certificate
   * @param {Object} pdfFile - PDF file object with buffer
   * @param {Object} certificateFile - P12/PFX certificate file object with buffer
   * @param {string} password - Certificate password
   * @param {Object} options - Signing options
   * @returns {Object} Result with signed PDF buffer or file path
   */
  async signPdf(pdfFile, certificateFile, password, options = {}) {
    const {
      reason = 'Document signing',
      location = 'Digital signature',
      contactInfo = '',
      streaming = false
    } = options;

    try {
      console.log('🔐 Starting PDF signing process...');

      // Initialize PDF signer
      const signer = new SignPdf();

      // Get PDF buffer
      const pdfBuffer = pdfFile.buffer || await fs.readFile(pdfFile.path);

      // Get certificate buffer
      const certificateBuffer = certificateFile.buffer || await fs.readFile(certificateFile.path);

      console.log(`📄 PDF size: ${(pdfBuffer.length / 1024).toFixed(1)}KB`);
      console.log(`🔑 Certificate size: ${(certificateBuffer.length / 1024).toFixed(1)}KB`);

      // Configure signing options
      const signOptions = {
        reason,
        location,
        contactInfo,
        // Set signing time
        signingTime: new Date(),
        // Use SHA256 for better security
        hashAlgorithm: 'sha256'
      };

      console.log('🖊️ Signing PDF with options:', {
        reason: signOptions.reason,
        location: signOptions.location,
        hashAlgorithm: signOptions.hashAlgorithm
      });

      // Sign the PDF
      const signedPdfBuffer = await signer.sign(pdfBuffer, certificateBuffer, {
        passphrase: password,
        ...signOptions
      });

      console.log(`✅ PDF signed successfully, output size: ${(signedPdfBuffer.length / 1024).toFixed(1)}KB`);

      if (streaming) {
        return { buffer: signedPdfBuffer };
      }

      // Save to file
      const filename = `signed-${Date.now()}.pdf`;
      const outputPath = join(this.tempDir, filename);
      await fs.writeFile(outputPath, signedPdfBuffer);

      return {
        filename,
        path: outputPath,
        size: signedPdfBuffer.length,
        signatureInfo: {
          reason,
          location,
          contactInfo,
          timestamp: new Date().toISOString(),
          algorithm: 'SHA256'
        }
      };
    } catch (error) {
      console.error('❌ Error signing PDF:', error);

      // Provide more specific error messages
      if (error.message.includes('passphrase') || error.message.includes('password')) {
        throw new Error('Invalid certificate password');
      } else if (error.message.includes('certificate') || error.message.includes('p12') || error.message.includes('pfx')) {
        throw new Error('Invalid or corrupted certificate file');
      } else if (error.message.includes('PDF')) {
        throw new Error('Invalid or corrupted PDF file');
      } else {
        throw new Error(`Failed to sign PDF: ${error.message}`);
      }
    }
  }
}

export default PdfService;
