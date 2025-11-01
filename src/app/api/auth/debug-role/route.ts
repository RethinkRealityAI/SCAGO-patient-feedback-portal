import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    const result: any = {
      hasSession: !!session,
      sessionRole: session?.role || null,
      sessionEmail: session?.email || null,
    };
    
    // If email provided, check Firestore directly
    if (email) {
      const firestore = getAdminFirestore();
      const adminDoc = await firestore.collection('config').doc('admins').get();
      const adminEmails: string[] = adminDoc.exists 
        ? (((adminDoc.data() as any)?.emails || []).map((e: string) => (e || '').toLowerCase())) 
        : [];
      
      result.firestoreCheck = {
        adminDocExists: adminDoc.exists,
        adminEmails: adminEmails,
        emailChecked: email.toLowerCase(),
        isInAdminList: adminEmails.includes(email.toLowerCase()),
      };
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

