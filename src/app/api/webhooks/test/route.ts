import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, secret, payload } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'Webhook URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid webhook URL' },
        { status: 400 }
      );
    }

    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (secret) {
      headers['X-Webhook-Secret'] = secret;
    }

    // Send test webhook
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Webhook test failed: ${response.status} ${response.statusText} - ${errorText}` },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook test sent successfully',
    });
  } catch (error) {
    console.error('Error testing webhook:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to test webhook',
      },
      { status: 500 }
    );
  }
}
