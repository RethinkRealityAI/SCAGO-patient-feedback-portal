import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit as firestoreLimit } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyId = searchParams.get('surveyId');

    if (!surveyId) {
      return NextResponse.json({ error: 'surveyId is required' }, { status: 400 });
    }

    const logsRef = collection(db, 'surveys', surveyId, 'emailLogs');
    const q = query(logsRef, orderBy('sentAt', 'desc'), firestoreLimit(50));
    const snapshot = await getDocs(q);

    const logs = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        submissionId: data.submissionId || null,
        recipients: data.recipients || [],
        subject: data.subject || '',
        success: data.success ?? false,
        error: data.error || null,
        skipped: data.skipped || false,
        sentAt: data.sentAt?.toDate?.()?.toISOString() || data.sentAt || null,
      };
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching email logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email logs' },
      { status: 500 }
    );
  }
}
