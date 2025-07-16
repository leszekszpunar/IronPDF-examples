import { body, param, query, validationResult } from 'express-validator';

/**
 * Helper function to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * Validation middleware for PDF files
 */
export const validatePdfFile = [
  body('file').optional()
    .custom((value, { req }) => {
      if (req.file && req.file.mimetype !== 'application/pdf') {
        throw new Error('File must be a PDF');
      }
      return true;
    })
    .withMessage('Invalid PDF file')
];

/**
 * Validation middleware for base64 PDF content
 */
export const validateBase64Pdf = [
  body('base64').optional()
    .isBase64()
    .withMessage('Invalid base64 encoding')
];

/**
 * Validation middleware for certificates
 */
export const validateCertificate = [
  body('certificate').optional()
    .custom((value) => {
      if (value && !value.includes('-----BEGIN CERTIFICATE-----')) {
        throw new Error('Certificate must be in PEM format');
      }
      return true;
    })
    .withMessage('Invalid certificate format')
];

/**
 * Validation middleware for passwords
 */
export const validatePassword = [
  body('password')
    .isString()
    .isLength({ min: 1, max: 256 })
    .withMessage('Password must be a string between 1 and 256 characters')
];

/**
 * Validation middleware for security options
 */
export const validateSecurityOptions = [
  body('checkEncryption').optional()
    .isBoolean()
    .withMessage('checkEncryption must be a boolean'),

  body('checkPermissions').optional()
    .isBoolean()
    .withMessage('checkPermissions must be a boolean'),

  body('checkVulnerabilities').optional()
    .isBoolean()
    .withMessage('checkVulnerabilities must be a boolean'),

  body('analyzeStructure').optional()
    .isBoolean()
    .withMessage('analyzeStructure must be a boolean'),

  body('deepScan').optional()
    .isBoolean()
    .withMessage('deepScan must be a boolean')
];

/**
 * Validation middleware for compliance standards
 */
export const validateCompliance = [
  body('compliance').optional()
    .isArray()
    .withMessage('Compliance must be an array')
    .custom((standards) => {
      const validStandards = ['ISO 32000', 'ETSI EN 319 142', 'PAdES', 'PAdES-B', 'PAdES-LTV', 'PAdES-LTA'];
      const invalidStandards = standards.filter(std => !validStandards.includes(std));

      if (invalidStandards.length > 0) {
        throw new Error(`Invalid compliance standards: ${invalidStandards.join(', ')}. Valid standards are: ${validStandards.join(', ')}`);
      }

      return true;
    })
];

/**
 * Validation middleware for batch operations
 */
export const validateBatchOptions = [
  body('maxConcurrency').optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('maxConcurrency must be an integer between 1 and 10'),

  body('timeout').optional()
    .isInt({ min: 1000, max: 300000 })
    .withMessage('timeout must be an integer between 1000 and 300000 milliseconds'),

  body('failFast').optional()
    .isBoolean()
    .withMessage('failFast must be a boolean')
];

/**
 * Validation middleware for trusted CA management
 */
export const validateTrustedCA = [
  body('name')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('CA name must be between 1 and 200 characters'),

  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),

  body('autoTrust').optional()
    .isBoolean()
    .withMessage('autoTrust must be a boolean')
];

/**
 * Validation middleware for certificate fingerprint
 */
export const validateCertificateFingerprint = [
  param('fingerprint')
    .isHexadecimal()
    .isLength({ min: 64, max: 64 })
    .withMessage('Fingerprint must be a 64-character hexadecimal string (SHA-256)')
];

/**
 * Validation middleware for signature verification options
 */
export const validateSignatureOptions = [
  body('checkRevocation').optional()
    .isBoolean()
    .withMessage('checkRevocation must be a boolean'),

  body('checkTimestamps').optional()
    .isBoolean()
    .withMessage('checkTimestamps must be a boolean'),

  body('requireTrustedCA').optional()
    .isBoolean()
    .withMessage('requireTrustedCA must be a boolean'),

  body('allowSelfSigned').optional()
    .isBoolean()
    .withMessage('allowSelfSigned must be a boolean'),

  body('minimumKeySize').optional()
    .isInt({ min: 1024, max: 8192 })
    .withMessage('minimumKeySize must be an integer between 1024 and 8192'),

  body('allowedAlgorithms').optional()
    .isArray()
    .withMessage('allowedAlgorithms must be an array')
    .custom((algorithms) => {
      const validAlgorithms = ['SHA1', 'SHA256', 'SHA384', 'SHA512', 'RSA', 'ECDSA', 'DSA'];
      const invalidAlgorithms = algorithms.filter(alg => !validAlgorithms.includes(alg));

      if (invalidAlgorithms.length > 0) {
        throw new Error(`Invalid algorithms: ${invalidAlgorithms.join(', ')}. Valid algorithms are: ${validAlgorithms.join(', ')}`);
      }

      return true;
    })
];

/**
 * Validation middleware for report generation options
 */
export const validateReportOptions = [
  body('includeRawData').optional()
    .isBoolean()
    .withMessage('includeRawData must be a boolean'),

  body('includeCertificateChain').optional()
    .isBoolean()
    .withMessage('includeCertificateChain must be a boolean'),

  body('includeSecurityRecommendations').optional()
    .isBoolean()
    .withMessage('includeSecurityRecommendations must be a boolean'),

  body('reportFormat').optional()
    .isIn(['json', 'xml', 'html', 'pdf'])
    .withMessage('reportFormat must be one of: json, xml, html, pdf'),

  body('detailLevel').optional()
    .isIn(['summary', 'detailed', 'comprehensive'])
    .withMessage('detailLevel must be one of: summary, detailed, comprehensive')
];

/**
 * Validation middleware for certificate analysis options
 */
export const validateCertificateAnalysis = [
  body('checkExpiration').optional()
    .isBoolean()
    .withMessage('checkExpiration must be a boolean'),

  body('checkKeyUsage').optional()
    .isBoolean()
    .withMessage('checkKeyUsage must be a boolean'),

  body('checkCriticalExtensions').optional()
    .isBoolean()
    .withMessage('checkCriticalExtensions must be a boolean'),

  body('validateChain').optional()
    .isBoolean()
    .withMessage('validateChain must be a boolean'),

  body('checkRevocationStatus').optional()
    .isBoolean()
    .withMessage('checkRevocationStatus must be a boolean')
];

/**
 * Validation middleware for security scoring options
 */
export const validateSecurityScoring = [
  body('weightings').optional()
    .isObject()
    .withMessage('weightings must be an object')
    .custom((weightings) => {
      const validWeights = ['encryption', 'signatures', 'permissions', 'vulnerabilities', 'compliance'];
      const weights = Object.keys(weightings);
      const invalidWeights = weights.filter(w => !validWeights.includes(w));

      if (invalidWeights.length > 0) {
        throw new Error(`Invalid weight categories: ${invalidWeights.join(', ')}`);
      }

      // Check that all weights are numbers between 0 and 1
      for (const weight of weights) {
        if (typeof weightings[weight] !== 'number' || weightings[weight] < 0 || weightings[weight] > 1) {
          throw new Error(`Weight for ${weight} must be a number between 0 and 1`);
        }
      }

      // Check that weights sum to 1
      const sum = Object.values(weightings).reduce((acc, val) => acc + val, 0);
      if (Math.abs(sum - 1) > 0.001) {
        throw new Error('Weightings must sum to 1');
      }

      return true;
    }),

  body('minimumScore').optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('minimumScore must be an integer between 0 and 100'),

  body('includeScoreBreakdown').optional()
    .isBoolean()
    .withMessage('includeScoreBreakdown must be a boolean')
];

/**
 * Validation middleware for pagination
 */
export const validatePagination = [
  query('page').optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),

  query('limit').optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),

  query('sortBy').optional()
    .isIn(['name', 'created', 'modified', 'size', 'score'])
    .withMessage('sortBy must be one of: name, created, modified, size, score'),

  query('sortOrder').optional()
    .isIn(['asc', 'desc'])
    .withMessage('sortOrder must be either asc or desc')
];

/**
 * Validation middleware for search filters
 */
export const validateSearchFilters = [
  query('filter').optional()
    .isObject()
    .withMessage('filter must be an object'),

  query('dateFrom').optional()
    .isISO8601()
    .withMessage('dateFrom must be a valid ISO 8601 date'),

  query('dateTo').optional()
    .isISO8601()
    .withMessage('dateTo must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.query.dateFrom && new Date(value) <= new Date(req.query.dateFrom)) {
        throw new Error('dateTo must be after dateFrom');
      }
      return true;
    })
];

// Export all validators as a convenience object
export const validators = {
  validatePdfFile,
  validateBase64Pdf,
  validateCertificate,
  validatePassword,
  validateSecurityOptions,
  validateCompliance,
  validateBatchOptions,
  validateTrustedCA,
  validateCertificateFingerprint,
  validateSignatureOptions,
  validateReportOptions,
  validateCertificateAnalysis,
  validateSecurityScoring,
  validatePagination,
  validateSearchFilters,
  handleValidationErrors
};
