import path from 'path';
import { fileURLToPath } from 'url';
// import qpdfInfo from 'node-qpdf2'; // Temporarily disabled - will implement alternative

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Advanced PDF Security Analysis Service
 * Analyzes PDF encryption, permissions, passwords, and security features
 */
class PdfSecurityService {
  constructor() {
    this.encryptionMethods = {
      'RC4_40': { keyLength: 40, algorithm: 'RC4', strength: 'very-weak' },
      'RC4_128': { keyLength: 128, algorithm: 'RC4', strength: 'weak' },
      'AES_128': { keyLength: 128, algorithm: 'AES', strength: 'medium' },
      'AES_256': { keyLength: 256, algorithm: 'AES', strength: 'strong' }
    };
  }

  /**
   * Comprehensive PDF security analysis
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @param {string} password - Optional password for encrypted PDFs
   * @returns {Object} Detailed security analysis
   */
  async analyzePdfSecurity(pdfBuffer, password = null) {
    try {
      const analysis = {
        encrypted: false,
        encryptionDetails: null,
        permissions: null,
        passwordProtected: false,
        ownerPasswordSet: false,
        userPasswordSet: false,
        securityHandler: null,
        metadata: {},
        vulnerabilities: [],
        recommendations: [],
        securityScore: 0
      };

      // Primary analysis using pdf-lib
      const pdfLibAnalysis = await this.analyzePdfLibSecurity(pdfBuffer);

      // QPDF analysis for advanced security features
      const qpdfAnalysis = await this.analyzeQpdfSecurity(pdfBuffer, password);

      // Manual PDF structure analysis
      const structureAnalysis = this.analyzePdfStructure(pdfBuffer);

      // Combine all analyses
      Object.assign(analysis, pdfLibAnalysis, qpdfAnalysis, structureAnalysis);

      // Calculate security score and generate recommendations
      analysis.securityScore = this.calculateSecurityScore(analysis);
      analysis.recommendations = this.generateSecurityRecommendations(analysis);
      analysis.vulnerabilities = this.identifyVulnerabilities(analysis);

      return {
        ...analysis,
        analysisMetadata: {
          timestamp: new Date().toISOString(),
          version: '2.0.0',
          methods: ['pdf-lib', 'qpdf', 'structure-analysis']
        }
      };
    } catch (error) {
      throw new Error(`PDF security analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze PDF security using pdf-lib
   * @param {Buffer} pdfBuffer - PDF buffer
   * @returns {Object} pdf-lib analysis results
   */
  async analyzePdfLibSecurity(pdfBuffer) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer, {
        ignoreEncryption: false,
        throwOnInvalidObject: false
      });

      const analysis = {
        pdfLibAnalysis: {
          canRead: true,
          pageCount: pdfDoc.getPageCount(),
          title: pdfDoc.getTitle() || '',
          author: pdfDoc.getAuthor() || '',
          creator: pdfDoc.getCreator() || '',
          producer: pdfDoc.getProducer() || '',
          creationDate: pdfDoc.getCreationDate(),
          modificationDate: pdfDoc.getModificationDate()
        }
      };

      return analysis;
    } catch (error) {
      if (error.message.includes('password') || error.message.includes('encrypted')) {
        return {
          encrypted: true,
          passwordProtected: true,
          pdfLibAnalysis: {
            canRead: false,
            error: 'PDF is encrypted and requires password'
          }
        };
      }

      return {
        pdfLibAnalysis: {
          canRead: false,
          error: error.message
        }
      };
    }
  }

  /**
   * Analyze PDF security using QPDF
   * @param {Buffer} _pdfBuffer - PDF buffer
   * @param {string} _password - Password for encrypted PDFs
   * @returns {Object} QPDF analysis results
   */
  async analyzeQpdfSecurity(_pdfBuffer, _password) {
    // QPDF analysis temporarily disabled due to ES module compatibility
    // Will implement alternative solution
    return {
      qpdfAnalysis: {
        accessible: true,
        note: 'QPDF analysis temporarily disabled - using alternative PDF analysis',
        encryptionInfo: null,
        permissions: {}
      }
    };
  }

  /**
   * Analyze PDF structure manually
   * @param {Buffer} pdfBuffer - PDF buffer
   * @returns {Object} Structure analysis results
   */
  analyzePdfStructure(pdfBuffer) {
    try {
      const pdfString = pdfBuffer.toString('latin1');
      const analysis = {
        structureAnalysis: {
          hasEncrypt: false,
          hasTrailer: false,
          hasXref: false,
          linearized: false,
          version: null,
          suspicious: []
        }
      };

      // Check PDF version
      const versionMatch = pdfString.match(/%PDF-(\d+\.\d+)/);
      if (versionMatch) {
        analysis.structureAnalysis.version = versionMatch[1];
      }

      // Check for encryption dictionary
      analysis.structureAnalysis.hasEncrypt = /\/Encrypt\s+\d+\s+\d+\s+R/.test(pdfString);
      if (analysis.structureAnalysis.hasEncrypt) {
        analysis.encrypted = true;
      }

      // Check for trailer
      analysis.structureAnalysis.hasTrailer = /trailer\s*<</.test(pdfString);

      // Check for xref table
      analysis.structureAnalysis.hasXref = /xref\s*\n/.test(pdfString);

      // Check if linearized
      analysis.structureAnalysis.linearized = /\/Linearized\s+\d+/.test(pdfString);

      // Check for suspicious content
      const suspiciousPatterns = [
        { pattern: /\/JavaScript\s/, description: 'Contains JavaScript' },
        { pattern: /\/Launch\s/, description: 'Contains Launch action' },
        { pattern: /\/URI\s/, description: 'Contains URI action' },
        { pattern: /\/EmbeddedFile\s/, description: 'Contains embedded files' },
        { pattern: /\/XFA\s/, description: 'Contains XFA forms' }
      ];

      for (const { pattern, description } of suspiciousPatterns) {
        if (pattern.test(pdfString)) {
          analysis.structureAnalysis.suspicious.push(description);
        }
      }

      return analysis;
    } catch (error) {
      return {
        structureAnalysis: {
          error: error.message
        }
      };
    }
  }

  /**
   * Get detailed QPDF information
   * @param {string} _filePath - Path to PDF file
   * @param {string} _password - Password for encrypted PDFs
   * @returns {Promise<Object>} QPDF information
   */
  async getQpdfInfo(_filePath, _password) {
    // Temporarily return mock data until QPDF integration is fixed
    return {
      encrypted: false,
      algorithm: 'none',
      keyLength: 0,
      permissions: {},
      version: 'unknown',
      note: 'QPDF analysis temporarily disabled'
    };
  }

  /**
   * Parse QPDF output
   * @param {string} output - QPDF output
   * @returns {Object} Parsed information
   */
  parseQpdfOutput(output) {
    const info = {
      encrypted: false,
      algorithm: null,
      keyLength: null,
      permissions: {},
      hasOwnerPassword: false,
      hasUserPassword: false
    };

    if (output.includes('File is not encrypted')) {
      return info;
    }

    info.encrypted = true;

    // Parse encryption algorithm
    const algorithmMatch = output.match(/R = (\d+)/);
    if (algorithmMatch) {
      const revision = parseInt(algorithmMatch[1]);
      if (revision <= 2) {
        info.algorithm = 'RC4';
        info.keyLength = 40;
      } else if (revision <= 3) {
        info.algorithm = 'RC4';
        info.keyLength = 128;
      } else if (revision === 4) {
        info.algorithm = output.includes('AES') ? 'AES' : 'RC4';
        info.keyLength = 128;
      } else if (revision >= 5) {
        info.algorithm = 'AES';
        info.keyLength = 256;
      }
    }

    // Parse permissions
    const permissionPatterns = {
      print: /print: (allowed|not allowed)/,
      modify: /modify: (allowed|not allowed)/,
      extract: /extract: (allowed|not allowed)/,
      annotate: /annotate: (allowed|not allowed)/,
      form: /form: (allowed|not allowed)/,
      accessibility: /accessibility: (allowed|not allowed)/,
      assemble: /assemble: (allowed|not allowed)/,
      printHiRes: /print hi-res: (allowed|not allowed)/
    };

    for (const [permission, pattern] of Object.entries(permissionPatterns)) {
      const match = output.match(pattern);
      if (match) {
        info.permissions[permission] = match[1] === 'allowed';
      }
    }

    return info;
  }

  /**
   * Parse encryption details
   * @param {Object} qpdfInfo - QPDF information
   * @returns {Object} Encryption details
   */
  parseEncryptionDetails(qpdfInfo) {
    const details = {
      algorithm: qpdfInfo.algorithm,
      keyLength: qpdfInfo.keyLength,
      strength: 'unknown',
      version: null,
      revision: null
    };

    // Determine encryption strength
    if (qpdfInfo.algorithm === 'RC4' && qpdfInfo.keyLength === 40) {
      details.strength = 'very-weak';
    } else if (qpdfInfo.algorithm === 'RC4' && qpdfInfo.keyLength === 128) {
      details.strength = 'weak';
    } else if (qpdfInfo.algorithm === 'AES' && qpdfInfo.keyLength === 128) {
      details.strength = 'medium';
    } else if (qpdfInfo.algorithm === 'AES' && qpdfInfo.keyLength === 256) {
      details.strength = 'strong';
    }

    return details;
  }

  /**
   * Parse permissions from QPDF info
   * @param {Object} qpdfInfo - QPDF information
   * @returns {Object} Permissions
   */
  parsePermissions(qpdfInfo) {
    return {
      printing: {
        allowed: qpdfInfo.permissions.print || false,
        highResolution: qpdfInfo.permissions.printHiRes || false
      },
      modification: {
        allowed: qpdfInfo.permissions.modify || false,
        annotations: qpdfInfo.permissions.annotate || false,
        forms: qpdfInfo.permissions.form || false,
        assembly: qpdfInfo.permissions.assemble || false
      },
      extraction: {
        allowed: qpdfInfo.permissions.extract || false,
        accessibility: qpdfInfo.permissions.accessibility || false
      }
    };
  }

  /**
   * Calculate security score (0-100)
   * @param {Object} analysis - Security analysis results
   * @returns {number} Security score
   */
  calculateSecurityScore(analysis) {
    let score = 0;

    // Encryption (50 points)
    if (analysis.encrypted) {
      if (analysis.encryptionDetails) {
        switch (analysis.encryptionDetails.strength) {
        case 'very-weak': score += 10; break;
        case 'weak': score += 20; break;
        case 'medium': score += 35; break;
        case 'strong': score += 50; break;
        }
      } else {
        score += 25; // Unknown encryption gets medium score
      }
    }

    // Password protection (20 points)
    if (analysis.passwordProtected) {
      score += 20;
    }

    // Permissions restrictions (20 points)
    if (analysis.permissions) {
      const restrictedPermissions = Object.values(analysis.permissions)
        .flat()
        .filter(permission => typeof permission === 'boolean' && !permission)
        .length;

      score += Math.min(20, restrictedPermissions * 2);
    }

    // No suspicious content (10 points)
    if (analysis.structureAnalysis && analysis.structureAnalysis.suspicious.length === 0) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Generate security recommendations
   * @param {Object} analysis - Security analysis results
   * @returns {Array} Security recommendations
   */
  generateSecurityRecommendations(analysis) {
    const recommendations = [];

    if (!analysis.encrypted) {
      recommendations.push({
        level: 'HIGH',
        message: 'PDF is not encrypted - consider adding encryption for sensitive content',
        action: 'Enable AES-256 encryption'
      });
    } else if (analysis.encryptionDetails) {
      switch (analysis.encryptionDetails.strength) {
      case 'very-weak':
      case 'weak':
        recommendations.push({
          level: 'HIGH',
          message: `Weak encryption algorithm (${analysis.encryptionDetails.algorithm}-${analysis.encryptionDetails.keyLength})`,
          action: 'Upgrade to AES-256 encryption'
        });
        break;
      case 'medium':
        recommendations.push({
          level: 'MEDIUM',
          message: 'Consider upgrading to AES-256 for maximum security',
          action: 'Upgrade to AES-256 encryption'
        });
        break;
      }
    }

    if (!analysis.passwordProtected) {
      recommendations.push({
        level: 'MEDIUM',
        message: 'PDF is not password protected',
        action: 'Add user and/or owner passwords'
      });
    }

    if (analysis.structureAnalysis && analysis.structureAnalysis.suspicious.length > 0) {
      recommendations.push({
        level: 'MEDIUM',
        message: `Potentially suspicious content: ${analysis.structureAnalysis.suspicious.join(', ')}`,
        action: 'Review and validate embedded content'
      });
    }

    if (analysis.permissions && Object.values(analysis.permissions).flat().every(p => p !== false)) {
      recommendations.push({
        level: 'LOW',
        message: 'All permissions are allowed - consider restricting unnecessary operations',
        action: 'Review and restrict permissions as needed'
      });
    }

    return recommendations;
  }

  /**
   * Identify security vulnerabilities
   * @param {Object} analysis - Security analysis results
   * @returns {Array} Identified vulnerabilities
   */
  identifyVulnerabilities(analysis) {
    const vulnerabilities = [];

    // Check for weak encryption
    if (analysis.encrypted && analysis.encryptionDetails) {
      if (analysis.encryptionDetails.strength === 'very-weak') {
        vulnerabilities.push({
          severity: 'HIGH',
          type: 'weak-encryption',
          description: 'RC4-40 encryption is easily breakable',
          cve: null,
          recommendation: 'Immediately upgrade to AES-256'
        });
      } else if (analysis.encryptionDetails.strength === 'weak') {
        vulnerabilities.push({
          severity: 'MEDIUM',
          type: 'weak-encryption',
          description: 'RC4-128 encryption has known vulnerabilities',
          cve: null,
          recommendation: 'Upgrade to AES encryption'
        });
      }
    }

    // Check for suspicious JavaScript
    if (analysis.structureAnalysis && analysis.structureAnalysis.suspicious.includes('Contains JavaScript')) {
      vulnerabilities.push({
        severity: 'MEDIUM',
        type: 'javascript-execution',
        description: 'PDF contains JavaScript which could be malicious',
        cve: null,
        recommendation: 'Review JavaScript code for malicious content'
      });
    }

    // Check for launch actions
    if (analysis.structureAnalysis && analysis.structureAnalysis.suspicious.includes('Contains Launch action')) {
      vulnerabilities.push({
        severity: 'HIGH',
        type: 'code-execution',
        description: 'PDF contains Launch actions that can execute external programs',
        cve: null,
        recommendation: 'Remove Launch actions or validate their safety'
      });
    }

    return vulnerabilities;
  }

  /**
   * Test password against encrypted PDF
   * @param {Buffer} pdfBuffer - PDF buffer
   * @param {string} password - Password to test
   * @returns {Object} Password test results
   */
  async testPassword(pdfBuffer, password) {
    try {
      // Test with pdf-lib
      const pdfDoc = await PDFDocument.load(pdfBuffer, {
        password,
        ignoreEncryption: false
      });

      return {
        valid: true,
        type: 'user', // pdf-lib doesn't distinguish between user/owner
        canRead: true,
        canModify: true // Would need more testing to determine exact permissions
      };
    } catch (error) {
      if (error.message.includes('password')) {
        return {
          valid: false,
          type: null,
          error: 'Invalid password'
        };
      }

      throw error;
    }
  }

  /**
   * Generate security report
   * @param {Object} analysis - Security analysis results
   * @returns {Object} Formatted security report
   */
  generateSecurityReport(analysis) {
    return {
      summary: {
        encrypted: analysis.encrypted,
        securityScore: analysis.securityScore,
        riskLevel: this.calculateRiskLevel(analysis.securityScore),
        totalVulnerabilities: analysis.vulnerabilities.length,
        criticalIssues: analysis.vulnerabilities.filter(v => v.severity === 'HIGH').length
      },
      encryption: analysis.encryptionDetails,
      permissions: analysis.permissions,
      vulnerabilities: analysis.vulnerabilities,
      recommendations: analysis.recommendations,
      technicalDetails: {
        analysisTimestamp: analysis.analysisMetadata.timestamp,
        methods: analysis.analysisMetadata.methods,
        version: analysis.analysisMetadata.version
      }
    };
  }

  /**
   * Calculate risk level based on security score
   * @param {number} score - Security score
   * @returns {string} Risk level
   */
  calculateRiskLevel(score) {
    if (score >= 80) return 'LOW';
    if (score >= 60) return 'MEDIUM';
    if (score >= 40) return 'HIGH';
    return 'CRITICAL';
  }
}

export default PdfSecurityService;
