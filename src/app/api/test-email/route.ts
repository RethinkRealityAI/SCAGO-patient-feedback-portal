import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmail } from '@/lib/email-templates';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    console.log(`[test-email API] Attempting to send test email to: ${email}`);
    const result = await sendTestEmail(email);

    if (result.success) {
      return NextResponse.json({ success: true, message: 'Test email sent successfully' });
    } else {
      console.error(`[test-email API] Failed:`, result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to send test email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[test-email API] Unhandled error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
