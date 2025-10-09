'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { 
  ImportResult, 
  ImportError, 
  ImportOptions, 
  ImportMapping,
  validateData,
  convertDataTypes,
  checkDuplicates,
  TABLE_SCHEMAS
} from '@/lib/import-utils';
import { 
  createParticipant, 
  createMentor, 
  createWorkshop, 
  createAdvisorMeeting,
  getParticipants,
  getMentors,
  getWorkshops,
  getWorkshopAttendance,
  getAdvisorMeetings,
  upsertParticipantByEmail
} from './actions';

// Import participants data
export async function importParticipants(
  data: any[],
  options: ImportOptions,
  mapping: ImportMapping
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    message: ''
  };

  try {
    // Map CSV columns to database fields
    const mappedData = data.map(row => {
      const mapped: any = {};
      Object.entries(mapping).forEach(([csvColumn, dbField]) => {
        if (row[csvColumn] !== undefined && dbField !== 'skip') {
          mapped[dbField] = row[csvColumn];
        }
      });
      return mapped;
    });

    // Validate data
    if (options.validateData) {
      const validationErrors = validateData(mappedData, 'participants');
      if (validationErrors.length > 0) {
        result.errors = validationErrors;
        result.message = `Validation failed with ${validationErrors.length} errors`;
        return result;
      }
    }

    // Convert data types
    const convertedData = convertDataTypes(mappedData, 'participants');

    // Check for duplicates if not updating existing
    if (!options.updateExisting) {
      const existingParticipants = await getParticipants();
      const duplicates = checkDuplicates(convertedData, 'participants', existingParticipants);
      
      if (Object.keys(duplicates).length > 0 && options.skipDuplicates) {
        result.skipped = Object.values(duplicates).flat().length;
        result.message = `Skipped ${result.skipped} duplicate records`;
      }
    }

    // Process in batches
    const batchSize = options.batchSize || 50;
    const batches = [];
    
    for (let i = 0; i < convertedData.length; i += batchSize) {
      batches.push(convertedData.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (participantData) => {
        try {
          // Use upsertParticipantByEmail for proper validation and security
          const upsertResult = await upsertParticipantByEmail(participantData);
          
          if (upsertResult.success) {
            if (upsertResult.action === 'created') {
              result.imported++;
            } else if (upsertResult.action === 'updated') {
              result.updated++;
            }
          } else {
            result.errors.push({
              row: convertedData.indexOf(participantData) + 1,
              message: `Failed to import participant: ${upsertResult.error}`,
              value: participantData
            });
          }
        } catch (error) {
          result.errors.push({
            row: convertedData.indexOf(participantData) + 1,
            message: `Failed to import participant: ${error instanceof Error ? error.message : 'Unknown error'}`,
            value: participantData
          });
        }
      });

      await Promise.all(batchPromises);
    }

    result.success = true;
    result.message = `Successfully imported ${result.imported} participants, updated ${result.updated}, skipped ${result.skipped}`;
    
  } catch (error) {
    result.message = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push({
      row: 0,
      message: result.message
    });
  }

  return result;
}

// Import mentors data
export async function importMentors(
  data: any[],
  options: ImportOptions,
  mapping: ImportMapping
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    message: ''
  };

  try {
    // Map CSV columns to database fields
    const mappedData = data.map(row => {
      const mapped: any = {};
      Object.entries(mapping).forEach(([csvColumn, dbField]) => {
        if (row[csvColumn] !== undefined && dbField !== 'skip') {
          mapped[dbField] = row[csvColumn];
        }
      });
      return mapped;
    });

    // Validate data
    if (options.validateData) {
      const validationErrors = validateData(mappedData, 'mentors');
      if (validationErrors.length > 0) {
        result.errors = validationErrors;
        result.message = `Validation failed with ${validationErrors.length} errors`;
        return result;
      }
    }

    // Convert data types
    const convertedData = convertDataTypes(mappedData, 'mentors');

    // Process in batches
    const batchSize = options.batchSize || 50;
    const batches = [];
    
    for (let i = 0; i < convertedData.length; i += batchSize) {
      batches.push(convertedData.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (mentorData) => {
        try {
          // Check if mentor exists
          const existingQuery = query(
            collection(db, 'yep_mentors'),
            where('email', '==', mentorData.email)
          );
          const existingSnapshot = await getDocs(existingQuery);
          
          if (!existingSnapshot.empty && options.updateExisting) {
            // Update existing mentor
            const existingDoc = existingSnapshot.docs[0];
            await setDoc(doc(db, 'yep_mentors', existingDoc.id), {
              ...mentorData,
              updatedAt: new Date()
            });
            result.updated++;
          } else if (existingSnapshot.empty) {
            // Create new mentor
            await addDoc(collection(db, 'yep_mentors'), {
              ...mentorData,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            result.imported++;
          } else {
            result.skipped++;
          }
        } catch (error) {
          result.errors.push({
            row: convertedData.indexOf(mentorData) + 1,
            message: `Failed to import mentor: ${error instanceof Error ? error.message : 'Unknown error'}`,
            value: mentorData
          });
        }
      });

      await Promise.all(batchPromises);
    }

    result.success = true;
    result.message = `Successfully imported ${result.imported} mentors, updated ${result.updated}, skipped ${result.skipped}`;
    
  } catch (error) {
    result.message = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push({
      row: 0,
      message: result.message
    });
  }

  return result;
}

// Import workshops data
export async function importWorkshops(
  data: any[],
  options: ImportOptions,
  mapping: ImportMapping
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    message: ''
  };

  try {
    // Map CSV columns to database fields
    const mappedData = data.map(row => {
      const mapped: any = {};
      Object.entries(mapping).forEach(([csvColumn, dbField]) => {
        if (row[csvColumn] !== undefined && dbField !== 'skip') {
          mapped[dbField] = row[csvColumn];
        }
      });
      return mapped;
    });

    // Validate data
    if (options.validateData) {
      const validationErrors = validateData(mappedData, 'workshops');
      if (validationErrors.length > 0) {
        result.errors = validationErrors;
        result.message = `Validation failed with ${validationErrors.length} errors`;
        return result;
      }
    }

    // Convert data types
    const convertedData = convertDataTypes(mappedData, 'workshops');

    // Process in batches
    const batchSize = options.batchSize || 50;
    const batches = [];
    
    for (let i = 0; i < convertedData.length; i += batchSize) {
      batches.push(convertedData.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (workshopData) => {
        try {
          // Check if workshop exists
          const existingQuery = query(
            collection(db, 'yep_workshops'),
            where('title', '==', workshopData.title),
            where('date', '==', workshopData.date)
          );
          const existingSnapshot = await getDocs(existingQuery);
          
          if (!existingSnapshot.empty && options.updateExisting) {
            // Update existing workshop
            const existingDoc = existingSnapshot.docs[0];
            await setDoc(doc(db, 'yep_workshops', existingDoc.id), {
              ...workshopData,
              updatedAt: new Date()
            });
            result.updated++;
          } else if (existingSnapshot.empty) {
            // Create new workshop
            await addDoc(collection(db, 'yep_workshops'), {
              ...workshopData,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            result.imported++;
          } else {
            result.skipped++;
          }
        } catch (error) {
          result.errors.push({
            row: convertedData.indexOf(workshopData) + 1,
            message: `Failed to import workshop: ${error instanceof Error ? error.message : 'Unknown error'}`,
            value: workshopData
          });
        }
      });

      await Promise.all(batchPromises);
    }

    result.success = true;
    result.message = `Successfully imported ${result.imported} workshops, updated ${result.updated}, skipped ${result.skipped}`;
    
  } catch (error) {
    result.message = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push({
      row: 0,
      message: result.message
    });
  }

  return result;
}

// Import attendance data
export async function importAttendance(
  data: any[],
  options: ImportOptions,
  mapping: ImportMapping
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    message: ''
  };

  try {
    // Map CSV columns to database fields
    const mappedData = data.map(row => {
      const mapped: any = {};
      Object.entries(mapping).forEach(([csvColumn, dbField]) => {
        if (row[csvColumn] !== undefined && dbField !== 'skip') {
          mapped[dbField] = row[csvColumn];
        }
      });
      return mapped;
    });

    // Validate data
    if (options.validateData) {
      const validationErrors = validateData(mappedData, 'attendance');
      if (validationErrors.length > 0) {
        result.errors = validationErrors;
        result.message = `Validation failed with ${validationErrors.length} errors`;
        return result;
      }
    }

    // Convert data types
    const convertedData = convertDataTypes(mappedData, 'attendance');

    // Process in batches
    const batchSize = options.batchSize || 50;
    const batches = [];
    
    for (let i = 0; i < convertedData.length; i += batchSize) {
      batches.push(convertedData.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (attendanceData) => {
        try {
          // Check if attendance record exists
          const existingQuery = query(
            collection(db, 'yep_workshop_attendance'),
            where('participantId', '==', attendanceData.participantId),
            where('workshopId', '==', attendanceData.workshopId)
          );
          const existingSnapshot = await getDocs(existingQuery);
          
          if (!existingSnapshot.empty && options.updateExisting) {
            // Update existing attendance
            const existingDoc = existingSnapshot.docs[0];
            await setDoc(doc(db, 'yep_workshop_attendance', existingDoc.id), {
              ...attendanceData,
              updatedAt: new Date()
            });
            result.updated++;
          } else if (existingSnapshot.empty) {
            // Create new attendance record
            await addDoc(collection(db, 'yep_workshop_attendance'), {
              ...attendanceData,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            result.imported++;
          } else {
            result.skipped++;
          }
        } catch (error) {
          result.errors.push({
            row: convertedData.indexOf(attendanceData) + 1,
            message: `Failed to import attendance: ${error instanceof Error ? error.message : 'Unknown error'}`,
            value: attendanceData
          });
        }
      });

      await Promise.all(batchPromises);
    }

    result.success = true;
    result.message = `Successfully imported ${result.imported} attendance records, updated ${result.updated}, skipped ${result.skipped}`;
    
  } catch (error) {
    result.message = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push({
      row: 0,
      message: result.message
    });
  }

  return result;
}

// Import meetings data
export async function importMeetings(
  data: any[],
  options: ImportOptions,
  mapping: ImportMapping
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    message: ''
  };

  try {
    // Map CSV columns to database fields
    const mappedData = data.map(row => {
      const mapped: any = {};
      Object.entries(mapping).forEach(([csvColumn, dbField]) => {
        if (row[csvColumn] !== undefined && dbField !== 'skip') {
          mapped[dbField] = row[csvColumn];
        }
      });
      return mapped;
    });

    // Validate data
    if (options.validateData) {
      const validationErrors = validateData(mappedData, 'meetings');
      if (validationErrors.length > 0) {
        result.errors = validationErrors;
        result.message = `Validation failed with ${validationErrors.length} errors`;
        return result;
      }
    }

    // Convert data types
    const convertedData = convertDataTypes(mappedData, 'meetings');

    // Process in batches
    const batchSize = options.batchSize || 50;
    const batches = [];
    
    for (let i = 0; i < convertedData.length; i += batchSize) {
      batches.push(convertedData.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (meetingData) => {
        try {
          // Check if meeting exists
          const existingQuery = query(
            collection(db, 'yep_advisor_meetings'),
            where('participantId', '==', meetingData.participantId),
            where('mentorId', '==', meetingData.mentorId),
            where('meetingDate', '==', meetingData.meetingDate)
          );
          const existingSnapshot = await getDocs(existingQuery);
          
          if (!existingSnapshot.empty && options.updateExisting) {
            // Update existing meeting
            const existingDoc = existingSnapshot.docs[0];
            await setDoc(doc(db, 'yep_advisor_meetings', existingDoc.id), {
              ...meetingData,
              updatedAt: new Date()
            });
            result.updated++;
          } else if (existingSnapshot.empty) {
            // Create new meeting
            await addDoc(collection(db, 'yep_advisor_meetings'), {
              ...meetingData,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            result.imported++;
          } else {
            result.skipped++;
          }
        } catch (error) {
          result.errors.push({
            row: convertedData.indexOf(meetingData) + 1,
            message: `Failed to import meeting: ${error instanceof Error ? error.message : 'Unknown error'}`,
            value: meetingData
          });
        }
      });

      await Promise.all(batchPromises);
    }

    result.success = true;
    result.message = `Successfully imported ${result.imported} meetings, updated ${result.updated}, skipped ${result.skipped}`;
    
  } catch (error) {
    result.message = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push({
      row: 0,
      message: result.message
    });
  }

  return result;
}

// Main import function that routes to appropriate handler
export async function importData(
  data: any[],
  options: ImportOptions,
  mapping: ImportMapping
): Promise<ImportResult> {
  switch (options.targetTable) {
    case 'participants':
      return await importParticipants(data, options, mapping);
    case 'mentors':
      return await importMentors(data, options, mapping);
    case 'workshops':
      return await importWorkshops(data, options, mapping);
    case 'attendance':
      return await importAttendance(data, options, mapping);
    case 'meetings':
      return await importMeetings(data, options, mapping);
    default:
      return {
        success: false,
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [{
          row: 0,
          message: `Unsupported table: ${options.targetTable}`
        }],
        message: `Unsupported table: ${options.targetTable}`
      };
  }
}
