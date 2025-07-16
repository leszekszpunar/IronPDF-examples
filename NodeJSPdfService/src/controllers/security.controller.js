import { validationResult } from 'express-validator';
import PdfSecurityService from '../services/pdf-security.service.js';
import SignatureVerificationService from '../services/signature-verification.service.js';

/**
 * Advanced Security Controller
 * Handles digital signature verification, certificate validation, and PDF security analysis
 */
class SecurityController {
  constructor() {
    this.signatureService = new SignatureVerificationService();
    this.securityService = new PdfSecurityService();
  }

  /**
   * Comprehensive PDF signature verification
   */
  async verifySignatures(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      let pdfBuffer;
      if (req.file) {
        pdfBuffer = req.file.buffer;
      } else if (req.body.base64) {
        pdfBuffer = Buffer.from(req.body.base64, 'base64');
      } else {
        return res.status(400).json({
          success: false,
          error: 'No PDF file provided. Use file upload or base64 data.'
        });
      }

      // Verify PDF signatures
      const verificationResult = await this.signatureService.verifyPdfSignatures(pdfBuffer);

      res.json({
        success: true,
        data: verificationResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Signature verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Signature verification failed',
        message: error.message
      });
    }
  }

  /**
   * Comprehensive PDF security analysis
   */
  async analyzeSecurityFeatures(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      let pdfBuffer;
      if (req.file) {
        pdfBuffer = req.file.buffer;
      } else if (req.body.base64) {
        pdfBuffer = Buffer.from(req.body.base64, 'base64');
      } else {
        return res.status(400).json({
          success: false,
          error: 'No PDF file provided. Use file upload or base64 data.'
        });
      }

      // Analyze PDF security
      const securityAnalysis = await this.securityService.analyzePdfSecurity(pdfBuffer);

      res.json({
        success: true,
        data: securityAnalysis,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Security analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Security analysis failed',
        message: error.message
      });
    }
  }

  /**
   * Test PDF password protection
   */
  async testPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      let pdfBuffer;
      if (req.file) {
        pdfBuffer = req.file.buffer;
      } else if (req.body.base64) {
        pdfBuffer = Buffer.from(req.body.base64, 'base64');
      } else {
        return res.status(400).json({
          success: false,
          error: 'No PDF file provided. Use file upload or base64 data.'
        });
      }

      const password = req.body.password || '';

      // Test password
      const passwordResult = await this.securityService.testPassword(pdfBuffer, password);

      res.json({
        success: true,
        data: passwordResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Password test error:', error);
      res.status(500).json({
        success: false,
        error: 'Password test failed',
        message: error.message
      });
    }
  }

  /**
   * Generate comprehensive security report
   */
  async generateSecurityReport(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      let pdfBuffer;
      if (req.file) {
        pdfBuffer = req.file.buffer;
      } else if (req.body.base64) {
        pdfBuffer = Buffer.from(req.body.base64, 'base64');
      } else {
        return res.status(400).json({
          success: false,
          error: 'No PDF file provided. Use file upload or base64 data.'
        });
      }

      // Get comprehensive analysis
      const [signatureResult, securityResult] = await Promise.all([
        this.signatureService.verifyPdfSignatures(pdfBuffer),
        this.securityService.analyzePdfSecurity(pdfBuffer)
      ]);

      const complianceStandards = req.body.compliance || ['ISO 32000', 'ETSI EN 319 142'];

      const report = {
        summary: {
          overallRisk: this.calculateOverallRisk(signatureResult, securityResult),
          securityScore: securityResult.securityAssessment.overallScore,
          signatureValidation: signatureResult.overall.isValid,
          complianceStatus: this.checkCompliance(signatureResult, securityResult, complianceStandards)
        },
        signatures: signatureResult,
        security: securityResult,
        compliance: {
          standards: complianceStandards,
          results: this.generateComplianceResults(signatureResult, securityResult, complianceStandards)
        },
        recommendations: [
          ...signatureResult.securityAnalysis.recommendations,
          ...securityResult.recommendations
        ],
        metadata: {
          reportGenerated: new Date().toISOString(),
          reportVersion: '2.0.0',
          analysisEngine: 'NodeJS PDF Security Service'
        }
      };

      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Security report error:', error);
      res.status(500).json({
        success: false,
        error: 'Security report generation failed',
        message: error.message
      });
    }
  }

  /**
   * Batch verification of multiple PDFs
   */
  async batchVerifyDocuments(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files provided for batch verification'
        });
      }

      const startTime = Date.now();
      const results = [];

      // Process files in parallel (with concurrency limit)
      const processFile = async (file) => {
        try {
          const [signatureResult, securityResult] = await Promise.all([
            this.signatureService.verifyPdfSignatures(file.buffer),
            this.securityService.analyzePdfSecurity(file.buffer)
          ]);

          return {
            fileName: file.originalname,
            status: 'success',
            signatures: signatureResult.overall,
            security: {
              encrypted: securityResult.encryption.isEncrypted,
              securityScore: securityResult.securityAssessment.overallScore,
              vulnerabilities: securityResult.vulnerabilities.length
            },
            overallRisk: this.calculateOverallRisk(signatureResult, securityResult)
          };
        } catch (error) {
          return {
            fileName: file.originalname,
            status: 'error',
            error: error.message
          };
        }
      };

      // Process with concurrency limit of 3
      const chunks = [];
      for (let i = 0; i < req.files.length; i += 3) {
        chunks.push(req.files.slice(i, i + 3));
      }

      for (const chunk of chunks) {
        const chunkResults = await Promise.all(chunk.map(processFile));
        results.push(...chunkResults);
      }

      const processingTime = Date.now() - startTime;
      const successful = results.filter(r => r.status === 'success').length;
      const failed = results.filter(r => r.status === 'error').length;

      res.json({
        success: true,
        data: {
          results,
          summary: {
            total: req.files.length,
            successful,
            failed,
            processingTimeMs: processingTime
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Batch verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Batch verification failed',
        message: error.message
      });
    }
  }

  /**
   * Add trusted CA certificate to signature verification service
   */
  async addTrustedCA(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      let certPem;
      if (req.file) {
        certPem = req.file.buffer.toString('utf8');
      } else if (req.body.certificate) {
        certPem = req.body.certificate;
      } else {
        return res.status(400).json({
          success: false,
          error: 'No certificate provided. Use file upload or certificate field.'
        });
      }

      // Add trusted CA
      this.signatureService.addTrustedCA(certPem);

      res.json({
        success: true,
        message: 'Trusted CA certificate added successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Add trusted CA error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add trusted CA',
        message: error.message
      });
    }
  }

  /**
   * Get list of trusted CA certificates
   */
  async listTrustedCAs(req, res) {
    try {
      const trustedCAs = this.signatureService.getTrustedCAs();

      res.json({
        success: true,
        data: {
          trustedCAs,
          count: trustedCAs.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('List trusted CAs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list trusted CAs',
        message: error.message
      });
    }
  }

  /**
   * Remove trusted CA certificate
   */
  async removeTrustedCA(req, res) {
    try {
      const { fingerprint } = req.params;

      if (!fingerprint) {
        return res.status(400).json({
          success: false,
          error: 'Certificate fingerprint is required'
        });
      }

      this.signatureService.removeTrustedCA(fingerprint);

      res.json({
        success: true,
        message: 'Trusted CA certificate removed successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Remove trusted CA error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove trusted CA',
        message: error.message
      });
    }
  }

  /**
   * Get certificate details from PDF
   */
  async getCertificateDetails(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      let pdfBuffer;
      if (req.file) {
        pdfBuffer = req.file.buffer;
      } else if (req.body.base64) {
        pdfBuffer = Buffer.from(req.body.base64, 'base64');
      } else {
        return res.status(400).json({
          success: false,
          error: 'No PDF file provided. Use file upload or base64 data.'
        });
      }

      // Get signatures which contain certificate details
      const verificationResult = await this.signatureService.verifyPdfSignatures(pdfBuffer);
      const certificates = verificationResult.certificates.details;

      res.json({
        success: true,
        data: {
          certificates,
          count: certificates.length,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Certificate extraction error:', error);
      res.status(500).json({
        success: false,
        error: 'Certificate extraction failed',
        message: error.message
      });
    }
  }

  /**
   * Calculate overall risk level
   * @param {Object} signatureResult - Signature verification results
   * @param {Object} securityResult - Security analysis results
   * @returns {string} Risk level (low, medium, high, critical)
   */
  calculateOverallRisk(signatureResult, securityResult) {
    let riskScore = 0;

    // Signature risks
    if (!signatureResult.overall.isValid) riskScore += 40;
    if (!signatureResult.overall.authenticity) riskScore += 30;
    if (signatureResult.overall.expired) riskScore += 20;

    // Security risks
    if (securityResult.securityAssessment.overallScore < 30) riskScore += 30;
    if (securityResult.vulnerabilities.length > 0) riskScore += 20;
    if (!securityResult.encryption.isEncrypted) riskScore += 10;

    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  /**
   * Check compliance with standards
   * @param {Object} signatureResult - Signature results
   * @param {Object} securityResult - Security results
   * @param {Array} standards - Compliance standards to check
   * @returns {Object} Compliance status
   */
  checkCompliance(signatureResult, securityResult, standards) {
    const results = {};

    standards.forEach(standard => {
      switch (standard) {
      case 'ISO 32000':
        results[standard] = signatureResult.overall.isValid && securityResult.securityAssessment.overallScore >= 70;
        break;
      case 'ETSI EN 319 142':
        results[standard] = signatureResult.overall.isValid && signatureResult.certificates.trustLevel === 'trusted';
        break;
      case 'PAdES':
        results[standard] = signatureResult.overall.isValid && !signatureResult.overall.expired;
        break;
      default:
        results[standard] = false;
      }
    });

    return results;
  }

  /**
   * Generate detailed compliance results
   * @param {Object} signatureResult - Signature results
   * @param {Object} securityResult - Security results
   * @param {Array} standards - Compliance standards
   * @returns {Object} Detailed compliance results
   */
  generateComplianceResults(signatureResult, securityResult, standards) {
    const results = {};

    standards.forEach(standard => {
      results[standard] = {
        compliant: this.checkCompliance(signatureResult, securityResult, [standard])[standard],
        requirements: this.getComplianceRequirements(standard),
        findings: this.getComplianceFindings(signatureResult, securityResult, standard)
      };
    });

    return results;
  }

  /**
   * Get compliance requirements for standard
   * @param {string} standard - Compliance standard
   * @returns {Array} Requirements list
   */
  getComplianceRequirements(standard) {
    const requirements = {
      'ISO 32000': [
        'Valid digital signatures',
        'Proper certificate chains',
        'Document integrity',
        'Security score >= 70%'
      ],
      'ETSI EN 319 142': [
        'Qualified digital signatures',
        'Trusted certificate authorities',
        'Long-term validation',
        'Timestamp verification'
      ],
      'PAdES': [
        'PDF Advanced Electronic Signatures',
        'Certificate validity',
        'Signature format compliance',
        'Non-expired certificates'
      ]
    };

    return requirements[standard] || [];
  }

  /**
   * Get compliance findings for standard
   * @param {Object} signatureResult - Signature results
   * @param {Object} securityResult - Security results
   * @param {string} standard - Compliance standard
   * @returns {Array} Findings list
   */
  getComplianceFindings(signatureResult, securityResult, standard) {
    const findings = [];

    if (!signatureResult.overall.isValid) {
      findings.push('Invalid digital signatures detected');
    }

    if (signatureResult.certificates.trustLevel !== 'trusted') {
      findings.push('Certificate trust chain issues');
    }

    if (securityResult.securityAssessment.overallScore < 70) {
      findings.push('Low security score');
    }

    if (signatureResult.overall.expired) {
      findings.push('Expired certificates found');
    }

    return findings;
  }
}

export default SecurityController;
