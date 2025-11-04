'use server';

import { getAdminFirestore } from '@/lib/firebase-admin';
import { enforceAdminInAction } from '@/lib/server-auth';

export interface DocumentRequirement {
  id: string;
  name: string;
  description: string;
  required: boolean;
  order: number;
}

export interface ProfilePageConfig {
  participantDocuments: DocumentRequirement[];
  mentorDocuments: DocumentRequirement[];
  pageTitle: string;
  documentsCardTitle: string;
  documentsCardDescription: string;
  additionalDocumentsTitle: string;
  additionalDocumentsDescription: string;
  updatedAt: Date;
  updatedBy: string;
}

const DEFAULT_CONFIG: Omit<ProfilePageConfig, 'updatedAt' | 'updatedBy'> = {
  participantDocuments: [
    {
      id: 'health_card',
      name: 'Health Card Copy',
      description: 'A copy of your OHIP health card',
      required: true,
      order: 1,
    },
    {
      id: 'photo_id',
      name: 'Photo ID',
      description: 'Government-issued photo identification',
      required: true,
      order: 2,
    },
    {
      id: 'consent_form',
      name: 'Program Consent Form',
      description: 'Signed consent form for program participation',
      required: true,
      order: 3,
    },
  ],
  mentorDocuments: [
    {
      id: 'police_check',
      name: 'Police Vulnerable Sector Check',
      description: 'Current police background check',
      required: true,
      order: 1,
    },
    {
      id: 'resume',
      name: 'Resume/CV',
      description: 'Current resume or curriculum vitae',
      required: false,
      order: 2,
    },
    {
      id: 'references',
      name: 'References',
      description: 'Contact information for references',
      required: false,
      order: 3,
    },
  ],
  pageTitle: 'Documents',
  documentsCardTitle: 'Required Documents',
  documentsCardDescription: 'Upload and manage your program documents',
  additionalDocumentsTitle: 'Additional Documents',
  additionalDocumentsDescription: "Upload any additional documents you'd like to share (optional)",
};

/**
 * Get profile page configuration
 */
export async function getProfilePageConfig(): Promise<{
  success: boolean;
  config?: ProfilePageConfig;
  error?: string;
}> {
  try {
    const firestore = getAdminFirestore();
    const configDoc = await firestore.collection('config').doc('profile_page').get();

    if (!configDoc.exists) {
      // Return default configuration
      return {
        success: true,
        config: {
          ...DEFAULT_CONFIG,
          updatedAt: new Date(),
          updatedBy: 'system',
        },
      };
    }

    const data = configDoc.data() as any;
    return {
      success: true,
      config: {
        ...data,
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
      },
    };
  } catch (error) {
    console.error('Error getting profile page config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get configuration',
    };
  }
}

/**
 * Update profile page configuration
 */
export async function updateProfilePageConfig(
  config: Omit<ProfilePageConfig, 'updatedAt' | 'updatedBy'>
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await enforceAdminInAction();
    const firestore = getAdminFirestore();

    // Get admin email for audit trail
    const adminEmail = 'admin'; // You can enhance this to get actual admin email from auth context

    const configData = {
      ...config,
      updatedAt: new Date(),
      updatedBy: adminEmail,
    };

    await firestore.collection('config').doc('profile_page').set(configData, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('Error updating profile page config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update configuration',
    };
  }
}

/**
 * Reset profile page configuration to defaults
 */
export async function resetProfilePageConfig(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await enforceAdminInAction();
    const firestore = getAdminFirestore();

    const configData = {
      ...DEFAULT_CONFIG,
      updatedAt: new Date(),
      updatedBy: 'admin',
    };

    await firestore.collection('config').doc('profile_page').set(configData);

    return { success: true };
  } catch (error) {
    console.error('Error resetting profile page config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset configuration',
    };
  }
}
