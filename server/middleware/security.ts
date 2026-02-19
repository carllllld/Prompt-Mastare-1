import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { z } from 'zod';

// Input validation schemas
const emailSchema = z.string().email('Invalid email format');
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'Password must contain uppercase, lowercase, number and special character');

const propertyDataSchema = z.object({
  propertyType: z.enum(['apartment', 'villa', 'radhouse', 'townhouse']),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  livingArea: z.number().min(10, 'Living area must be at least 10m²').max(1000, 'Living area must be less than 1000m²'),
  rooms: z.number().min(1, 'Must have at least 1 room').max(20, 'Must have less than 20 rooms'),
  price: z.number().min(0, 'Price must be positive'),
  yearBuilt: z.number().min(1800, 'Year built must be after 1800').max(new Date().getFullYear() + 1, 'Invalid year built'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional()
});

// Rate limiting configurations
const createRateLimit = (windowMs: number, max: number, message: string) => rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts, please try again later'
);

export const apiRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  100, // 100 requests
  'Too many API requests, please try again later'
);

export const uploadRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  10, // 10 uploads
  'Too many upload attempts, please try again later'
);

export const aiRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  20, // 20 AI requests
  'Too many AI requests, please try again later'
);

// Security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// CORS configuration
export const corsOptions = cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://optiprompt.se', 'https://www.optiprompt.se']
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});

// Input sanitization
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeString = (str: string): string => {
    return str
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Input validation middleware
export const validateInput = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Specific validation middleware
export const validateEmail = validateInput(z.object({ email: emailSchema }));
export const validatePassword = validateInput(z.object({ password: passwordSchema }));
export const validatePropertyData = validateInput(propertyDataSchema);

// SQL Injection protection
export const preventSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(--|;|\/\*|\*\/|xp_|sp_)/gi,
    /(\bOR\b.*=.*\bOR\b)/gi,
    /(\bAND\b.*=.*\bAND\b)/gi
  ];

  const checkForSQLInjection = (value: string): boolean => {
    return sqlPatterns.some(pattern => pattern.test(value));
  };

  const checkObject = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return checkForSQLInjection(obj);
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => checkObject(value));
    }
    return false;
  };

  // Check request body, query, and params
  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    return res.status(400).json({ error: 'Invalid input detected' });
  }

  next();
};

// XSS protection
export const preventXSS = (req: Request, res: Response, next: NextFunction) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]*src[^>]*javascript:/gi,
    /<\s*script/gi,
    /<\s*object/gi,
    /<\s*embed/gi,
    /<\s*link/gi
  ];

  const checkForXSS = (value: string): boolean => {
    return xssPatterns.some(pattern => pattern.test(value));
  };

  const checkObject = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return checkForXSS(obj);
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => checkObject(value));
    }
    return false;
  };

  // Check request body, query, and params
  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    return res.status(400).json({ error: 'Invalid input detected' });
  }

  next();
};

// CSRF protection
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET requests and API endpoints
  if (req.method === 'GET' || req.path.startsWith('/api/')) {
    return next();
  }

  const token = req.get('X-CSRF-Token');
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
};

// Request logging for security
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    
    // Log suspicious activities
    const suspiciousPatterns = [
      req.path.includes('..'),
      req.path.includes('%2e%2e'),
      req.get('user-agent')?.includes('sqlmap'),
      req.get('user-agent')?.includes('nmap'),
      req.get('user-agent')?.includes('nikto')
    ];

    if (suspiciousPatterns.some(pattern => pattern)) {
      console.warn('[SECURITY] Suspicious request detected:', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('user-agent'),
        timestamp: new Date().toISOString()
      });
    }

    // Log rate limit hits
    if (res.statusCode === 429) {
      console.warn('[SECURITY] Rate limit exceeded:', {
        ip: req.ip,
        path: req.path,
        timestamp: new Date().toISOString()
      });
    }

    // Log slow requests (potential DoS)
    if (duration > 5000) {
      console.warn('[SECURITY] Slow request detected:', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        duration,
        timestamp: new Date().toISOString()
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

// IP reputation check
export const checkIPReputation = async (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // In production, implement actual IP reputation check
  // For now, just block obviously suspicious IPs
  const suspiciousIPs = [
    '0.0.0.0', // Null route
    '127.0.0.1', // Only allow in development
  ];

  if (process.env.NODE_ENV === 'production' && suspiciousIPs.includes(clientIP as string)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
};

// Content type validation
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
      return res.status(415).json({ error: 'Unsupported Media Type' });
    }

    next();
  };
};

// File upload security
export const secureFileUpload = (req: Request, res: Response, next: NextFunction) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain'
  ];

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt'];
  const maxFileSize = 5 * 1024 * 1024; // 5MB

  if (req.file) {
    const file = req.file;
    
    // Check file size
    if (file.size > maxFileSize) {
      return res.status(413).json({ error: 'File too large' });
    }

    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(415).json({ error: 'File type not allowed' });
    }

    // Check file extension
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(415).json({ error: 'File extension not allowed' });
    }

    // Sanitize filename
    file.originalname = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_');
  }

  next();
};

// Session security
export const secureSession = (req: Request, res: Response, next: NextFunction) => {
  // Check if session exists and is valid
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check session age
  const sessionAge = Date.now() - (req.session.cookie?.expires?.getTime() || 0);
  const maxSessionAge = 30 * 24 * 60 * 60 * 1000; // 30 days

  if (sessionAge > maxSessionAge) {
    req.session.destroy(() => {
      return res.status(401).json({ error: 'Session expired' });
    });
    return;
  }

  // Regenerate session ID periodically
  if (Math.random() < 0.1) { // 10% chance
    req.session.regenerate(() => {
      next();
    });
  } else {
    next();
  }
};

// Combine all security middleware
export const securityMiddleware = [
  securityHeaders,
  corsOptions,
  securityLogger,
  checkIPReputation,
  sanitizeInput,
  preventSQLInjection,
  preventXSS,
  apiRateLimit
];

// Auth-specific security middleware
export const authSecurityMiddleware = [
  authRateLimit,
  validateContentType(['application/json']),
  validateEmail,
  validatePassword
];

// File upload security middleware
export const uploadSecurityMiddleware = [
  uploadRateLimit,
  secureFileUpload,
  validateContentType(['multipart/form-data'])
];
