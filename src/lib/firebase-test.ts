// Firebase connection test utility
import { db } from './firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

export async function testFirebaseConnection() {
  try {
    const surveysRef = collection(db, 'surveys');
    const surveysSnapshot = await getDocs(surveysRef);
    
    const { fetchAllSubmissions } = await import('./submission-utils');
    const allSubmissions = await fetchAllSubmissions();
    
    return { success: true, surveys: surveysSnapshot.docs.length, feedback: allSubmissions.length };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
