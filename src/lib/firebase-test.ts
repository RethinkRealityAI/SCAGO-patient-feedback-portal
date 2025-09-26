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
    
    // Test reading from feedback collection
    const feedbackRef = collection(db, 'feedback');
    const feedbackSnapshot = await getDocs(feedbackRef);
    console.log(`Found ${feedbackSnapshot.docs.length} feedback submissions`);
    
    console.log('Firebase connection test successful!');
    return { success: true, surveys: surveysSnapshot.docs.length, feedback: feedbackSnapshot.docs.length };
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
