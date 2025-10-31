'use server';

import { getAdminFirestore } from '@/lib/firebase-admin';
import { getStorage } from 'firebase-admin/storage';

/**
 * Upload file to Firebase Storage
 */
export async function uploadProfileDocument(data: {
  recordId: string;
  collection: 'yep_participants' | 'yep_mentors';
  fileData: string; // base64 encoded file
  fileName: string;
  fileType: string;
  documentType?: string; // Optional document type identifier
}): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
  try {
    const firestore = getAdminFirestore();
    const storage = getStorage();
    // Specify bucket explicitly - use project ID + firebasestorage.app
    const bucketName = `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`;
    const bucket = storage.bucket(bucketName);

    // Decode base64 file data
    const base64Data = data.fileData.split(',')[1] || data.fileData;
    const buffer = Buffer.from(base64Data, 'base64');

    // Create storage path
    const role = data.collection === 'yep_participants' ? 'participants' : 'mentors';
    const timestamp = Date.now();
    const sanitizedFileName = data.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `yep-files/${role}/${data.recordId}/${timestamp}-${sanitizedFileName}`;

    // Upload file
    const file = bucket.file(storagePath);
    await file.save(buffer, {
      metadata: {
        contentType: data.fileType,
        metadata: {
          recordId: data.recordId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Make file publicly accessible
    await file.makePublic();

    // Get public URL
    const fileUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    // Update Firestore record with file URL and metadata
    // If documentType is provided, use specific field names for different document types
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.documentType) {
      // Map to specific fields based on document type
      updateData[`${data.documentType}Url`] = fileUrl;
      updateData[`${data.documentType}FileName`] = data.fileName;
      updateData[`${data.documentType}FileType`] = data.fileType;
      
      // Set boolean flags for admin dashboard compatibility
      if (data.collection === 'yep_participants') {
        // Map participant document types to admin flags
        if (data.documentType === 'health_card' || data.documentType === 'photo_id') {
          updateData.idProvided = true; // Both health card and photo ID count as ID provided
        } else if (data.documentType === 'consent_form') {
          updateData.contractSigned = true; // Consent form counts as contract signed
        }
      } else if (data.collection === 'yep_mentors') {
        // Map mentor document types to admin flags
        if (data.documentType === 'police_check') {
          updateData.vulnerableSectorCheck = true; // Police check provided
        } else if (data.documentType === 'resume') {
          updateData.resumeProvided = true; // Resume provided
        } else if (data.documentType === 'references') {
          updateData.referencesProvided = true; // References provided
        }
      }
    } else {
      // Legacy: single file upload
      updateData.fileUrl = fileUrl;
      updateData.fileName = data.fileName;
      updateData.fileType = data.fileType;
    }

    await firestore.collection(data.collection).doc(data.recordId).update(updateData);

    return { success: true, fileUrl };
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file',
    };
  }
}

/**
 * Delete file from Firebase Storage
 */
export async function deleteProfileDocument(data: {
  recordId: string;
  collection: 'yep_participants' | 'yep_mentors';
  fileUrl: string;
  documentType?: string; // Optional document type identifier
}): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = getAdminFirestore();
    const storage = getStorage();
    // Specify bucket explicitly
    const bucketName = `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`;
    const bucket = storage.bucket(bucketName);

    // Extract file path from URL
    const urlParts = data.fileUrl.split(`${bucket.name}/`);
    if (urlParts.length > 1) {
      const filePath = urlParts[1];
      const file = bucket.file(filePath);

      // Delete file from storage
      try {
        await file.delete();
      } catch (error) {
        // File might not exist, continue anyway
        console.warn('File not found in storage:', error);
      }
    }

    // Remove file metadata from Firestore
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.documentType) {
      // Clear specific document type fields
      updateData[`${data.documentType}Url`] = null;
      updateData[`${data.documentType}FileName`] = null;
      updateData[`${data.documentType}FileType`] = null;
      
      // Clear boolean flags for admin dashboard compatibility
      // Note: Only clear if no other related documents exist
      if (data.collection === 'yep_participants') {
        if (data.documentType === 'health_card' || data.documentType === 'photo_id') {
          // Check if other ID document exists before clearing flag
          const doc = await firestore.collection(data.collection).doc(data.recordId).get();
          const docData = doc.data();
          const hasOtherIdDoc = (data.documentType === 'health_card' && docData?.photo_idUrl) ||
                                (data.documentType === 'photo_id' && docData?.health_cardUrl);
          if (!hasOtherIdDoc) {
            updateData.idProvided = false;
          }
        } else if (data.documentType === 'consent_form') {
          updateData.contractSigned = false;
        }
      } else if (data.collection === 'yep_mentors') {
        if (data.documentType === 'police_check') {
          updateData.vulnerableSectorCheck = false;
        } else if (data.documentType === 'resume') {
          updateData.resumeProvided = false;
        } else if (data.documentType === 'references') {
          updateData.referencesProvided = false;
        }
      }
    } else {
      // Legacy: single file fields
      updateData.fileUrl = null;
      updateData.fileName = null;
      updateData.fileType = null;
    }

    await firestore.collection(data.collection).doc(data.recordId).update(updateData);

    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete file',
    };
  }
}

