import { Router } from 'express';
import SecurityController from '../controllers/security.controller.js';
import { streamingMiddleware } from '../middleware/streaming.middleware.js';
import TelemetryMiddleware from '../middleware/telemetry.middleware.js';
import {
  validateBase64Pdf,
  validateCertificate,
  validateCompliance,
  validatePassword,
  validatePdfFile,
  validateSecurityOptions
} from '../validators/index.js';

const router = Router();
const securityController = new SecurityController();

/**
 * @swagger
 * tags:
 *   name: Security
 *   description: Digital signature verification, certificate validation, and PDF security analysis
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SignatureVerificationResult:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             overall:
 *               type: object
 *               properties:
 *                 isValid:
 *                   type: boolean
 *                 verified:
 *                   type: boolean
 *                 authenticity:
 *                   type: boolean
 *                 integrity:
 *                   type: boolean
 *                 expired:
 *                   type: boolean
 *                 confidence:
 *                   type: number
 *                   minimum: 0
 *                   maximum: 100
 *             signatures:
 *               type: array
 *               items:
 *                 type: object
 *             certificates:
 *               type: object
 *               properties:
 *                 details:
 *                   type: array
 *                 chainAnalysis:
 *                   type: object
 *                 revocationStatus:
 *                   type: object
 *                 trustLevel:
 *                   type: string
 *                   enum: [trusted, self-signed, untrusted, unsigned]
 */

/**
 * @swagger
 * /api/security/verify-signatures:
 *   post:
 *     summary: Comprehensive PDF digital signature verification
 *     description: |
 *       Performs thorough verification of PDF digital signatures including:
 *       - PKCS#7/CMS signature validation
 *       - Certificate chain verification
 *       - Trust store validation
 *       - Timestamp verification
 *       - Compliance checking (ISO 32000, ETSI EN 319 142, PAdES)
 *     tags: [Security]
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
 *                 description: PDF file with digital signatures
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               base64:
 *                 type: string
 *                 description: Base64 encoded PDF content
 *     responses:
 *       200:
 *         description: Signature verification completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignatureVerificationResult'
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Verification failed
 */
router.post('/verify-signatures',
  streamingMiddleware.uploadSingle,
  TelemetryMiddleware.securityOperationTracing(),
  [validatePdfFile, validateBase64Pdf],
  securityController.verifySignatures.bind(securityController)
);

/**
 * @swagger
 * /api/security/analyze:
 *   post:
 *     summary: Comprehensive PDF security analysis
 *     description: |
 *       Analyzes PDF security features including:
 *       - Encryption algorithms and strength
 *       - Password protection status
 *       - User and owner permissions
 *       - Security vulnerabilities
 *       - Compliance assessment
 *     tags: [Security]
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
 *                 description: PDF file to analyze
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               base64:
 *                 type: string
 *                 description: Base64 encoded PDF content
 *     responses:
 *       200:
 *         description: Security analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     encryption:
 *                       type: object
 *                     permissions:
 *                       type: object
 *                     vulnerabilities:
 *                       type: array
 *                     securityAssessment:
 *                       type: object
 *                     recommendations:
 *                       type: array
 */
router.post('/analyze',
  streamingMiddleware.uploadSingle,
  TelemetryMiddleware.securityOperationTracing(),
  [validatePdfFile, validateBase64Pdf, validateSecurityOptions],
  securityController.analyzeSecurityFeatures.bind(securityController)
);

/**
 * @swagger
 * /api/security/test-password:
 *   post:
 *     summary: Test PDF password protection
 *     description: Tests if provided password can unlock encrypted PDF document
 *     tags: [Security]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - password
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Encrypted PDF file
 *               password:
 *                 type: string
 *                 description: Password to test
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - base64
 *               - password
 *             properties:
 *               base64:
 *                 type: string
 *                 description: Base64 encoded PDF content
 *               password:
 *                 type: string
 *                 description: Password to test
 *     responses:
 *       200:
 *         description: Password test completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     passwordValid:
 *                       type: boolean
 *                     accessLevel:
 *                       type: string
 *                       enum: [none, user, owner]
 */
router.post('/test-password',
  streamingMiddleware.uploadSingle,
  TelemetryMiddleware.pdfOperationTracing('password_test'),
  [validatePdfFile, validateBase64Pdf, validatePassword],
  securityController.testPassword.bind(securityController)
);

/**
 * @swagger
 * /api/security/report:
 *   post:
 *     summary: Generate comprehensive security and compliance report
 *     description: |
 *       Generates detailed security report including:
 *       - Complete signature verification
 *       - Security vulnerability assessment
 *       - Compliance checking (ISO 32000, ETSI EN 319 142, PAdES)
 *       - Risk assessment and recommendations
 *     tags: [Security]
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
 *                 description: PDF file to analyze
 *               compliance:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [ISO 32000, ETSI EN 319 142, PAdES]
 *                 description: Compliance standards to check
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               base64:
 *                 type: string
 *                 description: Base64 encoded PDF content
 *               compliance:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Compliance standards to check
 *     responses:
 *       200:
 *         description: Security report generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                     signatures:
 *                       type: object
 *                     security:
 *                       type: object
 *                     compliance:
 *                       type: object
 *                     recommendations:
 *                       type: array
 */
router.post('/report',
  streamingMiddleware.uploadSingle,
  TelemetryMiddleware.securityOperationTracing(),
  [validatePdfFile, validateBase64Pdf, validateCompliance],
  securityController.generateSecurityReport.bind(securityController)
);

/**
 * @swagger
 * /api/security/batch-verify:
 *   post:
 *     summary: Batch verification of multiple PDF documents
 *     description: Performs parallel verification of multiple PDF files with concurrency control
 *     tags: [Security]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: PDF files to verify (max 10 files)
 *     responses:
 *       200:
 *         description: Batch verification completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         successful:
 *                           type: number
 *                         failed:
 *                           type: number
 *                         processingTimeMs:
 *                           type: number
 */
router.post('/batch-verify',
  streamingMiddleware.uploadMultiple,
  TelemetryMiddleware.batchOperationTracing(),
  securityController.batchVerifyDocuments.bind(securityController)
);

// ========== Certificate Authority Management ==========

/**
 * @swagger
 * /api/security/trusted-ca:
 *   get:
 *     summary: List trusted Certificate Authorities
 *     description: Retrieves list of trusted CA certificates used for signature verification
 *     tags: [Security]
 *     responses:
 *       200:
 *         description: Trusted CAs list retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     trustedCAs:
 *                       type: array
 *                       items:
 *                         type: string
 *                         description: SHA-256 fingerprint of trusted CA certificate
 *                     count:
 *                       type: number
 *   post:
 *     summary: Add trusted CA certificate
 *     description: Adds a trusted Certificate Authority certificate for signature verification
 *     tags: [Security]
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
 *                 description: CA certificate file (PEM format)
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               certificate:
 *                 type: string
 *                 description: PEM-encoded CA certificate
 *     responses:
 *       200:
 *         description: Trusted CA added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid certificate
 *       500:
 *         description: Server error
 */
router.get('/trusted-ca',
  TelemetryMiddleware.requestTracing(),
  securityController.listTrustedCAs.bind(securityController)
);

router.post('/trusted-ca',
  streamingMiddleware.uploadSingle,
  TelemetryMiddleware.pdfOperationTracing('ca_management'),
  [validateCertificate],
  securityController.addTrustedCA.bind(securityController)
);

/**
 * @swagger
 * /api/security/trusted-ca/{fingerprint}:
 *   delete:
 *     summary: Remove trusted CA certificate
 *     description: Removes a trusted CA certificate by its SHA-256 fingerprint
 *     tags: [Security]
 *     parameters:
 *       - in: path
 *         name: fingerprint
 *         required: true
 *         schema:
 *           type: string
 *         description: SHA-256 fingerprint of CA certificate to remove
 *     responses:
 *       200:
 *         description: Trusted CA removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid fingerprint
 *       500:
 *         description: Server error
 */
router.delete('/trusted-ca/:fingerprint',
  TelemetryMiddleware.pdfOperationTracing('ca_management'),
  securityController.removeTrustedCA.bind(securityController)
);

/**
 * @swagger
 * /api/security/certificates:
 *   post:
 *     summary: Extract certificate details from PDF
 *     description: Extracts and analyzes certificate details from a signed PDF document
 *     tags: [Security]
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
 *                 description: Signed PDF file
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               base64:
 *                 type: string
 *                 description: Base64 encoded PDF content
 *     responses:
 *       200:
 *         description: Certificate details extracted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     certificates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           issuedBy:
 *                             type: object
 *                           issuedTo:
 *                             type: object
 *                           validityPeriod:
 *                             type: object
 *                           pemCertificate:
 *                             type: string
 *                           clientCertificate:
 *                             type: boolean
 *                     count:
 *                       type: number
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/certificates',
  streamingMiddleware.uploadSingle,
  TelemetryMiddleware.pdfOperationTracing('certificate_extraction'),
  [validatePdfFile, validateBase64Pdf],
  securityController.getCertificateDetails.bind(securityController)
);

export default router;
