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
    // Simplified: All documents go into arrays, no complex field mapping
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Get current document data
    const doc = await firestore.collection(data.collection).doc(data.recordId).get();
    const docData = doc.data();

    if (data.documentType && data.documentType !== 'additional') {
      // Handle specific document types (health_card, photo_id, etc.) as categorized uploads
      const existingDocuments = docData?.documents || [];

      const newDocument = {
        type: data.documentType,
        url: fileUrl,
        fileName: data.fileName,
        fileType: data.fileType,
        uploadedAt: new Date(),
        uploadedBy: 'user', // Mark as user-uploaded (not admin)
      };

      // Remove any existing document of the same type (replace)
      const filteredDocuments = existingDocuments.filter((d: any) => d.type !== data.documentType);
      updateData.documents = [...filteredDocuments, newDocument];
    } else if (data.documentType === 'additional') {
      // Handle additional documents - add to array
      const existingDocuments = docData?.additionalDocuments || [];

      const newDocument = {
        url: fileUrl,
        fileName: data.fileName,
        fileType: data.fileType,
        uploadedAt: new Date(),
      };

      updateData.additionalDocuments = [...existingDocuments, newDocument];
    } else {
      // Legacy: single file upload (for backward compatibility)
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

    // Get current document data
    const doc = await firestore.collection(data.collection).doc(data.recordId).get();
    const docData = doc.data();

    if (data.documentType === 'additional') {
      // Remove document from additionalDocuments array
      const existingDocuments = docData?.additionalDocuments || [];

      updateData.additionalDocuments = existingDocuments.filter(
        (doc: { url: string }) => doc.url !== data.fileUrl
      );
    } else if (data.documentType) {
      // Remove specific document type from documents array
      const existingDocuments = docData?.documents || [];

      updateData.documents = existingDocuments.filter(
        (doc: { type: string; url: string }) =>
          !(doc.type === data.documentType && doc.url === data.fileUrl)
      );
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

