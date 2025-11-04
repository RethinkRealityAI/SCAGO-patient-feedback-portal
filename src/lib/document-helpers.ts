/**
 * Document Helper Utilities
 * Provides backward-compatible document reading for both old and new formats
 */

export interface UserDocument {
  type: string;
  url: string;
  fileName: string;
  fileType: string;
  uploadedAt: Date | any;
  uploadedBy?: 'user' | 'admin';
}

/**
 * Check if a participant has a specific document uploaded
 * Checks both new documents array and legacy boolean flags
 */
export function hasDocument(
  profile: any,
  documentType: string,
  role: 'participant' | 'mentor'
): boolean {
  // Check new format (documents array)
  const documents = profile?.documents || [];
  const hasInArray = documents.some((doc: UserDocument) => doc.type === documentType);

  if (hasInArray) return true;

  // Check legacy format (boolean flags)
  if (role === 'participant') {
    switch (documentType) {
      case 'health_card':
      case 'photo_id':
        return !!profile?.idProvided;
      case 'consent_form':
        return !!profile?.contractSigned;
      case 'syllabus':
        return !!profile?.signedSyllabus;
      case 'scd_proof':
        return !!profile?.proofOfAffiliationWithSCD;
      default:
        return false;
    }
  } else if (role === 'mentor') {
    switch (documentType) {
      case 'police_check':
        return !!profile?.vulnerableSectorCheck;
      case 'resume':
        return !!profile?.resumeProvided;
      case 'references':
        return !!profile?.referencesProvided;
      default:
        return false;
    }
  }

  return false;
}

/**
 * Get the document URL for a specific document type
 * Returns null if not found
 */
export function getDocumentUrl(profile: any, documentType: string): string | null {
  const documents = profile?.documents || [];
  const doc = documents.find((d: UserDocument) => d.type === documentType);
  return doc?.url || null;
}

/**
 * Get all uploaded documents for a profile
 * Returns documents from both new array format and legacy fields
 */
export function getAllDocuments(profile: any, role: 'participant' | 'mentor'): UserDocument[] {
  const documents: UserDocument[] = profile?.documents || [];

  // Add additional documents if they exist
  if (profile?.additionalDocuments) {
    const additional = profile.additionalDocuments.map((doc: any) => ({
      ...doc,
      type: 'additional',
      uploadedBy: 'user' as const,
    }));
    documents.push(...additional);
  }

  return documents;
}

/**
 * Count how many documents have been uploaded
 * Useful for completion percentage calculations
 */
export function getDocumentCount(
  profile: any,
  role: 'participant' | 'mentor',
  requiredTypes?: string[]
): { uploaded: number; total: number } {
  if (!requiredTypes) {
    // Default required document types
    requiredTypes = role === 'participant'
      ? ['health_card', 'photo_id', 'consent_form']
      : ['police_check', 'resume', 'references'];
  }

  const uploaded = requiredTypes.filter(type => hasDocument(profile, type, role)).length;

  return {
    uploaded,
    total: requiredTypes.length,
  };
}

/**
 * Check if participant/mentor has completed all required documents
 */
export function hasCompletedDocuments(
  profile: any,
  role: 'participant' | 'mentor',
  requiredTypes?: string[]
): boolean {
  const counts = getDocumentCount(profile, role, requiredTypes);
  return counts.uploaded === counts.total;
}

/**
 * Get document completion percentage
 */
export function getDocumentCompletionPercentage(
  profile: any,
  role: 'participant' | 'mentor',
  requiredTypes?: string[]
): number {
  const counts = getDocumentCount(profile, role, requiredTypes);
  if (counts.total === 0) return 0;
  return Math.round((counts.uploaded / counts.total) * 100);
}

/**
 * Backward compatibility: Check legacy boolean flags
 * This is useful when migrating from old to new system
 */
export function getLegacyDocumentStatus(profile: any, role: 'participant' | 'mentor'): {
  [key: string]: boolean;
} {
  if (role === 'participant') {
    return {
      contract: !!profile?.contractSigned,
      syllabus: !!profile?.signedSyllabus,
      id: !!profile?.idProvided,
      scdProof: !!profile?.proofOfAffiliationWithSCD,
      proposal: !!profile?.youthProposal,
    };
  } else {
    return {
      policeCheck: !!profile?.vulnerableSectorCheck,
      resume: !!profile?.resumeProvided,
      references: !!profile?.referencesProvided,
      contract: !!profile?.contractSigned,
    };
  }
}
