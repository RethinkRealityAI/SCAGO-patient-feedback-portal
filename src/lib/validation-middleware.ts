import { z } from 'zod';

/**
 * Sanitize user input to prevent XSS and injection attacks
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Validate file uploads
 */
export function validateFileUpload(file: File, config?: {
  maxSize?: number;
  allowedTypes?: string[];
}): { valid: boolean; error?: string } {
  const maxSize = config?.maxSize || 5 * 1024 * 1024; // 5MB default
  const allowedTypes = config?.allowedTypes || ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${maxSize / 1024 / 1024}MB limit`,
    };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }
  
  return { valid: true };
}

/**
 * Common validation schemas
 */
export const ValidationSchemas = {
  email: z.string().email('Invalid email address').max(255),
  phone: z.string().regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number').max(20),
  url: z.string().url('Invalid URL').max(2048),
  surveyId: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid survey ID').max(50),
  positiveInteger: z.number().int().positive(),
  rating: z.number().int().min(0).max(10),
};

/**
 * Detect and prevent potential spam submissions
 */
export function detectSpam(formData: Record<string, any>): {
  isSpam: boolean;
  reason?: string;
} {
  // Check for excessive URLs
  const textValues = Object.values(formData)
    .filter(v => typeof v === 'string')
    .join(' ');
  
  const urlCount = (textValues.match(/https?:\/\//gi) || []).length;
  if (urlCount > 5) {
    return { isSpam: true, reason: 'Too many URLs detected' };
  }
  
  // Check for suspicious patterns
  const spamKeywords = ['viagra', 'casino', 'lottery', 'prize', 'click here', 'buy now'];
  const lowerText = textValues.toLowerCase();
  const spamCount = spamKeywords.filter(keyword => lowerText.includes(keyword)).length;
  
  if (spamCount >= 2) {
    return { isSpam: true, reason: 'Spam keywords detected' };
  }
  
  // Check for excessive length (potential attack)
  if (textValues.length > 50000) {
    return { isSpam: true, reason: 'Submission too large' };
  }
  
  // Check for identical repeated values
  const values = Object.values(formData).filter(v => typeof v === 'string');
  if (values.length > 3) {
    const uniqueValues = new Set(values);
    if (uniqueValues.size === 1) {
      return { isSpam: true, reason: 'Identical repeated values' };
    }
  }
  
  return { isSpam: false };
}

/**
 * Validate submission metadata
 */
export function validateSubmissionMetadata(data: any): {
  valid: boolean;
  error?: string;
} {
  // Check for required timestamp
  if (!data.submittedAt) {
    return { valid: false, error: 'Missing submission timestamp' };
  }
  
  // Verify timestamp is not in the future
  const submittedAt = new Date(data.submittedAt);
  if (submittedAt > new Date()) {
    return { valid: false, error: 'Invalid submission timestamp' };
  }
  
  // Verify timestamp is not too old (> 24 hours for draft submissions)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (submittedAt < oneDayAgo && !data.isDraft) {
    return { valid: false, error: 'Submission timestamp too old' };
  }
  
  return { valid: true };
}

