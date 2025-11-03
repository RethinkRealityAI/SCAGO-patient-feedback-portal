// Firebase connection test utility
import { db } from './firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

export async function testFirebaseConnection() {
  try {
    console.log('Testing Firebase connection...');
    
    // Test reading from surveys collection
    const surveysRef = collection(db, 'surveys');
    const surveysSnapshot = await getDocs(surveysRef);
    console.log(`Found ${surveysSnapshot.docs.length} surveys`);
    
    // Test reading from both new organized structure and legacy feedback collection
    const { fetchAllSubmissions } = await import('./submission-utils');
    const allSubmissions = await fetchAllSubmissions();
    console.log(`Found ${allSubmissions.length} total feedback submissions (from both new structure and legacy collection)`);
    
    console.log('Firebase connection test successful!');
    return { success: true, surveys: surveysSnapshot.docs.length, feedback: allSubmissions.length };
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
