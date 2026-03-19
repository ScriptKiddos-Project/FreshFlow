// backend/src/utils/encryption.ts
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'fallback-32-char-encryption-key!!';

// Password hashing utilities
const passwordUtils = {
  // Hash password with bcrypt
  hash: async (password: string): Promise<string> => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  },

  // Compare password with hash
  compare: async (password: string, hash: string): Promise<boolean> => {
    return await bcrypt.compare(password, hash);
  },

  // Generate secure random password
  generateSecure: (length: number = 12): string => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&';
    let password = '';
    
    // Ensure at least one character from each required type
    const requirements = [
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ', // uppercase
      'abcdefghijklmnopqrstuvwxyz', // lowercase
      '0123456789', // numbers
      '@$!%*?&' // special characters
    ];
    
    // Add one character from each requirement
    requirements.forEach(req => {
      password += req.charAt(Math.floor(Math.random() * req.length));
    });
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  },

  // Check password strength
  checkStrength: (password: string): {
    score: number;
    feedback: string[];
    isValid: boolean;
  } => {
    const feedback: string[] = [];
    let score = 0;
    
    if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 8 characters long');
    
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Password should contain lowercase letters');
    
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Password should contain uppercase letters');
    
    if (/\d/.test(password)) score += 1;
    else feedback.push('Password should contain numbers');
    
    if (/[@$!%*?&]/.test(password)) score += 1;
    else feedback.push('Password should contain special characters (@$!%*?&)');
    
    if (password.length >= 12) score += 1;
    if (!/(.)\1{2,}/.test(password)) score += 1; // No repeated characters
    
    return {
      score,
      feedback,
      isValid: score >= 5
    };
  }
};

// JWT token utilities
const tokenUtils = {
  // Generate access token
  generateAccessToken: (payload: {
    userId: string | Types.ObjectId;
    email: string;
    role?: string;
  }): string => {
    return jwt.sign(
      {
        userId: payload.userId.toString(),
        email: payload.email,
        role: payload.role || 'vendor',
        type: 'access'
      },
      JWT_SECRET,
      { 
        expiresIn: '15m',
        issuer: 'freshflow-api',
        audience: 'freshflow-app'
      }
    );
  },

  // Generate refresh token
  generateRefreshToken: (payload: {
    userId: string | Types.ObjectId;
    email: string;
  }): string => {
    return jwt.sign(
      {
        userId: payload.userId.toString(),
        email: payload.email,
        type: 'refresh'
      },
      JWT_REFRESH_SECRET,
      { 
        expiresIn: '7d',
        issuer: 'freshflow-api',
        audience: 'freshflow-app'
      }
    );
  },

  // Verify access token
  verifyAccessToken: (token: string): any => {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: 'freshflow-api',
        audience: 'freshflow-app'
      });
    } catch (error) {
      throw new Error('Invalid access token');
    }
  },

  // Verify refresh token
  verifyRefreshToken: (token: string): any => {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET, {
        issuer: 'freshflow-api',
        audience: 'freshflow-app'
      });
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  },

  // Generate password reset token
  generateResetToken: (): {
    token: string;
    hash: string;
    expires: Date;
  } => {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    return { token, hash, expires };
  },

  // Generate email verification token
  generateVerificationToken: (): {
    token: string;
    hash: string;
    expires: Date;
  } => {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    return { token, hash, expires };
  },

  // Extract token from header
  extractTokenFromHeader: (authHeader: string): string | null => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  },

  // Get token expiry date
  getTokenExpiry: (token: string): Date | null => {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch {
      return null;
    }
  }
};

// Data encryption utilities
const encryptionUtils = {
  // Encrypt sensitive data
  encrypt: (text: string): {
    encrypted: string;
    iv: string;
  } => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
    cipher.setAutoPadding(true);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex')
    };
  },

  // Decrypt sensitive data
  decrypt: (encryptedData: {
    encrypted: string;
    iv: string;
  }): string => {
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    decipher.setAutoPadding(true);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  },

  // Hash sensitive data (one-way)
  hashData: (data: string, salt?: string): string => {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    return crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512').toString('hex');
  },

  // Generate secure random string
  generateSecureRandom: (length: number = 32): string => {
    return crypto.randomBytes(length).toString('hex');
  },

  // Generate API key
  generateApiKey: (): string => {
    const timestamp = Date.now().toString(36);
    const randomPart = crypto.randomBytes(16).toString('hex');
    return `ff_${timestamp}_${randomPart}`;
  },

  // Validate API key format
  validateApiKeyFormat: (apiKey: string): boolean => {
    const pattern = /^ff_[a-z0-9]+_[a-f0-9]{32}$/;
    return pattern.test(apiKey);
  }
};

// Session security utilities
const sessionUtils = {
  // Generate session ID
  generateSessionId: (): string => {
    return crypto.randomBytes(32).toString('hex');
  },

  // Generate CSRF token
  generateCSRFToken: (): string => {
    return crypto.randomBytes(24).toString('base64url');
  },

  // Validate CSRF token
  validateCSRFToken: (token: string, sessionToken: string): boolean => {
    // Simple validation - in production, use more sophisticated method
    return token === sessionToken && token.length === 32;
  },

  // Create secure cookie options
  getSecureCookieOptions: (isProd: boolean = false) => ({
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict' as const,
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/'
  }),

  // Create refresh cookie options
  getRefreshCookieOptions: (isProd: boolean = false) => ({
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/auth/refresh'
  })
};

// Security validation utilities
const securityUtils = {
  // Validate IP address
  isValidIP: (ip: string): boolean => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  },

  // Check for suspicious patterns
  detectSuspiciousActivity: (request: {
    ip: string;
    userAgent: string;
    path: string;
    method: string;
  }): {
    suspicious: boolean;
    reasons: string[];
  } => {
    const reasons: string[] = [];
    let suspicious = false;

    // Check for common attack patterns
    const suspiciousPatterns = [
      /\.\./g, // Directory traversal
      /<script/gi, // XSS attempts
      /union.*select/gi, // SQL injection
      /javascript:/gi, // JavaScript injection
      /eval\(/gi, // Code execution
      /base64_decode/gi, // Base64 encoded payloads
    ];

    suspiciousPatterns.forEach(pattern => {
      if (pattern.test(request.path)) {
        suspicious = true;
        reasons.push(`Suspicious pattern in path: ${pattern.source}`);
      }
    });

    // Check user agent
    if (!request.userAgent || request.userAgent.length < 10) {
      suspicious = true;
      reasons.push('Missing or suspicious user agent');
    }

    // Check for automated requests
    const botPatterns = [
      /bot/gi,
      /crawler/gi,
      /spider/gi,
      /scraper/gi,
    ];

    botPatterns.forEach(pattern => {
      if (pattern.test(request.userAgent)) {
        reasons.push('Automated request detected');
      }
    });

    return { suspicious, reasons };
  },

  // Rate limiting key generator
  generateRateLimitKey: (
    identifier: string,
    endpoint: string,
    timeWindow: string = '1h'
  ): string => {
    const hash = crypto.createHash('sha256');
    hash.update(`${identifier}:${endpoint}:${timeWindow}`);
    return hash.digest('hex').substring(0, 16);
  },

  // Sanitize input data
  sanitizeInput: (input: any): any => {
    if (typeof input === 'string') {
      return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();
    }
    
    if (Array.isArray(input)) {
      return input.map(item => securityUtils.sanitizeInput(item));
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = securityUtils.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  },

  // Generate secure headers
  getSecurityHeaders: () => ({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  })
};

// Audit logging utilities
const auditUtils = {
  // Generate audit log entry
  createAuditLog: (
    userId: string | Types.ObjectId,
    action: string,
    resource: string,
    details?: any,
    ip?: string
  ) => ({
    userId: userId.toString(),
    action,
    resource,
    details: details || {},
    ip,
    timestamp: new Date(),
    hash: crypto.createHash('sha256')
      .update(`${userId}:${action}:${resource}:${Date.now()}`)
      .digest('hex')
  }),

  // Hash sensitive audit data
  hashSensitiveData: (data: any): string => {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  },

  // Validate audit log integrity
  validateAuditLog: (log: any): boolean => {
    const expectedHash = crypto.createHash('sha256')
      .update(`${log.userId}:${log.action}:${log.resource}:${new Date(log.timestamp).getTime()}`)
      .digest('hex');
    return log.hash === expectedHash;
  }
};

// Multi-factor authentication utilities
const mfaUtils = {
  // Generate TOTP secret (returns hex instead of base32)
  generateTOTPSecret: (): string => {
    return crypto.randomBytes(20).toString('hex');
  },

  // Generate backup codes
  generateBackupCodes: (count: number = 10): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code.match(/.{2}/g)?.join('-') || code);
    }
    return codes;
  },

  // Generate SMS OTP
  generateSMSOTP: (length: number = 6): string => {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits.charAt(crypto.randomInt(0, digits.length));
    }
    return otp;
  },

  // Hash OTP for storage
  hashOTP: (otp: string, salt?: string): { hash: string; salt: string } => {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(otp, actualSalt, 10000, 32, 'sha256').toString('hex');
    return { hash, salt: actualSalt };
  },

  // Verify OTP
  verifyOTP: (otp: string, hash: string, salt: string): boolean => {
    const otpHash = crypto.pbkdf2Sync(otp, salt, 10000, 32, 'sha256').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(otpHash, 'hex'));
  }
};

// Single export statement to avoid redeclaration
export {
  passwordUtils,
  tokenUtils,
  encryptionUtils,
  sessionUtils,
  securityUtils,
  auditUtils,
  mfaUtils
};

// Default export with all utilities
export default {
  password: passwordUtils,
  token: tokenUtils,
  encryption: encryptionUtils,
  session: sessionUtils,
  security: securityUtils,
  audit: auditUtils,
  mfa: mfaUtils
};