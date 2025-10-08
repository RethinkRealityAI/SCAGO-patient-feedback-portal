import crypto from 'crypto';

/**
 * Generate a hash for data integrity verification
 */
export function generateDataHash(data: any): string {
  const jsonString = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(jsonString).digest('hex');
}

/**
 * Verify data integrity using hash
 */
export function verifyDataIntegrity(data: any, hash: string): boolean {
  const computedHash = generateDataHash(data);
  return computedHash === hash;
}

/**
 * Add integrity metadata to submission
 */
export function addIntegrityMetadata(submission: Record<string, any>): Record<string, any> {
  const { _integrity, ...dataToHash } = submission;
  
  return {
    ...submission,
    _integrity: {
      hash: generateDataHash(dataToHash),
      timestamp: new Date().toISOString(),
      version: '1.0',
    },
  };
}

/**
 * Verify submission integrity
 */
export function verifySubmissionIntegrity(submission: Record<string, any>): {
  valid: boolean;
  error?: string;
} {
  if (!submission._integrity) {
    return { valid: false, error: 'No integrity metadata found' };
  }

  const { _integrity, ...dataToVerify } = submission;
  const isValid = verifyDataIntegrity(dataToVerify, _integrity.hash);

  if (!isValid) {
    return { valid: false, error: 'Data integrity check failed - data may have been tampered with' };
  }

  return { valid: true };
}

/**
 * Detect duplicate submissions based on content similarity
 */
export function detectDuplicateSubmission(
  newSubmission: Record<string, any>,
  existingSubmissions: Record<string, any>[],
  similarityThreshold: number = 0.9
): { isDuplicate: boolean; matchedSubmission?: Record<string, any> } {
  const newHash = generateDataHash(newSubmission);

  for (const existing of existingSubmissions) {
    const existingHash = generateDataHash(existing);
    
    // Exact match
    if (newHash === existingHash) {
      return { isDuplicate: true, matchedSubmission: existing };
    }

    // Check for near-duplicate based on key fields
    const similarity = calculateSimilarity(newSubmission, existing);
    if (similarity >= similarityThreshold) {
      return { isDuplicate: true, matchedSubmission: existing };
    }
  }

  return { isDuplicate: false };
}

/**
 * Calculate similarity between two submissions
 */
function calculateSimilarity(obj1: Record<string, any>, obj2: Record<string, any>): number {
  const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
  let matches = 0;
  let total = 0;

  for (const key of keys) {
    // Skip metadata fields
    if (key.startsWith('_') || key === 'id' || key === 'submittedAt') {
      continue;
    }

    total++;

    const val1 = obj1[key];
    const val2 = obj2[key];

    if (val1 === val2) {
      matches++;
    } else if (typeof val1 === 'string' && typeof val2 === 'string') {
      // Check string similarity
      const stringSimilarity = calculateStringSimilarity(val1, val2);
      if (stringSimilarity > 0.8) {
        matches += stringSimilarity;
      }
    }
  }

  return total > 0 ? matches / total : 0;
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

